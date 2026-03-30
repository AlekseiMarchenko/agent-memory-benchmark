import { TestCase } from "../types.js";

export const factualRecallTests: TestCase[] = [
  {
    id: "fr-01", category: "factual-recall", name: "Database technology",
    description: "Retrieve the exact database technology used",
    seeds: [{ content: "The project uses PostgreSQL 15 with pgvector extension for vector storage" }],
    queries: [{ id: "fr-01-q1", query: "what database does the project use", expectedKeywords: ["PostgreSQL", "pgvector"] }],
  },
  {
    id: "fr-02", category: "factual-recall", name: "API authentication",
    description: "Retrieve authentication method details",
    seeds: [{ content: "API authentication uses Bearer tokens with JWT signed by RS256" }],
    queries: [{ id: "fr-02-q1", query: "how is the API authenticated", expectedKeywords: ["Bearer", "JWT", "RS256"] }],
  },
  {
    id: "fr-03", category: "factual-recall", name: "Deployment specs",
    description: "Retrieve infrastructure specifications",
    seeds: [{ content: "The deployment runs on 3 Kubernetes pods with 2GB RAM each" }],
    queries: [{ id: "fr-03-q1", query: "what are the deployment specs", expectedKeywords: ["Kubernetes", "3", "2GB"] }],
  },
  {
    id: "fr-04", category: "factual-recall", name: "Rate limiting",
    description: "Retrieve rate limit configuration",
    seeds: [{ content: "Rate limiting is set to 100 requests per minute per API key" }],
    queries: [{ id: "fr-04-q1", query: "what is the rate limit", expectedKeywords: ["100", "minute"] }],
  },
  {
    id: "fr-05", category: "factual-recall", name: "CI/CD system",
    description: "Retrieve CI/CD configuration details",
    seeds: [{ content: "The team uses GitHub Actions for CI/CD with a 15-minute build timeout" }],
    queries: [{ id: "fr-05-q1", query: "what CI/CD system do we use", expectedKeywords: ["GitHub Actions", "15"] }],
  },
  {
    id: "fr-06", category: "factual-recall", name: "Error format",
    description: "Retrieve error response format specification",
    seeds: [{ content: "Error codes follow RFC 7807 Problem Details format" }],
    queries: [{ id: "fr-06-q1", query: "what format do error responses use", expectedKeywords: ["RFC 7807", "Problem Details"] }],
  },
  {
    id: "fr-07", category: "factual-recall", name: "Staging URL",
    description: "Retrieve staging environment details",
    seeds: [{ content: "The staging environment URL is staging.example.com on port 8443" }],
    queries: [{ id: "fr-07-q1", query: "what is the staging URL", expectedKeywords: ["staging.example.com", "8443"] }],
  },
  {
    id: "fr-08", category: "factual-recall", name: "Migration tool",
    description: "Retrieve database migration tooling",
    seeds: [{ content: "Database migrations use Drizzle ORM with sequential version numbers" }],
    queries: [{ id: "fr-08-q1", query: "what tool handles database migrations", expectedKeywords: ["Drizzle"] }],
  },
];
