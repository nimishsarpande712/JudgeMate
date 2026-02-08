import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CRITERIA } from "@/lib/scoring";
import { toast } from "@/hooks/use-toast";
import { Bot, Loader2, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { scoreWithGroq } from "@/lib/groqScoring";

export default function Demo() {
  const [githubUrl, setGithubUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScore = async () => {
    if (!githubUrl && !description) {
      toast({ title: "Enter a GitHub URL or description", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await scoreWithGroq({
        github_url: githubUrl || undefined,
        description: description || undefined,
        project_name: "Demo Project",
        domain: "General",
      });
      setResult(data);
    } catch (err: any) {
      toast({ title: "Scoring failed", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold">JudgeMate-AI — Demo</span>
          </Link>
          <Link to="/auth"><Button size="sm">Judge Login</Button></Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Try AI Scoring</h1>
          <p className="text-muted-foreground">Paste any public GitHub URL and get instant AI scores</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <Input placeholder="https://github.com/user/repo" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
            <Textarea placeholder="Project description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            <Button onClick={handleScore} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              {loading ? "Analyzing..." : "Get AI Score"}
            </Button>
          </CardContent>
        </Card>

        {result?.scores && (
          <Card>
            <CardHeader><CardTitle>Scores</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {CRITERIA.map((c) => (
                <div key={c.key} className="flex justify-between items-center">
                  <span className="text-sm">{c.label} <span className="text-muted-foreground">({(c.weight * 100)}%)</span></span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(result.scores[c.key] / 10) * 100}%` }} />
                    </div>
                    <span className="font-semibold w-6 text-right">{result.scores[c.key]}</span>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Weighted Total</span>
                <span className="text-primary">{result.weighted_total?.toFixed(2)}</span>
              </div>
              {result.explanations && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-semibold text-sm">AI Explanations</h4>
                  {Object.entries(result.explanations).map(([key, val]) => (
                    <p key={key} className="text-xs text-muted-foreground"><strong>{key}:</strong> {val as string}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
