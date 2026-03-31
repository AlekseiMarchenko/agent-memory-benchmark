# Agent Memory Benchmark Results

**Provider:** Zep
**Date:** 2026-03-31T21:28:09.959Z
**AMB Version:** 2.0.0
**Layer 1 Score:** 11/100 (F)
**Layer 2 Score:** 0/100 (F)

## Category Scores

| Category | Score | Passed | Avg Latency |
|---|---|---|---|
| Factual Recall | 0% (F) | 0/8 | 490ms |
| Semantic Search | 0% (F) | 0/8 | 366ms |
| Temporal Reasoning | 14% (F) | 1/7 | 367ms |
| Conflict Resolution | 0% (F) | 0/7 | 372ms |
| Selective Forgetting | 67% (C) | 4/6 | 377ms |
| Cross-Session Continuity | 0% (F) | 0/7 | 393ms |
| Multi-Agent Collaboration | ⏭️ Skipped | — | — |
| Cost Efficiency | 19% (F) | 3/16 | 381ms |

## Efficiency Metrics

| Metric | Value |
|---|---|
| Total API Calls | 64 |
| Total Latency | 56.7s |
| Est. Token Usage | 3,589 |

## Layer 2: Multi-Step Retrieval

| Scenario | Score | Latency |
|---|---|---|
| ❌ Conflict Resolution (Multi-Step) | FAIL | 7521ms |
| ❌ Context Continuity | FAIL | 6147ms |
| ❌ Cross-Agent Handoff | FAIL | 6477ms |
| ❌ Preference Application | FAIL | 6281ms |
| ❌ Redundancy Check | FAIL | 7164ms |

**Layer 2 Score:** 0/5 scenarios passed (0%)

### Layer 2 Failures

**l2-03: Conflict Resolution (Multi-Step)**
- Missing keywords: [GraphQL]. Found: [4]

**l2-02: Context Continuity**
- Missing keywords: [Hono, Lucia, Turso, rate limiting]. Found: []

**l2-04: Cross-Agent Handoff**
- Missing keywords: [502, connection pool, 100]. Found: []

**l2-01: Preference Application**
- Missing keywords: [TypeScript, Fly.io, vitest]. Found: [PostgreSQL]

**l2-05: Redundancy Check**
- Missing keywords: [Redis, BullMQ, Resend, MinIO, Meilisearch]. Found: []


## Failed Tests (51)

### fr-01-q1: "what database does the project use"
- **Reason:** Found: [], Missing: [PostgreSQL, pgvector]

### fr-02-q1: "how is the API authenticated"
- **Reason:** Found: [], Missing: [Bearer, JWT, RS256]
- **Top result:** "The project utilizes the pgvector extension with PostgreSQL 15...."

### fr-03-q1: "what are the deployment specs"
- **Reason:** Found: [], Missing: [Kubernetes, 3, 2GB]
- **Top result:** "The project utilizes the pgvector extension with PostgreSQL 15...."

### fr-04-q1: "what is the rate limit"
- **Reason:** Found: [], Missing: [100, minute]
- **Top result:** "JWT is signed by RS256..."

### fr-05-q1: "what CI/CD system do we use"
- **Reason:** Found: [15], Missing: [GitHub Actions]
- **Top result:** "The deployment utilizing these Kubernetes pods is related to amb-user-1774992130225...."

### fr-06-q1: "what format do error responses use"
- **Reason:** Found: [], Missing: [RFC 7807, Problem Details]
- **Top result:** "API authentication uses Bearer tokens in conjunction with JWT..."

### fr-07-q1: "what is the staging URL"
- **Reason:** Found: [], Missing: [staging.example.com, 8443]
- **Top result:** "The deployment utilizing these Kubernetes pods is related to amb-user-1774992130225...."

### fr-08-q1: "what tool handles database migrations"
- **Reason:** Found: [], Missing: [Drizzle]
- **Top result:** "The team uses GitHub Actions for CI/CD processes...."

### ss-01-q1: "why did we pick this frontend framework"
- **Reason:** Found: [], Missing: [React, experience]
- **Top result:** "The team uses GitHub Actions for CI/CD processes...."

### ss-02-q1: "how do we handle money"
- **Reason:** Found: [], Missing: [Stripe, payment]
- **Top result:** "The team uses GitHub Actions for CI/CD processes...."

### ss-03-q1: "when do we show progress to leadership"
- **Reason:** Found: [], Missing: [Friday, 3pm]
- **Top result:** "The team uses GitHub Actions for CI/CD processes...."

### ss-04-q1: "how do we protect sensitive information"
- **Reason:** Found: [], Missing: [encrypted, AES-256]
- **Top result:** "JWT is signed by RS256..."

### ss-05-q1: "what happens when a new user joins"
- **Reason:** Found: [], Missing: [onboarding, signup]
- **Top result:** "The staging environment URL staging.example.com is associated with user amb-user-1774992130225..."

### ss-06-q1: "which programming languages do we support"
- **Reason:** Found: [], Missing: [TypeScript]
- **Top result:** "The staging environment URL staging.example.com operates on port 8443, which is relevant to amb-user..."

### ss-07-q1: "how fast should the system respond"
- **Reason:** Found: [], Missing: [200ms, latency]
- **Top result:** "GitHub Actions is used with a 15-minute build timeout...."

### ss-08-q1: "what can users do without paying"
- **Reason:** Found: [], Missing: [free, 500]
- **Top result:** "The staging environment URL staging.example.com is associated with user amb-user-1774992130225..."

### tr-01-q1: "what database do we currently use"
- **Reason:** Found: [], Missing: [PostgreSQL 16]
- **Top result:** "Database migrations utilize Drizzle ORM..."

### tr-02-q1: "what database did we use before the migration"
- **Reason:** Found: [], Missing: [MySQL]
- **Top result:** "Database migrations utilize Drizzle ORM..."

### tr-03-q1: "what is our current velocity"
- **Reason:** Found: [], Missing: [34]
- **Top result:** "The team uses GitHub Actions for CI/CD processes...."

### tr-04-q1: "where do we deploy now"
- **Reason:** Found: [], Missing: [Fly.io]
- **Top result:** "The deployment utilizing these Kubernetes pods is related to amb-user-1774992130225...."

_...and 31 more failures_

---
_Generated by [Agent Memory Benchmark](https://github.com/AlekseiMarchenko/agent-memory-benchmark) v2.0.0_
