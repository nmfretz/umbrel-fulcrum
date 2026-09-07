import { describe, expect, it } from "vitest";
import { createConnectionDetails } from "./connections.js";

describe("createConnectionDetails", () => {
  it("creates distinct Bitcoin LAN and Tor connection records", () => {
    expect(createConnectionDetails({ localHost: "umbrel.local", torHost: "fulcrum.example.onion", port: "50002" })).toEqual({
      local: { address: "umbrel.local", port: 50002, connectionString: "umbrel.local:50002", transport: "tcp" },
      tor: { address: "fulcrum.example.onion", port: 50002, connectionString: "fulcrum.example.onion:50002", transport: "tcp" }
    });
  });

  it("never adds Electrum transport suffixes to user-facing connection strings", () => {
    const details = createConnectionDetails({ localHost: "umbrel.local", torHost: "fulcrum.example.onion", port: 50002 });
    expect(details.local.connectionString).not.toMatch(/:[ts]$/u);
    expect(details.tor.connectionString).not.toMatch(/:[ts]$/u);
    expect(details.local.transport).toBe("tcp");
    expect(details.tor.transport).toBe("tcp");
  });

  it("rejects invalid public ports", () => {
    expect(() => createConnectionDetails({ localHost: "umbrel.local", torHost: "example.onion", port: "0" })).toThrow("Invalid Electrum port");
  });
});
