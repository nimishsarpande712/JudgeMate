import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PPTViewer from "@/components/PPTViewer";
import PlagiarismDetector from "@/components/PlagiarismDetector";
import RecommendationEngine from "@/components/RecommendationEngine";
import { scoreProjectWithAI, type AIScoreResult } from "@/lib/aiScoring";
import { analyzeGitHubRepo } from "@/lib/githubAnalyzer";
import { analyzePlagiarism } from "@/lib/plagiarism";
import { useProjects } from "@/hooks/useProjects";
import {
  GitBranch, Clock, Users, FileText,
  ChevronDown, ChevronUp, Sparkles, Brain,
  RefreshCw, Info, Zap, TrendingUp
} from "lucide-react";
import { CRITERIA, type Project } from "@/types";
import { toast } from "@/hooks/use-toast";

interface JudgeTeamCardProps {
  project: Project;
}

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-blue-400";
  if (score >= 4) return "text-yellow-400";
  return "text-red-400";
}

function getScoreBarColor(score: number): string {
  if (score >= 8) return "bg-green-500";
  if (score >= 6) return "bg-blue-500";
  if (score >= 4) return "bg-yellow-500";
  return "bg-red-500";
}

function getVerdictBg(total: number): string {
  if (total >= 8) return "bg-green-500/10 border-green-500/30";
  if (total >= 6.5) return "bg-blue-500/10 border-blue-500/30";
  if (total >= 5) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-red-500/10 border-red-500/30";
}

