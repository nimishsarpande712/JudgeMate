import type { Project } from "@/types";
import type { GitHubAnalysis } from "@/lib/githubAnalyzer";

/**
 * Generates ACTUAL project-specific questions based on:
 * - Real project description keywords
 * - GitHub analysis data (if available)
 * - Domain + tech stack detection
 * - AI scores and plagiarism results
 * - PPT/submission completeness
 *
 * NO generic mock questions. Every question references the actual project.
 */

// ──────── Extract real tech stack from description ────────
function extractTechStack(desc: string, gh?: GitHubAnalysis): string[] {
  const lower = desc.toLowerCase();
  const techs: string[] = [];

  const techKeywords: Record<string, string> = {
    react: "React", "next.js": "Next.js", nextjs: "Next.js",
    vue: "Vue.js", angular: "Angular", svelte: "Svelte",
    "node.js": "Node.js", nodejs: "Node.js", express: "Express",
    django: "Django", flask: "Flask", fastapi: "FastAPI",
    "spring boot": "Spring Boot", springboot: "Spring Boot",
    python: "Python", javascript: "JavaScript", typescript: "TypeScript",
    java: "Java", "c++": "C++", rust: "Rust", golang: "Go", go: "Go",
    tensorflow: "TensorFlow", pytorch: "PyTorch", keras: "Keras",
    opencv: "OpenCV", scikit: "scikit-learn",
    mongodb: "MongoDB", postgresql: "PostgreSQL", mysql: "MySQL",
    firebase: "Firebase", supabase: "Supabase", redis: "Redis",
    docker: "Docker", kubernetes: "Kubernetes",
    aws: "AWS", azure: "Azure", gcp: "GCP",
    graphql: "GraphQL", "rest api": "REST API", websocket: "WebSocket",
    blockchain: "Blockchain", solidity: "Solidity", ethereum: "Ethereum",
    arduino: "Arduino", "raspberry pi": "Raspberry Pi", esp32: "ESP32",
    mqtt: "MQTT", flutter: "Flutter", "react native": "React Native",
    tailwind: "Tailwind CSS", bootstrap: "Bootstrap",
    openai: "OpenAI API", gpt: "GPT", llm: "LLM", bert: "BERT",
    langchain: "LangChain", "hugging face": "Hugging Face",
    stripe: "Stripe", razorpay: "Razorpay",
    socket: "Socket.io", socketio: "Socket.io",
  };

  for (const [keyword, name] of Object.entries(techKeywords)) {
    if (lower.includes(keyword)) techs.push(name);
  }

  // Also from GitHub languages
  if (gh?.fetched && gh.languages) {
    Object.keys(gh.languages).forEach((lang) => {
      if (!techs.some((t) => t.toLowerCase() === lang.toLowerCase())) {
        techs.push(lang);
      }
    });
  }

  return [...new Set(techs)];
}

// ──────── Extract what the project does from description ────────
function extractProjectFeatures(desc: string): string[] {
  const features: string[] = [];
  const lower = desc.toLowerCase();

  // Action words that indicate features
  const featurePatterns = [
    { pattern: /(?:detect|identifies?|recogni[sz]e)\s+([^,.]+)/gi, prefix: "detection of" },
    { pattern: /(?:predict|forecast|estimat)\s+([^,.]+)/gi, prefix: "prediction of" },
    { pattern: /(?:automat|generat|creat)\w*\s+([^,.]+)/gi, prefix: "automated" },
    { pattern: /(?:monitor|track|analyz)\w*\s+([^,.]+)/gi, prefix: "monitoring of" },
    { pattern: /(?:recommend|suggest)\w*\s+([^,.]+)/gi, prefix: "recommendations for" },
    { pattern: /(?:connect|integrat)\w*\s+(?:with\s+)?([^,.]+)/gi, prefix: "integration with" },
    { pattern: /(?:real[- ]time)\s+([^,.]+)/gi, prefix: "real-time" },
  ];

  featurePatterns.forEach(({ pattern }) => {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      const feature = match[1].trim().slice(0, 40);
      if (feature.length > 3) features.push(feature);
    }
  });

  return features.slice(0, 5);
}

