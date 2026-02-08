// Re-export CRITERIA and DOMAINS from the single source of truth
import { CRITERIA, DOMAINS } from "@/types";
import type { CriterionKey } from "@/types";

export { CRITERIA, DOMAINS };
export type { CriterionKey };

export function computeWeightedTotal(scores: Record<string, number>): number {
  return CRITERIA.reduce((sum, c) => sum + (scores[c.key] || 0) * c.weight, 0);
}
