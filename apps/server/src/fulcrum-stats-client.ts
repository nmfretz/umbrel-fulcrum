import { z } from "zod";

const statsSchema = z.object({
  Controller: z.object({
    "Header count": z.number().int().nonnegative(),
    StateMachine: z.object({
      State: z.string().min(1),
      Height: z.number().int().nonnegative(),
    }).nullable().optional(),
  }),
});

export interface FulcrumProgress { indexedHeight: number | null; targetHeight: number | null; phase: string | null }
export interface FulcrumStatsClient { getProgress(): Promise<FulcrumProgress> }

export function createFulcrumStatsClient({ host, port, fetchFn = fetch, timeoutMs = 5_000 }: {
  host: string;
  port: number;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): FulcrumStatsClient {
  return {
    async getProgress() {
      let response: Response;
      try {
        response = await fetchFn(`http://${host}:${port}/stats`, { redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
      } catch {
        throw new Error("Fulcrum stats request failed");
      }
      if (!response.ok) throw new Error("Fulcrum stats request failed");
      let parsed: z.infer<typeof statsSchema>;
      try {
        parsed = statsSchema.parse(await response.json());
      } catch {
        throw new Error("Fulcrum stats response was invalid");
      }
      const stateMachine = parsed.Controller.StateMachine ?? null;
      return {
        indexedHeight: parsed.Controller["Header count"] === 0 ? null : parsed.Controller["Header count"] - 1,
        targetHeight: stateMachine?.Height ?? null,
        phase: stateMachine?.State ?? null,
      };
    },
  };
}
