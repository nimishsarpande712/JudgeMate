/**
 * GitHub Repository Analyzer
 * Fetches real data from GitHub's public API and analyzes:
 * - Code modularity (file/folder structure)
 * - Code cleanliness (languages, README, license)
 * - Commit history genuineness (burst detection, single-push AI dumps)
 * - Repo health indicators
 */

export interface GitHubAnalysis {
  // Fetch status
  fetched: boolean;
  error?: string;

  // Repo metadata
  repoName: string;
  repoFullName: string;
  repoDescription: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  defaultBranch: string;
  size: number; // KB
  isForked: boolean;
  isMirror: boolean;
  hasReadme: boolean;
  hasLicense: boolean;
  visibility: string;

  // Languages
  languages: Record<string, number>; // language → bytes
  primaryLanguage: string;

  // Commit analysis
  totalCommits: number;
  commitAuthors: string[];
  commitTimeline: { date: string; count: number }[];
  firstCommitDate: string | null;
  lastCommitDate: string | null;
  avgTimeBetweenCommits: number; // hours
  burstCommitScore: number; // 0-100, high = all pushed at once
  singleAuthorPercent: number; // % of commits by one person

  // File structure
  totalFiles: number;
  totalDirs: number;
  fileExtensions: Record<string, number>; // ext → count
  hasPackageJson: boolean;
  hasRequirements: boolean;
  hasDockerfile: boolean;
  hasCIConfig: boolean;
  hasTests: boolean;
  hasEnvExample: boolean;
  structureDepth: number;
  topLevelItems: string[];

  // Scoring summaries
  modularityScore: number;   // 1-10
  cleanlinessScore: number;  // 1-10
  commitGenuineness: number; // 1-10 (low = suspicious bulk push)
  overallRepoScore: number;  // 1-10

  // Detailed flags
  flags: string[];
  positives: string[];
}

// ──────── Parse owner/repo from URL ────────
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const match = url.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