// ──────── Generate questions based on actual GitHub data ────────
function generateGitHubQuestions(project: Project): string[] {
  const gh = project.githubAnalysis;
  const questions: string[] = [];

  if (!gh?.fetched) {
    if (!project.githubUrl) {
      questions.push(
        `You haven't provided a GitHub link for "${project.projectName}" — can you open your codebase and walk us through the architecture?`
      );
    } else {
      questions.push(
        `We couldn't access your GitHub repo (${project.githubUrl}) — is it private? Can you make it public or show us the code structure?`
      );
    }
    return questions;
  }

  // Commit pattern questions
  if (gh.burstCommitScore >= 70) {
    if (gh.totalCommits <= 3) {
      questions.push(
        `Your repo "${gh.repoName}" has only ${gh.totalCommits} commit(s). That's very unusual for a hackathon project — was all the code written and pushed at once? Walk us through your development timeline.`
      );
    } else if (gh.commitTimeline.length === 1) {
      questions.push(
        `All ${gh.totalCommits} commits in "${gh.repoName}" were pushed on ${gh.commitTimeline[0].date}. This pattern suggests AI-generated or pre-existing code. Can you explain your actual development process?`
      );
    } else {
      questions.push(
        `The commit pattern in your repo shows rapid-fire commits (avg ${gh.avgTimeBetweenCommits}h apart). Did you use an AI tool to generate the code? Walk us through what YOU personally wrote.`
      );
    }
  }

  // Fork detection
  if (gh.isForked) {
    questions.push(
      `Your repository is a fork. What specific changes did YOUR team make to the original codebase? Show us your unique contributions.`
    );
  }

  // Single author but team project
  if (gh.singleAuthorPercent === 100 && project.members.filter(Boolean).length >= 2 && gh.totalCommits > 2) {
    questions.push(
      `Only "${gh.commitAuthors[0]}" appears in the commit history, but you have ${project.members.filter(Boolean).length} team members. How did the others contribute? Why don't they have commits?`
    );
  }

  // No tests
  if (!gh.hasTests && gh.totalFiles > 5) {
    questions.push(
      `Your codebase has ${gh.totalFiles} files but no test files. How do you verify that "${project.projectName}" works correctly? What's your testing approach?`
    );
  }

  // Code structure
  if (gh.modularityScore <= 4) {
    questions.push(
      `Your code structure is quite flat (${gh.totalDirs} directories, ${gh.totalFiles} files). How do you handle separation of concerns in "${project.projectName}"?`
    );
  }

  // Tech stack from languages
  const langs = Object.keys(gh.languages);
  if (langs.length >= 2) {
    questions.push(
      `Your repo uses ${langs.slice(0, 3).join(", ")}. Explain the architecture — which language handles what part of "${project.projectName}"?`
    );
  }

  return questions;
}

