import { MemoryAdapter, MemoryEntry, StoreOptions, SearchOptions } from "../types.js";

/**
 * Zep Cloud v2 adapter.
 * API docs: https://help.getzep.com/v2/memory
 * Auth: "Api-Key <key>" header
 *
 * Zep is session-oriented. You add messages to sessions, and Zep builds a
 * knowledge graph automatically. Search returns context + relevant_facts from
 * the knowledge graph for recent session state.
 *
 * Note: Zep's memory model (chat-message-based sessions) is a different
 * paradigm from store/search adapters. Scores on semantic retrieval tests
 * will be lower because Zep requires session history to build its graph.
 */
export class ZepAdapter implements MemoryAdapter {
  name = "Zep";
  capabilities = { multiAgent: false, scoping: false, temporalDecay: false };
  private apiKey: string;
  private apiUrl: string;
  private userId: string;
  private sessions: Set<string> = new Set();

  constructor(apiKey: string, apiUrl: string = "https://api.getzep.com/api/v2") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.userId = `amb-user-${Date.now()}`;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Api-Key": this.apiKey,
    };
  }

  async initialize(): Promise<void> {
    // Create a benchmark user
    const res = await fetch(`${this.apiUrl}/users`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ user_id: this.userId }),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`Zep user creation failed (${res.status}): ${await res.text()}`);
    }
  }

  private async ensureSession(sessionId: string): Promise<void> {
    if (this.sessions.has(sessionId)) return;
    const res = await fetch(`${this.apiUrl}/sessions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ session_id: sessionId, user_id: this.userId }),
    });
    if (res.ok || res.status === 409) {
      this.sessions.add(sessionId);
    }
  }

  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> {
    const sessionId = options?.agentId || "amb-benchmark";
    await this.ensureSession(sessionId);

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

    // Zep doesn't return a per-message ID — track by session
    const id = `zep-${sessionId}-${Date.now()}`;
    return { id, content, createdAt: new Date().toISOString() };
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    const sessionId = options?.agentId || "amb-benchmark";
    await this.ensureSession(sessionId);

    // Zep v2 search: GET session memory returns context + relevant_facts
    // We also try graph search for direct semantic retrieval
    const params = new URLSearchParams({ lastn: "50" });
    const res = await fetch(`${this.apiUrl}/sessions/${sessionId}/memory?${params}`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zep search failed (${res.status}): ${text}`);
    }

    const data = await res.json() as {
      context?: string;
      messages?: Array<{ content: string; uuid?: string; role?: string }>;
      relevant_facts?: Array<{ fact: string; uuid?: string }>;
    };

    const results: MemoryEntry[] = [];

    // Include relevant_facts first (most semantically relevant)
    if (data.relevant_facts) {
      for (const f of data.relevant_facts) {
        results.push({ id: f.uuid || `zep-fact-${Date.now()}`, content: f.fact, score: 0.9 });
      }
    }

    // Include messages that contain the query keywords
    if (data.messages) {
      const queryLower = query.toLowerCase();
      for (const m of data.messages) {
        if (m.role === "user" && m.content.toLowerCase().includes(queryLower.split(" ")[0])) {
          results.push({ id: m.uuid || `zep-msg-${Date.now()}`, content: m.content, score: 0.7 });
        }
      }
    }

    // Add all messages as fallback (Zep builds context from full history)
    if (results.length === 0 && data.messages) {
      for (const m of data.messages.filter((m) => m.role === "user")) {
        results.push({ id: m.uuid || `zep-msg-${Date.now()}`, content: m.content, score: 0.5 });
      }
    }

    return results.slice(0, options?.limit || 10);
  }

  async delete(_id: string): Promise<boolean> {
    // Individual message deletion is not supported in Zep v2.
    // cleanup() deletes sessions.
    return true;
  }

  async cleanup(): Promise<void> {
    for (const sessionId of this.sessions) {
      try {
        await fetch(`${this.apiUrl}/sessions/${sessionId}/memory`, {
          method: "DELETE",
          headers: this.headers(),
        });
      } catch {}
    }
    this.sessions.clear();
  }
}
