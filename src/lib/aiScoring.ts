/**
 * AI Auto-Scoring Engine
 * Automatically evaluates hackathon projects across 8 criteria
 * based on project metadata: description, domain, GitHub URL,
 * PPT presence, team size, plagiarism data, and keyword analysis.
 */

import { CRITERIA, type Project, type CriterionKey } from "@/types";

export interface AIScoreResult {
  scores: Record<string, number>; // criterion key → 1-10
  weightedTotal: number;
  explanations: Record<string, string>; // criterion key → reasoning
  timestamp: string;
  overallVerdict: string;
}

// ────────── Domain-specific tech keywords with impact tiers ──────────
const DOMAIN_TECH: Record<string, { high: string[]; medium: string[]; low: string[] }> = {
  "AI/ML": {
    high: ["transformer", "neural network", "deep learning", "reinforcement learning", "llm", "gpt", "bert", "diffusion", "fine-tuning", "rag", "vector database", "embeddings", "cnn", "rnn", "lstm"],
    medium: ["machine learning", "classification", "regression", "nlp", "computer vision", "opencv", "pytorch", "tensorflow", "scikit", "model training", "dataset", "prediction", "clustering"],
    low: ["ai", "artificial intelligence", "data", "algorithm", "automation", "smart"],
  },
  HealthTech: {
    high: ["ehr", "fhir", "hl7", "medical imaging", "dicom", "telemedicine", "drug discovery", "clinical trials", "genomics", "pathology", "radiology"],
    medium: ["health monitoring", "patient portal", "diagnosis", "wearable", "fitness tracker", "symptom checker", "medical records", "healthcare api"],
    low: ["health", "wellness", "doctor", "hospital", "medicine", "patient"],
  },
  FinTech: {
    high: ["payment gateway", "smart contract", "defi", "kyc", "aml", "algorithmic trading", "tokenization", "credit scoring model", "fraud detection"],
    medium: ["banking api", "upi", "wallet", "investment", "insurance", "loan", "transaction", "portfolio", "budgeting"],
    low: ["finance", "money", "payment", "banking", "fintech"],
  },
  Blockchain: {
    high: ["solidity", "smart contract", "consensus mechanism", "zero-knowledge", "zk-proof", "evm", "web3", "ipfs", "dao", "cross-chain"],
    medium: ["ethereum", "polygon", "nft", "token", "defi", "dapp", "metamask", "hardhat", "truffle", "blockchain node"],
    low: ["blockchain", "crypto", "decentralized", "ledger", "distributed"],
  },
  IoT: {
    high: ["mqtt", "embedded systems", "microcontroller", "fpga", "rtos", "edge computing", "sensor fusion", "digital twin"],
    medium: ["arduino", "raspberry pi", "esp32", "lora", "zigbee", "ble", "sensor", "actuator", "gpio", "firmware"],
    low: ["iot", "connected", "device", "smart device", "automation"],
  },
  Cybersecurity: {
    high: ["zero-day", "penetration testing", "cryptography", "vulnerability assessment", "siem", "intrusion detection", "reverse engineering", "threat modeling"],
    medium: ["firewall", "encryption", "authentication", "oauth", "jwt", "xss", "sql injection", "malware", "phishing detection", "security audit"],
    low: ["security", "privacy", "protection", "safe", "secure"],
  },
  EdTech: {
    high: ["adaptive learning", "learning management system", "gamification engine", "spaced repetition", "intelligent tutoring"],
    medium: ["online learning", "quiz platform", "video streaming", "virtual classroom", "progress tracking", "assessment", "curriculum"],
    low: ["education", "learning", "teaching", "student", "course", "school"],
  },
  SmartCities: {
    high: ["traffic optimization", "urban planning ai", "smart grid", "waste management system", "gis", "geospatial"],
    medium: ["parking system", "public transport", "air quality", "water management", "surveillance", "civic engagement", "infrastructure"],
    low: ["city", "urban", "smart", "municipal", "public"],
  },
  AgriTech: {
    high: ["precision agriculture", "crop disease detection", "soil analysis", "drone mapping", "yield prediction"],
    medium: ["irrigation", "farm management", "livestock", "weather prediction", "supply chain", "marketplace"],
    low: ["agriculture", "farming", "crop", "plant", "food"],
  },
  Sustainability: {
    high: ["carbon footprint calculator", "renewable energy optimization", "circular economy", "life cycle assessment"],
    medium: ["solar", "wind energy", "recycling", "emission tracking", "sustainable supply chain", "green energy"],
    low: ["sustainability", "environment", "green", "eco", "climate"],
  },
  Gaming: {
    high: ["game engine", "procedural generation", "multiplayer networking", "physics simulation", "shader programming"],
    medium: ["unity", "unreal", "godot", "webgl", "3d rendering", "ai npc", "level design", "matchmaking"],
    low: ["game", "gaming", "play", "player", "interactive"],
  },
  SocialImpact: {
    high: ["impact measurement", "beneficiary tracking", "social enterprise model", "inclusive design"],
    medium: ["ngo platform", "donation tracking", "volunteer management", "accessibility", "community engagement"],
    low: ["social", "community", "impact", "help", "charity"],
  },
  Other: {
    high: ["microservices", "distributed systems", "real-time processing", "graphql", "grpc"],
    medium: ["api", "database", "cloud", "docker", "kubernetes", "ci/cd", "rest", "websocket"],
    low: ["web", "app", "platform", "system", "tool"],
  },
};

