import { TestCase } from "../types.js";

export const multiAgentTests: TestCase[] = [
  {
    id: "ma-01", category: "multi-agent", name: "Cross-agent discovery",
    description: "Agent B finds what Agent A stored",
    seeds: [{ content: "Refactored auth module to use middleware pattern instead of inline checks", agentId: "coder-agent" }],
    setup: "multi-agent-store",
    queries: [{ id: "ma-01-q1", query: "what changed in authentication", expectedKeywords: ["middleware", "auth"], agentId: "reviewer-agent" }],
  },
  {
    id: "ma-02", category: "multi-agent", name: "Multi-agent aggregation",
    description: "PM agent finds decisions from both frontend and backend agents",
    seeds: [
      { content: "Frontend decision: use Tailwind CSS for styling instead of CSS modules", agentId: "frontend-agent" },
      { content: "Frontend decision: implement dark mode with CSS custom properties", agentId: "frontend-agent" },
      { content: "Backend decision: use Hono framework for API instead of Express", agentId: "backend-agent" },
      { content: "Backend decision: store embeddings as JSONB instead of using pgvector", agentId: "backend-agent" },
    ],
    setup: "multi-agent-store",
    queries: [{ id: "ma-02-q1", query: "what decisions were made", expectedKeywords: ["Tailwind", "Hono"], agentId: "pm-agent", topK: 5 }],
  },
  {
    id: "ma-03", category: "multi-agent", name: "Bug handoff",
    description: "Fix agent finds root cause stored by debug agent",
    seeds: [{ content: "Root cause identified: race condition in queue consumer. Two workers processing same message due to missing distributed lock.", agentId: "debug-agent" }],
    setup: "multi-agent-store",
    queries: [{ id: "ma-03-q1", query: "what is the bug", expectedKeywords: ["race condition", "queue"], agentId: "fix-agent" }],
  },
  {
    id: "ma-04", category: "multi-agent", name: "Agent scope isolation",
    description: "Private agent-scoped memory should NOT be visible to other agents",
    seeds: [{ content: "Private note: trying experimental approach with WebAssembly for hot path optimization", agentId: "experiment-agent", scope: "agent" }],
    setup: "multi-agent-store",
    queries: [{ id: "ma-04-q1", query: "what experimental approaches are being tried", expectEmpty: true, agentId: "other-agent", scope: "agent" }],
  },
  {
    id: "ma-05", category: "multi-agent", name: "Org scope sharing",
    description: "Org-scoped memory should be visible to all agents",
    seeds: [{ content: "Org-wide standard: all services must use structured JSON logging with correlation IDs", agentId: "platform-agent", scope: "org" }],
    setup: "multi-agent-store",
    queries: [{ id: "ma-05-q1", query: "what are the logging standards", expectedKeywords: ["JSON logging", "correlation"], agentId: "new-agent", scope: "org" }],
  },
  {
    id: "ma-06", category: "multi-agent", name: "Collaborative puzzle",
    description: "Fourth agent assembles context from three other agents",
    seeds: [
      { content: "Database schema: users table has id, email, name, created_at columns", agentId: "schema-agent" },
      { content: "API endpoint: POST /users creates a new user, requires email and name", agentId: "api-agent" },
      { content: "Frontend form: user registration collects email, name, and optional phone", agentId: "ui-agent" },
    ],
    setup: "multi-agent-store",
    queries: [{ id: "ma-06-q1", query: "how does user registration work end to end", expectedKeywords: ["email", "name"], agentId: "docs-agent", topK: 5 }],
  },
];
