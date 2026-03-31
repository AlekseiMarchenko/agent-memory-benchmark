import { MemoryAdapter, MemoryEntry, StoreOptions, SearchOptions } from "../types.js";

// Tool name patterns for heuristic discovery
const STORE_PATTERNS = ["remember", "store", "save", "add_memory", "create_memory", "memorize"];
const SEARCH_PATTERNS = ["recall", "search", "query", "find", "retrieve", "get_memories"];
const DELETE_PATTERNS = ["forget", "delete", "remove", "delete_memory", "remove_memory"];
const DESCRIPTION_KEYWORDS = ["memory", "remember", "store", "persist", "recall"];

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface McpToolMapping {
  store: string;
  search: string;
  delete: string;
}

function discoverTools(
  tools: McpTool[],
  overrides?: { store?: string; search?: string; delete?: string }
): McpToolMapping {
  const mapping: Partial<McpToolMapping> = {};

  // Layer 1: CLI overrides take precedence
  if (overrides?.store) mapping.store = overrides.store;
  if (overrides?.search) mapping.search = overrides.search;
  if (overrides?.delete) mapping.delete = overrides.delete;

  // Layer 2: Heuristic name matching
  for (const tool of tools) {
    const name = tool.name.toLowerCase();
    if (!mapping.store && STORE_PATTERNS.some((p) => name.includes(p))) {
      mapping.store = tool.name;
    }
    if (!mapping.search && SEARCH_PATTERNS.some((p) => name.includes(p))) {
      mapping.search = tool.name;
    }
    if (!mapping.delete && DELETE_PATTERNS.some((p) => name.includes(p))) {
      mapping.delete = tool.name;
    }
  }

  // Layer 3: Description scanning
  for (const tool of tools) {
    const desc = (tool.description || "").toLowerCase();
    if (!mapping.store && desc.includes("store") && DESCRIPTION_KEYWORDS.some((k) => desc.includes(k))) {
      mapping.store = tool.name;
    }
    if (!mapping.search && (desc.includes("search") || desc.includes("retrieve") || desc.includes("recall")) && DESCRIPTION_KEYWORDS.some((k) => desc.includes(k))) {
      mapping.search = tool.name;
    }
    if (!mapping.delete && (desc.includes("delete") || desc.includes("remove") || desc.includes("forget")) && DESCRIPTION_KEYWORDS.some((k) => desc.includes(k))) {
      mapping.delete = tool.name;
    }
  }

  if (!mapping.store) throw new Error(`Could not find a store/remember tool. Available tools: ${tools.map((t) => t.name).join(", ")}. Use --mcp-store-tool to specify.`);
  if (!mapping.search) throw new Error(`Could not find a search/recall tool. Available tools: ${tools.map((t) => t.name).join(", ")}. Use --mcp-search-tool to specify.`);
  if (!mapping.delete) throw new Error(`Could not find a delete/forget tool. Available tools: ${tools.map((t) => t.name).join(", ")}. Use --mcp-delete-tool to specify.`);

  return mapping as McpToolMapping;
}

export class McpAdapter implements MemoryAdapter {
  name = "MCP Provider";
  capabilities = { multiAgent: false, scoping: false, temporalDecay: false };
  private command: string;
  private toolOverrides?: { store?: string; search?: string; delete?: string };
  private client: any = null;
  private transport: any = null;
  private toolMapping: McpToolMapping | null = null;
  private storedIds: string[] = [];

  constructor(
    command: string,
    toolOverrides?: { store?: string; search?: string; delete?: string }
  ) {
    this.command = command;
    this.toolOverrides = toolOverrides;
  }

  async initialize(): Promise<void> {
    let sdk: any;
    try {
      // @ts-ignore -- optional peer dependency, dynamically imported
      sdk = await import("@modelcontextprotocol/sdk/client/index.js");
    } catch {
      throw new Error(
        "MCP adapter requires @modelcontextprotocol/sdk. Install it: npm install @modelcontextprotocol/sdk"
      );
    }

    let transport: any;
    try {
      // @ts-ignore -- optional peer dependency, dynamically imported
      const transportModule = await import("@modelcontextprotocol/sdk/client/stdio.js");
      const [cmd, ...args] = this.command.split(" ");
      transport = new transportModule.StdioClientTransport({ command: cmd, args });
    } catch {
      throw new Error(
        "Failed to create MCP stdio transport. Ensure the command is correct: " + this.command
      );
    }

    this.client = new sdk.Client({ name: "amb-benchmark", version: "2.0.0" }, { capabilities: {} });
    await this.client.connect(transport);
    this.transport = transport;

    // Discover tools
    const { tools } = await this.client.listTools();
    this.toolMapping = discoverTools(tools as McpTool[], this.toolOverrides);
    this.name = `MCP: ${this.command.split(" ")[0]}`;

    console.log(`   MCP tools mapped: store=${this.toolMapping.store}, search=${this.toolMapping.search}, delete=${this.toolMapping.delete}`);
  }

  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> {
    if (!this.client || !this.toolMapping) throw new Error("MCP adapter not initialized");

    const result = await this.client.callTool({
      name: this.toolMapping.store,
      arguments: {
        content,
        agent_id: options?.agentId,
        tags: options?.tags,
        scope: options?.scope,
      },
    });

    // Parse the response - MCP tools return content as text
    const text = result.content?.[0]?.text || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    }

    const id = parsed.id || parsed.memory?.id || `mcp-${Date.now()}`;
    this.storedIds.push(id);

    return {
      id,
      content: parsed.content || parsed.memory?.content || content,
      createdAt: new Date().toISOString(),
    };
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    if (!this.client || !this.toolMapping) throw new Error("MCP adapter not initialized");

    const result = await this.client.callTool({
      name: this.toolMapping.search,
      arguments: {
        query,
        agent_id: options?.agentId,
        limit: options?.limit || 10,
        scope: options?.scope,
      },
    });

    const text = result.content?.[0]?.text || "[]";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }

    // Handle various response shapes
    const memories = Array.isArray(parsed) ? parsed : parsed.memories || parsed.results || [];

    return memories.map((m: any) => ({
      id: m.id || "unknown",
      content: m.content || m.memory || m.text || "",
      score: m.score ?? m.similarity,
      createdAt: m.created_at || m.createdAt,
    }));
  }

  async delete(id: string): Promise<boolean> {
    if (!this.client || !this.toolMapping) throw new Error("MCP adapter not initialized");

    try {
      await this.client.callTool({
        name: this.toolMapping.delete,
        arguments: { id },
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

// Export the discovery function for testing
export { discoverTools, McpTool, McpToolMapping };
