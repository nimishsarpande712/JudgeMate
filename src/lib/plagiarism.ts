import type { PlagiarismDetails } from "@/types";
import type { GitHubAnalysis } from "@/lib/githubAnalyzer";

// AI-generated code patterns in descriptions
const AI_PATTERNS = [
  "comprehensive", "robust", "scalable", "maintainable",
  "best practices", "industry standard", "enterprise-grade",
  "production-ready", "well-documented", "thoroughly tested",
  "handles edge cases", "implements interface", "follows solid principles",
  "design pattern", "clean architecture", "state-of-the-art",
  "cutting-edge", "seamless integration", "holistic approach",
];

// Common boilerplate project names
const BOILERPLATE_PATTERNS = [
  "create-react-app", "npx create-next-app", "vite create",
  "todo app", "todo list", "calculator app", "weather app",
  "chat application", "e-commerce", "blog platform",
  "social media clone", "portfolio website", "landing page template",
  "crud application", "login registration", "authentication boilerplate",
];

const COMMON_REPO_KEYWORDS = [
  "tutorial", "example", "demo", "template", "starter",
  "boilerplate", "scaffold", "seed project", "clone", "copy",
  "fork", "sample",
];

function countMatches(text: string, patterns: string[]): number {
  const lower = text.toLowerCase();
  return patterns.filter((p) => lower.includes(p)).length;
}

/**
 * Analyze plagiarism using REAL GitHub data.
 * If GitHub analysis is available, uses actual commit patterns,
 * file structure, fork status to detect AI-generated / copied code.
 */
export function analyzePlagiarism(
  githubUrl: string,
  description: string,
  projectName: string,
  githubAnalysis?: GitHubAnalysis
): PlagiarismDetails {
  const flags: string[] = [];
  const positives: string[] = [];

  // ── Description analysis (AI-generated language detection) ──
  const descWords = description.split(/\s+/).length;
  const aiMatches = countMatches(description, AI_PATTERNS);
  const aiPatternScore = Math.min(Math.round((aiMatches / 5) * 100), 100);

  if (aiMatches >= 4) flags.push(`Description uses ${aiMatches} AI-generated phrases — likely GPT-written`);
  else if (aiMatches >= 2) flags.push(`Description has ${aiMatches} AI-pattern words`);
  else if (aiMatches === 0 && descWords > 20) positives.push("Description appears human-written");

  // ── Keyword density (repetitive words) ──
  const wordMap = new Map<string, number>();
  description.toLowerCase().split(/\s+/).forEach((w) => {
    if (w.length > 3) wordMap.set(w, (wordMap.get(w) || 0) + 1);
  });
  const repeated = Array.from(wordMap.values()).filter((c) => c > 2).length;
  const keywordDensity = Math.min(Math.round((repeated / Math.max(descWords, 1)) * 200), 100);

  // ── Boilerplate detection ──
  const boilerplateMatches = countMatches(description, BOILERPLATE_PATTERNS) +
    countMatches(projectName, BOILERPLATE_PATTERNS);
  const nameMatches = countMatches(projectName, COMMON_REPO_KEYWORDS);
  const boilerplateScore = Math.min((boilerplateMatches + nameMatches) * 20, 100);
  if (boilerplateScore > 30) flags.push("Project matches common boilerplate/tutorial patterns");

  // ── GitHub-based analysis (THE REAL DEAL) ──
  let commitHistoryScore = 50; // default: no data = suspicious
  let codeModularityScore = 50;

  if (githubAnalysis?.fetched) {
    // Use real GitHub data
    const gh = githubAnalysis;

    // Fork / mirror = instant red flag
    if (gh.isForked) {
      flags.push("⚠️ Repository is a FORK — code is copied from another repo");
      commitHistoryScore = 85;
    }
    if (gh.isMirror) {
      flags.push("⚠️ Repository is a MIRROR — not original");
      commitHistoryScore = 90;
    }

    // Commit genuineness (burst = AI-generated dump)
    // burstCommitScore ranges 0-100 where HIGH = suspicious
    if (!gh.isForked && !gh.isMirror) {
      commitHistoryScore = gh.burstCommitScore;
    }
    gh.flags.forEach((f) => { if (!flags.includes(f)) flags.push(f); });
    gh.positives.forEach((p) => { if (!positives.includes(p)) positives.push(p); });

    // Single author when team has 3+ members
    if (gh.singleAuthorPercent === 100 && gh.totalCommits > 2) {
      flags.push("Only 1 commit author despite claimed team — others may not have contributed code");
      commitHistoryScore = Math.max(commitHistoryScore, 55);
    }

    // Very few commits = always suspicious regardless of spread
    if (gh.totalCommits <= 5) {
      commitHistoryScore = Math.max(commitHistoryScore, 60);
      if (!flags.some(f => f.includes("minimal"))) flags.push(`Only ${gh.totalCommits} commits — suspiciously low development activity`);
    }

    // Code modularity from real file tree
    // Invert: high modularity (8+) = low plagiarism risk (20%), low modularity (2) = high risk (80%)
    codeModularityScore = Math.round((10 - gh.modularityScore) * 10);
    if (gh.modularityScore >= 7) positives.push(`Good code structure (${gh.totalFiles} files, ${gh.totalDirs} dirs)`);
    if (gh.modularityScore <= 3) flags.push("Poor code organization — minimal file structure");

    // Missing tests in a substantial project = suspicious
    if (gh.hasTests) positives.push("Project includes test files");
    if (!gh.hasTests && gh.totalFiles > 10) {
      flags.push("No tests found despite substantial codebase");
      codeModularityScore = Math.max(codeModularityScore, 40);
    }

    // README check
    if (!gh.hasReadme) {
      flags.push("No README.md — lacks documentation");
      codeModularityScore = Math.max(codeModularityScore, 35);
    }

    // No CI/CD in a multi-file project
    if (!gh.hasCIConfig && gh.totalFiles > 15) {
      codeModularityScore = Math.max(codeModularityScore, 30);
    }

    // Generic commit messages
    if (gh.burstCommitScore >= 50 && gh.totalCommits > 3) {
      commitHistoryScore = Math.max(commitHistoryScore, 50);
    }

  } else if (!githubUrl || !githubUrl.trim()) {
    commitHistoryScore = 55;
    codeModularityScore = 60;
    flags.push("No GitHub URL provided — cannot verify code authenticity");
  } else {
    // URL provided but fetch failed
    commitHistoryScore = 50;
    codeModularityScore = 55;
    flags.push("GitHub repo could not be accessed — may be private or invalid");
    if (githubAnalysis?.error) flags.push(`Details: ${githubAnalysis.error}`);
  }

  // ── Weighted overall score ──
  // Minimum floor of 5 — there's always some uncertainty
  const rawScore = Math.round(
    commitHistoryScore * 0.40 +   // Commit patterns = biggest signal
    aiPatternScore * 0.20 +        // AI-generated description
    codeModularityScore * 0.15 +   // Code structure
    boilerplateScore * 0.15 +      // Boilerplate matching
    keywordDensity * 0.10          // Keyword repetition
  );
  const overallScore = Math.max(5, Math.min(rawScore, 100));

  return {
    overallScore,
    keywordDensity,
    aiPatternScore,
    boilerplateScore,
    commitHistoryScore,
    codeModularityScore,
    flags,
    positives,
  };
}

export function getPlagiarismLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (score >= 70) {
    return {
      label: "High Risk",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    };
  }
  if (score >= 40) {
    return {
      label: "Medium Risk",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
    };
  }
  return {
    label: "Low Risk",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  };
}
