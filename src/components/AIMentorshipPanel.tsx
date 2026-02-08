import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Loader2, CheckCircle2, AlertTriangle, XCircle,
  Lightbulb, ListChecks, Wrench, MessageSquare, ShieldCheck, ChevronDown, ChevronUp
} from "lucide-react";
import { generateMentorship, verifyProject, type MentorshipResult, type VerificationCheck } from "@/lib/aiMentorship";
import type { Project } from "@/types";

interface Props {
  project: Project;
}

function CheckIcon({ status }: { status: VerificationCheck["status"] }) {
  if (status === "pass") return <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />;
  if (status === "warn") return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
  return <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-300 border-red-500/30",
    high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    low: "bg-green-500/20 text-green-300 border-green-500/30",
  };
  return (
    <Badge className={`text-[10px] ${colors[priority] || colors.medium}`}>
      {priority}
    </Badge>
  );
}

function EffortBadge({ effort }: { effort: string }) {
  const labels: Record<string, string> = {
    "quick-fix": "⚡ Quick Fix",
    moderate: "🔧 Moderate",
    significant: "🏗️ Significant",
  };
  return (
    <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-white/5">
      {labels[effort] || effort}
    </span>
  );
}

export default function AIMentorshipPanel({ project }: Props) {
  const [mentorship, setMentorship] = useState<MentorshipResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await generateMentorship(project);
      setMentorship(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate mentorship");
    }
    setLoading(false);
  };

  // Not generated yet — show button
  if (!mentorship && !loading) {
    // Quick pre-check to show warning
    const preCheck = verifyProject(project);
    const criticalFails = preCheck.checks.filter((c) => c.status === "fail").length;

    return (
      <div className="p-4 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 space-y-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-indigo-400" />
          <span className="text-sm font-semibold text-white">AI Mentorship</span>
        </div>
        <p className="text-xs text-slate-400">
          Get real, verified improvement recommendations powered by Groq AI. The system verifies your project data before generating mentorship.
        </p>

        {criticalFails > 0 && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-[11px] text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {criticalFails} check(s) failing — mentorship may be limited. AI Score the project first.
            </p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading}
          size="sm"
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 gap-2"
        >
          <GraduationCap className="h-4 w-4" />
          Generate AI Mentorship
        </Button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 text-center space-y-3">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto" />
        <div>
          <p className="text-sm text-white font-medium">Analyzing project...</p>
          <p className="text-xs text-slate-500">Verifying data → Calling Groq AI → Building recommendations</p>
        </div>
      </div>
    );
  }

  if (!mentorship) return null;

  const { verification, improvements, actionPlan, techSuggestions, overallAdvice } = mentorship;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-indigo-400" />
          <span className="text-sm font-semibold text-white">AI Mentorship</span>
          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
            Verified
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs text-indigo-400 hover:text-indigo-300 h-7 gap-1"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <GraduationCap className="h-3 w-3" />}
          Refresh
        </Button>
      </div>

      {/* Verification Panel */}
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <button
          onClick={() => setShowVerification(!showVerification)}
          className="w-full flex items-center justify-between text-xs"
        >
          <span className="flex items-center gap-2 text-slate-300 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            Project Verification
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">
              {verification.checks.filter((c) => c.status === "pass").length}/{verification.checks.length} passed
            </span>
            {showVerification ? <ChevronUp className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
          </div>
        </button>

        {showVerification && (
          <div className="mt-2 space-y-1.5 pt-2 border-t border-white/5">
            {verification.checks.map((check, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <CheckIcon status={check.status} />
                <div>
                  <span className="text-slate-300 font-medium">{check.name}:</span>{" "}
                  <span className="text-slate-500">{check.detail}</span>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/5">
              {verification.summary}
            </p>
          </div>
        )}
      </div>

      {/* Overall Advice */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-300 leading-relaxed">{overallAdvice}</p>
        </div>
      </div>

      {/* Improvements */}
      {improvements.length > 0 && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h4 className="text-xs font-semibold text-white flex items-center gap-2">
            <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
            Improvement Areas ({improvements.length})
          </h4>
          <div className="space-y-3">
            {improvements.map((imp, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{imp.area}</span>
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={imp.priority} />
                    <EffortBadge effort={imp.effort} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  <span className="text-slate-400">Current:</span> {imp.currentState}
                </p>
                <p className="text-[11px] text-indigo-300">
                  💡 {imp.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Plan */}
      {actionPlan.length > 0 && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <h4 className="text-xs font-semibold text-white flex items-center gap-2">
            <ListChecks className="h-3.5 w-3.5 text-green-400" />
            Action Plan
          </h4>
          <ol className="space-y-1.5">
            {actionPlan.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-green-500/20 text-green-300 text-[10px] flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span className="text-slate-400">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Tech Suggestions */}
      {techSuggestions.length > 0 && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <h4 className="text-xs font-semibold text-white flex items-center gap-2">
            <Wrench className="h-3.5 w-3.5 text-blue-400" />
            Recommended Technologies
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {techSuggestions.map((tech, i) => (
              <div
                key={i}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-[10px] text-slate-600 text-right">
        Generated {new Date(mentorship.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
}
