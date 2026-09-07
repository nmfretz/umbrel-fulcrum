// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Bitcoin Fulcrum candidate contract", () => {
  it("uses independent Bitcoin product identity across package and UI", () => {
    const packageJson = JSON.parse(read("package.json")) as { name: string; description: string };
    const dashboard = read("apps/ui/src/components/Dashboard.tsx");
    const connectionPanel = read("apps/ui/src/components/ConnectionPanel.tsx");
    const status = read("packages/contracts/src/status.ts");
    const readme = read("README.md");
    const html = read("apps/ui/index.html");

    expect(packageJson.name).toBe("umbrel-bitcoin-fulcrum-gui");
    expect(packageJson.description).toContain("Bitcoin");
    expect(dashboard).toContain('alt="Fulcrum logo"');
    expect(dashboard).toContain("<h1>Fulcrum</h1>");
    expect(dashboard).not.toContain("LTC");
    expect(connectionPanel).toContain("https://electrum.org/");
    expect(connectionPanel).toContain("private Bitcoin indexer");
    expect(status).toContain("Waiting for Bitcoin Core to finish syncing");
    expect(status).toContain("Indexing Bitcoin blocks");
    expect(readme).toContain("nmfretz/umbrel-fulcrum@349e24666fe9cd819015e845612c3ff7e5340c0c");
    expect(readme).toContain("cculianu/Fulcrum v2.1.2");
    expect(html).toContain('name="theme-color" content="#f7931a"');
    expect(`${readme}\n${html}`).not.toMatch(/Fulcrum \(LTC\)|Electrum-LTC|LITECOIN_HOST/);
  });

  it("uses the orange Bitcoin semantic motion contract", () => {
    const css = read("apps/ui/src/styles.css");
    const qr = read("apps/ui/src/components/QrCodeDialog.tsx");
    expect(css).toContain("--brand: #f7931a;");
    expect(qr).toContain('dark: "#F7931A", light: "#00000000"');
    expect(`${css}\n${qr}`).not.toMatch(/1377e7|5e8fd3|19 119 231|94 143 211|12 60 110|9 68 124/i);
    expect(css).toContain("animation: index-progress-pulse 2.4s ease-in-out infinite;");
    expect(css).toContain("animation-delay: calc(var(--pulse-index) * 120ms);");
    expect(css).toContain("transform: scale(1.055);");
    expect(css).toContain("filter: brightness(1.65);");
    expect(css.match(/transition: opacity 220ms ease-out;/g)).toHaveLength(2);
    expect(css).toContain("animation: none !important;");
    expect(css).toContain("filter: none !important;");
    expect(css).toContain(".index-art.is-complete .index-block-pulse { animation-name: none; }");
  });

  it("retains Fulcrum 2.1.2 and Bitcoin wallet/admin topology", () => {
    const compose = read("docker-compose.yml");
    expect(compose).toContain("cculianu/fulcrum:v2.1.2@sha256:0af448db05f259206a55d68d099a4742168e9eaedb007e8f700b31920653375f");
    expect(compose).toContain("TCP: 0.0.0.0:50002");
    expect(compose).toContain("ADMIN: 0.0.0.0:8000");
    expect(compose).toContain('"50002:50002"');
    expect(compose).toContain("BITCOIN_HOST: bitcoind");
    expect(compose).not.toMatch(/litecoin/i);
  });
});
