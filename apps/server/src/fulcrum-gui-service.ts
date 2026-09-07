import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { deriveIndexerStatus, type IndexerStatus } from "../../../packages/contracts/src/status.js";
import type { FulcrumGuiService } from "./app.js";
import type { FulcrumStatsClient } from "./fulcrum-stats-client.js";

export interface BitcoinCoreClient {
  getBlockchainInfo(): Promise<{ blocks: number; initialblockdownload: boolean }>;
  getTxIndexInfo(): Promise<{ synced: boolean; bestBlockHeight: number | null } | null>;
}
export interface FulcrumClient { getTip(): Promise<number>; getVersion(): Promise<string> }

function activeProviderProgress(indexedHeight: number | null | undefined, coreHeight: number): number | null {
  if (indexedHeight === null || indexedHeight === undefined) return null;
  // Provider stats can prove incomplete work, but never readiness. If their
  // height has caught or passed this Core snapshot, wait for the live listener
  // (or a newer Core snapshot) instead of deriving ready from telemetry.
  return indexedHeight < coreHeight ? indexedHeight : null;
}

export function createFulcrumGuiService({ core, fulcrum, progress, connections }: {
  core: BitcoinCoreClient; fulcrum: FulcrumClient; progress?: FulcrumStatsClient; connections: ConnectionDetails;
}): FulcrumGuiService {
  let wasReady = false;
  async function requiredCoreIndexStatus(coreHeight: number): Promise<IndexerStatus | null> {
    try {
      const index = await core.getTxIndexInfo();
      if (!index) return { state: "degraded", version: null, coreHeight, indexedHeight: null, percent: null, message: "Bitcoin Core transaction index is unavailable" };
      if (!index.synced) return { state: "waiting-for-core", version: null, coreHeight, indexedHeight: null, percent: null, message: "Waiting for Bitcoin Core transaction index" };
      return null;
    } catch {
      return { state: "degraded", version: null, coreHeight, indexedHeight: null, percent: null, message: "Bitcoin Core transaction index is unavailable" };
    }
  }
  async function providerProgress(coreHeight: number): Promise<number | null> {
    try {
      const current = await progress?.getProgress();
      return activeProviderProgress(current?.indexedHeight, coreHeight);
    } catch { return null; }
  }

  return {
    getConnections: () => connections,
    getLegacyVersion: () => fulcrum.getVersion(),
    async getLegacySyncPercent() {
      const coreInfo = await core.getBlockchainInfo();
      const dependency = await requiredCoreIndexStatus(coreInfo.blocks);
      if (dependency) return 0;
      try {
        await fulcrum.getVersion();
        return ((await fulcrum.getTip()) / coreInfo.blocks) * 100;
      } catch (error) {
        const indexedHeight = await providerProgress(coreInfo.blocks);
        if (indexedHeight === null) throw error;
        return (indexedHeight / coreInfo.blocks) * 100;
      }
    },
    async getStatus(): Promise<IndexerStatus> {
      let coreInfo: { blocks: number; initialblockdownload: boolean };
      try { coreInfo = await core.getBlockchainInfo(); }
      catch { return { state: "degraded", version: null, coreHeight: null, indexedHeight: null, percent: null, message: "Bitcoin Core is unavailable" }; }

      const dependency = await requiredCoreIndexStatus(coreInfo.blocks);
      if (dependency) return dependency;
      try {
        const [indexedHeight, version] = await Promise.all([fulcrum.getTip(), Promise.resolve().then(() => fulcrum.getVersion()).catch(() => null)]);
        const status = deriveIndexerStatus({ coreHeight: coreInfo.blocks, indexedHeight, initialBlockDownload: false, version });
        if (status.state === "ready") wasReady = true;
        return status;
      } catch {
        const indexedHeight = await providerProgress(coreInfo.blocks);
        if (indexedHeight !== null) {
          return { ...deriveIndexerStatus({ coreHeight: coreInfo.blocks, indexedHeight, initialBlockDownload: false, version: null }), message: "Indexing Fulcrum transaction history" };
        }
        if (wasReady) return { state: "degraded", version: null, coreHeight: coreInfo.blocks, indexedHeight: null, percent: null, message: "Fulcrum is unavailable" };
        return deriveIndexerStatus({ coreHeight: coreInfo.blocks, indexedHeight: null, initialBlockDownload: false, version: null });
      }
    },
  };
}
