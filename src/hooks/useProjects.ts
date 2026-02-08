import { useState, useEffect, useCallback, useRef } from "react";
import type { Project, Domain, AIScoreResult } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { analyzeGitHubRepo } from "@/lib/githubAnalyzer";
import { analyzePlagiarism } from "@/lib/plagiarism";
import { scoreProjectWithAI } from "@/lib/aiScoring";

const PROJECTS_KEY = "judgemate_projects";
const OLD_KEY = "hackjudge_projects";

/* ── one-time: migrate old localStorage key ────────────────── */
try {
  const old = localStorage.getItem(OLD_KEY);
  if (old) {
    if (!localStorage.getItem(PROJECTS_KEY)) {
      localStorage.setItem(PROJECTS_KEY, old);
    }
    localStorage.removeItem(OLD_KEY);
  }
} catch {
  /* SSR / privacy guard */
}

/* ── Verdict helper ────────────────────────────────────────── */
function inferVerdict(total: number): string {
  if (total >= 8) return "Excellent — Strong contender for top prizes!";
  if (total >= 6.5) return "Good — Solid project with potential.";
  if (total >= 5) return "Average — Needs improvement in key areas.";
  return "Below Average — Significant gaps identified.";
}

/* ── Map Supabase teams row → frontend Project ─────────────── */
function rowToProject(row: Tables<"teams">): Project {
  return {
    id: row.id,
    teamName: row.team_name,
    projectName: row.project_name,
    githubUrl: row.github_url ?? "",
    description: row.description ?? "",
    domain: (row.domain as Domain) || "Other",
    submissionTime: row.created_at,
    submittedBy: row.created_by ?? "supabase",
    judgeScores: {},
    recommendations: [],
    plagiarismScore: 0,
    members: [],
  };
}

/* ── Attach Supabase scores to projects ────────────────────── */
function attachScores(
  projects: Project[],
  scores: Tables<"scores">[]
): void {
  for (const score of scores) {
    const proj = projects.find((p) => p.id === score.team_id);
    if (!proj) continue;

    const scoreMap: Record<string, number> = {
      innovation: score.innovation ?? 0,
      technical_feasibility: score.technical_feasibility ?? 0,
      impact: score.impact ?? 0,
      mvp_completeness: score.mvp_completeness ?? 0,
      presentation: score.presentation ?? 0,
      tech_stack: score.tech_stack ?? 0,
      team_collaboration: score.team_collaboration ?? 0,
      originality: score.originality ?? 0,
    };
    const total = Number(score.weighted_total) || 0;

    if (score.is_ai_generated) {
      // AI-generated score → map to aiScores
      proj.aiScores = {
        scores: scoreMap,
        weightedTotal: total,
        explanations: (score.ai_explanations as Record<string, string>) ?? {},
        timestamp: score.created_at,
        overallVerdict: inferVerdict(total),
      };
    } else {
      // Judge score
      proj.judgeScores[score.judge_id] = {
        judgeId: score.judge_id,
        judgeName: score.judge_id, // best we can do without user lookup
        scores: scoreMap,
        weightedTotal: total,
        customQuestions: [],
        timestamp: score.created_at,
      };
    }
  }
}

/**
 * Auto-migrate old projects that are missing githubAnalysis.
 * Runs once per session — re-fetches GitHub, re-runs plagiarism + AI scoring.
 */
