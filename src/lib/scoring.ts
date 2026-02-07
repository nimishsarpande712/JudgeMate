export const CRITERIA = [
  { key: "innovation", label: "Innovation", weight: 0.30 },
  { key: "technical_feasibility", label: "Technical Feasibility", weight: 0.20 },
  { key: "impact", label: "Impact / Potential", weight: 0.20 },
  { key: "mvp_completeness", label: "MVP Completeness", weight: 0.10 },
  { key: "presentation", label: "Presentation", weight: 0.05 },
  { key: "tech_stack", label: "Tech Stack Relevance", weight: 0.05 },
  { key: "team_collaboration", label: "Team Collaboration", weight: 0.05 },
  { key: "originality", label: "Originality", weight: 0.05 },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

export const DOMAINS = [
  "General", "HealthTech", "SmartCities", "EdTech", "FinTech",
  "AgriTech", "Sustainability", "AI/ML", "Blockchain", "IoT", "Other",
];

export function computeWeightedTotal(scores: Record<CriterionKey, number>): number {
  return CRITERIA.reduce((sum, c) => sum + (scores[c.key] || 0) * c.weight, 0);
}
