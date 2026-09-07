import { connect } from "node:net";
import { z } from "zod";
import type { FulcrumClient } from "./fulcrum-gui-service.js";

const responseSchema = z.object({
  id: z.number(),
  result: z.unknown(),
  error: z.unknown().optional(),
});

export function createFulcrumClient({ host, port, timeoutMs = 5_000 }: { host: string; port: number; timeoutMs?: number }): FulcrumClient {
  let requestId = 0;

  async function request(method: string, params: unknown[]): Promise<unknown> {
    requestId += 1;
    const id = requestId;

    return new Promise((resolve, reject) => {
      const socket = connect({ host, port });
      let settled = false;
      let buffer = "";

      const finish = (error?: Error, result?: unknown) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (error) reject(error);
        else resolve(result);
      };

      socket.setEncoding("utf8");
      socket.setTimeout(timeoutMs);
      socket.on("timeout", () => finish(new Error("Fulcrum request timed out")));
      socket.on("error", () => finish(new Error("Fulcrum request failed")));
      socket.on("connect", () => {
        socket.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      });
      socket.on("data", (chunk) => {
        buffer += chunk;
        if (buffer.length > 65_536) {
          finish(new Error("Fulcrum response was too large"));
          return;
        }
        const newline = buffer.indexOf("\n");
        if (newline === -1) return;
        try {
          const response = responseSchema.parse(JSON.parse(buffer.slice(0, newline)));
          if (response.id !== id || response.error) throw new Error("invalid response");
          finish(undefined, response.result);
        } catch {
          finish(new Error("Fulcrum response was invalid"));
        }
      });
    });
  }

  return {
    async getVersion() {
      const result = await request("server.version", ["umbrel", "1.4"]);
      const value = z.union([z.string(), z.tuple([z.string(), z.string()])]).parse(result);
      const serverVersion = Array.isArray(value) ? value[0] : value;
      const separator = serverVersion.indexOf(" ");
      return separator === -1 ? serverVersion : serverVersion.slice(separator + 1);
    },
    async getTip() {
      const result = z.object({ height: z.number().int().nonnegative() }).parse(
        await request("blockchain.headers.subscribe", []),
      );
      return result.height;
    },
  };
}
