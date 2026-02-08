/**
 * xAI (Grok) Scoring — routes through backend proxy when available,
 * falls back to direct client-side API call.
 */

import { scoreViaBackend } from "@/lib/apiClient";

const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;

const CRITERIA_WEIGHTS: Record<string, number> = {
  innovation: 0.30,
  technical_feasibility: 0.20,
  impact: 0.20,
  mvp_completeness: 0.10,
  presentation: 0.05,
  tech_stack: 0.05,
  team_collaboration: 0.05,
  originality: 0.05,
};

interface GitHubStats {
  stars: number;
  forks: number;
  open_issues: number;
  language: string | null;
  languages: string[];
  commits: number;
  contributors: number;
  description: string | null;
}

async function fetchGitHubStats(url: string): Promise<GitHubStats | null> {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, "");

    const [repoRes, contribRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
        headers: { "User-Agent": "JudgeMate-AI" },
      }),
      fetch(`https://api.github.com/repos/${owner}/${repoName}/contributors?per_page=100`, {
        headers: { "User-Agent": "JudgeMate-AI" },
      }),
      fetch(`https://api.github.com/repos/${owner}/${repoName}/commits?per_page=1`, {
        headers: { "User-Agent": "JudgeMate-AI" },
      }),
    ]);

    if (!repoRes.ok) return null;
    const repoData = await repoRes.json();

    let contributors = 0;
    if (contribRes.ok) {
      const contribData = await contribRes.json();
      contributors = Array.isArray(contribData) ? contribData.length : 0;
    }

    let commits = 0;
    if (commitsRes.ok) {
      const linkHeader = commitsRes.headers.get("link");
      if (linkHeader) {
        const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
        commits = lastMatch ? parseInt(lastMatch[1]) : 1;
      } else {
        commits = 1;
      }
    }

    const langRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/languages`, {
      headers: { "User-Agent": "JudgeMate-AI" },
    });
    const languages = langRes.ok ? Object.keys(await langRes.json()) : [];

    return {
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      open_issues: repoData.open_issues_count || 0,
      language: repoData.language,
      languages,
      commits,
      contributors,
      description: repoData.description,
    };
  } catch (e) {
    console.error("GitHub fetch error:", e);
    return null;
  }
}

function fallbackScoring(
  github: GitHubStats | null,
  description: string
): { scores: Record<string, number>; explanations: Record<string, string> } {
  const scores: Record<string, number> = {};
  const explanations: Record<string, string> = {};
  const descLen = (description || "").length;
  const keywords = ["innovative", "novel", "machine learning", "ai", "blockchain", "iot", "real-time", "scalable"];
  const keywordHits = keywords.filter((k) => description?.toLowerCase().includes(k)).length;

  scores.innovation = Math.min(10, 4 + keywordHits);
  explanations.innovation = `${keywordHits} innovation keywords found in description`;

  if (github) {
    scores.technical_feasibility = Math.min(10, 3 + Math.floor(github.stars / 10) + (github.languages.length > 2 ? 2 : 1));
    explanations.technical_feasibility = `${github.stars} stars, ${github.languages.length} languages`;

    scores.team_collaboration = Math.min(10, 3 + Math.min(github.contributors * 2, 5) + (github.commits > 20 ? 2 : 0));
    explanations.team_collaboration = `${github.contributors} contributors, ~${github.commits} commits`;

    scores.tech_stack = Math.min(10, 4 + github.languages.length);
    explanations.tech_stack = `Uses: ${github.languages.slice(0, 5).join(", ")}`;
  } else {
    scores.technical_feasibility = 5;
    scores.team_collaboration = 5;
    scores.tech_stack = 5;
    explanations.technical_feasibility = "No GitHub data available";
    explanations.team_collaboration = "No GitHub data available";
    explanations.tech_stack = "No GitHub data available";
  }

  scores.impact = Math.min(10, 4 + Math.floor(descLen / 100));
  explanations.impact = `Description length: ${descLen} chars`;

  scores.mvp_completeness = github ? Math.min(10, 4 + (github.commits > 10 ? 3 : 1)) : 5;
  explanations.mvp_completeness = github ? `${github.commits} commits suggest active development` : "No repo data";

  scores.presentation = Math.min(10, 3 + Math.floor(descLen / 80));
  explanations.presentation = `Description clarity score based on ${descLen} chars`;

  scores.originality = Math.min(10, 5 + keywordHits);
  explanations.originality = `Uniqueness estimated from keyword analysis`;

  return { scores, explanations };
}

export interface GroqScoringResult {
  scores: Record<string, number>;
  explanations: Record<string, string>;
  weighted_total: number;
  github_stats: GitHubStats | null;
}

export async function scoreWithGroq(params: {
  github_url?: string;
  description?: string;
  project_name?: string;
  domain?: string;
}): Promise<GroqScoringResult> {
  const { github_url, description, project_name, domain } = params;
  console.log("Grok scoring request:", { github_url, project_name, domain });

  // Try backend proxy first (keeps API key secure)
  const backendResult = await scoreViaBackend(params);
  if (backendResult) {
    console.log("Scored via backend proxy");
    return {
      scores: backendResult.scores,
      explanations: backendResult.explanations,
      weighted_total: backendResult.weighted_total,
      github_stats: (backendResult.github_stats as unknown) as GitHubStats | null,
    };
  }

  // Fallback: direct client-side scoring
  const github = github_url ? await fetchGitHubStats(github_url) : null;
  console.log("GitHub stats:", github);

  let scores: Record<string, number>;
  let explanations: Record<string, string>;

  if (XAI_API_KEY) {
    try {
      const prompt = `You are an expert hackathon judge. Score this project 1-10 on each criterion based on the data provided.

