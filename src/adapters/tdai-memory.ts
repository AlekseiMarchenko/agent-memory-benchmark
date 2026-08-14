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
      sdk = await import("@modelcontextprotocol/sdk/client/index.js");
    } catch {
      throw new Error("MCP adapter requires @modelcontextprotocol/sdk. Install it: npm install @modelcontextprotocol/sdk");
    }

    let transportModule: any;
    try {
      transportModule = await import("@modelcontextprotocol/sdk/client/stdio.js");
    } catch {
      throw new Error("Failed to create MCP stdio transport.");
    }

    const [cmd, ...args] = this.command.split(" ");
    this.transport = new transportModule.StdioClientTransport({ command: cmd, args });
    this.client = new sdk.Client({ name: "amb-tdai-memory", version: "1.0.0" }, { capabilities: {} });
    await this.client.connect(this.transport);

    console.log("   tdai-memory-mcp: connected, tools: capture, search, forget");
  }

  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> {
    const result = await this.client.callTool({
      name: "capture",
      arguments: {
        content,
        type: "conversation",
        tags: options?.tags,
        agent_id: options?.agentId,
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
    // This is critical for temporal reasoning tests where the latest fact should win.
    if (parsed.conflict_ids && Array.isArray(parsed.conflict_ids) && parsed.conflict_ids.length > 0) {
      console.error(`[tdai-adapter] Conflicts detected for ${id}: ${JSON.stringify(parsed.conflict_ids)}`);
      for (const oldId of parsed.conflict_ids) {
        try {
          await this.client.callTool({
            name: "resolve",
            arguments: { winner: id, loser: oldId, reason: "auto-resolved by benchmark adapter" },
          });
          console.error(`[tdai-adapter] Resolved: ${oldId} → stale (superseded by ${id})`);
        } catch (e) {
          console.error(`[tdai-adapter] Resolve failed for ${oldId}: ${e}`);
        }
      }
    }

    return {
      id,
      content: parsed.content || content,
      createdAt: parsed.created_at || new Date().toISOString(),
    };
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const result = await this.client.callTool({
      name: "search",
      arguments: {
        query,
        agent_id: options?.agentId,
        limit: options?.limit || 50,
        format: "json",
      },
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
    // Stale memories get a lower score from the server's trust boost, so they rank below active ones.
    const activeMemories = memories.filter((m: any) => m.trust_state !== "rejected");
    return activeMemories.map((m: any) => ({
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