export default function JudgeTeamCard({ project }: JudgeTeamCardProps) {
  const { updateProject } = useProjects();
  const [expanded, setExpanded] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  const aiScores: AIScoreResult | null = project.aiScores ?? null;

  const handleRescore = async () => {
    setRescoring(true);
    try {
      const updates: Partial<Project> = {};

      // 1. Re-fetch GitHub repo data
      if (project.githubUrl?.trim()) {
        toast({ title: "Fetching GitHub repo... 🔍", description: "Analyzing commits, structure, languages." });
        try {
          const ghData = await analyzeGitHubRepo(project.githubUrl.trim());
          updates.githubAnalysis = ghData;
        } catch {
          // continue without GitHub data
        }
      }

      // Build a temp project with updated GitHub data for plagiarism + scoring
      const tempProject = { ...project, ...updates };

      // 2. Re-run plagiarism with real GitHub data
      const plagResult = analyzePlagiarism(
        tempProject.githubUrl,
        tempProject.description,
        tempProject.projectName,
        tempProject.githubAnalysis
      );
      updates.plagiarismScore = plagResult.overallScore;
      updates.plagiarismDetails = plagResult;

      // 3. Re-run AI scoring (now with githubAnalysis + updated plagiarism)
      const scoringProject = { ...tempProject, plagiarismScore: plagResult.overallScore, plagiarismDetails: plagResult };
      const newScores = scoreProjectWithAI(scoringProject);
      updates.aiScores = newScores;

      // 4. Save everything
      updateProject(project.id, updates);
      toast({
        title: "Full Re-analysis Complete! 🤖",
        description: `${project.teamName}: Score ${newScores.weightedTotal.toFixed(2)}/10 | Plagiarism ${plagResult.overallScore}%`,
      });
    } catch (err) {
      console.error("Rescore failed:", err);
      toast({ title: "Re-analysis failed", description: "An error occurred during scoring. Please try again.", variant: "destructive" });
    } finally {
      setRescoring(false);
    }
  };

  const timeAgo = getTimeAgo(project.submissionTime);

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden hover:bg-white/[0.07] transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-lg truncate">{project.teamName}</h3>
              {project.pptFile && (
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] gap-1 shrink-0">
                  <FileText className="h-3 w-3" /> PPT
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400 truncate">{project.projectName}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border-purple-500/30 text-xs">
              {project.domain}
            </Badge>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="h-3 w-3" /> {timeAgo}
            </span>
          </div>
        </div>

        {/* GitHub link */}
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 transition-colors"
          >
            <GitBranch className="h-3 w-3" /> {project.githubUrl.replace("https://github.com/", "")}
          </a>
        )}

        {/* Team members */}
        {project.members.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Users className="h-3 w-3 text-slate-500" />
            {project.members.filter(Boolean).map((m, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                {m}
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        {project.description && (
          <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{project.description}</p>
        )}

        {/* ──── AI SCORES SECTION ──── */}
        {aiScores ? (
          <div className="space-y-3">
            {/* Verdict banner */}
            <div className={`p-3 rounded-xl border ${getVerdictBg(aiScores.weightedTotal)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-medium text-slate-300">AI Verdict</span>
                </div>
                <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  {aiScores.weightedTotal.toFixed(2)}/10
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{aiScores.overallVerdict}</p>
            </div>

            {/* Score bars per criterion */}
            <TooltipProvider>
              <div className="space-y-2">
                {CRITERIA.map((c) => {
                  const score = aiScores.scores[c.key] ?? 0;
                  const explanation = aiScores.explanations[c.key] ?? "";
                  return (
                    <Tooltip key={c.key}>
                      <TooltipTrigger asChild>
                        <div className="group/row cursor-help">
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-slate-400 flex items-center gap-1">
                              <span>{c.icon}</span>
                              <span>{c.label}</span>
                              <span className="text-slate-600">({(c.weight * 100)}%)</span>
                              <Info className="h-3 w-3 text-slate-600 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                            </span>
                            <span className={`font-mono font-bold ${getScoreColor(score)}`}>{score}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(score)}`}
                              style={{ width: `${score * 10}%` }}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs bg-slate-800 border-white/10 text-slate-200 text-xs p-3"
                      >
                        <p className="font-semibold mb-1">{c.icon} {c.label} — {score}/10</p>
                        <p className="text-slate-400">{explanation}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>

            {/* Scored timestamp + rescore */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-600">
                AI scored {getTimeAgo(aiScores.timestamp)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRescore}
                disabled={rescoring}
                className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${rescoring ? "animate-spin" : ""}`} />
                {rescoring ? "Scoring..." : "Re-score"}
              </Button>
            </div>
          </div>
        ) : (
          /* No AI scores yet → prompt to score */
          <div className="p-4 rounded-xl border border-dashed border-purple-500/30 bg-purple-500/5 text-center space-y-2">
            <Brain className="h-8 w-8 text-purple-400 mx-auto" />
            <p className="text-sm text-slate-400">AI has not scored this project yet</p>
            <Button
              onClick={handleRescore}
              disabled={rescoring}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0"
              size="sm"
            >
              {rescoring ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Analyzing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Run AI Scoring
                </span>
              )}
            </Button>
          </div>
        )}

        {/* Expandable section */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Show Less" : "AI Analysis & More"}
        </button>

        {expanded && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* AI Explanations Detail */}
            {aiScores && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                  AI Score Breakdown
                </h4>
                <div className="space-y-2">
                  {CRITERIA.map((c) => {
                    const explanation = aiScores.explanations[c.key];
                    if (!explanation) return null;
                    return (
                      <div key={c.key} className="text-xs">
                        <span className="text-slate-300 font-medium">{c.icon} {c.label}:</span>{" "}
                        <span className="text-slate-500">{explanation}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plagiarism */}
            <PlagiarismDetector score={project.plagiarismScore} details={project.plagiarismDetails} />

            {/* AI Recommendations */}
            <RecommendationEngine
              project={project}
              scores={aiScores?.scores}
            />

            {/* PPT Viewer */}
            {project.pptFile && (
              <PPTViewer
                pptFile={project.pptFile}
                pptFileName={project.pptFileName || "presentation"}
                pptFileType={project.pptFileType}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-purple-500/20 text-purple-300 hover:bg-purple-500/10 gap-2"
                  >
                    <FileText className="h-4 w-4" /> View Presentation
                  </Button>
                }
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "unknown";
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
