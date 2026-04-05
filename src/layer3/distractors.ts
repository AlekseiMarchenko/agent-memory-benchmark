/**
 * Generates realistic distractor memories for scale testing.
 * Distractors are deterministic (seeded PRNG) so results are reproducible.
 *
 * Covers 10 domains with varied content to create genuine semantic noise
 * in the embedding space — not lorem ipsum or random strings.
 */

// Simple seeded PRNG (mulberry32) for reproducibility
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Domain templates ----
// Each domain has sentence fragments that are combined randomly.
// The templates reference realistic technologies, names, and patterns
// but do NOT overlap with AMB test case keywords (PostgreSQL, pgvector, etc.)

const FRONTEND = {
  actions: [
    "Migrated the dashboard from Angular to React 19 with server components",
    "Implemented drag-and-drop file upload using react-dropzone v14",
    "Added skeleton loading states to all list views for better perceived performance",
    "Refactored the notification center to use WebSocket push instead of polling",
    "Updated the color theme to support both light and dark modes via CSS custom properties",
    "Fixed a hydration mismatch in the product catalog caused by locale-dependent date formatting",
    "Replaced moment.js with date-fns to reduce bundle size by 67KB",
    "Added keyboard navigation to the dropdown menu component for accessibility compliance",
    "Implemented virtual scrolling for the transaction history table using tanstack-virtual",
    "Set up Storybook 8 with automated visual regression tests via Chromatic",
    "Converted all class components to functional components with hooks",
    "Added error boundary wrappers around all route-level components",
    "Implemented code splitting with React.lazy for the admin panel routes",
    "Fixed the CSS grid layout breaking on Safari 16 by adding explicit row heights",
    "Added form validation using react-hook-form with zod schema integration",
  ],
  details: [
    "The old implementation was causing 3-second render delays on mobile devices.",
    "This reduces initial page load from 4.2s to 1.8s on 3G connections.",
    "QA verified the fix across Chrome, Firefox, Safari, and Edge.",
    "The component now supports both controlled and uncontrolled modes.",
    "Lighthouse performance score improved from 62 to 89 after this change.",
    "The animation frame budget is now consistently under 16ms.",
    "Memory usage dropped 40% on the inventory management page.",
  ],
};

const BACKEND = {
  actions: [
    "Added rate limiting to the /api/search endpoint using a sliding window algorithm",
    "Implemented retry logic with exponential backoff for the Stripe webhook handler",
    "Migrated the email service from SendGrid to Amazon SES for cost savings",
    "Added request validation middleware using Joi schemas on all POST endpoints",
    "Implemented cursor-based pagination for the /api/orders endpoint",
    "Set up OpenTelemetry tracing across all microservices",
    "Added a circuit breaker pattern to the inventory service client",
    "Refactored the user authentication flow to support passkeys via WebAuthn",
    "Implemented background job processing using BullMQ with Redis streams",
    "Added health check endpoints returning dependency status for each service",
    "Migrated from Express to Fastify for 30% better throughput on the API gateway",
    "Implemented GraphQL subscriptions for real-time order status updates",
    "Added request deduplication using idempotency keys on payment endpoints",
    "Set up graceful shutdown handling to drain in-flight requests before stopping",
    "Implemented multi-tenant data isolation using row-level security policies",
  ],
  details: [
    "Peak traffic is 1,200 requests/second during flash sales.",
    "The old approach was causing connection pool exhaustion under load.",
    "Response time p99 improved from 850ms to 120ms.",
    "This prevents duplicate charges when webhooks are retried.",
    "The service now handles 10x the previous throughput without scaling.",
    "Error rate dropped from 2.3% to 0.1% after the fix.",
    "Average API response time is now 45ms at the 95th percentile.",
  ],
};

