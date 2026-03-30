import { factualRecallTests } from "./factual-recall.js";
import { semanticSearchTests } from "./semantic-search.js";
import { temporalReasoningTests } from "./temporal-reasoning.js";
import { conflictResolutionTests } from "./conflict-resolution.js";
import { selectiveForgettingTests } from "./selective-forgetting.js";
import { crossSessionTests } from "./cross-session.js";
import { multiAgentTests } from "./multi-agent.js";
import { costEfficiencyTests } from "./cost-efficiency.js";
import { TestCase, CategoryId } from "../types.js";

export const ALL_TESTS: TestCase[] = [
  ...factualRecallTests,
  ...semanticSearchTests,
  ...temporalReasoningTests,
  ...conflictResolutionTests,
  ...selectiveForgettingTests,
  ...crossSessionTests,
  ...multiAgentTests,
  ...costEfficiencyTests,
];

export function getTestsByCategory(category: CategoryId): TestCase[] {
  return ALL_TESTS.filter((t) => t.category === category);
}

export function getCategories(): CategoryId[] {
  return [
    "factual-recall",
    "semantic-search",
    "temporal-reasoning",
    "conflict-resolution",
    "selective-forgetting",
    "cross-session",
    "multi-agent",
    "cost-efficiency",
  ];
}
