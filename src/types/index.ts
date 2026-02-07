// ─── Core Types ───────────────────────────────────────────────
export type UserRole = "student" | "judge";

export type Domain =
  | "HealthTech"
  | "SmartCities"
  | "EdTech"
  | "FinTech"
  | "AgriTech"
  | "Sustainability"
  | "AI/ML"
  | "Blockchain"
  | "IoT"
  | "Cybersecurity"
  | "Gaming"
  | "SocialImpact"
  | "Other";

export const DOMAINS: Domain[] = [
  "HealthTech",
  "SmartCities",
  "EdTech",
  "FinTech",
  "AgriTech",
  "Sustainability",
  "AI/ML",
  "Blockchain",
  "IoT",
  "Cybersecurity",
  "Gaming",
  "SocialImpact",
  "Other",
];

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AIScoreResult {
  scores: Record<string, number>;
  weightedTotal: number;
  explanations: Record<string, string>;
  timestamp: string;
  overallVerdict: string;
}

export interface Project {
  id: string;
  teamName: string;
  projectName: string;
  githubUrl: string;
  description: string;
  domain: Domain;
  pptFile?: string; // base64 encoded
  pptFileName?: string;
  pptFileType?: string;
  submissionTime: string;
  submittedBy: string; // user id
  judgeScores: Record<string, JudgeScore>;
  aiScores?: AIScoreResult; // AI auto-generated scores
  githubAnalysis?: import("@/lib/githubAnalyzer").GitHubAnalysis; // Real GitHub data
  recommendations: string[];
  plagiarismScore: number;
  plagiarismDetails?: PlagiarismDetails;
  members: string[];
}

export interface JudgeScore {
  judgeId: string;
  judgeName: string;
  scores: Record<string, number>;
  weightedTotal: number;
  customQuestions: QuestionAnswer[];
  timestamp: string;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  score: number; // 1-10
}

export interface PlagiarismDetails {
  overallScore: number;
  keywordDensity: number;
  aiPatternScore: number;
  boilerplateScore: number;
  commitHistoryScore: number;
  codeModularityScore: number;
  flags: string[];
  positives: string[];
}

export interface Notification {
  id: string;
  message: string;
  type: "submission" | "score" | "info";
  timestamp: string;
  read: boolean;
}

export const CRITERIA = [
  { key: "innovation", label: "Innovation", weight: 0.25, icon: "💡" },
  { key: "technical_feasibility", label: "Technical Feasibility", weight: 0.20, icon: "⚙️" },
  { key: "impact", label: "Impact / Potential", weight: 0.20, icon: "🚀" },
  { key: "mvp_completeness", label: "MVP Completeness", weight: 0.10, icon: "✅" },
  { key: "presentation", label: "Presentation", weight: 0.10, icon: "🎤" },
  { key: "code_quality", label: "Code Quality", weight: 0.05, icon: "📝" },
  { key: "team_collaboration", label: "Team Collaboration", weight: 0.05, icon: "🤝" },
  { key: "originality", label: "Originality", weight: 0.05, icon: "🎯" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];