const DEVOPS = {
  actions: [
    "Configured Terraform modules for provisioning staging environments on demand",
    "Set up GitHub Actions CI pipeline with parallel test execution across 4 runners",
    "Migrated container registry from Docker Hub to GitHub Container Registry",
    "Implemented blue-green deployments using AWS ALB target group switching",
    "Added Prometheus metrics collection with Grafana dashboards for all services",
    "Set up Dependabot with auto-merge for patch-level security updates",
    "Configured PagerDuty alerting for error rate spikes above 1% threshold",
    "Implemented infrastructure-as-code for the Kubernetes cluster using Pulumi",
    "Added automated database backup verification using restore-and-check scripts",
    "Set up cost monitoring alerts for AWS spending exceeding monthly budget",
    "Migrated from self-hosted Jenkins to GitHub Actions reducing CI costs by 60%",
    "Implemented canary deployments with automatic rollback on error rate increase",
    "Added log aggregation using Loki with structured JSON logging across all services",
    "Configured auto-scaling policies based on CPU and request queue depth",
    "Set up disaster recovery playbooks with quarterly drill schedules",
  ],
  details: [
    "Deploy frequency increased from weekly to multiple times per day.",
    "Mean time to recovery dropped from 2 hours to 15 minutes.",
    "Infrastructure costs reduced by 35% through right-sizing instances.",
    "The previous setup required manual intervention for every deployment.",
    "Build times reduced from 12 minutes to 3 minutes with caching.",
    "Zero-downtime deployments are now the standard for all services.",
    "Alert fatigue decreased by 80% after tuning notification thresholds.",
  ],
};

const DATABASE = {
  actions: [
    "Created migration 045 to add composite indexes on orders(user_id, created_at)",
    "Implemented read replicas for the reporting queries to reduce primary load",
    "Added connection pooling using PgBouncer with 50 max connections per service",
    "Migrated the search feature from LIKE queries to Elasticsearch with synonym support",
    "Implemented soft deletes with a deleted_at timestamp across all tables",
    "Added database-level audit logging for all PII-containing tables",
    "Optimized the monthly report query from 45 seconds to 800ms using materialized views",
    "Implemented sharding for the events table by date range using partitioning",
    "Added foreign key constraints that were missing on the legacy order_items table",
    "Set up automated vacuum tuning for tables with high write throughput",
    "Migrated from MySQL 5.7 to MariaDB 11 for better JSON column performance",
    "Implemented row-level security policies for multi-tenant data isolation",
    "Added a caching layer using Dragonfly instead of Redis for memory efficiency",
    "Created a data warehouse ETL pipeline using dbt for analytics queries",
    "Implemented change data capture using Debezium for event-driven updates",
  ],
  details: [
    "The table has 450 million rows and grows by 2 million per day.",
    "Query performance improved 50x after adding the composite index.",
    "Storage costs reduced by 40% after archiving records older than 2 years.",
    "The migration ran in 3 minutes with zero downtime using online DDL.",
    "Connection count dropped from 800 to 200 after pooling was configured.",
    "The reporting dashboard now loads in under 2 seconds.",
    "Deadlock frequency dropped from 15/hour to zero after fixing lock ordering.",
  ],
};

const SECURITY = {
  actions: [
    "Rotated all API keys and service account credentials after the quarterly audit",
    "Implemented Content Security Policy headers to prevent XSS attacks",
    "Added CORS configuration limiting origins to known frontend domains",
    "Set up automated dependency scanning using Snyk in the CI pipeline",
    "Implemented token refresh rotation to limit the window of stolen tokens",
    "Added IP-based rate limiting on the login endpoint to prevent brute force",
    "Configured TLS 1.3 with HSTS preloading on all public endpoints",
    "Implemented field-level encryption for SSN and payment card data at rest",
    "Added security event logging for failed auth attempts and permission escalations",
    "Set up penetration testing schedule with quarterly external assessments",
    "Implemented RBAC with fine-grained permissions replacing the boolean is_admin flag",
    "Added CSRF token validation on all state-changing form submissions",
    "Configured WAF rules to block SQL injection and path traversal attempts",
    "Implemented secret management using HashiCorp Vault for all service credentials",
    "Added subresource integrity checks for all third-party JavaScript includes",
  ],
  details: [
    "The vulnerability was reported through our bug bounty program.",
    "All affected sessions were invalidated within 30 minutes of detection.",
    "The penetration test found zero critical and two medium severity issues.",
    "OWASP ZAP scan now runs automatically on every staging deployment.",
    "Compliance with SOC 2 Type II requirements verified after the change.",
    "Two-factor authentication adoption increased from 23% to 87% of users.",
    "The security headers now score A+ on securityheaders.com.",
  ],
};

