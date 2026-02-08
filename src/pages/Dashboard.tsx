import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamSubmitForm from "@/components/TeamSubmitForm";
import TeamCard from "@/components/TeamCard";
import RankingsTable from "@/components/RankingsTable";
import { CRITERIA, DOMAINS } from "@/lib/scoring";
import { toast } from "@/hooks/use-toast";
import { Download, LogOut, Trophy, Users, Zap } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function Dashboard() {
  const { user, signOut, role } = useAuth();
  const [teams, setTeams] = useState<Tables<"teams">[]>([]);
  const [scores, setScores] = useState<Tables<"scores">[]>([]);
  const [domainFilter, setDomainFilter] = useState("All");

  const fetchData = useCallback(async () => {
    const [teamsRes, scoresRes] = await Promise.all([
      supabase.from("teams").select("*").order("created_at", { ascending: false }),
      supabase.from("scores").select("*"),
    ]);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (scoresRes.data) setScores(scoresRes.data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const filteredTeams = domainFilter === "All" ? teams : teams.filter((t) => t.domain === domainFilter);

  const rankings = teams
    .map((team) => {
      const teamScores = scores.filter((s) => s.team_id === team.id);
      if (!teamScores.length) return null;
      const avgScores: Record<string, number> = {};
      CRITERIA.forEach((c) => {
        const vals = teamScores.map((s) => (s as any)[c.key]).filter((v) => v != null);
        avgScores[c.key] = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
      });
      const avgTotal = CRITERIA.reduce((sum, c) => sum + (avgScores[c.key] || 0) * c.weight, 0);
      return { team, avgScores, avgTotal, judgeCount: teamScores.length };
    })
    .filter(Boolean)
    .sort((a, b) => b!.avgTotal - a!.avgTotal) as any[];

  const exportCSV = () => {
    const headers = ["Rank", "Team", "Project", "Domain", ...CRITERIA.map((c) => c.label), "Weighted Total", "Judges"];
    const rows = rankings.map((r: any, i: number) => [
      i + 1, r.team.team_name, r.team.project_name, r.team.domain,
      ...CRITERIA.map((c) => r.avgScores[c.key]?.toFixed(2) ?? ""), r.avgTotal.toFixed(2), r.judgeCount,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "judgemate-rankings.csv"; a.click();
    toast({ title: "CSV exported!" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold">JudgeMate-AI</h1>
            {role && <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">{role}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> CSV</Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="teams">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="teams" className="gap-1"><Users className="h-4 w-4" /> Teams</TabsTrigger>
              <TabsTrigger value="rankings" className="gap-1"><Trophy className="h-4 w-4" /> Rankings</TabsTrigger>
            </TabsList>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Domains</SelectItem>
                {DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="teams" className="space-y-6 mt-4">
            <TeamSubmitForm onAdded={fetchData} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  score={scores.find((s) => s.team_id === team.id && s.judge_id === user?.id) ?? null}
                  onScoreUpdate={fetchData}
                />
              ))}
              {!filteredTeams.length && <p className="col-span-full text-center text-muted-foreground py-8">No teams yet. Add one above!</p>}
            </div>
          </TabsContent>

          <TabsContent value="rankings" className="mt-4">
            <RankingsTable rankings={rankings} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
