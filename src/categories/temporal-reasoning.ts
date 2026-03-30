import { TestCase } from "../types.js";

export const temporalReasoningTests: TestCase[] = [
  {
    id: "tr-01", category: "temporal-reasoning", name: "Current database (latest)",
    description: "After multiple migrations, retrieve the current database",
    seeds: [
      { content: "Database is MySQL 5.7", storeDelay: 0 },
      { content: "Migrated database to PostgreSQL 14", storeDelay: 200 },
      { content: "Upgraded to PostgreSQL 16", storeDelay: 400 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "tr-01-q1", query: "what database do we currently use", expectedKeywords: ["PostgreSQL 16"], unexpectedKeywords: ["MySQL"] }],
  },
  {
    id: "tr-02", category: "temporal-reasoning", name: "Previous database",
    description: "Retrieve the database used before migration",
    seeds: [
      { content: "Database is MySQL 5.7", storeDelay: 0 },
      { content: "Migrated database from MySQL to PostgreSQL 14", storeDelay: 200 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "tr-02-q1", query: "what database did we use before the migration", expectedKeywords: ["MySQL"] }],
  },
  {
    id: "tr-03", category: "temporal-reasoning", name: "Current velocity",
    description: "Retrieve latest sprint velocity after change",
    seeds: [
      { content: "Sprint velocity is 21 story points", storeDelay: 0 },
      { content: "Sprint velocity increased to 34 story points", storeDelay: 200 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "tr-03-q1", query: "what is our current velocity", expectedKeywords: ["34"] }],
  },
  {
    id: "tr-04", category: "temporal-reasoning", name: "Current deploy target",
    description: "After multiple migrations, find current deployment platform",
    seeds: [
      { content: "Deploy target: Heroku", storeDelay: 0 },
      { content: "Migrated from Heroku to AWS ECS", storeDelay: 200 },
      { content: "Migrated from AWS to Fly.io", storeDelay: 400 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "tr-04-q1", query: "where do we deploy now", expectedKeywords: ["Fly.io"] }],
  },
  {
    id: "tr-05", category: "temporal-reasoning", name: "All cloud providers",
    description: "Retrieve all historically used cloud providers",
    seeds: [
      { content: "Deploy target: Heroku", storeDelay: 0 },
      { content: "Migrated from Heroku to AWS ECS", storeDelay: 200 },
      { content: "Migrated from AWS to Fly.io", storeDelay: 400 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "tr-05-q1", query: "what cloud providers have we used", expectedKeywords: ["Heroku", "AWS", "Fly.io"], topK: 5 }],
  },
  {
    id: "tr-06", category: "temporal-reasoning", name: "Current team size",
    description: "Track team size through changes",
    seeds: [
      { content: "Team size: 3 engineers", storeDelay: 0 },
      { content: "Hired 2 more, team is now 5 engineers", storeDelay: 200 },
      { content: "Alice left, team is 4 engineers", storeDelay: 400 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "tr-06-q1", query: "how many people on the team", expectedKeywords: ["4"] }],
  },
  {
    id: "tr-07", category: "temporal-reasoning", name: "Latest API version",
    description: "Track API versioning",
    seeds: [
      { content: "API version v1 launched", storeDelay: 0 },
      { content: "v2 released with breaking changes", storeDelay: 200 },
      { content: "v2.1 patch released", storeDelay: 400 },
    ],
    setup: "store-with-delay",
    queries: [{ id: "tr-07-q1", query: "what is the latest API version", expectedKeywords: ["v2.1"] }],
  },
];