const MEETINGS = {
  actions: [
    "Sprint planning: agreed to prioritize the billing redesign over the admin panel",
    "Architecture review: decided to decompose the monolith starting with the payment service",
    "1-on-1 with team lead: discussed career growth path toward staff engineer",
    "Customer feedback session: 3 of 5 users struggled with the onboarding flow",
    "Incident retrospective: the outage was caused by a misconfigured autoscaling policy",
    "Design review: approved the new checkout flow mockups with minor color adjustments",
    "Quarterly planning: OKR for Q3 is reducing churn from 5.2% to 3.5%",
    "Stakeholder demo: showed the new analytics dashboard to the product team",
    "Hiring committee: moving forward with the senior backend candidate from the panel",
    "Tech debt review: prioritized fixing the flaky integration test suite this sprint",
    "Cross-team sync: the mobile team needs the API v3 endpoints ready by March 15",
    "Budget review: approved the Datadog contract renewal at $2,400/month",
    "Post-mortem: the data corruption was caused by a race condition in the batch processor",
    "Release planning: targeting the v2.4 release for the first week of April",
    "Vendor evaluation: comparing Cloudflare Workers vs AWS Lambda for edge compute",
  ],
  details: [
    "Action items assigned to 3 team members with a 2-week deadline.",
    "The team voted 7-2 in favor of the proposed approach.",
    "Follow-up meeting scheduled for next Thursday at 2 PM.",
    "The customer segment most affected is enterprise accounts with 50+ seats.",
    "We agreed to time-box the investigation to 3 days before deciding.",
    "The budget increase was approved by the VP of Engineering.",
    "Next steps: create RFC document and circulate for async review.",
  ],
};

const DEBUGGING = {
  actions: [
    "Found the memory leak in the WebSocket handler caused by unclosed event listeners",
    "Traced the intermittent 503 errors to a DNS resolution timeout on service discovery",
    "Fixed the race condition in the checkout flow where concurrent requests caused double charges",
    "Identified the slow query causing the dashboard timeout as a missing index on analytics.events",
    "Resolved the CORS error on the file upload endpoint by adding multipart content type to allowed headers",
    "Fixed the timezone bug where UTC dates were displayed as local time in the export CSV",
    "Traced the null pointer exception to an unhandled edge case in the discount calculation",
    "Identified the cause of increased error rates as a misconfigured connection pool size",
    "Fixed the infinite redirect loop on the OAuth callback by correcting the state parameter encoding",
    "Resolved the data sync issue where deleted records were reappearing after cache invalidation",
    "Fixed the flaky test by replacing setTimeout with proper async/await patterns",
    "Traced the performance regression to an N+1 query introduced in the recent refactor",
    "Resolved the Docker container OOM kills by increasing memory limits and fixing a buffer leak",
    "Fixed the webhook signature verification failure caused by request body parsing middleware",
    "Identified the root cause of duplicate notifications as a missing idempotency check",
  ],
  details: [
    "The bug was only reproducible under high concurrency with 100+ simultaneous users.",
    "Root cause was a closure capturing a stale reference to the previous connection object.",
    "The fix required changes across 3 files with a total diff of 12 lines.",
    "Added a regression test that simulates the exact conditions that trigger the bug.",
    "The issue had been open for 6 weeks and was affecting 2% of production requests.",
    "Profiling showed the function was allocating 50MB per request due to the leak.",
    "The fix was deployed to production within 2 hours of root cause identification.",
  ],
};

const DESIGN = {
  actions: [
    "Updated the button component to use the new brand colors from the style guide",
    "Redesigned the settings page layout from a single column to a tabbed interface",
    "Added micro-animations to the card components using Framer Motion transitions",
    "Implemented a responsive navigation pattern that collapses to a bottom bar on mobile",
    "Created a design token system mapping Figma variables to CSS custom properties",
    "Updated all form inputs to show inline validation errors instead of toast notifications",
    "Redesigned the empty state illustrations for the dashboard widgets",
    "Implemented a consistent spacing system using 4px grid increments",
    "Added support for reduced-motion preferences in all animations",
    "Created a component library documentation site using Storybook with MDX pages",
    "Redesigned the pricing page with comparison tables and feature highlights",
    "Implemented dark mode color tokens that maintain WCAG AA contrast ratios",
    "Updated the typography scale to use Inter for body text and JetBrains Mono for code",
    "Added focus-visible indicators to all interactive elements for keyboard navigation",
    "Redesigned the onboarding wizard from 5 steps to 3 with progressive disclosure",
  ],
  details: [
    "User testing showed a 23% improvement in task completion rate.",
    "The design was approved by the product team after two rounds of iteration.",
    "Accessibility audit confirmed WCAG 2.1 AA compliance across all pages.",
    "The new layout reduced the number of clicks to complete the task from 7 to 3.",
    "Mobile engagement increased 15% after the responsive redesign.",
    "The component now supports all 12 design variants from the Figma file.",
    "Load time improved because we replaced a 200KB illustration with an SVG.",
  ],
};

