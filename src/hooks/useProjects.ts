import { useState, useEffect, useCallback, useRef } from "react";
import type { Project } from "@/types";
import { analyzeGitHubRepo } from "@/lib/githubAnalyzer";
import { analyzePlagiarism } from "@/lib/plagiarism";
import { scoreProjectWithAI } from "@/lib/aiScoring";

const PROJECTS_KEY = "hackjudge_projects";

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

  const load = useCallback(() => {
    try {
      const data = JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
      setProjects(data);
    } catch {
      setProjects([]);
    }
  }, []);

  // Auto-migrate old projects once per session
  useEffect(() => {
    if (migratedRef.current || projects.length === 0) return;
    migratedRef.current = true;

    migrateProjects(projects).then((updated) => {
      if (updated) {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
        setProjects(updated);
        window.dispatchEvent(new CustomEvent("local-storage", { detail: { key: PROJECTS_KEY } }));
      }
    });
  }, [projects]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("local-storage", handler);
    const interval = setInterval(load, 2000);
    return () => {
      window.removeEventListener("local-storage", handler);
      clearInterval(interval);
    };
  }, [load]);

  const addProject = useCallback((project: Project) => {
    const current: Project[] = JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
    const updated = [...current, project];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
    setProjects(updated);
    window.dispatchEvent(new CustomEvent("local-storage", { detail: { key: PROJECTS_KEY } }));
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    const current: Project[] = JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
    const updated = current.map((p) => (p.id === id ? { ...p, ...updates } : p));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
    setProjects(updated);
    window.dispatchEvent(new CustomEvent("local-storage", { detail: { key: PROJECTS_KEY } }));
  }, []);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id) ?? null,
    [projects]
  );

  return { projects, addProject, updateProject, getProject, reload: load };
}
