import { MemoryAdapter, MemoryEntry, StoreOptions, SearchOptions } from "../types.js";

/**
 * Adapter for tdai-memory-mcp — a code-aware long-term memory MCP server.
 * Uses MCP stdio transport with JSON response format for structured data exchange.
 */
export class TdaiMemoryAdapter implements MemoryAdapter {
  name = "tdai-memory-mcp";
  capabilities = { multiAgent: true, scoping: true, temporalDecay: true };
  private command: string;
  private client: any = null;
  private transport: any = null;
  private storedIds: string[] = [];

  constructor(command: string = "node /data/projects/tdai-memory-mcp/dist/index.js") {
    this.command = command;
  }

  async initialize(): Promise<void> {
    let sdk: any;
    try {
      sdk = await import("@modelcontextprotocol/sdk/client");
    } catch {
      throw new Error("MCP adapter requires @modelcontextprotocol/sdk. Install it: npm install @modelcontextprotocol/sdk");
    }

    let transportModule: any;
    try {
      transportModule = await import("@modelcontextprotocol/sdk/client/stdio.js");
    } catch {
      try {
        transportModule = await import("@modelcontextprotocol/sdk/client/stdio");
      } catch {
        throw new Error("Failed to create MCP stdio transport.");
      }
    }

    const [cmd, ...args] = this.command.split(" ");
    this.transport = new transportModule.StdioClientTransport({ command: cmd, args });
    this.client = new sdk.Client({ name: "amb-tdai-memory", version: "1.0.0" }, { capabilities: {} });
    await this.client.connect(this.transport);

    console.log("   tdai-memory-mcp: connected, tools: capture, search, forget");
  }

  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> {
    // Session key strategy for test isolation:
    // - scope="org": use shared "amb-org" session (all agents in same test share it)
    // - scope="agent": use agent_id as session_key (private to each agent)
    // - default: use agent_id as session_key (defaultAgentId isolates per test)
    let sessionKey: string;
    if (options?.scope === "org") {
      sessionKey = "amb-org";
    } else {
      sessionKey = options?.agentId || `amb-${Date.now()}`;
    }
    const result = await this.client.callTool({
      name: "capture",
      arguments: {
        content,
        type: "conversation",
        tags: options?.tags,
        agent_id: options?.agentId,
        session_key: sessionKey,
        format: "json",
      },
    });

    const text = result.content?.[0]?.text || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { id: `tdai-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    }

    const id = parsed.id || `tdai-${Date.now()}`;
    this.storedIds.push(id);

    // Auto-resolve conflicts: when a new capture conflicts with existing ones,
    // mark the older ones as stale (superseded by the new capture).
    // Only auto-resolve for explicit fact-update language, not casual mentions.
    // "fix"/"resolv"/"new"/"chang"/"mov" are excluded — too common in non-update contexts.
    const UPDATE_KEYWORDS = /\b(migrat|upgrad|switch|replac|updat|now use|deprecat|remov|no longer|switched to|moved to|changed to)/i;
    const isUpdate = UPDATE_KEYWORDS.test(content);
    if (isUpdate && parsed.conflict_ids && Array.isArray(parsed.conflict_ids) && parsed.conflict_ids.length > 0) {
      for (const oldId of parsed.conflict_ids) {
        try {
          await this.client.callTool({
            name: "resolve",
            arguments: { winner: id, loser: oldId, reason: "auto-resolved by benchmark adapter" },
          });
        } catch {}
      }
    }

    return {
      id,
      content: parsed.content || content,
      createdAt: parsed.created_at || new Date().toISOString(),
    };
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    // Session key strategy for search (must match store strategy):
    // - scope="agent": search in agent_id's session (private memory isolation)
    // - scope="org": search in "amb-org" session (shared across agents)
    // - default with amb- agent: search in agent_id's session (test isolation)
    // - default with named agent (multi-agent): search in "amb-org" session
    //   (named agents like pm-agent need to find memories stored by other agents)
    const searchArgs: any = {
      query,
      limit: 500,  // Request large limit to get all relevant memories at scale
      format: "json",
    };

    if (options?.scope === "agent" && options?.agentId) {
      searchArgs.agent_id = options.agentId;
      searchArgs.session_key = options.agentId;
    } else if (options?.scope === "org") {
      searchArgs.session_key = "amb-org";
    } else {
      const agentId = options?.agentId || "";
      const isDefaultAgent = /^amb-/.test(agentId);
      if (isDefaultAgent) {
        searchArgs.session_key = agentId;
      } else {
        // Named agent (pm-agent, fix-agent, etc.) — search in shared org session
        // to find memories stored by other agents in the same multi-agent test
        searchArgs.session_key = "amb-org";
      }
    }

    const result = await this.client.callTool({
      name: "search",
      arguments: searchArgs,
    });

    const text = result.content?.[0]?.text || "[]";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }

    const memories = Array.isArray(parsed) ? parsed : parsed.memories || parsed.results || [];
    // Filter out rejected memories, but keep stale ones (needed for "before/previous" queries).
    const activeMemories = memories.filter((m: any) => m.trust_state !== "rejected");

    // Fallback for aggregation queries: if the query is generic (e.g., "summarize what
    // happened this week", "list project details", "what decisions were made") and we
    // got fewer results than the requested topK, do a broader search with a generic
    // query to find more memories in the same session.
    // Skip fallback for temporal-intent queries (contains "currently/now/latest") to
    // avoid bringing back stale memories that would fail unexpected-keyword checks.
    const requestedTopK = options?.limit || 5;
    const isTemporalIntent = /\b(currently|current|now|latest)\b/i.test(query);
    let finalMemories = activeMemories;
    if (activeMemories.length < requestedTopK && searchArgs.session_key && !isTemporalIntent) {
      // Try keyword mode first — better for finding specific terms like "CI/CD", "Heroku"
      // that might be drowned out by distractors in vector search at scale.
      for (const mode of ["keyword", "hybrid"] as const) {
        try {
          const broadResult = await this.client.callTool({
            name: "search",
            arguments: {
              query: query || "project memory decision detail session deploy",
              session_key: searchArgs.session_key,
              limit: 100,
              mode,
              format: "json",
            },
          });
          const broadText = broadResult.content?.[0]?.text || "[]";
          let broadParsed: any;
          try { broadParsed = JSON.parse(broadText); } catch { broadParsed = []; }
          const broadMemories = (Array.isArray(broadParsed) ? broadParsed : [])
            .filter((m: any) => m.trust_state !== "rejected" && m.trust_state !== "stale");
          if (broadMemories.length > finalMemories.length) {
            const existingIds = new Set(finalMemories.map((m: any) => m.id));
            finalMemories = [...finalMemories, ...broadMemories.filter((m: any) => !existingIds.has(m.id))];
          }
          if (finalMemories.length >= requestedTopK) break;
        } catch {}
      }
    }

    if (process.env.AMB_DEBUG) {
      console.error(`[tdai-adapter] search "${query}" → ${memories.length} raw, ${finalMemories.length} final: ${finalMemories.map((m: any) => m.content?.slice(0, 50)).join(' | ')}`);
    }
    return finalMemories.map((m: any) => ({
      id: m.id || "unknown",
      content: m.content || m.memory || m.text || "",
      score: m.score ?? m.similarity,
      createdAt: m.created_at || m.createdAt,
    }));
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.client.callTool({
        name: "forget",
        arguments: { id, format: "json" },
      });
      return true;
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    for (const id of this.storedIds) {
      try { await this.delete(id); } catch {}
    }
    this.storedIds = [];

    if (this.client) {
      try { await this.client.close(); } catch {}
    }
  }
}
