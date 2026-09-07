import { constants } from "node:fs";
import { open } from "node:fs/promises";

const MAX_TAIL_BYTES = 256 * 1024;
const processedHeightPattern = /<Controller>\s+Processed height:\s+(\d+),\s+\d+(?:\.\d+)?%,/;

export interface FulcrumLogProgress {
  getIndexedHeight(): Promise<number | null>;
}

export function createFulcrumLogProgress({
  path,
  maxTailBytes = MAX_TAIL_BYTES,
}: {
  path: string;
  maxTailBytes?: number;
}): FulcrumLogProgress {
  return {
    async getIndexedHeight() {
      let file;
      try {
        file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
        const stats = await file.stat();
        if (!stats.isFile() || stats.size <= 0) return null;

        const length = Math.min(stats.size, maxTailBytes);
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await file.read(buffer, 0, length, stats.size - length);
        const lines = buffer.subarray(0, bytesRead).toString("utf8").split("\n");

        for (let index = lines.length - 1; index >= 0; index -= 1) {
          const match = processedHeightPattern.exec(lines[index] ?? "");
          if (!match) continue;
          const height = Number(match[1]);
          if (Number.isSafeInteger(height) && height >= 0) return height;
        }
        return null;
      } catch {
        return null;
      } finally {
        await file?.close().catch(() => undefined);
      }
    },
  };
}
