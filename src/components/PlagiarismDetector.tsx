import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ShieldAlert, ShieldCheck, Shield, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PlagiarismDetails } from "@/types";
import { getPlagiarismLevel } from "@/lib/plagiarism";
import { useState } from "react";

interface PlagiarismDetectorProps {
  score: number;
  details?: PlagiarismDetails;
  compact?: boolean;
}

export default function PlagiarismDetector({ score, details, compact = false }: PlagiarismDetectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const level = getPlagiarismLevel(score);

  const getIcon = () => {
    if (score >= 70) return <ShieldAlert className="h-4 w-4 text-red-400" />;
    if (score >= 40) return <Shield className="h-4 w-4 text-orange-400" />;
    return <ShieldCheck className="h-4 w-4 text-green-400" />;
  };

  if (compact) {
    return (
      <Badge className={`${level.bgColor} ${level.color} ${level.borderColor} border text-xs gap-1`}>
        {getIcon()} {score}% {level.label}
      </Badge>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={`flex items-center justify-between p-3 rounded-xl border ${level.borderColor} ${level.bgColor} transition-all hover:opacity-90 cursor-pointer`}>
          <div className="flex items-center gap-3">
            {getIcon()}
            <div className="text-left">
              <p className={`text-sm font-medium ${level.color}`}>Plagiarism: {score}%</p>
              <p className="text-xs text-slate-500">{level.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20">
              <Progress
                value={score}
                className="h-2 bg-white/5"
              />
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {details && (
          <div className="mt-2 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Analysis Breakdown
            </h4>

            {/* Individual scores */}
            <div className="space-y-2">
              {[
                { label: "Commit History Risk", value: details.commitHistoryScore, desc: "Repository commit pattern authenticity" },
                { label: "AI Pattern Detection", value: details.aiPatternScore, desc: "AI-generated language patterns" },
                { label: "Code Modularity", value: details.codeModularityScore ?? 0, desc: "Code structure & organization" },
                { label: "Boilerplate Match", value: details.boilerplateScore, desc: "Common template similarity" },
                { label: "Keyword Density", value: details.keywordDensity, desc: "Repetitive keyword usage" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{item.label}</span>
                    <span className={`font-mono ${
                      item.value >= 60 ? "text-red-400" : item.value >= 30 ? "text-orange-400" : "text-green-400"
                    }`}>
                      {item.value}%
                    </span>
                  </div>
                  <Progress value={item.value} className="h-1.5 bg-white/5" />
                </div>
              ))}
            </div>

            {/* Positives (green items) */}
            {details.positives && details.positives.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <p className="text-xs font-medium text-green-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Positives:
                </p>
                {details.positives.map((pos, i) => (
                  <p key={i} className="text-xs text-green-400/80 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span> {pos}
                  </p>
                ))}
              </div>
            )}

            {/* Flags */}
            {details.flags.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <p className="text-xs font-medium text-slate-300">Flags:</p>
                {details.flags.map((flag, i) => (
                  <p key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">•</span> {flag}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
