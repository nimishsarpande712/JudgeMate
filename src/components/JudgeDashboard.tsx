import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { useProjects } from "@/hooks/useProjects";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import JudgeTeamCard from "@/components/JudgeTeamCard";
import JudgeRankingsTable from "@/components/JudgeRankingsTable";
import ThemeToggle from "@/components/ThemeToggle";
import { DOMAINS, CRITERIA, type Project } from "@/types";
import { toast } from "@/hooks/use-toast";
import {
  Download, LogOut, Trophy, Users, Zap, Bell, Search,
  LayoutGrid, BarChart3, Sparkles, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function JudgeDashboard() {
  const { user, signOut } = useLocalAuth();
  const { projects } = useProjects();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [domainFilter, setDomainFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showStats, setShowStats] = useState(true);

  if (!user || user.role !== "judge") {
    return <Navigate to="/auth" replace />;
  }

  const filteredProjects = projects.filter((p) => {
    const matchesDomain = domainFilter === "All" || p.domain === domainFilter;
    const matchesSearch =
      !searchQuery ||
      p.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  const totalTeams = projects.length;
  const aiScoredCount = projects.filter((p) => p.aiScores).length;
  const avgAIScore = aiScoredCount > 0
    ? projects
        .filter((p) => p.aiScores)
        .reduce((s, p) => s + (p.aiScores?.weightedTotal ?? 0), 0) / aiScoredCount
    : 0;
  const withPPT = projects.filter((p) => p.pptFile).length;

  const exportCSV = () => {
    const headers = ["Rank", "Team", "Project", "Domain", ...CRITERIA.map((c) => c.label), "AI Total", "Plagiarism", "Verdict"];
    const ranked = [...projects]
      .filter((p) => p.aiScores)
      .map((p) => ({
        project: p,
        scores: p.aiScores!.scores,
        total: p.aiScores!.weightedTotal,
        verdict: p.aiScores!.overallVerdict,
      }))
      .sort((a, b) => b.total - a.total);

    const escCsv = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = ranked.map((r, i) => [
      i + 1,
      escCsv(r.project.teamName),
      escCsv(r.project.projectName),
      escCsv(r.project.domain),
      ...CRITERIA.map((c) => r.scores[c.key]?.toFixed(1) ?? ""),
      r.total.toFixed(2),
      r.project.plagiarismScore + "%",
      escCsv(r.verdict),
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `judgemate-rankings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported! 📊" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25">
              <Zap className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white leading-tight">JudgeMate-AI</h1>
              <p className="text-[10px] text-slate-500 leading-tight">Judge Dashboard</p>
            </div>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
              Judge
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-white/5">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-purple-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-slate-900 border-white/10 p-0" align="end">
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-slate-400 hover:text-white h-6">
                      Mark all read
                    </Button>
                  )}
                </div>
                <div className="max-h-64 overflow-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-6">No notifications</p>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className={`px-3 py-2.5 border-b border-white/5 ${!n.read ? "bg-purple-500/5" : ""}`}
                      >
                        <p className="text-xs text-slate-300">{n.message}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {new Date(n.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" onClick={exportCSV} className="border-white/10 text-slate-300 hover:bg-white/5 hidden sm:flex">
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/auth"); }} className="text-slate-400 hover:text-white hover:bg-white/5">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats bar */}
        {showStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Teams", value: totalTeams, icon: Users, colorClass: "text-purple-400" },
              { label: "AI Scored", value: `${aiScoredCount}/${totalTeams}`, icon: Sparkles, colorClass: "text-blue-400" },
              { label: "Avg AI Score", value: avgAIScore.toFixed(1), icon: BarChart3, colorClass: "text-green-400" },
              { label: "With PPT", value: withPPT, icon: LayoutGrid, colorClass: "text-orange-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`h-4 w-4 ${stat.colorClass}`} />
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs + Filters */}
        <Tabs defaultValue="teams">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="teams" className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
                <Users className="h-4 w-4" /> Teams
              </TabsTrigger>
              <TabsTrigger value="rankings" className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
                <Trophy className="h-4 w-4" /> Rankings
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search teams..."
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-9"
                />
              </div>
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white h-9">
                  <Filter className="h-3 w-3 mr-1 text-slate-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="All" className="text-white">All Domains</SelectItem>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d} value={d} className="text-white">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="teams" className="mt-4">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-lg">No teams submitted yet</p>
                <p className="text-slate-600 text-sm mt-1">Teams will appear here once students submit projects</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <JudgeTeamCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rankings" className="mt-4">
            <JudgeRankingsTable projects={projects} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