async function migrateProjects(projects: Project[]): Promise<Project[] | null> {
  const needsMigration = projects.filter(
    (p) => p.githubUrl?.trim() && !p.githubAnalysis
  );
  if (needsMigration.length === 0) return null;

  let changed = false;
  const updated = [...projects];

  for (const proj of needsMigration) {
    try {
      const ghData = await analyzeGitHubRepo(proj.githubUrl.trim());
      const plagResult = analyzePlagiarism(
        proj.githubUrl, proj.description, proj.projectName, ghData
      );
      const tempProject = {
        ...proj,
        githubAnalysis: ghData,
        plagiarismScore: plagResult.overallScore,
        plagiarismDetails: plagResult,
      };
      const aiScores = scoreProjectWithAI(tempProject);

      const idx = updated.findIndex((p) => p.id === proj.id);
      if (idx !== -1) {
        updated[idx] = {
          ...updated[idx],
          githubAnalysis: ghData,
          plagiarismScore: plagResult.overallScore,
          plagiarismDetails: plagResult,
          aiScores,
        };
        changed = true;
      }
    } catch {
      // Skip this project if fetch fails
    }
  }

  return changed ? updated : null;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const migratedRef = useRef(false);
  const supabaseDone = useRef(false);

  /* ── localStorage helpers ── */
  const readLocal = useCallback((): Project[] => {
    try {
      return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
    } catch {
      return [];
    }
  }, []);

  const saveLocal = useCallback((data: Project[]) => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent("local-storage", { detail: { key: PROJECTS_KEY } })
    );
  }, []);

  /* ── Sync reload from localStorage ── */
  const syncReload = useCallback(() => {
    setProjects(readLocal());
  }, [readLocal]);

  /* ── Initial load: localStorage immediately, then Supabase merge ── */
  useEffect(() => {
    // 1. Instant render from localStorage
    const local = readLocal();
    setProjects(local);

    // 2. One-time Supabase fetch + merge
    if (supabaseDone.current) return;
    supabaseDone.current = true;

    (async () => {
      try {
        // Try to authenticate with Supabase for RLS access
        // (anonymous sign-in or existing session)
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          // Try anonymous sign-in (works if enabled on project)
          await supabase.auth.signInAnonymously().catch(() => {});
        }

        // Fetch teams
        const { data: teamsData, error: teamsErr } = await supabase
          .from("teams")
          .select("*");

        if (teamsErr) {
          console.warn("Supabase teams fetch:", teamsErr.message);
          return;
        }
        if (!teamsData || teamsData.length === 0) return;

        const sbProjects = teamsData.map(rowToProject);

        // Fetch scores and attach to projects
        try {
          const { data: scoresData } = await supabase
            .from("scores")
            .select("*");
          if (scoresData && scoresData.length > 0) {
            attachScores(sbProjects, scoresData);
          }
        } catch {
          // Scores fetch failed — continue without scores
        }

        // Merge: localStorage wins on ID collisions
        const freshLocal = readLocal();
        const localIds = new Set(freshLocal.map((p) => p.id));
        const newFromSB = sbProjects.filter((p) => !localIds.has(p.id));

        if (newFromSB.length > 0) {
          console.log(
            `[useProjects] Merged ${newFromSB.length} team(s) from Supabase`
          );
          const merged = [...freshLocal, ...newFromSB];
          saveLocal(merged);
          setProjects(merged);
        }
      } catch (err) {
        console.warn("Supabase unreachable, using localStorage only:", err);
      }
    })();
  }, [readLocal, saveLocal]);

  /* ── Polling + cross-tab sync ── */
  useEffect(() => {
    const handler = () => syncReload();
    window.addEventListener("local-storage", handler);
    const interval = setInterval(syncReload, 2000);
    return () => {
      window.removeEventListener("local-storage", handler);
      clearInterval(interval);
    };
  }, [syncReload]);

  /* ── Auto-migrate projects without GitHub analysis ── */
  useEffect(() => {
    if (migratedRef.current || projects.length === 0) return;
    migratedRef.current = true;

    migrateProjects(projects).then((updated) => {
      if (updated) {
        saveLocal(updated);
        setProjects(updated);
      }
    });
  }, [projects, saveLocal]);

  /* ── CRUD ── */
  const addProject = useCallback(
    (project: Project) => {
      const current = readLocal();
      const updated = [...current, project];
      saveLocal(updated);
      setProjects(updated);

      // Also write to Supabase (fire-and-forget, non-blocking)
      supabase
        .from("teams")
        .upsert({
          id: project.id,
          team_name: project.teamName,
          project_name: project.projectName,
          domain: project.domain,
          github_url: project.githubUrl || null,
          description: project.description || null,
        })
        .then(({ error }) => {
          if (error)
            console.warn("Supabase upsert (non-blocking):", error.message);
        });
    },
    [readLocal, saveLocal]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      const current = readLocal();
      const updated = current.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      );
      saveLocal(updated);
      setProjects(updated);
    },
    [readLocal, saveLocal]
  );

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id) ?? null,
    [projects]
  );

  return { projects, addProject, updateProject, getProject, reload: syncReload };
}