const ANALYTICS = {
  actions: [
    "Set up Mixpanel tracking for the onboarding funnel with 7 conversion events",
    "Implemented server-side event tracking to capture ad-blocker-resistant metrics",
    "Added A/B test framework using LaunchDarkly for the new pricing experiment",
    "Created a retention cohort dashboard showing weekly user engagement trends",
    "Implemented custom event tracking for the search feature to measure relevance",
    "Set up Segment as the central event hub connecting to 5 downstream destinations",
    "Added revenue attribution tracking linking marketing channels to paid conversions",
    "Implemented session replay using PostHog for debugging user-reported issues",
    "Created automated weekly email reports for KPI dashboards using Retool",
    "Set up alerting for significant drops in daily active users or conversion rate",
    "Implemented UTM parameter tracking across the full marketing funnel",
    "Added product analytics for feature adoption measuring time-to-first-use",
    "Created a data pipeline for joining marketing spend with revenue data",
    "Set up event schema validation to prevent tracking data quality issues",
    "Implemented user journey mapping showing the most common navigation paths",
  ],
  details: [
    "The experiment showed a 12% lift in conversion with 95% statistical significance.",
    "Daily active users increased from 2,300 to 3,100 after the optimization.",
    "The funnel analysis revealed a 45% drop-off at the payment information step.",
    "Data latency for real-time dashboards is under 30 seconds end-to-end.",
    "The attribution model correctly tracks cross-device user journeys.",
    "Average session duration increased from 4.2 to 6.8 minutes.",
    "The cohort analysis showed that users who complete onboarding retain 3x better.",
  ],
};

const PERSONAL = {
  actions: [
    "User prefers Monaco editor over CodeMirror for TypeScript development",
    "Team uses conventional commits with scope prefixes for all repositories",
    "Default branch protection requires 1 approval and passing CI before merge",
    "User timezone is EST and prefers meetings scheduled between 10 AM and 4 PM",
    "Code review style preference: focus on architecture, not nitpick formatting",
    "The team follows a trunk-based development workflow with short-lived feature branches",
    "User prefers functional programming patterns and avoids class-based architectures",
    "Documentation standard: every public function needs a JSDoc comment with examples",
    "Testing philosophy: 80% unit tests, 15% integration tests, 5% end-to-end tests",
    "Deployment cadence: ship to staging daily, production releases on Tuesdays",
    "User uses a 14-inch MacBook Pro M3 with 36GB RAM as primary development machine",
    "Preferred terminal setup: iTerm2 with zsh, Starship prompt, and tmux",
    "The team uses Linear for project management with 2-week sprint cycles",
    "Code style: 2-space indentation, single quotes, no semicolons, trailing commas",
    "User prefers concise variable names and avoids Hungarian notation",
  ],
  details: [
    "This preference was mentioned during the initial project setup discussion.",
    "The team agreed on this convention during the engineering standards review.",
    "This has been the workflow since the project started in January.",
    "The preference applies to both personal and team repositories.",
    "This was documented in the team's engineering handbook.",
    "The standard was adopted after evaluating three alternative approaches.",
    "Exceptions are allowed for prototypes and hackathon projects.",
  ],
};

const ALL_DOMAINS = [
  FRONTEND, BACKEND, DEVOPS, DATABASE, SECURITY,
  MEETINGS, DEBUGGING, DESIGN, ANALYTICS, PERSONAL,
];

/**
 * Generate N deterministic, realistic distractor memories.
 * Each memory is 1-3 sentences combining an action with optional detail.
 */
export function generateDistractors(count: number, seed: number = 42): string[] {
  const rng = mulberry32(seed);
  const distractors: string[] = [];

  for (let i = 0; i < count; i++) {
    const domain = ALL_DOMAINS[Math.floor(rng() * ALL_DOMAINS.length)];
    const action = domain.actions[Math.floor(rng() * domain.actions.length)];

    // 70% chance of adding a detail sentence
    if (rng() < 0.7) {
      const detail = domain.details[Math.floor(rng() * domain.details.length)];
      distractors.push(`${action}. ${detail}`);
    } else {
      distractors.push(action);
    }
  }

  return distractors;
}