Project: ${project_name || "Unknown"}
Domain: ${domain || "General"}
Description: ${description || "No description provided"}
${
  github
    ? `
GitHub Stats:
- Stars: ${github.stars}, Forks: ${github.forks}
- Contributors: ${github.contributors}, Commits: ~${github.commits}
- Languages: ${github.languages.join(", ")}
- Open Issues: ${github.open_issues}
- Repo Description: ${github.description || "None"}
`
    : "No GitHub data available."
}

Score each criterion 1-10 with a brief explanation.`;

      const aiResponse = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-4-latest",
          messages: [
            { role: "system", content: "You are a hackathon judging AI. Return scores and explanations." },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_scores",
                description: "Submit hackathon scores for a project",
                parameters: {
                  type: "object",
                  properties: {
                    innovation: { type: "number", description: "Innovation score 1-10" },
                    innovation_explanation: { type: "string" },
                    technical_feasibility: { type: "number", description: "Technical feasibility score 1-10" },
                    technical_feasibility_explanation: { type: "string" },
                    impact: { type: "number", description: "Impact/Potential score 1-10" },
                    impact_explanation: { type: "string" },
                    mvp_completeness: { type: "number", description: "MVP completeness score 1-10" },
                    mvp_completeness_explanation: { type: "string" },
                    presentation: { type: "number", description: "Presentation quality score 1-10" },
                    presentation_explanation: { type: "string" },
                    tech_stack: { type: "number", description: "Tech stack relevance score 1-10" },
                    tech_stack_explanation: { type: "string" },
                    team_collaboration: { type: "number", description: "Team collaboration score 1-10" },
                    team_collaboration_explanation: { type: "string" },
                    originality: { type: "number", description: "Originality score 1-10" },
                    originality_explanation: { type: "string" },
                  },
                  required: [
                    "innovation", "technical_feasibility", "impact", "mvp_completeness",
                    "presentation", "tech_stack", "team_collaboration", "originality",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_scores" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("Grok API error:", aiResponse.status, errText);
        throw new Error(`Grok API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in Grok response");

      const parsed = JSON.parse(toolCall.function.arguments);
      scores = {};
      explanations = {};
      for (const key of Object.keys(CRITERIA_WEIGHTS)) {
        scores[key] = Math.max(1, Math.min(10, Math.round(parsed[key] || 5)));
        explanations[key] = parsed[`${key}_explanation`] || "";
      }
      console.log("Grok AI scores:", scores);
    } catch (aiErr) {
      console.error("Grok fallback triggered:", aiErr);
      const fb = fallbackScoring(github, description || "");
      scores = fb.scores;
      explanations = fb.explanations;
      explanations._fallback = "Grok AI unavailable, used rule-based scoring";
    }
  } else {
    console.warn("No VITE_XAI_API_KEY found, using fallback scoring");
    const fb = fallbackScoring(github, description || "");
    scores = fb.scores;
    explanations = fb.explanations;
    explanations._note = "Rule-based scoring (no Grok API key configured)";
  }

  const weighted_total = Object.entries(CRITERIA_WEIGHTS).reduce(
    (sum, [key, weight]) => sum + (scores[key] || 0) * weight,
    0
  );

  return { scores, explanations, weighted_total, github_stats: github };
}
