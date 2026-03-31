import { describe, it, expect } from "vitest";
import { discoverTools, McpTool } from "../src/adapters/mcp-adapter.js";

describe("MCP tool discovery", () => {
  it("discovers tools by heuristic name matching", () => {
    const tools: McpTool[] = [
      { name: "remember", description: "Store a memory" },
      { name: "recall", description: "Search memories" },
      { name: "forget", description: "Delete a memory" },
    ];
    const mapping = discoverTools(tools);
    expect(mapping.store).toBe("remember");
    expect(mapping.search).toBe("recall");
    expect(mapping.delete).toBe("forget");
  });

  it("CLI override takes precedence over heuristic", () => {
    const tools: McpTool[] = [
      { name: "remember", description: "Store a memory" },
      { name: "recall", description: "Search memories" },
      { name: "forget", description: "Delete a memory" },
      { name: "custom_store", description: "Custom store" },
    ];
    const mapping = discoverTools(tools, { store: "custom_store" });
    expect(mapping.store).toBe("custom_store");
    expect(mapping.search).toBe("recall");
  });

  it("discovers tools by description scanning", () => {
    const tools: McpTool[] = [
      { name: "op1", description: "Store persistent memory for agents" },
      { name: "op2", description: "Search and retrieve stored memory entries" },
      { name: "op3", description: "Delete a memory entry permanently" },
    ];
    const mapping = discoverTools(tools);
    expect(mapping.store).toBe("op1");
    expect(mapping.search).toBe("op2");
    expect(mapping.delete).toBe("op3");
  });

  it("throws clear error when no matching tools found", () => {
    const tools: McpTool[] = [
      { name: "get_weather", description: "Get the weather" },
      { name: "calculate", description: "Do math" },
    ];
    expect(() => discoverTools(tools)).toThrow("Could not find a store/remember tool");
  });
});
