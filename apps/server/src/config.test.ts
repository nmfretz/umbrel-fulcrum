// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

describe("server config", () => {
  it("reads the canonical Umbrel Bitcoin Fulcrum environment contract", () => {
    expect(readConfig({
      PORT: "3006",
      ELECTRUM_HOST: "fulcrum_server_1",
      ELECTRUM_PUBLIC_CONNECTION_PORT: "50002",
      ELECTRUM_LOCAL_SERVICE: "umbrel.local",
      ELECTRUM_HIDDEN_SERVICE: "example.onion",
      BITCOIN_HOST: "bitcoin_core_1",
      RPC_PORT: "8332",
      RPC_USER: "gui",
      RPC_PASSWORD: "secret"
    })).toMatchObject({
      port: 3006,
      fulcrum: { host: "fulcrum_server_1", port: 50002 },
      fulcrumStats: { host: "fulcrum_server_1", port: 8080 },
      connections: { localHost: "umbrel.local", torHost: "example.onion", port: 50002 },
      core: { host: "bitcoin_core_1", port: 8332, username: "gui", password: "secret" }
    });
  });

  it("preserves non-secret legacy defaults while requiring the RPC password", () => {
    expect(readConfig({ RPC_PASSWORD: "secret" })).toMatchObject({
      port: 3006,
      fulcrum: { host: "0.0.0.0", port: 50002 },
      connections: { localHost: "umbrel.local", torHost: "/var/lib/tor/electrum/hostname", port: 50002 },
      core: { host: "172.28.0.2", port: 18443, username: "umbrel", password: "secret" }
    });
  });

  it("configures the provider-owned Fulcrum stats endpoint", () => {
    expect(readConfig({ RPC_PASSWORD: "secret" }).fulcrumStats).toEqual({ host: "0.0.0.0", port: 8080 });
    expect(readConfig({ RPC_PASSWORD: "secret", FULCRUM_STATS_HOST: "fulcrum", FULCRUM_STATS_PORT: "8181" }).fulcrumStats).toEqual({ host: "fulcrum", port: 8181 });
  });

  it("rejects missing credentials rather than shipping fallback secrets", () => {
    expect(() => readConfig({})).toThrow("Invalid Fulcrum GUI configuration");
  });

  it("accepts the documented public-port alias while preferring ELECTRUM_PORT", () => {
    expect(readConfig({ RPC_PASSWORD: "secret", ELECTRUM_PUBLIC_CONNECTION_PORT: "52002" }).connections.port).toBe(52002);
    expect(readConfig({ RPC_PASSWORD: "secret", ELECTRUM_PUBLIC_CONNECTION_PORT: "52002", ELECTRUM_PORT: "50002" }).connections.port).toBe(50002);
  });
});
