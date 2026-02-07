import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAINS } from "@/lib/scoring";
import { toast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";

interface Props {
  onAdded: () => void;
}

export default function TeamSubmitForm({ onAdded }: Props) {
  const { user } = useAuth();
  const [teamName, setTeamName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [domain, setDomain] = useState("General");
  const [githubUrl, setGithubUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !projectName) {
      toast({ title: "Missing fields", description: "Team name and project name are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("teams").insert({
      team_name: teamName,
      project_name: projectName,
      domain,
      github_url: githubUrl || null,
      description: description || null,
      created_by: user!.id,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team added!" });
      setTeamName(""); setProjectName(""); setGithubUrl(""); setDescription("");
      onAdded();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Plus className="h-5 w-5" /> Add Team</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Team Name *</Label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="ByteForce" />
            </div>
            <div className="space-y-1">
              <Label>Project Name *</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="MediScan AI" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Domain</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>GitHub URL</Label>
              <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/user/repo" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the project..." rows={3} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</> : "Add Team"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
