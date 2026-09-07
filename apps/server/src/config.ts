import { z } from "zod";

const port = z.coerce.number().int().min(1).max(65535);
const nonempty = z.string().trim().min(1);

const environmentSchema = z.object({
  PORT: port.default(3006),
  FULCRUM_HOST: nonempty.optional(),
  ELECTRUM_HOST: nonempty.optional(),
  FULCRUM_PORT: port.optional(),
  FULCRUM_STATS_HOST: nonempty.optional(),
  FULCRUM_STATS_PORT: port.default(8080),
  ELECTRUM_PORT: port.optional(),
  ELECTRUM_PUBLIC_CONNECTION_PORT: port.optional(),
  ELECTRUM_LOCAL_SERVICE: nonempty.default("umbrel.local"),
  ELECTRUM_HIDDEN_SERVICE: nonempty.default("/var/lib/tor/electrum/hostname"),
  BITCOIN_HOST: nonempty.default("172.28.0.2"),
  RPC_PORT: port.default(18443),
  RPC_USER: nonempty.default("umbrel"),
  RPC_PASSWORD: nonempty,
});

export type ServerConfig = ReturnType<typeof readConfig>;

export function readConfig(environment: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    throw new Error("Invalid Fulcrum GUI configuration");
  }

  const publicPort = parsed.data.ELECTRUM_PORT ?? parsed.data.ELECTRUM_PUBLIC_CONNECTION_PORT ?? 50002;

  return {
    port: parsed.data.PORT,
    fulcrum: {
      host: parsed.data.FULCRUM_HOST ?? parsed.data.ELECTRUM_HOST ?? "0.0.0.0",
      port: parsed.data.FULCRUM_PORT ?? publicPort,
    },
    fulcrumStats: {
      host: parsed.data.FULCRUM_STATS_HOST ?? parsed.data.FULCRUM_HOST ?? parsed.data.ELECTRUM_HOST ?? "0.0.0.0",
      port: parsed.data.FULCRUM_STATS_PORT,
    },
    connections: {
      localHost: parsed.data.ELECTRUM_LOCAL_SERVICE,
      torHost: parsed.data.ELECTRUM_HIDDEN_SERVICE,
      port: publicPort,
    },
    core: {
      host: parsed.data.BITCOIN_HOST,
      port: parsed.data.RPC_PORT,
      username: parsed.data.RPC_USER,
      password: parsed.data.RPC_PASSWORD,
    },
  };
}