// ────────── General technical complexity indicators ──────────
const TECH_COMPLEXITY_HIGH = [
  "microservices", "kubernetes", "docker", "ci/cd", "graphql", "grpc",
  "websocket", "real-time", "distributed", "load balancing", "caching",
  "redis", "elasticsearch", "message queue", "kafka", "rabbitmq",
  "serverless", "lambda", "terraform", "infrastructure as code",
];
const TECH_COMPLEXITY_MEDIUM = [
  "react", "next.js", "vue", "angular", "node.js", "express",
  "django", "flask", "fastapi", "spring boot", "postgresql",
  "mongodb", "firebase", "supabase", "aws", "azure", "gcp",
  "typescript", "tailwind", "authentication", "authorization",
];

// ────────── Analyze GitHub URL quality ──────────
function analyzeGitHubUrl(url: string): { score: number; notes: string[] } {
  const notes: string[] = [];
  if (!url || !url.trim()) {
    return { score: 2, notes: ["No GitHub URL provided — cannot assess code quality"] };
  }

  let score = 5;
  const lower = url.toLowerCase().trim();

  // Valid GitHub URL
  if (lower.includes("github.com/")) {
    score += 1;
    notes.push("Valid GitHub repository link provided");

    // Extract org/repo pattern
    const match = lower.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (match) {
      const org = match[1];
      const repo = match[2];

      // Repo name quality checks
      if (repo.length > 3 && !repo.match(/^(test|demo|sample|example|untitled|my-app|app|project)/)) {
        score += 1;
        notes.push(`Meaningful repo name: ${repo}`);
      }
      if (org !== repo) {
        score += 0.5;
      }
    }
  } else if (lower.includes("gitlab.com") || lower.includes("bitbucket.org")) {
    score += 0.5;
    notes.push("Alternative Git hosting platform");
  } else {
    notes.push("URL doesn't appear to be a recognized Git platform");
    score -= 1;
  }

  return { score: Math.min(10, Math.max(1, Math.round(score))), notes };
}

