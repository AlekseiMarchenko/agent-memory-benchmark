import { TestCase } from "../types.js";

export const selectiveForgettingTests: TestCase[] = [
  {
    id: "sf-01", category: "selective-forgetting", name: "Delete API key",
    description: "Deleted secret should not be retrievable",
    seeds: [{ content: "Old API key is sk_test_abc123 for the staging environment" }],
    setup: "store-then-delete",
    queries: [{ id: "sf-01-q1", query: "what is the API key", expectEmpty: true }],
  },
  {
    id: "sf-02", category: "selective-forgetting", name: "Delete workaround",
    description: "Deleted temporary workaround should disappear",
    seeds: [{ content: "Temporary workaround: restart the auth service every 6 hours to prevent memory leak" }],
    setup: "store-then-delete",
    queries: [{ id: "sf-02-q1", query: "what workarounds do we have", expectEmpty: true }],
  },
  {
    id: "sf-03", category: "selective-forgetting", name: "Delete one of two",
    description: "Only the deleted memory should disappear, the other remains",
    seeds: [
      { content: "Linter configuration uses ESLint with airbnb preset" },
      { content: "Switched linter from ESLint to Biome for faster checks" },
    ],
    setup: "store-then-delete",
    queries: [{ id: "sf-03-q1", query: "what linter do we use", expectedKeywords: ["Biome"] }],
  },
  {
    id: "sf-04", category: "selective-forgetting", name: "Bulk delete verification",
    description: "Delete 3 of 5 memories, verify exactly 2 remain",
    seeds: [
      { content: "Memory alpha: project uses TypeScript" },
      { content: "Memory beta: deploy to Fly.io" },
      { content: "Memory gamma: use PostgreSQL" },
      { content: "Memory delta: MIT license" },
      { content: "Memory epsilon: Hono framework" },
    ],
    setup: "store-then-delete",
    queries: [{ id: "sf-04-q1", query: "list project details", expectedKeywords: ["delta", "epsilon"] }],
  },
  {
    id: "sf-05", category: "selective-forgetting", name: "Delete deprecated endpoint",
    description: "Deleted deprecation notice should not resurface",
    seeds: [{ content: "Deprecated endpoint: /api/v1/users will be removed in Q4 2026" }],
    setup: "store-then-delete",
    queries: [{ id: "sf-05-q1", query: "what endpoints are deprecated", expectEmpty: true }],
  },
  {
    id: "sf-06", category: "selective-forgetting", name: "Delete fixed bug",
    description: "Fixed bug report should be removed from memory",
    seeds: [{ content: "Bug: null pointer exception in auth.ts line 42 when session expires" }],
    setup: "store-then-delete",
    queries: [{ id: "sf-06-q1", query: "what bugs exist in auth", expectEmpty: true }],
  },
];
