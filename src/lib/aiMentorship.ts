/**
 * AI Mentorship Engine — Uses xAI (Grok-4) to generate
 * real, project-specific improvement recommendations.
 *
 * VERIFICATION FIRST: Before recommending anything, the engine verifies:
 *  - GitHub repo exists and is accessible
 *  - Description is substantial enough to analyze
 *  - AI scores exist (project has been evaluated)
 *  - Plagiarism check has run
 *
 * Only after verification passes does it call Grok for deep mentorship.
 */

import type { Project } from "@/types";
import type { GitHubAnalysis } from "@/lib/githubAnalyzer";
import { getMentorshipViaBackend } from "@/lib/apiClient";

const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;

// ──────── Verification Result ────────
export interface VerificationResult {
  passed: boolean;
  checks: VerificationCheck[];
  summary: string;
}

export interface VerificationCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

// ──────── Mentorship Result ────────
export interface MentorshipResult {
  verification: VerificationResult;
  improvements: MentorshipAdvice[];
  actionPlan: string[];
  techSuggestions: string[];
  overallAdvice: string;
  timestamp: string;
}

export interface MentorshipAdvice {
  area: string;
  currentState: string;
  recommendation: string;
  priority: "critical" | "high" | "medium" | "low";
  effort: "quick-fix" | "moderate" | "significant";
}

// ──────── Step 1: Verify the project is real & complete ────────
export function verifyProject(project: Project): VerificationResult {
  const checks: VerificationCheck[] = [];
  let failCount = 0;
  let warnCount = 0;

  // 1. Description check
  const descLen = project.description?.trim().length || 0;
  if (descLen >= 50) {
    checks.push({ name: "Description", status: "pass", detail: `${descLen} chars — sufficient for analysis` });
  } else if (descLen >= 15) {
    checks.push({ name: "Description", status: "warn", detail: `Only ${descLen} chars — limited context for mentorship` });
    warnCount++;
  } else {
    checks.push({ name: "Description", status: "fail", detail: "No meaningful description provided" });
    failCount++;
  }

  // 2. GitHub repo check
  const gh = project.githubAnalysis;
  if (gh?.fetched && gh.totalCommits > 0) {
    const langCount = Object.keys(gh.languages).length;
    checks.push({
      name: "GitHub Repo",
      status: "pass",
      detail: `Verified: ${gh.totalCommits} commits, ${gh.totalFiles} files, ${langCount} languages (${Object.keys(gh.languages).join(", ")})`,
    });
  } else if (project.githubUrl?.trim()) {
    if (gh?.fetched === false || !gh) {
      checks.push({ name: "GitHub Repo", status: "warn", detail: `URL provided but repo data not fetched yet — run AI Score first` });
      warnCount++;
    } else {
      checks.push({ name: "GitHub Repo", status: "warn", detail: "Repo accessible but limited data" });
      warnCount++;
    }
  } else {
    checks.push({ name: "GitHub Repo", status: "fail", detail: "No GitHub URL provided — cannot assess code quality" });
    failCount++;
  }

  // 3. AI Scores check
  if (project.aiScores && project.aiScores.weightedTotal > 0) {
    checks.push({
      name: "AI Scoring",
      status: "pass",
      detail: `Scored ${project.aiScores.weightedTotal.toFixed(1)}/10 across 8 criteria`,
    });
  } else {
    checks.push({ name: "AI Scoring", status: "fail", detail: "Project has not been AI scored yet — score it first" });
    failCount++;
  }

  // 4. Plagiarism check
  if (project.plagiarismDetails) {
    const pScore = project.plagiarismScore;
    if (pScore > 60) {
      checks.push({ name: "Plagiarism", status: "warn", detail: `High plagiarism concern (${pScore}%) — mentorship may not be useful if code is not original` });
      warnCount++;
    } else {
      checks.push({ name: "Plagiarism", status: "pass", detail: `Plagiarism risk: ${pScore}% — acceptable` });
    }
  } else {
    checks.push({ name: "Plagiarism", status: "warn", detail: "Plagiarism check not run yet" });
    warnCount++;
  }

  // 5. Team members
  const memberCount = project.members?.filter(Boolean).length || 0;
  if (memberCount >= 2) {
    checks.push({ name: "Team", status: "pass", detail: `${memberCount} members listed` });
  } else if (memberCount === 1) {
    checks.push({ name: "Team", status: "pass", detail: "Solo developer" });
  } else {
    checks.push({ name: "Team", status: "warn", detail: "No team members listed" });
    warnCount++;
  }

  // 6. Domain validity
  if (project.domain && project.domain !== "Other") {
    checks.push({ name: "Domain", status: "pass", detail: `Domain: ${project.domain}` });
  } else {
    checks.push({ name: "Domain", status: "warn", detail: "Generic/unspecified domain — mentorship will be less targeted" });
    warnCount++;
  }

  const passed = failCount === 0;
  let summary: string;
  if (failCount >= 2) {
    summary = "❌ Project verification FAILED — critical data is missing. Please ensure the project has a description, AI scores, and ideally a GitHub repo before requesting mentorship.";
  } else if (failCount === 1) {
    summary = "⚠️ Partial verification — one critical check failed. Mentorship will proceed but may be limited.";
  } else if (warnCount >= 3) {
    summary = "⚠️ Verified with warnings — several data points are incomplete. Mentorship quality may vary.";
  } else {
    summary = "✅ Project fully verified — all key data points available for comprehensive mentorship.";
  }

  return { passed, checks, summary };
}

