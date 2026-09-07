// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFulcrumLogProgress } from "./fulcrum-log-progress.js";

const temporaryDirectories: string[] = [];

async function temporaryLog(contents: string) {
  const directory = await mkdtemp(join(tmpdir(), "fulcrum-log-progress-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "fulcrum.log");
  await writeFile(path, contents);
  return path;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("FulcrumLogProgress", () => {
  it("returns the newest valid processed height while Fulcrum listeners are unavailable", async () => {
    const path = await temporaryLog([
      "[2026-08-10 12:03:29.169] <Controller> Processed height: 48000, 1.5%, 663.1 blocks/sec",
      "unrelated line",
      "[2026-08-10 12:04:26.930] <Controller> Processed height: 87000, 2.8%, 1292.0 blocks/sec",
      "",
    ].join("\n"));

    await expect(createFulcrumLogProgress({ path }).getIndexedHeight()).resolves.toBe(87_000);
  });

  it("ignores malformed and partial markers", async () => {
    const path = await temporaryLog([
      "[2026-08-10] <Controller> Processed height: 86000, 2.7%, 500 blocks/sec",
      "[2026-08-10] <Controller> Processed height: 999999999999999999999, 99.9%",
      "[2026-08-10] <Controller> Processed height: 87000,",
    ].join("\n"));

    await expect(createFulcrumLogProgress({ path }).getIndexedHeight()).resolves.toBe(86_000);
  });

  it("returns null when the log is absent or has no progress marker", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fulcrum-log-progress-missing-"));
    temporaryDirectories.push(directory);
    const progress = createFulcrumLogProgress({ path: join(directory, "missing.log") });

    await expect(progress.getIndexedHeight()).resolves.toBeNull();
  });
});
