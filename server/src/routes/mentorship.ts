import { Router, Request, Response } from "express";
import { callXAI } from "../services/xai.js";

export const mentorshipRouter = Router();

interface MentorshipRequest {
  project_name: string;
  team_name: string;
  domain: string;
  description: string;
  github_analysis?: Record<string, unknown>;
  ai_scores?: {
    scores: Record<string, number>;
    weightedTotal: number;
    explanations: Record<string, string>;
    overallVerdict: string;
  };
  plagiarism_score?: number;
  plagiarism_details?: Record<string, unknown>;
  members?: string[];
  has_ppt?: boolean;
  ppt_file_name?: string;
}

mentorshipRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = req.body as MentorshipRequest;
    const XAI_API_KEY = process.env.XAI_API_KEY;

    if (!XAI_API_KEY) {
      return res.status(200).json({
        fallback: true,
        message: "AI API key not configured. Using client-side mentorship.",
      });
    }

    // Build project context
    let context = `PROJECT: "${data.project_name}" by team "${data.team_name}"
DOMAIN: ${data.domain}
DESCRIPTION: ${data.description}
`;

    const gh = data.github_analysis as Record<string, unknown> | undefined;
    if (gh?.fetched) {
      context += `
GITHUB ANALYSIS (VERIFIED):
- Repository: ${gh.repoName} (${gh.isForked ? "FORKED" : "original"})
- Total commits: ${gh.totalCommits}
- Commit authors: ${(gh.commitAuthors as string[])?.join(", ")}
- Languages: ${Object.entries(gh.languages as Record<string, number>).map(([l, p]) => `${l} (${p}%)`).join(", ")}
- Total files: ${gh.totalFiles}, Directories: ${gh.totalDirs}
- Has tests: ${gh.hasTests ? "Yes" : "No"}
- Code cleanliness: ${gh.cleanlinessScore}/10
- Code modularity: ${gh.modularityScore}/10
`;
    }

    if (data.ai_scores) {
      context += `
AI SCORES:
${Object.entries(data.ai_scores.scores).map(([k, v]) => `- ${k}: ${v}/10 — ${data.ai_scores?.explanations[k] || ""}`).join("\n")}
- WEIGHTED TOTAL: ${data.ai_scores.weightedTotal}/10
- VERDICT: ${data.ai_scores.overallVerdict}
`;
    }

    if (data.plagiarism_score !== undefined) {
      context += `\nPLAGIARISM: ${data.plagiarism_score}%\n`;
    }

    if (data.members?.length) {
      context += `\nTEAM MEMBERS: ${data.members.filter(Boolean).join(", ")}\n`;
    }

    const aiData = await callXAI(XAI_API_KEY, [
      {
        role: "system",
        content: `You are an expert hackathon mentor. Analyze the VERIFIED, REAL data about a project and provide specific, data-driven mentorship. Every recommendation MUST cite actual numbers from the data. Reference the project name and domain throughout.`,
      },
      {
        role: "user",
        content: `Analyze this project and provide mentorship:\n\n${context}`,
      },
    ], [
      {
        type: "function" as const,
        function: {
          name: "submit_mentorship",
          description: "Submit structured mentorship recommendations",
          parameters: {
            type: "object",
            properties: {
              improvements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    area: { type: "string" },
                    currentState: { type: "string" },
                    recommendation: { type: "string" },
                    priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    effort: { type: "string", enum: ["quick-fix", "moderate", "significant"] },
                  },
                  required: ["area", "currentState", "recommendation", "priority", "effort"],
                },
              },
              actionPlan: { type: "array", items: { type: "string" } },
              techSuggestions: { type: "array", items: { type: "string" } },
              overallAdvice: { type: "string" },
            },
            required: ["improvements", "actionPlan", "techSuggestions", "overallAdvice"],
            additionalProperties: false,
          },
        },
      },
    ], "submit_mentorship");

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    res.json(parsed);
  } catch (e) {
    console.error("mentorship error:", e);
    res.status(500).json({
      error: e instanceof Error ? e.message : "Unknown error",
      fallback: true,
    });
  }
});