// ──────── Generate questions based on project description ────────
function generateDescriptionQuestions(project: Project): string[] {
  const questions: string[] = [];
  const desc = project.description.toLowerCase();
  const name = project.projectName;
  const techs = extractTechStack(project.description, project.githubAnalysis);
  const features = extractProjectFeatures(project.description);

  // Tech-specific probing
  if (techs.length > 0) {
    const mainTech = techs.slice(0, 2).join(" + ");
    questions.push(
      `You're using ${mainTech} in "${name}". What made you choose this stack over alternatives? What challenges did you face with it?`
    );
  }

  // Feature-specific deep dives
  features.forEach((feature) => {
    questions.push(
      `You mention ${feature} in "${name}" — how exactly does this work? Show us the implementation and explain the logic.`
    );
  });

  // Domain-specific technical questions
  if (desc.includes("machine learning") || desc.includes("ml") || desc.includes("model")) {
    questions.push(`What dataset did you use to train your model in "${name}"? What's the accuracy, and how did you validate it?`);
  }
  if (desc.includes("api") || desc.includes("backend") || desc.includes("server")) {
    questions.push(`What API endpoints does "${name}" expose? How do you handle authentication and rate limiting?`);
  }
  if (desc.includes("database") || desc.includes("data") || desc.includes("storage")) {
    questions.push(`How does "${name}" handle data persistence? What's your database schema design?`);
  }
  if (desc.includes("real-time") || desc.includes("realtime") || desc.includes("live")) {
    questions.push(`How does the real-time feature in "${name}" work? What protocol do you use and how do you handle disconnections?`);
  }
  if (desc.includes("security") || desc.includes("encrypt") || desc.includes("auth")) {
    questions.push(`What security measures does "${name}" implement? How do you handle user data protection?`);
  }
  if (desc.includes("ai") || desc.includes("artificial intelligence") || desc.includes("gpt") || desc.includes("llm")) {
    questions.push(`Is "${name}" using a pre-trained AI model or did you build your own? What's the AI doing that couldn't be done with simple logic?`);
  }
  if (desc.includes("mobile") || desc.includes("app") || desc.includes("android") || desc.includes("ios")) {
    questions.push(`Is "${name}" a native app or web-based? How do you handle offline functionality and different screen sizes?`);
  }
  if (desc.includes("blockchain") || desc.includes("smart contract") || desc.includes("web3")) {
    questions.push(`Which blockchain network does "${name}" deploy on? What's the gas cost per transaction?`);
  }
  if (desc.includes("iot") || desc.includes("sensor") || desc.includes("hardware") || desc.includes("arduino")) {
    questions.push(`What hardware components does "${name}" use? How do you handle sensor calibration and data accuracy?`);
  }

  return questions;
}

// ──────── Score-based follow-ups ────────
function generateScoreBasedQuestions(project: Project): string[] {
  const questions: string[] = [];
  const ai = project.aiScores;
  const name = project.projectName;

  if (!ai) return questions;

  if (ai.scores.innovation <= 4) {
    questions.push(`"${name}" scored low on innovation. What makes your solution different from existing ones? What's your unique angle?`);
  }
  if (ai.scores.technical_feasibility <= 4) {
    questions.push(`The technical feasibility score for "${name}" is low. Can you demo a working feature right now?`);
  }
  if (ai.scores.code_quality <= 4) {
    questions.push(`Code quality concerns in "${name}" — show us your error handling, logging, and how you manage edge cases.`);
  }
  if (ai.scores.impact >= 8) {
    questions.push(`"${name}" shows strong impact potential. What's your 6-month roadmap to go from hackathon to real users?`);
  }
  if (ai.scores.mvp_completeness <= 4) {
    questions.push(`"${name}" seems incomplete. What's the minimum set of features needed to make this usable, and how far are you?`);
  }

  // Plagiarism concerns
  if (project.plagiarismScore > 50) {
    questions.push(
      `Your project flagged ${project.plagiarismScore}% on plagiarism detection. Can you open your code editor and show us which parts YOU personally wrote?`
    );
  }

  return questions;
}

