import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Trophy, Bot, Download } from "lucide-react";
export default function Index() {
  return <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg">JudgeMate-AI</span>
          </div>
          <div className="flex gap-2">
            <Link to="/demo"><Button variant="outline" size="sm">Live Demo</Button></Link>
            <Link to="/auth"><Button size="sm">Judge Login</Button></Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 bg-[#f3f8dd]">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            AI-Powered <span className="text-primary">Hackathon Judging</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Score 100+ teams in minutes. Real GitHub analysis, AI-powered scoring across 8 criteria, live rankings, and CSV export.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="gap-2"><Zap className="h-5 w-5" /> Start Judging</Button></Link>
            <Link to="/demo"><Button size="lg" variant="outline" className="gap-2"><Bot className="h-5 w-5" /> Try Demo</Button></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
            {[{
            icon: Bot,
            title: "AI Scoring",
            desc: "Scores 1-10 across innovation, feasibility, impact & more"
          }, {
            icon: Trophy,
            title: "Live Rankings",
            desc: "Real-time leaderboard updates as judges score"
          }, {
            icon: Download,
            title: "CSV Export",
            desc: "Download full rankings for organizers"
          }].map(f => <div key={f.title} className="p-4 rounded-xl border text-left space-y-2 bg-[#bde7fa]">
                <f.icon className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>)}
          </div>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Built for Hack With Mumbai 2.0 🏆
      </footer>
    </div>;
}