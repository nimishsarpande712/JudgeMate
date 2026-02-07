import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CRITERIA } from "@/lib/scoring";
import type { Tables } from "@/integrations/supabase/types";
import { Trophy } from "lucide-react";

interface RankedTeam {
  team: Tables<"teams">;
  avgScores: Record<string, number>;
  avgTotal: number;
  judgeCount: number;
}

interface Props {
  rankings: RankedTeam[];
}

export default function RankingsTable({ rankings }: Props) {
  if (!rankings.length) return <p className="text-muted-foreground text-center py-8">No scores yet. Start scoring teams!</p>;

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Domain</TableHead>
            {CRITERIA.map((c) => <TableHead key={c.key} className="text-center text-xs">{c.label.split(" ")[0]}</TableHead>)}
            <TableHead className="text-center font-bold">Total</TableHead>
            <TableHead className="text-center">Judges</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((r, i) => (
            <TableRow key={r.team.id} className={i === 0 ? "bg-primary/5" : ""}>
              <TableCell className="font-bold">
                {i === 0 ? <Trophy className="h-4 w-4 text-primary" /> : i + 1}
              </TableCell>
              <TableCell>
                <div className="font-semibold">{r.team.team_name}</div>
                <div className="text-xs text-muted-foreground">{r.team.project_name}</div>
              </TableCell>
              <TableCell><Badge variant="secondary" className="text-xs">{r.team.domain}</Badge></TableCell>
              {CRITERIA.map((c) => (
                <TableCell key={c.key} className="text-center text-sm">
                  {r.avgScores[c.key]?.toFixed(1) ?? "—"}
                </TableCell>
              ))}
              <TableCell className="text-center font-bold text-primary">{r.avgTotal.toFixed(2)}</TableCell>
              <TableCell className="text-center text-sm">{r.judgeCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