// ──────── Domain-specific deep probing (fallback) ────────
function generateDomainProbes(project: Project): string[] {
  const name = project.projectName;
  const domain = project.domain;
  const questions: string[] = [];

  const domainProbes: Record<string, string[]> = {
    "AI/ML": [
      `What dataset did you use for "${name}"? How did you handle bias and class imbalance?`,
      `Show us your model's confusion matrix or accuracy metrics for "${name}".`,
    ],
    HealthTech: [
      `How does "${name}" comply with data privacy regulations like HIPAA or India's DISHA?`,
      `Did you validate "${name}" with real healthcare professionals? What feedback did you get?`,
    ],
    FinTech: [
      `How does "${name}" handle failed transactions and edge cases like double payments?`,
      `What encryption and security standards does "${name}" use for financial data?`,
    ],
    EdTech: [
      `How does "${name}" measure actual learning outcomes, not just engagement?`,
      `What accessibility features does "${name}" have for differently-abled students?`,
    ],
    Blockchain: [
      `What's the actual decentralization benefit of "${name}" over a traditional database?`,
      `What's the gas cost per transaction in "${name}"? How do you optimize it?`,
    ],
    IoT: [
      `How does "${name}" handle sensor calibration drift and noisy data?`,
      `What's "${name}"'s power consumption strategy for battery-operated devices?`,
    ],
    Cybersecurity: [
      `What specific threat model does "${name}" address? Show us a demo of the detection.`,
      `How does "${name}" minimize false positives in threat detection?`,
    ],
    SmartCities: [
      `What real-time data sources does "${name}" integrate with? How do you handle data latency?`,
      `How does "${name}" ensure equitable access across different neighborhoods?`,
    ],
    AgriTech: [
      `How does "${name}" work for small-hold farmers with limited smartphone access?`,
      `What's the accuracy of your prediction model in "${name}"? Validated against what data?`,
    ],
    Sustainability: [
      `What measurable environmental impact metrics does "${name}" track?`,
      `How does "${name}" incentivize sustained behavior change, not just one-time actions?`,
    ],
    Gaming: [
      `How does "${name}" handle real-time multiplayer synchronization and cheating?`,
      `What's your monetization model for "${name}" — is it fair or pay-to-win?`,
    ],
    SocialImpact: [
      `How do you quantitatively measure social impact of "${name}"?`,
      `What's "${name}"'s sustainability model beyond hackathon/grants?`,
    ],
    Other: [
      `Who is the target user of "${name}" and how did you validate the need exists?`,
      `What's "${name}"'s competitive advantage over existing solutions?`,
    ],
  };

  const probes = domainProbes[domain] || domainProbes["Other"];
  questions.push(...probes);

  // Universal probing questions that reference the project
  questions.push(
    `What was the single biggest technical challenge you faced building "${name}" and how did you solve it?`,
    `If you had 2 more weeks, what's the #1 feature you'd add to "${name}"?`,
    `Walk us through "${name}"'s architecture — draw it on the whiteboard right now.`,
    `Show us the most complex function in "${name}" and explain the logic line by line.`,
  );

  return questions;
}

// ──────── MAIN: Generate Recommendations ────────
export function generateRecommendations(project: Project): string[] {
  const allQuestions: string[] = [];

  // 1. GitHub-based questions (highest priority — real data)
  allQuestions.push(...generateGitHubQuestions(project));

  // 2. Description-based questions (project specific)
  allQuestions.push(...generateDescriptionQuestions(project));

  // 3. Score-based follow-ups
  allQuestions.push(...generateScoreBasedQuestions(project));

  // 4. PPT question if missing
  if (!project.pptFile) {
    allQuestions.push(
      `No presentation was uploaded for "${project.projectName}". Can you give a 2-minute verbal pitch covering the problem, solution, and demo?`
    );
  }

  // 5. If we still don't have enough questions, add domain-specific probes
  if (allQuestions.length < 5) {
    const domainQs = generateDomainProbes(project);
    for (const q of domainQs) {
      if (!allQuestions.includes(q)) allQuestions.push(q);
      if (allQuestions.length >= 7) break;
    }
  }

  // Deduplicate, prioritize, and return 5-7
  const unique = [...new Set(allQuestions)];
  return unique.slice(0, 7);
}

export function generateScoreFollowups(
  project: Project,
  scores: Record<string, number>
): string[] {
  const followups: string[] = [];
  const name = project.projectName;

  for (const [key, value] of Object.entries(scores)) {
    if (key === "innovation" && value <= 4) {
      followups.push(`What existing solutions did you study before building "${name}", and how is your approach fundamentally different?`);
    }
    if (key === "technical_feasibility" && value <= 4) {
      followups.push(`Can you demo error handling in "${name}"? Show us what happens when something fails.`);
    }
    if (key === "impact" && value >= 8) {
      followups.push(`"${name}" has great impact potential — what partnerships or deployments could you pursue in the next 3 months?`);
    }
    if (key === "code_quality" && value <= 4) {
      followups.push(`Walk us through a specific function in "${name}" — explain the logic, variable naming, and how you'd refactor it.`);
    }
    if (key === "originality" && value <= 4) {
      followups.push(`The originality score is low for "${name}". What part of the code is 100% written by your team? Show us.`);
    }
  }

  return followups.slice(0, 3);
}
