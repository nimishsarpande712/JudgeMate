import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CRITERIA, type Project } from "@/types";
import { Trophy, Medal, Award, Sparkles } from "lucide-react";

interface RankedTeam {
  project: Project;
  scores: Record<string, number>;
  total: number;
  verdict: string;
}

interface Props {
  projects: Project[];
}

export default function JudgeRankingsTable({ projects }: Props) {
  const rankings: RankedTeam[] = projects
    .filter((p) => p.aiScores)
    .map((project) => ({
      project,
      scores: project.aiScores!.scores,
      total: project.aiScores!.weightedTotal,
      verdict: project.aiScores!.overallVerdict,
    }))
    .sort((a, b) => b.total - a.total);

  if (!rankings.length) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No AI scores yet. Projects will be scored on submission.</p>
      </div>
    );
  }

  const getRankIcon = (idx: number) => {
    if (idx === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (idx === 1) return <Medal className="h-5 w-5 text-slate-400" />;
    if (idx === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-mono text-slate-500">{idx + 1}</span>;
  };

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-xl">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="w-12 text-slate-400">#</TableHead>
            <TableHead className="text-slate-400">Team</TableHead>
            <TableHead className="text-slate-400">Domain</TableHead>
            {CRITERIA.map((c) => (
              <TableHead key={c.key} className="text-center text-[11px] text-slate-500 hidden lg:table-cell">
                {c.icon}
              </TableHead>
            ))}
            <TableHead className="text-center font-bold text-slate-400">
              <span className="flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" /> AI Total
              </span>
            </TableHead>
            <TableHead className="text-center text-slate-400">Plagiarism</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((r, i) => (
            <TableRow
              key={r.project.id}
              className={`border-white/5 transition-colors ${
                i === 0 ? "bg-yellow-500/5 hover:bg-yellow-500/10" :
                i === 1 ? "bg-slate-500/5 hover:bg-slate-500/10" :
                i === 2 ? "bg-amber-500/5 hover:bg-amber-500/10" :
                "hover:bg-white/5"
              }`}
            >
              <TableCell className="font-bold">{getRankIcon(i)}</TableCell>
              <TableCell>
                <div className="font-semibold text-white">{r.project.teamName}</div>
                <div className="text-xs text-slate-500">{r.project.projectName}</div>
              </TableCell>
              <TableCell>
                <Badge className="bg-white/5 text-slate-400 border-white/10 text-[10px]">
                  {r.project.domain}
                </Badge>
              </TableCell>
              {CRITERIA.map((c) => (
                <TableCell key={c.key} className="text-center text-sm text-slate-300 hidden lg:table-cell font-mono">
                  {r.scores[c.key]?.toFixed(0) ?? "—"}
                </TableCell>
              ))}
              <TableCell className="text-center">
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 text-lg">
                  {r.total.toFixed(2)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className={`text-sm font-mono ${
                  r.project.plagiarismScore > 60 ? "text-red-400" :
                  r.project.plagiarismScore > 30 ? "text-yellow-400" :
                  "text-green-400"
                }`}>
                  {r.project.plagiarismScore}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
