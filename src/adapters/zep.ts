import { MemoryAdapter, MemoryEntry, StoreOptions, SearchOptions } from "../types.js";

/**
 * Zep Cloud v3 adapter.
 * API docs: https://help.getzep.com
 * Auth: "Authorization: Api-Key <key>"
 *
 * Zep v3 model:
 * - Users hold a knowledge graph
 * - Threads (formerly sessions) hold message sequences
 * - Messages added to threads are auto-extracted into the user's knowledge graph
 * - Search uses POST /api/v2/graph/search with user_id + query
 */
export class ZepAdapter implements MemoryAdapter {
  name = "Zep";
  capabilities = { multiAgent: false, scoping: false, temporalDecay: false };
  private apiKey: string;
  private apiUrl: string;
  private userId: string;
  private threads: Set<string> = new Set();
  private messageUuids: string[] = [];

  constructor(apiKey: string, apiUrl: string = "https://api.getzep.com/api/v2") {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.userId = `amb-user-${Date.now()}`;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Authorization": `Api-Key ${this.apiKey}`,
    };
  }

  async initialize(): Promise<void> {
    const res = await fetch(`${this.apiUrl}/users`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ user_id: this.userId }),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`Zep user creation failed (${res.status}): ${await res.text()}`);
    }
  }

  private async ensureThread(threadId: string): Promise<void> {
    if (this.threads.has(threadId)) return;
    const res = await fetch(`${this.apiUrl}/threads`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ thread_id: threadId, user_id: this.userId }),
    });
    if (res.ok || res.status === 409) {
      this.threads.add(threadId);
    }
  }

  async store(content: string, options?: StoreOptions): Promise<MemoryEntry> {
    const threadId = options?.agentId || "amb-benchmark";
    await this.ensureThread(threadId);

    const res = await fetch(`${this.apiUrl}/threads/${threadId}/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        messages: [{ role: "user", content, role_type: "human" }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zep store failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { message_uuids?: string[] };
    const msgUuid = data.message_uuids?.[0] || `zep-${Date.now()}`;
    this.messageUuids.push(msgUuid);

    return { id: msgUuid, content, createdAt: new Date().toISOString() };
  }

  async search(query: string, options?: SearchOptions): Promise<MemoryEntry[]> {
    // Zep v3: semantic search via knowledge graph
    const res = await fetch(`${this.apiUrl}/graph/search`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        user_id: this.userId,
        query,
        limit: options?.limit || 10,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zep search failed (${res.status}): ${text}`);
    }

    const data = await res.json() as {
      edges?: Array<{ uuid: string; fact: string; score?: number }>;
      episodes?: Array<{ uuid: string; content: string; score?: number }>;
    };

    const results: MemoryEntry[] = [];

    // Edges = extracted facts from the knowledge graph (most relevant)
    if (data.edges) {
      for (const e of data.edges) {
        results.push({ id: e.uuid, content: e.fact, score: e.score });
      }
    }

    // Episodes = raw message content
    if (data.episodes) {
      for (const ep of data.episodes) {
        results.push({ id: ep.uuid, content: ep.content, score: ep.score });
      }
    }

    return results.slice(0, options?.limit || 10);
  }

  async delete(_id: string): Promise<boolean> {
    // Zep v3 does not support deleting individual messages or facts.
    // cleanup() deletes the user (cascade deletes all threads + graph).
    return true;
  }

  async cleanup(): Promise<void> {
    // Delete the benchmark user — cascades to all threads and graph data
    try {
      await fetch(`${this.apiUrl}/users/${this.userId}`, {
        method: "DELETE",
        headers: this.headers(),
      });
    } catch {}
    this.threads.clear();
    this.messageUuids = [];
  }
}
