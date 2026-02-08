/**
 * API client for JudgeMate-AI backend
 * Routes AI calls through the backend proxy instead of exposing API keys in the frontend
 */

const getApiBaseUrl = (): string => {
  // In production, use the VITE_API_URL environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development, default to localhost
  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }
  // Fallback in production without VITE_API_URL — backend proxy unavailable
  console.warn("VITE_API_URL not set — backend AI proxy will be unavailable");
  return "";
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Check if backend API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { 
      signal: AbortSignal.timeout(5000) 
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Score a project through the backend AI proxy
 */
export async function scoreViaBackend(params: {
  github_url?: string;
  description?: string;
  project_name?: string;
  domain?: string;
}): Promise<{
  scores: Record<string, number>;
  explanations: Record<string, string>;
  weighted_total: number;
  github_stats: Record<string, unknown> | null;
} | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend scoring unavailable, using client-side fallback:", err);
    return null;
  }
}

/**
 * Get AI mentorship through the backend proxy
 */
export async function getMentorshipViaBackend(params: {
  project_name: string;
  team_name: string;
  domain: string;
  description: string;
  github_analysis?: Record<string, unknown>;
  ai_scores?: Record<string, unknown>;
  plagiarism_score?: number;
  plagiarism_details?: Record<string, unknown>;
  members?: string[];
  has_ppt?: boolean;
  ppt_file_name?: string;
}): Promise<{
  improvements: Array<{
    area: string;
    currentState: string;
    recommendation: string;
    priority: string;
    effort: string;
  }>;
  actionPlan: string[];
  techSuggestions: string[];
  overallAdvice: string;
  fallback?: boolean;
} | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/mentorship`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    if (data.fallback) return null; // Backend says use client-side
    return data;
  } catch (err) {
    console.warn("Backend mentorship unavailable, using client-side fallback:", err);
    return null;
  }
}
