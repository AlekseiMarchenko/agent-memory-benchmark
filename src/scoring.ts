import { CategoryResult, CATEGORY_WEIGHTS } from "./types.js";

export function computeOverallScore(categories: CategoryResult[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const cat of categories) {
    if (cat.skipped) continue;

    const weight = CATEGORY_WEIGHTS[cat.category] || 0.1;
    weightedSum += cat.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  // Normalize if some categories were skipped
  return weightedSum / totalWeight;
}

export function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function getGradeColor(score: number): string {
  if (score >= 90) return "#4CAF50";
  if (score >= 80) return "#8BC34A";
  if (score >= 70) return "#FFC107";
  if (score >= 60) return "#FF9800";
  if (score >= 50) return "#FF5722";
  return "#F44336";
}