// ────────── Analyze description quality and extract signals ──────────
function analyzeDescription(description: string, domain: string): {
  technicalDepth: number;
  innovationSignals: number;
  impactSignals: number;
  clarity: number;
  keywords: string[];
} {
  const lower = description.toLowerCase();
  const words = lower.split(/\s+/);
  const wordCount = words.length;
  const sentences = description.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  const foundKeywords: string[] = [];

  // Technical depth analysis
  let techScore = 3;
  const domainTech = DOMAIN_TECH[domain] || DOMAIN_TECH["Other"];

  domainTech.high.forEach((kw) => {
    if (lower.includes(kw)) { techScore += 1.5; foundKeywords.push(kw); }
  });
  domainTech.medium.forEach((kw) => {
    if (lower.includes(kw)) { techScore += 0.8; foundKeywords.push(kw); }
  });
  domainTech.low.forEach((kw) => {
    if (lower.includes(kw)) { techScore += 0.3; foundKeywords.push(kw); }
  });

  TECH_COMPLEXITY_HIGH.forEach((kw) => {
    if (lower.includes(kw)) { techScore += 0.7; foundKeywords.push(kw); }
  });
  TECH_COMPLEXITY_MEDIUM.forEach((kw) => {
    if (lower.includes(kw)) { techScore += 0.3; foundKeywords.push(kw); }
  });

  // Innovation signals
  let innovScore = 3;
  const innovationWords = ["novel", "unique", "first", "pioneering", "revolutionary", "innovative", "breakthrough", "new approach", "rethink", "reimagine", "disrupt", "patent", "original"];
  innovationWords.forEach((w) => { if (lower.includes(w)) innovScore += 1; });
  // Penalize generic/vague descriptions
  const genericWords = ["simple", "basic", "todo", "clone", "copy", "like uber", "like netflix"];
  genericWords.forEach((w) => { if (lower.includes(w)) innovScore -= 1; });

  // Impact signals
  let impactScore = 3;
  const impactWords = ["users", "millions", "scale", "solve", "problem", "community", "accessibility", "affordable", "real-world", "deployment", "production", "impact", "lives", "society", "reduce", "improve", "transform"];
  impactWords.forEach((w) => { if (lower.includes(w)) impactScore += 0.7; });

  // Clarity & quality of writing
  let clarity = 4;
  if (wordCount >= 30) clarity += 1;
  if (wordCount >= 60) clarity += 1;
  if (wordCount >= 100) clarity += 0.5;
  if (sentences.length >= 3) clarity += 1;
  if (sentences.length >= 5) clarity += 0.5;
  // Check for proper structure
  if (description.includes(",")) clarity += 0.3;
  if (description.match(/\b(we|our|team)\b/i)) clarity += 0.3;

  return {
    technicalDepth: Math.min(10, Math.max(1, Math.round(techScore))),
    innovationSignals: Math.min(10, Math.max(1, Math.round(innovScore))),
    impactSignals: Math.min(10, Math.max(1, Math.round(impactScore))),
    clarity: Math.min(10, Math.max(1, Math.round(clarity))),
    keywords: [...new Set(foundKeywords)],
  };
}

// ────────── Analyze PPT quality ──────────
function analyzePPT(project: Project): { score: number; note: string } {
  if (!project.pptFile) {
    return { score: 3, note: "No presentation uploaded — presentation score limited" };
  }
  let score = 6; // Base for having a PPT
  if (project.pptFileType?.includes("pdf")) {
    score += 1; // PDF = polished
  }
  if (project.pptFileName) {
    const name = project.pptFileName.toLowerCase();
    if (name.includes(project.projectName.toLowerCase().split(" ")[0])) {
      score += 1; // Named after project = organized
    }
    if (!name.match(/^(untitled|presentation|document|new)/)) {
      score += 0.5;
    }
  }
  // File size heuristic (base64 length correlates with content)
  if (project.pptFile.length > 100000) score += 0.5; // Substantial content
  if (project.pptFile.length > 500000) score += 0.5; // Very detailed

  return {
    score: Math.min(10, Math.max(1, Math.round(score))),
    note: `Presentation uploaded (${project.pptFileName})`,
  };
}

