import { TestCase } from "../types.js";

export const semanticSearchTests: TestCase[] = [
  {
    id: "ss-01", category: "semantic-search", name: "Frontend framework rationale",
    description: "Find framework choice using conceptual query (not keyword match)",
    seeds: [{ content: "We chose React because the team has 5 years of collective React experience" }],
    queries: [{ id: "ss-01-q1", query: "why did we pick this frontend framework", expectedKeywords: ["React", "experience"] }],
  },
  {
    id: "ss-02", category: "semantic-search", name: "Payment processing",
    description: "Find payment info using colloquial query",
    seeds: [{ content: "Payment processing uses Stripe with webhooks for async confirmation" }],
    queries: [{ id: "ss-02-q1", query: "how do we handle money", expectedKeywords: ["Stripe", "payment"] }],
  },
  {
    id: "ss-03", category: "semantic-search", name: "Leadership demos",
    description: "Find meeting schedule using indirect query",
    seeds: [{ content: "The CEO wants weekly demos every Friday at 3pm Pacific" }],
    queries: [{ id: "ss-03-q1", query: "when do we show progress to leadership", expectedKeywords: ["Friday", "3pm"] }],
  },
  {
    id: "ss-04", category: "semantic-search", name: "Data protection",
    description: "Find security details using abstract query",
    seeds: [{ content: "User data is encrypted at rest with AES-256 and in transit with TLS 1.3" }],
    queries: [{ id: "ss-04-q1", query: "how do we protect sensitive information", expectedKeywords: ["encrypted", "AES-256"] }],
  },
  {
    id: "ss-05", category: "semantic-search", name: "New user flow",
    description: "Find onboarding details using different phrasing",
    seeds: [{ content: "The onboarding flow has 4 steps: signup, verify email, choose plan, connect first agent" }],
    queries: [{ id: "ss-05-q1", query: "what happens when a new user joins", expectedKeywords: ["onboarding", "signup"] }],
  },
  {
    id: "ss-06", category: "semantic-search", name: "Language support",
    description: "Find SDK language support using indirect query",
    seeds: [{ content: "We sunset the Python SDK in favor of TypeScript-only to reduce maintenance burden" }],
    queries: [{ id: "ss-06-q1", query: "which programming languages do we support", expectedKeywords: ["TypeScript"] }],
  },
  {
    id: "ss-07", category: "semantic-search", name: "Performance SLA",
    description: "Find latency requirements using conceptual query",
    seeds: [{ content: "Performance SLA: p99 latency under 200ms for recall operations" }],
    queries: [{ id: "ss-07-q1", query: "how fast should the system respond", expectedKeywords: ["200ms", "latency"] }],
  },
  {
    id: "ss-08", category: "semantic-search", name: "Free tier details",
    description: "Find pricing info using casual query",
    seeds: [{ content: "The free tier includes 500 operations per month with no credit card required" }],
    queries: [{ id: "ss-08-q1", query: "what can users do without paying", expectedKeywords: ["free", "500"] }],
  },
];
