import { PLANS, PlanConfig } from "@/data/plans";

export function getPlanConfig(id: string): PlanConfig | undefined {
  return PLANS.find((plan) => plan.id === id);
}
