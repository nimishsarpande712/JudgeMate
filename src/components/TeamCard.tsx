import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CRITERIA, type CriterionKey } from "@/lib/scoring";
import { toast } from "@/hooks/use-toast";
import { Bot, GitBranch, Loader2, Pencil, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { scoreWithGroq } from "@/lib/groqScoring";

interface Props {
  team: Tables<"teams">;
  score?: Tables<"scores"> | null;
  onScoreUpdate: () => void;
}

export default function TeamCard({ team, score, onScoreUpdate }: Props) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [localScores, setLocalScores] = useState<Record<string, number>>(() => {
    if (!score) return Object.fromEntries(CRITERIA.map((c) => [c.key, 5]));
    return Object.fromEntries(CRITERIA.map((c) => [c.key, (score as any)[c.key] ?? 5]));
  });

  const handleAiScore = async () => {
    setAiLoading(true);
    try {
      const data = await scoreWithGroq({
        github_url: team.github_url || undefined,
        description: team.description || undefined,
        project_name: team.project_name || undefined,
        domain: team.domain || undefined,
      });
      if (data?.scores) {
        setLocalScores(data.scores);
        // Save AI scores
        const payload: any = {
          team_id: team.id,
          judge_id: user!.id,
          is_ai_generated: true,
          ai_explanations: data.explanations || {},
          ...data.scores,
        };
        const { error: upsertError } = await supabase.from("scores").upsert(payload, { onConflict: "team_id,judge_id" });
        if (upsertError) throw upsertError;
        toast({ title: "AI scored!", description: `Weighted total: ${data.weighted_total?.toFixed(2)}` });
        onScoreUpdate();
      }
    } catch (err: any) {
      toast({ title: "AI scoring failed", description: err.message || "Try again", variant: "destructive" });
    }
    setAiLoading(false);
  };

  const handleSave = async () => {
    const payload: any = {
      team_id: team.id,
      judge_id: user!.id,
      is_ai_generated: false,
      ...localScores,
    };
    const { error } = await supabase.from("scores").upsert(payload, { onConflict: "team_id,judge_id" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Scores saved!" });
      setEditing(false);
      onScoreUpdate();
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{team.team_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{team.project_name}</p>
          </div>
          <Badge variant="secondary">{team.domain}</Badge>
        </div>
        {team.github_url && (
          <a href={team.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1">
            <GitBranch className="h-3 w-3" /> {team.github_url.replace("https://github.com/", "")}
          </a>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {team.description && <p className="text-sm text-muted-foreground line-clamp-2">{team.description}</p>}

        {score && !editing && (
          <div className="grid grid-cols-2 gap-2">
            {CRITERIA.map((c) => (
              <div key={c.key} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-semibold">{(score as any)[c.key] ?? "—"}</span>
              </div>
            ))}
            <div className="col-span-2 border-t pt-2 flex justify-between font-semibold">
              <span>Weighted Total</span>
              <span className="text-primary">{score.weighted_total?.toFixed(2) ?? "—"}</span>
            </div>
          </div>
        )}

        {editing && (
          <div className="space-y-2">
            {CRITERIA.map((c) => (
              <div key={c.key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{c.label} ({(c.weight * 100).toFixed(0)}%)</span>
                  <span className="font-semibold">{localScores[c.key]}</span>
                </div>
                <Slider min={1} max={10} step={1} value={[localScores[c.key]]} onValueChange={([v]) => setLocalScores((p) => ({ ...p, [c.key]: v }))} />
              </div>
            ))}
            <Button onClick={handleSave} size="sm" className="w-full"><Save className="h-4 w-4 mr-1" /> Save Scores</Button>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAiScore} disabled={aiLoading} className="flex-1">
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            <span className="ml-1">{aiLoading ? "Scoring..." : "AI Score"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="flex-1">
            <Pencil className="h-4 w-4 mr-1" /> {editing ? "Cancel" : "Manual"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