// ──────── Fetch with timeout ────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJSON(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github.v3+json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ──────── Analyze commit patterns ────────
interface GitHubCommitRaw {
  commit?: { author?: { name?: string; date?: string }; committer?: { date?: string }; message?: string };
  author?: { login?: string };
}
function analyzeCommits(commits: GitHubCommitRaw[]): {
  totalCommits: number;
  commitAuthors: string[];
  commitTimeline: { date: string; count: number }[];
  firstCommitDate: string | null;
  lastCommitDate: string | null;
  avgTimeBetweenCommits: number;
  burstCommitScore: number;
  singleAuthorPercent: number;
  flags: string[];
  positives: string[];
} {
  const flags: string[] = [];
  const positives: string[] = [];

  if (!commits.length) {
    return {
      totalCommits: 0, commitAuthors: [],
      commitTimeline: [], firstCommitDate: null, lastCommitDate: null,
      avgTimeBetweenCommits: 0, burstCommitScore: 100,
      singleAuthorPercent: 100, flags: ["No commits found"], positives: [],
    };
  }

  // Extract authors
  const authorMap = new Map<string, number>();
  commits.forEach((c) => {
    const author = c.commit?.author?.name || c.author?.login || "unknown";
    authorMap.set(author, (authorMap.get(author) || 0) + 1);
  });
  const commitAuthors = [...authorMap.keys()];
  const topAuthorCount = Math.max(...authorMap.values());
  const singleAuthorPercent = Math.round((topAuthorCount / commits.length) * 100);

  // Dates
  const dates = commits
    .map((c) => new Date(c.commit?.author?.date || c.commit?.committer?.date))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const firstCommitDate = dates.length ? dates[0].toISOString() : null;
  const lastCommitDate = dates.length ? dates[dates.length - 1].toISOString() : null;

  // Timeline by day
  const dayMap = new Map<string, number>();
  dates.forEach((d) => {
    const day = d.toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  });
  const commitTimeline = [...dayMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Average time between commits (hours)
  let totalGapHours = 0;
  for (let i = 1; i < dates.length; i++) {
    totalGapHours += (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60);
  }
  const avgTimeBetweenCommits = dates.length > 1
    ? Math.round((totalGapHours / (dates.length - 1)) * 10) / 10
    : 0;

  // Burst detection: if all/most commits happened in one day or within a few hours
  const totalDays = dayMap.size;
  const totalSpanHours = dates.length >= 2
    ? (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60)
    : 0;

  let burstCommitScore = 0;

  if (commits.length <= 2) {
    burstCommitScore = 70; // Very few commits = suspicious
    flags.push(`Only ${commits.length} commit(s) — very minimal development history`);
  } else if (totalDays === 1) {
    burstCommitScore = 90; // All commits in one day
    flags.push("⚠️ All commits pushed in a SINGLE DAY — likely AI-generated code dump");
  } else if (totalSpanHours < 4) {
    burstCommitScore = 85; // All commits within 4 hours
    flags.push("⚠️ All commits within a few hours — suspicious bulk push pattern");
  } else if (totalDays <= 2 && commits.length > 5) {
    burstCommitScore = 65;
    flags.push("Most commits concentrated in 1-2 days — limited iterative development");
  } else if (avgTimeBetweenCommits < 0.5 && commits.length > 3) {
    burstCommitScore = 60;
    flags.push("Rapid-fire commits (avg < 30 min apart) — possible automated generation");
  } else if (totalDays >= 3 && avgTimeBetweenCommits >= 2) {
    burstCommitScore = 15;
    positives.push(`Healthy commit pattern: ${totalDays} active days, avg ${avgTimeBetweenCommits}h between commits`);
  } else {
    burstCommitScore = 30;
  }

  // Check commit messages for AI patterns
  const messages = commits.map((c) => c.commit?.message?.toLowerCase() || "");
  const aiCommitPatterns = ["initial commit", "add files", "update", "first commit", "auto", "generated"];
  const aiMsgCount = messages.filter((m) =>
    aiCommitPatterns.some((p) => m === p || m.startsWith(p))
  ).length;
  if (aiMsgCount > commits.length * 0.6) {
    burstCommitScore = Math.min(burstCommitScore + 20, 100);
    flags.push("Most commit messages are generic ('initial commit', 'update') — lacks meaningful descriptions");
  }

  if (commitAuthors.length >= 2) {
    positives.push(`${commitAuthors.length} contributors found: ${commitAuthors.join(", ")}`);
  }
  if (singleAuthorPercent === 100 && commits.length > 3) {
    flags.push("Single author for all commits — no evidence of team collaboration in code");
  }

  return {
    totalCommits: commits.length,
    commitAuthors,
    commitTimeline,
    firstCommitDate,
    lastCommitDate,
    avgTimeBetweenCommits,
    burstCommitScore,
    singleAuthorPercent,
    flags,
    positives,
  };
}

// ──────── Analyze file tree ────────
interface TreeItemRaw {
  path: string;
  type: string;
}
function analyzeTree(tree: TreeItemRaw[]): {
  totalFiles: number;
  totalDirs: number;
  fileExtensions: Record<string, number>;
  hasPackageJson: boolean;
  hasRequirements: boolean;
  hasDockerfile: boolean;
  hasCIConfig: boolean;
  hasTests: boolean;
  hasEnvExample: boolean;
  structureDepth: number;
  topLevelItems: string[];
  modularityScore: number;
  flags: string[];
  positives: string[];
} {
  const flags: string[] = [];
  const positives: string[] = [];

  const files = tree.filter((t) => t.type === "blob");
  const dirs = tree.filter((t) => t.type === "tree");
  const totalFiles = files.length;
  const totalDirs = dirs.length;

  // File extensions
  const extMap: Record<string, number> = {};
  files.forEach((f) => {
    const parts = f.path.split(".");
    const ext = parts.length > 1 ? "." + parts.pop()!.toLowerCase() : "(none)";
    extMap[ext] = (extMap[ext] || 0) + 1;
  });

  // Key files check
  const allPaths = tree.map((t) => t.path.toLowerCase());
  const hasPackageJson = allPaths.some((p) => p === "package.json" || p.endsWith("/package.json"));
  const hasRequirements = allPaths.some((p) => p.includes("requirements.txt") || p.includes("pyproject.toml") || p.includes("pipfile"));
  const hasDockerfile = allPaths.some((p) => p.includes("dockerfile") || p.includes("docker-compose"));
  const hasCIConfig = allPaths.some((p) => p.includes(".github/workflows") || p.includes(".gitlab-ci") || p.includes("jenkinsfile") || p.includes(".circleci"));
  const hasTests = allPaths.some((p) => p.includes("test") || p.includes("spec") || p.includes("__tests__"));
  const hasEnvExample = allPaths.some((p) => p.includes(".env.example") || p.includes(".env.sample"));

  // Structure depth
  const depths = tree.map((t) => t.path.split("/").length);
  const structureDepth = Math.max(...depths, 1);

  // Top-level items
  const topLevelItems = tree
    .filter((t) => !t.path.includes("/"))
    .map((t) => t.path)
    .slice(0, 20);

  // Modularity scoring
  let modularityScore = 3;

  // Directory structure
  if (totalDirs >= 3) { modularityScore += 1; positives.push(`${totalDirs} directories — organized structure`); }
  if (totalDirs >= 6) { modularityScore += 1; positives.push("Deep directory hierarchy — good separation of concerns"); }
  if (structureDepth >= 3) modularityScore += 0.5;
  if (structureDepth >= 5) modularityScore += 0.5;

  // File count (reasonable project)
  if (totalFiles >= 10) modularityScore += 0.5;
  if (totalFiles >= 25) modularityScore += 0.5;
  if (totalFiles >= 50) { modularityScore += 1; positives.push(`${totalFiles} files — substantial codebase`); }

  // Key files bonus
  if (hasDockerfile) { modularityScore += 0.5; positives.push("Docker configuration found"); }
  if (hasCIConfig) { modularityScore += 1; positives.push("CI/CD pipeline configured"); }
  if (hasTests) { modularityScore += 1; positives.push("Test files found"); }
  if (hasEnvExample) { modularityScore += 0.5; positives.push(".env.example present — good security practice"); }

  // Red flags
  if (totalFiles <= 3) { modularityScore -= 2; flags.push("Very few files — possibly incomplete or single-file dump"); }
  if (totalDirs === 0) { modularityScore -= 1; flags.push("No subdirectories — all code in root folder"); }

  // Check for typical AI-gen pattern: very flat structure with few well-named files
  if (totalFiles > 10 && totalDirs <= 1) {
    flags.push("Many files but flat structure — lacks proper code organization");
    modularityScore -= 1;
  }

  return {
    totalFiles, totalDirs, fileExtensions: extMap,
    hasPackageJson, hasRequirements, hasDockerfile,
    hasCIConfig, hasTests, hasEnvExample,
    structureDepth, topLevelItems,
    modularityScore: Math.min(10, Math.max(1, Math.round(modularityScore))),
    flags, positives,
  };
}

// ──────── MAIN: Analyze GitHub Repository ────────
export async function analyzeGitHubRepo(githubUrl: string): Promise<GitHubAnalysis> {
  const parsed = parseGitHubUrl(githubUrl);

  if (!parsed) {
    return createEmptyAnalysis("Invalid or missing GitHub URL");
  }

  const { owner, repo } = parsed;
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    // Fetch repo info first to get the default branch
    const repoInfo = await fetchJSON(baseUrl);
    const defaultBranch = repoInfo?.default_branch || "main";

    // Fetch commits, languages, and tree in parallel using the actual default branch
    const [commitsRaw, languages, treeData] = await Promise.all([
      fetchJSON(`${baseUrl}/commits?per_page=100`).catch(() => []),
      fetchJSON(`${baseUrl}/languages`).catch(() => ({})),
      fetchJSON(`${baseUrl}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`).catch(() => ({ tree: [] })),
    ]);

    // Analyze commits
    const commitAnalysis = analyzeCommits(commitsRaw);

    // Analyze tree
    const treeItems = treeData?.tree || [];
    const treeAnalysis = analyzeTree(treeItems);

    // Determine primary language
    const langEntries = Object.entries(languages as Record<string, number>);
    langEntries.sort((a, b) => b[1] - a[1]);
    const primaryLanguage = langEntries.length > 0 ? langEntries[0][0] : "Unknown";

    // README & license
    const hasReadme = treeItems.some((t: TreeItemRaw) => t.path?.toLowerCase().startsWith("readme"));
    const hasLicense = treeItems.some((t: TreeItemRaw) => t.path?.toLowerCase().startsWith("license"));

    // Aggregate flags & positives
    const allFlags: string[] = [...commitAnalysis.flags, ...treeAnalysis.flags];
    const allPositives: string[] = [...commitAnalysis.positives, ...treeAnalysis.positives];

    if (repoInfo.fork) {
      allFlags.push("⚠️ Repository is a FORK — not original code");
    }
    if (repoInfo.mirror_url) {
      allFlags.push("⚠️ Repository is a MIRROR — copied from elsewhere");
    }
    if (hasReadme) allPositives.push("README.md present");
    else allFlags.push("No README.md — poor documentation");
    if (hasLicense) allPositives.push("License file present");

    if (langEntries.length >= 3) {
      allPositives.push(`Multi-language project: ${langEntries.map(([l]) => l).slice(0, 4).join(", ")}`);
    }

    // Cleanliness score
    let cleanlinessScore = 4;
    if (hasReadme) cleanlinessScore += 1.5;
    if (hasLicense) cleanlinessScore += 0.5;
    if (langEntries.length >= 2) cleanlinessScore += 0.5;
    if (treeAnalysis.hasEnvExample) cleanlinessScore += 0.5;
    if (treeAnalysis.hasTests) cleanlinessScore += 1;
    if (repoInfo.description) cleanlinessScore += 0.5;
    if (treeAnalysis.totalFiles <= 3) cleanlinessScore -= 2;
    cleanlinessScore = Math.min(10, Math.max(1, Math.round(cleanlinessScore)));

    // Commit genuineness (inverse of burst score)
    const commitGenuineness = Math.min(10, Math.max(1, Math.round(10 - commitAnalysis.burstCommitScore / 10)));

    // Overall repo score
    const overallRepoScore = Math.min(10, Math.max(1, Math.round(
      treeAnalysis.modularityScore * 0.3 +
      cleanlinessScore * 0.25 +
      commitGenuineness * 0.35 +
      (repoInfo.fork ? -2 : 0) +
      (repoInfo.mirror_url ? -2 : 0) +
      (treeAnalysis.hasTests ? 0.5 : 0) +
      (treeAnalysis.hasCIConfig ? 0.5 : 0)
    )));

    return {
      fetched: true,
      repoName: repoInfo.name,
      repoFullName: repoInfo.full_name,
      repoDescription: repoInfo.description,
      stars: repoInfo.stargazers_count || 0,
      forks: repoInfo.forks_count || 0,
      openIssues: repoInfo.open_issues_count || 0,
      createdAt: repoInfo.created_at,
      updatedAt: repoInfo.updated_at,
      pushedAt: repoInfo.pushed_at,
      defaultBranch: repoInfo.default_branch || "main",
      size: repoInfo.size || 0,
      isForked: !!repoInfo.fork,
      isMirror: !!repoInfo.mirror_url,
      hasReadme,
      hasLicense,
      visibility: repoInfo.visibility || "public",
      languages: languages as Record<string, number>,
      primaryLanguage,
      ...commitAnalysis,
      ...treeAnalysis,
      cleanlinessScore,
      commitGenuineness,
      overallRepoScore,
      flags: allFlags,
      positives: allPositives,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return createEmptyAnalysis(
      msg.includes("404")
        ? "Repository not found (404) — private or doesn't exist"
        : msg.includes("403")
          ? "GitHub API rate limit reached — try again later"
          : `Failed to fetch: ${msg}`
    );
  }
}

// ──────── Empty/error result ────────
function createEmptyAnalysis(error: string): GitHubAnalysis {
  return {
    fetched: false,
    error,
    repoName: "",
    repoFullName: "",
    repoDescription: null,
    stars: 0, forks: 0, openIssues: 0,
    createdAt: "", updatedAt: "", pushedAt: "",
    defaultBranch: "", size: 0,
    isForked: false, isMirror: false,
    hasReadme: false, hasLicense: false,
    visibility: "unknown",
    languages: {}, primaryLanguage: "Unknown",
    totalCommits: 0, commitAuthors: [],
    commitTimeline: [],
    firstCommitDate: null, lastCommitDate: null,
    avgTimeBetweenCommits: 0,
    burstCommitScore: 50, singleAuthorPercent: 100,
    totalFiles: 0, totalDirs: 0,
    fileExtensions: {},
    hasPackageJson: false, hasRequirements: false,
    hasDockerfile: false, hasCIConfig: false,
    hasTests: false, hasEnvExample: false,
    structureDepth: 0, topLevelItems: [],
    modularityScore: 3, cleanlinessScore: 3,
    commitGenuineness: 3, overallRepoScore: 3,
    flags: [error],
    positives: [],
  };
}
