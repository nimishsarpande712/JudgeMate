import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Zap, GraduationCap, Scale, ArrowRight, Sparkles } from "lucide-react";
import type { UserRole } from "@/types";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const { signIn, signUp, user } = useLocalAuth();
  const navigate = useNavigate();

  // Navigate after user state updates (not during render)
  useEffect(() => {
    if (user) {
      navigate(user.role === "student" ? "/submit" : "/judge", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Please enter email and password.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    if (isLogin) {
      const { error } = signIn(email, password);
      if (error) {
        toast({ title: "Login failed", description: error, variant: "destructive" });
      } else {
        toast({ title: "Welcome back! 🎉" });
      }
    } else {
      if (!name.trim()) {
        toast({ title: "Name required", description: "Please enter your name.", variant: "destructive" });
        return;
      }
      const { error } = signUp(email, password, name, role);
      if (error) {
        toast({ title: "Sign up failed", description: error, variant: "destructive" });
      } else {
        toast({ title: "Account created! 🚀", description: `Welcome, ${name}!` });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25">
              <Zap className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white tracking-tight">JudgeMate-AI</h1>
              <p className="text-xs text-purple-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Fairer Hackathon Judging
              </p>
            </div>
          </div>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-purple-500/10">
          <CardHeader className="text-center space-y-2 pb-4">
            <CardTitle className="text-xl text-white">
              {isLogin ? "Welcome Back" : "Join JudgeMate"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isLogin ? "Sign in to continue" : "Create your account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role selector (only on signup) */}
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setRole("student")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 ${
                    role === "student"
                      ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <GraduationCap className={`h-6 w-6 ${role === "student" ? "text-purple-400" : "text-slate-400"}`} />
                  <span className={`text-sm font-medium ${role === "student" ? "text-purple-300" : "text-slate-400"}`}>
                    Student
                  </span>
                </button>
                <button
                  onClick={() => setRole("judge")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 ${
                    role === "judge"
                      ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <Scale className={`h-6 w-6 ${role === "judge" ? "text-blue-400" : "text-slate-400"}`} />
                  <span className={`text-sm font-medium ${role === "judge" ? "text-blue-300" : "text-slate-400"}`}>
                    Judge
                  </span>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@hack.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-[1.02]"
              >
                {isLogin ? "Sign In" : `Sign Up as ${role === "student" ? "Student" : "Judge"}`}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-purple-400 hover:text-purple-300 underline-offset-4 hover:underline font-medium transition-colors"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          Built for Hack With Mumbai 2.0 🏆
        </p>
      </div>
    </div>
  );
}
