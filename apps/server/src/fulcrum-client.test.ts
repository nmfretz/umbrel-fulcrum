// @vitest-environment node
import { createServer, type Server, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createFulcrumClient } from "./fulcrum-client.js";

const servers: Server[] = [];
const sockets = new Set<Socket>();
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
  for (const socket of sockets) socket.destroy();
  sockets.clear();
  server.close((error) => error ? reject(error) : resolve());
}))));

async function fakeFulcrum(handler: (request: { method: string; id: number; params: unknown[] }) => unknown): Promise<number> {
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    let buffer = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline === -1) return;
      const request = JSON.parse(buffer.slice(0, newline)) as { method: string; id: number; params: unknown[] };
      socket.end(`${JSON.stringify({ id: request.id, jsonrpc: "2.0", result: handler(request) })}\n`);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test address");
  return address.port;
}

describe("FulcrumClient", () => {
  it("reads the Fulcrum version and indexed tip over bounded Electrum JSON-RPC", async () => {
    const port = await fakeFulcrum(({ method, params }) => {
      if (method === "server.version") {
        expect(params).toEqual(["umbrel", "1.4"]);
        return ["Fulcrum 2.1.1", "1.4"];
      }
      expect(params).toEqual([]);
      return { height: 110, hex: "00" };
    });
    const client = createFulcrumClient({ host: "127.0.0.1", port, timeoutMs: 500 });

    expect(await client.getVersion()).toBe("2.1.1");
    expect(await client.getTip()).toBe(110);
  });

  it("times out instead of leaving a hanging daemon socket", async () => {
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test address");
    const client = createFulcrumClient({ host: "127.0.0.1", port: address.port, timeoutMs: 30 });

    await expect(client.getTip()).rejects.toThrow("Fulcrum request timed out");
  });

  it("removes only the daemon-name prefix from the legacy banner", async () => {
    const port = await fakeFulcrum(({ method }) => method === "server.version" ? "Fulcrum 2.1.1 release" : { height: 1 });
    await expect(createFulcrumClient({ host: "127.0.0.1", port, timeoutMs: 500 }).getVersion()).resolves.toBe("2.1.1 release");
  });
});
