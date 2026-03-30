import { TestCase } from "../types.js";

export const crossSessionTests: TestCase[] = [
  {
    id: "cs-01", category: "cross-session", name: "Editor preferences",
    description: "Retrieve user preferences stored in a previous session",
    seeds: [{ content: "User prefers dark mode, vim keybindings, 2-space indent, and Fira Code font" }],
    queries: [{ id: "cs-01-q1", query: "what are the user's editor preferences", expectedKeywords: ["dark mode", "vim", "2-space"] }],
  },
  {
    id: "cs-02", category: "cross-session", name: "Debugging context",
    description: "Retrieve root cause from a previous debugging session",
    seeds: [{ content: "Investigated OOM crash at 2am. Root cause was unbounded cache in UserService.getAll() method. Fixed by adding LRU eviction with max 1000 entries." }],
    queries: [{ id: "cs-02-q1", query: "what caused the out of memory crash", expectedKeywords: ["unbounded cache", "UserService"] }],
  },
  {
    id: "cs-03", category: "cross-session", name: "Architecture decision",
    description: "Retrieve architecture decision rationale from a previous session",
    seeds: [{ content: "Architecture decision: chose event sourcing over CRUD for the audit trail requirements. CQRS pattern with separate read and write models." }],
    queries: [{ id: "cs-03-q1", query: "why did we pick this data pattern", expectedKeywords: ["event sourcing", "audit trail"] }],
  },
  {
    id: "cs-04", category: "cross-session", name: "Feature context aggregation",
    description: "Retrieve multiple related memories about a feature",
    seeds: [
      { content: "Feature: user dashboard. Requirements: show usage metrics, billing status, and recent API calls." },
      { content: "Dashboard design: use Recharts for graphs, card layout for metrics, infinite scroll for API log." },
      { content: "Dashboard implementation: 70% complete. Metrics cards done, charts in progress, API log not started." },
    ],
    queries: [{ id: "cs-04-q1", query: "what is the status of the dashboard feature", expectedKeywords: ["dashboard", "70%"], topK: 5 }],
  },
  {
    id: "cs-05", category: "cross-session", name: "Weekly context",
    description: "Retrieve memories from multiple simulated sessions",
    seeds: [
      { content: "Monday: set up CI/CD pipeline with GitHub Actions. Tests passing." },
      { content: "Tuesday: implemented user authentication with JWT tokens." },
      { content: "Wednesday: added rate limiting middleware. 100 req/min for free tier." },
      { content: "Thursday: deployed to staging. Found CORS issue, fixed by evening." },
      { content: "Friday: production deploy successful. Monitoring looks clean." },
    ],
    queries: [{ id: "cs-05-q1", query: "summarize what happened this week", expectedKeywords: ["CI/CD", "authentication"], topK: 5 }],
  },
  {
    id: "cs-06", category: "cross-session", name: "Task progression",
    description: "Track task through multiple status changes",
    seeds: [
      { content: "Task started: implement search functionality for the API" },
      { content: "Blocker found: full-text search requires pg_trgm extension not available on managed Postgres" },
      { content: "Blocker resolved: switched to application-layer trigram matching instead of pg_trgm" },
      { content: "Task completed: search functionality shipped with vector + BM25 + trigram hybrid approach" },
    ],
    queries: [{ id: "cs-06-q1", query: "what happened with the search task", expectedKeywords: ["search", "completed"], topK: 5 }],
  },
  {
    id: "cs-07", category: "cross-session", name: "Multi-session deploy trace",
    description: "Trace a deploy process across multiple sessions",
    seeds: [
      { content: "Session 1: updated environment variables for production. Added OPENAI_API_KEY and DATABASE_URL." },
      { content: "Session 2: code changes merged. Updated recall function to use hybrid retrieval." },
      { content: "Session 3: deployed to Fly.io. Health checks passing. Latency improved by 40%." },
    ],
    queries: [{ id: "cs-07-q1", query: "trace the deploy process", expectedKeywords: ["environment", "deployed"], topK: 5 }],
  },
];