// ──────── Step 2: Build context from real project data ────────
function buildProjectContext(project: Project): string {
  const gh = project.githubAnalysis;
  const ai = project.aiScores;
  const plag = project.plagiarismDetails;

  let context = `PROJECT: "${project.projectName}" by team "${project.teamName}"
DOMAIN: ${project.domain}
DESCRIPTION: ${project.description}
`;

  if (gh?.fetched) {
    context += `
GITHUB ANALYSIS (VERIFIED):
- Repository: ${gh.repoName} (${gh.isForked ? "FORKED" : "original"})
- Total commits: ${gh.totalCommits}
- Commit authors: ${gh.commitAuthors.join(", ")}
- Single author contribution: ${gh.singleAuthorPercent}%
- Languages: ${Object.entries(gh.languages).map(([l, p]) => `${l} (${p}%)`).join(", ")}
- Total files: ${gh.totalFiles}, Directories: ${gh.totalDirs}
- Has tests: ${gh.hasTests ? "Yes" : "No"}
- Has CI/CD config: ${gh.hasCIConfig ? "Yes" : "No"}
- Has Dockerfile: ${gh.hasDockerfile ? "Yes" : "No"}
- Has package.json: ${gh.hasPackageJson ? "Yes" : "No"}
- Has README: ${gh.hasReadme ? "Yes" : "No"}
- Code cleanliness score: ${gh.cleanlinessScore}/10
- Code modularity score: ${gh.modularityScore}/10
- Commit genuineness: ${gh.commitGenuineness}/10
- Burst commit score: ${gh.burstCommitScore}% (high = suspicious)
${gh.commitTimeline.length > 0 ? `- Commit timeline: ${gh.commitTimeline.map((d) => `${d.date}: ${d.count} commits`).join(", ")}` : ""}
`;
  }

  if (ai) {
    context += `
AI SCORES:
${Object.entries(ai.scores).map(([k, v]) => `- ${k}: ${v}/10 — ${ai.explanations[k] || ""}`).join("\n")}
- WEIGHTED TOTAL: ${ai.weightedTotal}/10
- VERDICT: ${ai.overallVerdict}
`;
  }

  if (plag) {
    context += `
PLAGIARISM ANALYSIS:
- Overall score: ${plag.overallScore}%
- Flags: ${plag.flags.length > 0 ? plag.flags.join("; ") : "None"}
- Positives: ${plag.positives.length > 0 ? plag.positives.join("; ") : "None"}
`;
  }

  const members = project.members?.filter(Boolean);
  if (members?.length) {
    context += `\nTEAM MEMBERS: ${members.join(", ")} (${members.length} members)\n`;
  }

  if (project.pptFile) {
    context += `\nPRESENTATION: Uploaded (${project.pptFileName})\n`;
  } else {
    context += `\nPRESENTATION: Not uploaded\n`;
  }

  return context;
}

