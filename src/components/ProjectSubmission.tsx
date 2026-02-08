import { useState, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { useProjects } from "@/hooks/useProjects";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { analyzePlagiarism } from "@/lib/plagiarism";
import { scoreProjectWithAI } from "@/lib/aiScoring";
import { analyzeGitHubRepo } from "@/lib/githubAnalyzer";
import {
  Upload, FileText, Github, Users, Zap, LogOut, CheckCircle2,
  Sparkles, Globe, X, Plus
} from "lucide-react";
import { DOMAINS, type Domain, type Project } from "@/types";
import AIMentorshipPanel from "@/components/AIMentorshipPanel";

export default function ProjectSubmission() {
  const { user, signOut } = useLocalAuth();
  const { projects, addProject } = useProjects();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teamName, setTeamName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [domain, setDomain] = useState<Domain>("AI/ML");
  const [githubUrl, setGithubUrl] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  const [pptFile, setPptFile] = useState<string | undefined>();
  const [pptFileName, setPptFileName] = useState("");
  const [pptFileType, setPptFileType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const existingProject = projects.find((p) => p.submittedBy === user?.id);

  const handleFileUpload = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|pptx?|ppt)$/i)) {
      toast({ title: "Invalid file", description: "Please upload a PDF or PPT/PPTX file.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB allowed.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPptFile(reader.result as string);
      setPptFileName(file.name);
      setPptFileType(file.type);
      toast({ title: "File uploaded! 📎", description: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Not authenticated", description: "Please sign in first.", variant: "destructive" });
      return;
    }
    if (!teamName.trim() || !projectName.trim() || !description.trim()) {
      toast({ title: "Missing fields", description: "Team name, project name, and description are required.", variant: "destructive" });
      return;
    }
    if (description.length > 500) {
      toast({ title: "Description too long", description: "Max 500 characters.", variant: "destructive" });
      return;
    }
    if (githubUrl.trim() && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/i.test(githubUrl.trim())) {
      toast({ title: "Invalid GitHub URL", description: "Please enter a valid GitHub repository URL (https://github.com/owner/repo).", variant: "destructive" });
      return;
    }
    if (existingProject) {
      toast({ title: "Already submitted", description: "You've already submitted a project.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    // 1. Fetch real GitHub data if URL provided
    let githubData: Awaited<ReturnType<typeof analyzeGitHubRepo>> | undefined;
    if (githubUrl.trim()) {
      toast({ title: "Analyzing GitHub repo... 🔍", description: "Fetching commit history, code structure, and languages." });
      try {
        githubData = await analyzeGitHubRepo(githubUrl.trim());
      } catch {
        // Non-blocking — continue even if GitHub fetch fails
      }
    }

    // 2. Plagiarism detection using real GitHub data
    const plagiarismResult = analyzePlagiarism(githubUrl, description, projectName, githubData);

    const project: Project = {
      id: crypto.randomUUID(),
      teamName: teamName.trim(),
      projectName: projectName.trim(),
      githubUrl: githubUrl.trim(),
      description: description.trim(),
      domain,
      pptFile,
      pptFileName,
      pptFileType,
      submissionTime: new Date().toISOString(),
      submittedBy: user.id,
      judgeScores: {},
      recommendations: [],
      plagiarismScore: plagiarismResult.overallScore,
      plagiarismDetails: plagiarismResult,
      members: members.filter((m) => m.trim()),
      githubAnalysis: githubData,
    };

    // Run AI auto-scoring (now uses real GitHub data from project.githubAnalysis)
    const aiScores = scoreProjectWithAI(project);
    project.aiScores = aiScores;

    addProject(project);
    addNotification(`🆕 New submission: "${projectName}" by ${teamName} (AI Score: ${aiScores.weightedTotal.toFixed(1)})`, "submission");

    setSubmitting(false);
    setSubmitted(true);
    toast({ title: "Project submitted! 🎉", description: "Judges can now view your project." });
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (existingProject || submitted) {
    const proj = existingProject || projects.find((p) => p.submittedBy === user.id);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="pt-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Submission Received!</h2>
              <p className="text-slate-400">Your project is now visible to judges.</p>
              {proj && (
                <div className="text-left space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm text-slate-300"><strong className="text-white">Team:</strong> {proj.teamName}</p>
                  <p className="text-sm text-slate-300"><strong className="text-white">Project:</strong> {proj.projectName}</p>
                  <p className="text-sm text-slate-300"><strong className="text-white">Domain:</strong> {proj.domain}</p>
                  {proj.aiScores && (
                    <p className="text-sm text-slate-300"><strong className="text-white">AI Score:</strong> {proj.aiScores.weightedTotal.toFixed(1)}/10</p>
                  )}
                  {proj.pptFileName && (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      <FileText className="h-3 w-3 mr-1" /> {proj.pptFileName}
                    </Badge>
                  )}
                </div>
              )}
              <Button
                onClick={signOut}
                variant="outline"
                className="border-white/10 text-slate-300 hover:bg-white/5"
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* AI Mentorship Panel — student can get improvement tips */}
          {proj && <AIMentorshipPanel project={proj} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold text-white">JudgeMate-AI</span>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">Student</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden sm:block">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-400 hover:text-white hover:bg-white/5">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Submit Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Project</span>
          </h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Fill in your project details. Judges will review your submission with AI-powered analysis.
          </p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" /> Project Details
            </CardTitle>
            <CardDescription className="text-slate-400">
              All fields marked with * are required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Team & Project Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Team Name *</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="ByteForce"
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-purple-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Project Name *</Label>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="MediScan AI"
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Domain & GitHub */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Domain *</Label>
                  <Select value={domain} onValueChange={(v) => setDomain(v as Domain)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <Globe className="h-4 w-4 mr-2 text-slate-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      {DOMAINS.map((d) => (
                        <SelectItem key={d} value={d} className="text-white hover:bg-white/10">{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">GitHub URL</Label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/team/repo"
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-slate-300">Project Description *</Label>
                  <span className={`text-xs ${description.length > 500 ? "text-red-400" : "text-slate-500"}`}>
                    {description.length}/500
                  </span>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project, the problem it solves, and key features..."
                  rows={4}
                  maxLength={500}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-purple-500 resize-none"
                />
              </div>

              {/* Team Members */}
              <div className="space-y-2">
                <Label className="text-slate-300">Team Members</Label>
                <div className="space-y-2">
                  {members.map((member, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={member}
                        onChange={(e) => {
                          const updated = [...members];
                          updated[idx] = e.target.value;
                          setMembers(updated);
                        }}
                        placeholder={`Member ${idx + 1} name`}
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-purple-500"
                      />
                      {members.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setMembers(members.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-red-400 shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {members.length < 6 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMembers([...members, ""])}
                      className="text-purple-400 hover:text-purple-300 hover:bg-white/5"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Member
                    </Button>
                  )}
                </div>
              </div>

              {/* PPT Upload */}
              <div className="space-y-2">
                <Label className="text-slate-300">Presentation (PPT/PDF)</Label>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
                    ${dragOver
                      ? "border-purple-500 bg-purple-500/10"
                      : pptFile
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-white/10 hover:border-white/20 bg-white/5"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                  {pptFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-green-400" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-green-300">{pptFileName}</p>
                        <p className="text-xs text-slate-500">Click to replace</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPptFile(undefined);
                          setPptFileName("");
                        }}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">
                        Drag & drop your presentation here, or <span className="text-purple-400 font-medium">browse</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-1">PDF, PPT, PPTX (max 10MB)</p>
                    </>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg shadow-purple-500/25 h-12 text-base font-semibold transition-all duration-300 hover:shadow-purple-500/40 hover:scale-[1.01]"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" /> Submit Project
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
