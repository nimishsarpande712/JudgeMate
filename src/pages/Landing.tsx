import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Zap, Trophy, Bot, FileText, Shield, Brain,
  ArrowRight, GraduationCap, Scale, Sparkles, Star
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white">JudgeMate-AI</span>
              <p className="text-[10px] text-purple-400 leading-tight flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> Fairer Hackathon Judging
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <ThemeToggle />
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/25">
                Get Started <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <div className="max-w-4xl text-center space-y-8 relative z-10">
          {/* Announcement badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm">
            <Star className="h-4 w-4 text-yellow-500" />
            Hack With Mumbai 2.0
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-tight">
            AI-Powered{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400">
              Hackathon Judging
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Smart scoring, plagiarism detection, AI-generated questions, and real-time rankings.
            The fairest way to judge a hackathon.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-xl shadow-purple-500/25 h-14 px-8 text-lg gap-3 transition-all hover:scale-105">
                <GraduationCap className="h-5 w-5" /> Student Login
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="border-white/10 text-white hover:bg-white/5 h-14 px-8 text-lg gap-3 transition-all hover:scale-105">
                <Scale className="h-5 w-5" /> Judge Login
              </Button>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-12">
            {[
              {
                icon: Brain,
                title: "AI Recommendations",
                desc: "Custom questions generated from project description, domain & GitHub analysis",
                gradient: "from-purple-500/20 to-blue-500/20",
                border: "border-purple-500/20",
                iconColor: "text-purple-400",
              },
              {
                icon: Shield,
                title: "Plagiarism Detection",
                desc: "Heuristic analysis of code patterns, AI detection & boilerplate matching",
                gradient: "from-red-500/20 to-orange-500/20",
                border: "border-red-500/20",
                iconColor: "text-red-400",
              },
              {
                icon: FileText,
                title: "PPT Viewer",
                desc: "Upload & view presentations directly in the dashboard with fullscreen support",
                gradient: "from-green-500/20 to-teal-500/20",
                border: "border-green-500/20",
                iconColor: "text-green-400",
              },
              {
                icon: Trophy,
                title: "Live Rankings",
                desc: "Real-time leaderboard with weighted scoring across 8 criteria",
                gradient: "from-yellow-500/20 to-amber-500/20",
                border: "border-yellow-500/20",
                iconColor: "text-yellow-400",
              },
              {
                icon: Bot,
                title: "Smart Scoring",
                desc: "Weighted multi-criteria scoring with innovation, feasibility & impact metrics",
                gradient: "from-blue-500/20 to-cyan-500/20",
                border: "border-blue-500/20",
                iconColor: "text-blue-400",
              },
              {
                icon: Sparkles,
                title: "Student Portal",
                desc: "Separate student flow for project submission, team details & PPT upload",
                gradient: "from-indigo-500/20 to-violet-500/20",
                border: "border-indigo-500/20",
                iconColor: "text-indigo-400",
              },
            ].map((f) => (
              <div
                key={f.title}
                className={`p-5 rounded-2xl border ${f.border} bg-gradient-to-br ${f.gradient} backdrop-blur-sm text-left space-y-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
              >
                <f.icon className={`h-8 w-8 ${f.iconColor}`} />
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-xs text-slate-600">
          Built for Hack With Mumbai 2.0 🏆 | Powered by React + Shadcn UI
        </p>
      </footer>
    </div>
  );
}