// ────────── Analyze team composition ──────────
function analyzeTeam(members: string[]): { score: number; note: string } {
  const validMembers = members.filter((m) => m.trim().length > 0);
  const count = validMembers.length;

  if (count === 0) return { score: 4, note: "No team members listed" };
  if (count === 1) return { score: 5, note: "Solo developer" };
  if (count === 2) return { score: 6, note: "Small team (2 members)" };
  if (count >= 3 && count <= 4) return { score: 8, note: `Well-sized team (${count} members)` };
  if (count >= 5) return { score: 7, note: `Large team (${count} members)` };

  return { score: 5, note: `${count} member(s)` };
}

// ────────── Main AI Scoring function ──────────
export function scoreProjectWithAI(project: Project): AIScoreResult {
  const descAnalysis = analyzeDescription(project.description, project.domain);
  const githubUrlAnalysis = analyzeGitHubUrl(project.githubUrl);
  const pptAnalysis = analyzePPT(project);
  const teamAnalysis = analyzeTeam(project.members);
  const plagiarismPenalty = project.plagiarismScore > 60 ? -2 : project.plagiarismScore > 30 ? -1 : 0;

  // Real GitHub analysis data (if available from repo fetch)
  const gh = project.githubAnalysis;
  const hasGH = gh?.fetched === true;

  const scores: Record<string, number> = {};
  const explanations: Record<string, string> = {};

  // 💡 Innovation (25%)
  let innovationRaw = Math.round(
    descAnalysis.innovationSignals * 0.5 +
    (descAnalysis.keywords.length >= 3 ? 2 : descAnalysis.keywords.length >= 1 ? 1 : 0) +
    (project.domain !== "Other" ? 1 : 0) +
    Math.random() * 0.8
  );
  // If it's a fork, reduce innovation
  if (hasGH && gh!.isForked) innovationRaw -= 2;
  scores.innovation = clamp(innovationRaw + plagiarismPenalty);
  explanations.innovation = (hasGH && gh!.isForked ? "⚠️ Forked repo — innovation impact reduced. " : "") +
    (descAnalysis.innovationSignals >= 6
      ? `Strong innovation signals. Keywords: ${descAnalysis.keywords.slice(0, 3).join(", ")}`
      : descAnalysis.innovationSignals >= 4
        ? "Moderate innovation. Consider highlighting unique differentiators."
        : "Limited innovation indicators. Project seems conventional.");

  // ⚙️ Technical Feasibility (20%) — uses real GitHub languages + structure
  let techRaw: number;
  if (hasGH) {
    const langCount = Object.keys(gh!.languages).length;
    const langBonus = langCount >= 3 ? 2 : langCount >= 2 ? 1 : 0;
    techRaw = Math.round(
      descAnalysis.technicalDepth * 0.3 +
      gh!.modularityScore * 0.3 +
      langBonus +
      (gh!.hasPackageJson ? 1 : 0) +
      (gh!.hasCIConfig ? 1 : 0) +
      (gh!.hasDockerfile ? 0.5 : 0) +
      Math.random() * 0.5
    );
    explanations.technical_feasibility =
      `GitHub repo uses ${Object.keys(gh!.languages).join(", ")}. ` +
      `Modularity: ${gh!.modularityScore}/10. ` +
      (gh!.hasCIConfig ? "Has CI/CD ✓. " : "") +
      (gh!.hasDockerfile ? "Dockerized ✓. " : "") +
      (descAnalysis.technicalDepth >= 7 ? "Advanced stack detected." : "Standard implementation.");
  } else {
    techRaw = Math.round(
      descAnalysis.technicalDepth * 0.4 +
      githubUrlAnalysis.score * 0.3 +
      (descAnalysis.keywords.length * 0.4) +
      Math.random() * 0.5
    );
    explanations.technical_feasibility = githubUrlAnalysis.notes.join(". ") + ". " +
      (descAnalysis.technicalDepth >= 7 ? "Advanced technical stack detected."
        : descAnalysis.technicalDepth >= 5 ? "Standard technical implementation."
          : "Limited technical depth in description.");
  }
  scores.technical_feasibility = clamp(techRaw + plagiarismPenalty);

  // 🚀 Impact / Potential (20%)
  const impactRaw = Math.round(
    descAnalysis.impactSignals * 0.5 +
    (project.domain === "HealthTech" || project.domain === "SocialImpact" ? 2 : 1) +
    teamAnalysis.score * 0.2 +
    Math.random() * 0.6
  );
  scores.impact = clamp(impactRaw + plagiarismPenalty);
  explanations.impact = descAnalysis.impactSignals >= 6
    ? "Strong real-world impact potential. Clear problem-solution fit."
    : descAnalysis.impactSignals >= 4
      ? "Moderate impact. Domain has potential for scalability."
      : "Impact not clearly articulated. Needs stronger problem statement.";

  // ✅ MVP Completeness (10%)
  let mvpRaw: number;
  if (hasGH) {
    mvpRaw = Math.round(
      (gh!.totalFiles >= 10 ? 3 : gh!.totalFiles >= 5 ? 2 : 1) +
      (project.pptFile ? 2 : 0) +
      (gh!.hasTests ? 1 : 0) +
      descAnalysis.clarity * 0.2 +
      (project.members.filter(Boolean).length > 0 ? 1 : 0) +
      Math.random() * 0.5
    );
    explanations.mvp_completeness = [
      `✓ GitHub repo: ${gh!.totalFiles} files in ${gh!.totalDirs} dirs`,
      project.pptFile ? "✓ Presentation uploaded" : "✗ No presentation",
      gh!.hasTests ? "✓ Tests found" : "✗ No tests",
      `✓ ${project.members.filter(Boolean).length} team member(s)`,
    ].join(" | ");
  } else {
    mvpRaw = Math.round(
      (project.githubUrl ? 2 : 0) +
      (project.pptFile ? 2 : 0) +
      descAnalysis.clarity * 0.3 +
      (project.members.filter(Boolean).length > 0 ? 1 : 0) +
      (descAnalysis.keywords.length >= 2 ? 1 : 0) +
      Math.random() * 0.5
    );
    explanations.mvp_completeness = [
      project.githubUrl ? "✓ GitHub repo linked" : "✗ No GitHub repo",
      project.pptFile ? "✓ Presentation uploaded" : "✗ No presentation",
      `✓ ${project.members.filter(Boolean).length} team member(s)`,
    ].join(" | ");
  }
  scores.mvp_completeness = clamp(mvpRaw + plagiarismPenalty);

  // 🎤 Presentation (10%)
  scores.presentation = clamp(pptAnalysis.score + plagiarismPenalty);
  explanations.presentation = pptAnalysis.note + ". " +
    (descAnalysis.clarity >= 7
      ? "Description is well-written and clear."
      : descAnalysis.clarity >= 5
        ? "Description could be more detailed."
        : "Description is too brief for thorough evaluation.");

  // 📝 Code Quality (5%) — uses real GitHub cleanliness + modularity
  let codeRaw: number;
  if (hasGH) {
    codeRaw = Math.round(
      gh!.cleanlinessScore * 0.4 +
      gh!.modularityScore * 0.3 +
      gh!.commitGenuineness * 0.1 +
      Math.random() * 0.5
    );
    const codeNotes: string[] = [];
    codeNotes.push(`Cleanliness: ${gh!.cleanlinessScore}/10`);
    codeNotes.push(`Modularity: ${gh!.modularityScore}/10`);
    if (gh!.burstCommitScore >= 70) codeNotes.push("⚠️ Suspicious commit pattern");
    if (gh!.hasTests) codeNotes.push("✓ Has tests");
    if (project.plagiarismScore > 30) codeNotes.push(`⚠️ Plagiarism: ${project.plagiarismScore}%`);
    explanations.code_quality = codeNotes.join(". ");
  } else {
    codeRaw = Math.round(
      githubUrlAnalysis.score * 0.6 +
      descAnalysis.technicalDepth * 0.3 +
      Math.random() * 0.5
    );
    explanations.code_quality = githubUrlAnalysis.notes.join(". ") +
      (project.plagiarismScore > 30 ? ` ⚠️ Plagiarism flag: ${project.plagiarismScore}% concern.` : "");
  }
  scores.code_quality = clamp(codeRaw + plagiarismPenalty);

  // 🤝 Team Collaboration (5%) — uses real multi-author commit data
  let teamCollab: number;
  if (hasGH && gh!.commitAuthors.length > 0) {
    const multiAuthor = gh!.commitAuthors.length >= 2;
    const balancedContrib = gh!.singleAuthorPercent < 80;
    teamCollab = clamp(
      teamAnalysis.score +
      (multiAuthor ? 1 : -1) +
      (balancedContrib ? 1 : 0)
    );
    explanations.team_collaboration = teamAnalysis.note +
      (multiAuthor
        ? `. ${gh!.commitAuthors.length} contributors in repo`
        : ". ⚠️ Only 1 author in commit history despite team of " + project.members.filter(Boolean).length) +
      (balancedContrib ? ". Balanced contributions ✓" : "");
  } else {
    teamCollab = clamp(teamAnalysis.score + plagiarismPenalty);
    explanations.team_collaboration = teamAnalysis.note;
  }
  scores.team_collaboration = teamCollab;

  // 🎯 Originality (5%) — uses fork detection + commit genuineness
  let origRaw: number;
  if (hasGH) {
    origRaw = Math.round(
      gh!.commitGenuineness * 0.4 +
      (gh!.isForked ? 1 : 4) +
      (gh!.isMirror ? 0 : 1) +
      descAnalysis.innovationSignals * 0.2 +
      Math.random() * 0.5
    );
    explanations.originality =
      (gh!.isForked ? "⚠️ Forked repository. " : "") +
      (gh!.isMirror ? "⚠️ Mirror repository. " : "") +
      (gh!.commitGenuineness >= 7 ? "Commit history looks genuine. " : "⚠️ Suspicious commit patterns. ") +
      `Plagiarism: ${project.plagiarismScore}%.`;
  } else {
    origRaw = Math.round(
      (10 - project.plagiarismScore / 10) * 0.5 +
      descAnalysis.innovationSignals * 0.3 +
      (descAnalysis.keywords.length >= 3 ? 2 : 1) +
      Math.random() * 0.5
    );
    explanations.originality = project.plagiarismScore > 60
      ? `⚠️ High plagiarism concern (${project.plagiarismScore}%). Originality questionable.`
      : project.plagiarismScore > 30
        ? `⚠ Moderate plagiarism indicators (${project.plagiarismScore}%). Some concerns.`
        : `Low plagiarism risk (${project.plagiarismScore}%). Project appears original.`;
  }
  scores.originality = clamp(origRaw + plagiarismPenalty);

  // Calculate weighted total
  const weightedTotal = CRITERIA.reduce(
    (sum, c) => sum + (scores[c.key] || 0) * c.weight,
    0
  );

  // Overall verdict
  let overallVerdict: string;
  if (weightedTotal >= 8) {
    overallVerdict = "🏆 Outstanding — Strong contender for top placement";
  } else if (weightedTotal >= 6.5) {
    overallVerdict = "🌟 Impressive — Above-average project with solid execution";
  } else if (weightedTotal >= 5) {
    overallVerdict = "👍 Promising — Good foundation with room for improvement";
  } else if (weightedTotal >= 3.5) {
    overallVerdict = "📋 Needs Work — Several areas require attention";
  } else {
    overallVerdict = "⚠️ Incomplete — Major areas need significant improvement";
  }

  return {
    scores,
    weightedTotal: Math.round(weightedTotal * 100) / 100,
    explanations,
    timestamp: new Date().toISOString(),
    overallVerdict,
  };
}

// Utility
function clamp(value: number, min = 1, max = 10): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
