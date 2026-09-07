// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createFulcrumStatsClient } from "./fulcrum-stats-client.js";

describe("FulcrumStatsClient", () => {
  it("reads provider-owned indexed and target heights from the v2.1.x /stats shape", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({
      Controller: {
        "Header count": 87_001,
        StateMachine: { State: "DownloadingBlocks", Height: 3_157_425 },
      },
    })));
    const client = createFulcrumStatsClient({ host: "fulcrum", port: 8080, fetchFn });
    await expect(client.getProgress()).resolves.toEqual({ indexedHeight: 87_000, targetHeight: 3_157_425, phase: "DownloadingBlocks" });
  });

  it("accepts an empty database without fabricating a negative height", async () => {
    const client = createFulcrumStatsClient({ host: "fulcrum", port: 8080, fetchFn: async () => new Response(JSON.stringify({ Controller: { "Header count": 0, StateMachine: null } })) });
    await expect(client.getProgress()).resolves.toEqual({ indexedHeight: null, targetHeight: null, phase: null });
  });

  it("rejects malformed provider stats", async () => {
    const client = createFulcrumStatsClient({ host: "fulcrum", port: 8080, fetchFn: async () => new Response(JSON.stringify({ Controller: { "Header count": "87001" } })) });
    await expect(client.getProgress()).rejects.toThrow("Fulcrum stats response was invalid");
  });
});
