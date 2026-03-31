import { TestCase } from "../types.js";

export const costEfficiencyTests: TestCase[] = [
  {
    id: "ce-01", category: "cost-efficiency", name: "Sequential store latency",
    description: "Measure latency for storing 10 memories sequentially",
    seeds: [
      { content: "Cost test memory 1: The project architecture follows a monorepo pattern" },
      { content: "Cost test memory 2: Authentication uses OAuth 2.0 with PKCE flow" },
      { content: "Cost test memory 3: The frontend is built with Next.js 14 using app router" },
      { content: "Cost test memory 4: Database connection pooling is set to max 20 connections" },
      { content: "Cost test memory 5: Caching layer uses Redis with 15-minute TTL" },
      { content: "Cost test memory 6: API versioning follows URL-based strategy /v1/ /v2/" },
      { content: "Cost test memory 7: File storage uses S3-compatible MinIO instance" },
      { content: "Cost test memory 8: Monitoring uses Grafana with Prometheus metrics" },
      { content: "Cost test memory 9: Background jobs run on BullMQ with Redis backend" },
      { content: "Cost test memory 10: Email notifications use Resend API with templates" },
    ],
    queries: [{ id: "ce-01-q1", query: "what is the project architecture", expectedKeywords: ["monorepo"] }],
  },
  {
    id: "ce-02", category: "cost-efficiency", name: "Short query latency",
    description: "Measure search latency for a short 5-word query",
    seeds: [{ content: "The main API server runs on port 3000 with hot reload enabled in development" }],
    queries: [{ id: "ce-02-q1", query: "what port does the server use", expectedKeywords: ["3000"] }],
  },
  {
    id: "ce-03", category: "cost-efficiency", name: "Long query latency",
    description: "Measure search latency for a detailed 50+ word query",
    seeds: [{ content: "The authentication system was designed with security in mind, implementing JWT tokens with RS256 signing, refresh token rotation every 24 hours, and automatic session invalidation after 30 minutes of inactivity" }],
    queries: [{
      id: "ce-03-q1",
      query: "I need to understand the complete authentication and authorization system including how tokens are generated signed verified and refreshed and what happens when a user session expires or becomes inactive for a period of time",
      expectedKeywords: ["JWT", "RS256"],
    }],
  },
  {
    id: "ce-04", category: "cost-efficiency", name: "Batch operations",
    description: "Measure total time for 20 stores followed by 10 searches",
    seeds: Array.from({ length: 20 }, (_, i) => ({
      content: `Batch memory ${i + 1}: Configuration setting ${String.fromCharCode(65 + i)} is set to value_${i + 1} for the production environment`,
    })),
    queries: Array.from({ length: 10 }, (_, i) => ({
      id: `ce-04-q${i + 1}`,
      query: `what is configuration setting ${String.fromCharCode(65 + i)}`,
      expectedKeywords: [`value_${i + 1}`],
    })),
  },
  {
    id: "ce-05", category: "cost-efficiency", name: "Delete latency",
    description: "Measure latency for deleting 10 memories",
    seeds: Array.from({ length: 10 }, (_, i) => ({
      content: `Deletable memory ${i + 1}: temporary test data for benchmarking purposes`,
    })),
    setup: "store-then-delete" as const,
    queries: [{ id: "ce-05-q1", query: "temporary test data", expectEmpty: true }],
  },
  {
    id: "ce-06", category: "cost-efficiency", name: "Cold start search",
    description: "Measure first search after fresh initialization",
    seeds: [{ content: "Cold start test: this memory exists to measure initial search latency" }],
    queries: [{ id: "ce-06-q1", query: "cold start test", expectedKeywords: ["cold start"] }],
  },
  {
    id: "ce-07", category: "cost-efficiency", name: "Full lifecycle",
    description: "Measure complete store → search → delete cycle",
    seeds: [{ content: "Lifecycle test: this memory will be stored, searched, and then deleted to measure full cycle" }],
    setup: "store-then-delete" as const,
    deletePattern: "search-then-delete",
    queries: [{ id: "ce-07-q1", query: "lifecycle test", expectEmpty: true }],
  },
];
