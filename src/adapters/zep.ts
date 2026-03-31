import { MemoryAdapter, MemoryEntry, StoreOptions, SearchOptions } from "../types.js";

/**
 * Zep Cloud adapter.
 * API docs: https://help.getzep.com/api-reference
 * Auth: API key via x-api-key header
 */
export class ZepAdapter implements MemoryAdapter {
  name = "Zep";
  capabilities = { multiAgent: false, scoping: false, temporalDecay: false };
  private apiKey: string;
  private apiUrl: string;
  private storedIds: string[] = [];

  constructor(apiKey: string, apiUrl: string = "https://api.getzep.com/api/v2") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Authorization": `Api-Key ${this.apiKey}`,
    };
  }

  async initialize(): Promise<void> {
    // Zep uses session-based memory. Create a session for the benchmark.
    const res = await fetch(`${this.apiUrl}/sessions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        session_id: `amb-benchmark-${Date.now()}`,
      }),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`Zep auth/session failed (${res.status}): ${await res.text()}`);
    }
  }

  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> {
    const sessionId = options?.agentId || "amb-benchmark";

    // Ensure session exists
    await fetch(`${this.apiUrl}/sessions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ session_id: sessionId }),
    });

    // Add memory to session
    const res = await fetch(`${this.apiUrl}/sessions/${sessionId}/memory`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        messages: [{ role: "user", content, role_type: "user" }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zep store failed (${res.status}): ${text}`);
    }

    // Zep doesn't return a memory ID from the add endpoint.
    // Generate a synthetic ID for tracking.
    const id = `zep-${sessionId}-${Date.now()}`;
    this.storedIds.push(id);

    return { id, content, createdAt: new Date().toISOString() };
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const sessionId = options?.agentId || "amb-benchmark";

    const res = await fetch(`${this.apiUrl}/sessions/${sessionId}/search`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        text: query,
        search_type: "similarity",
        limit: options?.limit || 10,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zep search failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { results?: Array<{ message?: { content: string }; score?: number; uuid?: string }> };

    return (data.results || []).map((r) => ({
      id: r.uuid || "unknown",
      content: r.message?.content || "",
      score: r.score,
    }));
  }

  async delete(id: string): Promise<boolean> {
    // Zep doesn't support deleting individual memories easily.
    // Delete the session instead if this is a session ID.
    const parts = id.split("-");
    if (parts[0] === "zep" && parts.length > 2) {
      const sessionId = parts.slice(1, -1).join("-");
      const res = await fetch(`${this.apiUrl}/sessions/${sessionId}/memory`, {
        method: "DELETE",
        headers: this.headers(),
      });
      return res.ok;
    }
    return false;
  }

  async cleanup(): Promise<void> {
    // Delete sessions used by the benchmark
    const sessions = new Set<string>();
    for (const id of this.storedIds) {
      const parts = id.split("-");
      if (parts[0] === "zep" && parts.length > 2) {
        sessions.add(parts.slice(1, -1).join("-"));
      }
    }
    for (const sessionId of sessions) {
      try {
        await fetch(`${this.apiUrl}/sessions/${sessionId}`, {
          method: "DELETE",
          headers: this.headers(),
        });
      } catch {}
    }
    this.storedIds = [];
  }
}