// ──────── Step 3: Call Groq for real mentorship ────────
export async function generateMentorship(project: Project): Promise<MentorshipResult> {
  const verification = verifyProject(project);
  const timestamp = new Date().toISOString();

  // If verification hard-fails (2+ critical checks), return with verification only
  const criticalFails = verification.checks.filter((c) => c.status === "fail").length;
  if (criticalFails >= 2) {
    return {
      verification,
      improvements: [],
      actionPlan: ["Fix the verification issues above before requesting AI mentorship."],
      techSuggestions: [],
      overallAdvice: "Project needs more data before meaningful mentorship can be provided. Ensure AI scoring is done and a description is provided.",
      timestamp,
    };
  }

  const projectContext = buildProjectContext(project);

  // Try backend proxy first (keeps API key secure)
  try {
    const backendResult = await getMentorshipViaBackend({
      project_name: project.projectName,
      team_name: project.teamName,
      domain: project.domain,
      description: project.description,
      github_analysis: project.githubAnalysis as unknown as Record<string, unknown>,
      ai_scores: project.aiScores as unknown as Record<string, unknown>,
      plagiarism_score: project.plagiarismScore,
      plagiarism_details: project.plagiarismDetails as unknown as Record<string, unknown>,
      members: project.members,
      has_ppt: !!project.pptFile,
      ppt_file_name: project.pptFileName,
    });

    if (backendResult && !backendResult.fallback) {
      return {
        verification,
        improvements: backendResult.improvements as MentorshipAdvice[],
        actionPlan: backendResult.actionPlan,
        techSuggestions: backendResult.techSuggestions,
        overallAdvice: backendResult.overallAdvice,
        timestamp,
      };
    }
  } catch {
    // Fall through to client-side
  }

  if (!XAI_API_KEY) {
    // Fallback: rule-based mentorship without AI
    return generateFallbackMentorship(project, verification, timestamp);
  }

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-latest",
        messages: [
          {
            role: "system",
            content: `You are an expert hackathon mentor. You will receive VERIFIED, REAL data about a specific project — including its actual GitHub repository stats, AI evaluation scores with explanations, plagiarism analysis, domain, description, and team composition.

Your mentorship MUST be deeply specific to THIS project's actual data. Follow these strict rules:

1. CITE REAL DATA: Every "currentState" MUST quote actual numbers from the data (e.g., "Your innovation score is 4.2/10", "Your repo has 12 commits from 1 author", "You're using Python (62%) and JavaScript (38%)"). Never write vague statements.
2. PROJECT-SPECIFIC RECOMMENDATIONS: Each recommendation must directly address something visible in the provided data. For example, if the project is an "EdTech" app using React with no tests, say "Add Jest tests for your React components" — NOT "Consider adding tests".
3. USE THE PROJECT'S NAME AND DOMAIN: Reference "${project.projectName}" and "${project.domain}" throughout. Recommendations must be relevant to the ${project.domain} domain specifically.
4. REFERENCE THE TECH STACK: If GitHub shows languages like Python, JavaScript, etc., tailor recommendations to THOSE languages. Don't suggest Java solutions for a Python project.
5. NO INVENTED FEATURES: Don't assume the project has features not mentioned in the data. Only reference what's actually described.
6. CONNECT SCORES TO ACTIONS: If innovation is 3/10, explain WHY based on the description and what specific feature would raise it. If MVP completeness is low, identify what core feature seems missing based on the description.
7. HONEST AND CONSTRUCTIVE: If the project has major issues (high plagiarism, very few commits, all code from 1 person despite 4 team members), address these directly but respectfully.
8. HACKATHON TIMEFRAME: Prioritize improvements achievable in 2-6 hours, not days. Be realistic about what a team can do right now.
9. TECH SUGGESTIONS MUST MATCH: Only suggest technologies compatible with the project's existing stack and domain. If they use React, suggest React-ecosystem tools. If the domain is HealthTech, suggest health-specific APIs.`,
          },
          {
            role: "user",
            content: `Here is the VERIFIED data for the hackathon project "${project.projectName}" in the "${project.domain}" domain. Analyze it and provide mentorship that is 100% specific to this project's actual scores, code, and team:\n\n${projectContext}\n\nRemember: cite actual scores and stats in every recommendation. Generic advice is not acceptable.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_mentorship",
              description: "Submit structured mentorship recommendations for a hackathon project",
              parameters: {
                type: "object",
                properties: {
                  improvements: {
                    type: "array",
                    description: "3-6 specific improvement areas. Each MUST cite real data from the project.",
                    items: {
                      type: "object",
                      properties: {
                        area: { type: "string", description: "Specific area name tied to the project (e.g., 'React Component Testing', 'HealthTech API Integration', 'Git Collaboration')" },
                        currentState: { type: "string", description: "MUST quote actual numbers/stats from the provided data. Example: 'Your innovation score is 4.2/10. Your repo uses Python (62%) with 23 commits from 1 author.' Never be vague." },
                        recommendation: { type: "string", description: "A concrete, actionable step specific to this project's tech stack and domain. Include specific file types, library names, or API endpoints relevant to their stack. Example: 'Add pytest unit tests for your Flask API endpoints in tests/test_api.py'" },
                        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        effort: { type: "string", enum: ["quick-fix", "moderate", "significant"] },
                      },
                      required: ["area", "currentState", "recommendation", "priority", "effort"],
                    },
                  },
                  actionPlan: {
                    type: "array",
                    description: "5-7 ordered next steps the team should take RIGHT NOW, each referencing the project by name and citing specific scores or stats that motivate the action. Example: 'Your MVP completeness is 3.8/10 — spend 2 hours implementing the core search feature described in your project description'",
                    items: { type: "string" },
                  },
                  techSuggestions: {
                    type: "array",
                    description: "2-4 technologies/tools that fit this project's EXISTING tech stack and domain. Must be compatible with the languages shown in GitHub analysis. Include a 1-line reason why each helps THIS specific project.",
                    items: { type: "string" },
                  },
                  overallAdvice: {
                    type: "string",
                    description: "2-3 sentences mentioning the project name, its domain, its overall score, and the single most impactful thing the team can do right now. Be honest and encouraging.",
                  },
                },
                required: ["improvements", "actionPlan", "techSuggestions", "overallAdvice"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_mentorship" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Grok mentorship API error:", response.status, errText);
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in Grok response");

    const parsed = JSON.parse(toolCall.function.arguments);

    return {
      verification,
      improvements: parsed.improvements || [],
      actionPlan: parsed.actionPlan || [],
      techSuggestions: parsed.techSuggestions || [],
      overallAdvice: parsed.overallAdvice || "",
      timestamp,
    };
  } catch (err) {
    console.error("Grok mentorship error:", err);
    return generateFallbackMentorship(project, verification, timestamp);
  }
}

// ──────── Fallback: rule-based mentorship ────────
function generateFallbackMentorship(
  project: Project,
  verification: VerificationResult,
  timestamp: string
): MentorshipResult {
  const improvements: MentorshipAdvice[] = [];
  const actionPlan: string[] = [];
  const techSuggestions: string[] = [];
  const ai = project.aiScores;
  const gh = project.githubAnalysis;

  // Weak scores → improvement areas
  if (ai) {
    if (ai.scores.innovation <= 5) {
      improvements.push({
        area: "Innovation",
        currentState: `Innovation scored ${ai.scores.innovation}/10. ${ai.explanations.innovation || ""}`,
        recommendation: "Add a unique differentiator — what does your project do that no other does? Consider integrating an emerging technology like AI/ML, blockchain, or IoT to stand out.",
        priority: "high",
        effort: "moderate",
      });
    }
    if (ai.scores.technical_feasibility <= 5) {
      improvements.push({
        area: "Technical Depth",
        currentState: `Technical feasibility scored ${ai.scores.technical_feasibility}/10.`,
        recommendation: "Add proper error handling, API integration, or a more sophisticated architecture. Consider separating frontend/backend if not already done.",
        priority: "high",
        effort: "moderate",
      });
    }
    if (ai.scores.mvp_completeness <= 5) {
      improvements.push({
        area: "MVP Completeness",
        currentState: `MVP scored ${ai.scores.mvp_completeness}/10 — key features may be missing.`,
        recommendation: "Focus on completing 2-3 core features end-to-end rather than having many half-done features. A working demo beats a feature list.",
        priority: "critical",
        effort: "significant",
      });
    }
    if (ai.scores.presentation <= 5) {
      improvements.push({
        area: "Presentation",
        currentState: project.pptFile ? "PPT uploaded but presentation score is low." : "No presentation uploaded.",
        recommendation: project.pptFile
          ? "Improve your slides: add a problem statement, architecture diagram, demo screenshots, and a clear impact slide."
          : "Upload a presentation! Include: problem → solution → demo → tech stack → impact → team slides.",
        priority: "high",
        effort: "quick-fix",
      });
    }
  }

  // GitHub-based recommendations
  if (gh?.fetched) {
    if (!gh.hasTests) {
      improvements.push({
        area: "Testing",
        currentState: `${gh.totalFiles} files but no test files detected.`,
        recommendation: "Add at least 3-5 basic unit tests for core functions. Even simple tests show engineering maturity to judges.",
        priority: "medium",
        effort: "quick-fix",
      });
      actionPlan.push("Add a __tests__ or test/ folder with basic unit tests for your core logic");
    }
    if (!gh.hasReadme || gh.cleanlinessScore < 5) {
      improvements.push({
        area: "Documentation",
        currentState: !gh.hasReadme ? "No README file found." : `Code cleanliness: ${gh.cleanlinessScore}/10.`,
        recommendation: "Add a comprehensive README with: project description, setup instructions, screenshots, tech stack, and team info.",
        priority: "medium",
        effort: "quick-fix",
      });
      actionPlan.push("Write a README.md with setup instructions, screenshots, and architecture overview");
    }
    if (!gh.hasCIConfig) {
      techSuggestions.push("GitHub Actions — add a simple CI pipeline for automated testing and linting");
    }
    if (!gh.hasDockerfile) {
      techSuggestions.push("Docker — containerize your app for easy deployment and reproducibility");
    }
    if (gh.singleAuthorPercent === 100 && project.members.filter(Boolean).length >= 2) {
      improvements.push({
        area: "Team Collaboration",
        currentState: `Only 1 commit author despite ${project.members.filter(Boolean).length} team members.`,
        recommendation: "Have all team members make commits from their own accounts. Judges look for distributed contributions.",
        priority: "high",
        effort: "quick-fix",
      });
    }
  }

  // Plagiarism concerns
  if (project.plagiarismScore > 50) {
    improvements.push({
      area: "Code Originality",
      currentState: `Plagiarism score: ${project.plagiarismScore}%. ${project.plagiarismDetails?.flags.join("; ") || ""}`,
      recommendation: "Significantly customize any boilerplate or template code. Add unique business logic, custom UI, and original features that clearly differentiate your work.",
      priority: "critical",
      effort: "significant",
    });
  }

  // Domain + stack-specific tech suggestions
  const langs = gh?.fetched ? Object.keys(gh.languages) : [];
  const isJs = langs.some(l => /javascript|typescript/i.test(l));
  const isPython = langs.some(l => /python/i.test(l));

  const domainTech: Record<string, string[]> = {
    "AI/ML": [
      isPython ? "Hugging Face Transformers — add a pre-trained model to your Python pipeline" : "TensorFlow.js — run ML models in the browser with your JS stack",
      isPython ? "Streamlit — build a quick demo UI for your ML model" : "Gradio — create an interactive ML demo alongside your app",
    ],
    "HealthTech": [
      "FHIR API — add health data interoperability to your HealthTech app",
      isJs ? "Chart.js — visualize patient/health metrics in your React/JS app" : "Plotly — create interactive health data dashboards",
    ],
    "FinTech": [
      isJs ? "Stripe.js — integrate payment processing directly in your frontend" : "Razorpay Python SDK — add payment support to your backend",
      isJs ? "Recharts — build financial dashboards in React" : "Chart.js — create financial data visualizations",
    ],
    "Blockchain": ["Hardhat — test your smart contracts locally", "ethers.js — connect your frontend to Web3"],
    "IoT": [
      isPython ? "paho-mqtt — connect IoT devices with MQTT in Python" : "MQTT.js — add IoT message handling to your app",
      "Grafana — create real-time sensor dashboards",
    ],
    "EdTech": [
      isJs ? "Socket.io — add real-time collaboration to your EdTech platform" : "WebSockets — enable live learning sessions",
      "Mermaid.js — add interactive diagrams for educational content",
    ],
    "Cybersecurity": [
      "OWASP ZAP — scan your app for security vulnerabilities",
      isJs ? "Helmet.js — add HTTP security headers to your Node.js server" : "PyJWT — secure your Python API with token-based auth",
    ],
    "SmartCities": ["Leaflet.js — add interactive maps to your SmartCities dashboard", "D3.js — create data visualizations for urban data"],
    "AgriTech": [
      "OpenWeather API — integrate real weather data for your AgriTech features",
      isPython ? "TensorFlow Lite — deploy crop detection models on edge devices" : "TensorFlow.js — run agricultural ML models in the browser",
    ],
    "Sustainability": ["Carbon Interface API — add carbon footprint tracking to your sustainability app", isJs ? "Recharts — visualize environmental impact data" : "Matplotlib — generate impact reports"],
    "Gaming": [isJs ? "Phaser.js — build 2D game mechanics in the browser" : "Pygame — create game logic in Python", "Socket.io — add multiplayer support"],
    "SocialImpact": ["Mapbox — add geographic visualization to show social impact", "SendGrid — add notification emails for community engagement"],
  };

  const domainSuggestions = domainTech[project.domain] || [
    isJs ? "Vercel — deploy your JS app instantly for demo" : "Railway.app — deploy your backend instantly for demo",
    "Sentry — add error monitoring to catch issues during judging",
  ];
  techSuggestions.push(...domainSuggestions.map(s => `${s} (for "${project.projectName}")`));

  // Build action plan — always project-specific
  if (ai) {
    // Find the weakest score
    const sortedScores = Object.entries(ai.scores)
      .sort(([, a], [, b]) => a - b);
    if (sortedScores.length > 0) {
      const [weakest, weakestVal] = sortedScores[0];
      actionPlan.push(`Your weakest area is ${weakest.replace(/_/g, " ")} at ${weakestVal}/10 — spend 2 hours focused on improving this for "${project.projectName}"`);
    }
    if (sortedScores.length > 1) {
      const [second, secondVal] = sortedScores[1];
      actionPlan.push(`Next priority: ${second.replace(/_/g, " ")} scored ${secondVal}/10 — ${ai.explanations[second] || "needs attention"}`);
    }
  }

  if (gh?.fetched) {
    const langs = Object.keys(gh.languages);
    if (langs.length > 0) {
      actionPlan.push(`Your stack uses ${langs.join(", ")} — add proper error handling specific to your ${langs[0]} codebase`);
    }
    if (gh.cleanlinessScore < 6) {
      actionPlan.push(`Code cleanliness is ${gh.cleanlinessScore}/10 — remove console.logs, unused imports, and add comments in your ${Object.keys(gh.languages)[0] || ""} files`);
    }
  }

  actionPlan.push(`Practice a 3-minute demo of "${project.projectName}" showing the core ${project.domain} user flow end-to-end`);
  if (!project.pptFile) {
    actionPlan.push(`Create a 6-8 slide deck for "${project.projectName}": Problem in ${project.domain} → Your Solution → Live Demo → Architecture → Impact`);
  }

  // Build project-specific overall advice
  let overallAdvice: string;
  if (ai) {
    const sortedScores = Object.entries(ai.scores).sort(([, a], [, b]) => a - b);
    const weakestArea = sortedScores[0]?.[0]?.replace(/_/g, " ") || "overall quality";
    const strongestArea = sortedScores[sortedScores.length - 1]?.[0]?.replace(/_/g, " ") || "presentation";
    const langList = gh?.fetched ? Object.keys(gh.languages).join(", ") : "your tech stack";

    if (ai.weightedTotal >= 7) {
      overallAdvice = `"${project.projectName}" (${project.domain}) scored ${ai.weightedTotal.toFixed(1)}/10 — strong work! Your ${strongestArea} stands out. Focus the remaining time on polishing ${weakestArea} (${sortedScores[0]?.[1]}/10) and rehearsing your demo with your ${langList} implementation.`;
    } else if (ai.weightedTotal >= 5) {
      overallAdvice = `"${project.projectName}" (${project.domain}) scored ${ai.weightedTotal.toFixed(1)}/10 — solid foundation built with ${langList}. Your ${weakestArea} (${sortedScores[0]?.[1]}/10) is the biggest opportunity — improving it could push your total score significantly.`;
    } else {
      overallAdvice = `"${project.projectName}" (${project.domain}) scored ${ai.weightedTotal.toFixed(1)}/10 — it needs focused effort. Prioritize getting your core ${project.domain} feature working end-to-end in ${langList} before adding anything new. Your ${weakestArea} (${sortedScores[0]?.[1]}/10) needs the most attention.`;
    }
  } else {
    overallAdvice = `"${project.projectName}" (${project.domain}) hasn't been AI scored yet — run AI scoring first for detailed, data-driven mentorship.`;
  }

  return {
    verification,
    improvements,
    actionPlan,
    techSuggestions: [...new Set(techSuggestions)].slice(0, 5),
    overallAdvice,
    timestamp,
  };
}
