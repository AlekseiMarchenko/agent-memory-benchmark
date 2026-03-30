import { TestCase } from "../types.js";

export const conflictResolutionTests: TestCase[] = [
  {
    id: "cr-01", category: "conflict-resolution", name: "Timeout change",
    description: "Latest timeout value should win",
    seeds: [
      { content: "Default timeout is 30 seconds", storeDelay: 0 },
      { content: "Changed default timeout to 60 seconds", storeDelay: 200 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "cr-01-q1", query: "what is the default timeout", expectedKeywords: ["60"], expectedFact: "60 seconds" }],
  },
  {
    id: "cr-02", category: "conflict-resolution", name: "Logging library",
    description: "Latest logging library should win",
    seeds: [
      { content: "Logging uses Winston", storeDelay: 0 },
      { content: "Replaced Winston with Pino for better performance", storeDelay: 200 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "cr-02-q1", query: "what logging library do we use", expectedKeywords: ["Pino"], expectedFact: "Pino" }],
  },
  {
    id: "cr-03", category: "conflict-resolution", name: "Upload size limit",
    description: "Latest upload limit should win",
    seeds: [
      { content: "Max file upload size is 5MB", storeDelay: 0 },
      { content: "Increased max upload to 50MB for enterprise tier", storeDelay: 200 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "cr-03-q1", query: "what is the max file upload size", expectedKeywords: ["50MB"], expectedFact: "50MB" }],
  },
  {
    id: "cr-04", category: "conflict-resolution", name: "Git branch naming",
    description: "Latest branch name should win",
    seeds: [
      { content: "Primary branch is master", storeDelay: 0 },
      { content: "Renamed primary branch to main", storeDelay: 200 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "cr-04-q1", query: "what is the main git branch", expectedKeywords: ["main"], expectedFact: "main" }],
  },
  {
    id: "cr-05", category: "conflict-resolution", name: "Code style semicolons",
    description: "Latest style decision should win",
    seeds: [
      { content: "Use Prettier with semicolons enabled", storeDelay: 0 },
      { content: "Team voted to disable semicolons in Prettier config", storeDelay: 200 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "cr-05-q1", query: "do we use semicolons", expectedKeywords: ["disable"], expectedFact: "disabled" }],
  },
  {
    id: "cr-06", category: "conflict-resolution", name: "Node version",
    description: "Latest Node version requirement should win",
    seeds: [
      { content: "Node.js 18 is required minimum version", storeDelay: 0 },
      { content: "Upgraded minimum to Node.js 20", storeDelay: 200 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "cr-06-q1", query: "what Node version do we need", expectedKeywords: ["20"], expectedFact: "Node.js 20" }],
  },
  {
    id: "cr-07", category: "conflict-resolution", name: "API response format",
    description: "Latest format should win",
    seeds: [
      { content: "The API returns XML responses", storeDelay: 0 },
      { content: "Switched API to return JSON exclusively", storeDelay: 200 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "cr-07-q1", query: "what format does the API return", expectedKeywords: ["JSON"], expectedFact: "JSON" }],
  },
];
