# Fulcrum for Bitcoin on Umbrel

A modern, independently maintained Bitcoin Fulcrum status and wallet-connection interface for Umbrel.

## Provenance and scope

This repository is a GUI/backend-facade modernization of `nmfretz/umbrel-fulcrum@349e24666fe9cd819015e845612c3ff7e5340c0c`, the exact source behind the canonical `nmfretz/umbrel-fulcrum:1.0.1` GUI lineage. The canonical Umbrel package currently pins `cculianu/Fulcrum v2.1.2`; this candidate retains that daemon version and its wallet/admin topology.

The modernization preserves Bitcoin branding, Core RPC semantics, environment variables, ports, endpoints, and connection behavior while updating the architecture and interaction model.

## Interface

- React 19, TypeScript, Vite, Fastify 5, TanStack Query, Radix UI, and Zod;
- Umbrel Bitcoin Core-inspired orange semantic UI with Fulcrum's original product artwork;
- provider-driven Core IBD, Core transaction-index processing, Fulcrum connecting/indexing/synchronized, and degraded states;
- exactly six progress blocks with independent progress and motion layers;
- accessible Local and Tor details, plain-HTTP clipboard fallback, and locally generated QR codes;
- no telemetry and no logging of request paths, RPC payloads, wallet information, credentials, or daemon responses;
- compatibility routes retained for existing Umbrel health and integration checks.

## Runtime contract

The canonical Umbrel package supplies:

- `PORT` for the GUI service, normally `3006`;
- `ELECTRUM_HOST` for the private Fulcrum service, with `FULCRUM_HOST` retained as a compatibility alias;
- `FULCRUM_PORT` for the private Fulcrum listener (defaulting to the advertised wallet port);
- `BITCOIN_HOST`, `RPC_PORT`, `RPC_USER`, and required `RPC_PASSWORD` for scoped Bitcoin Core access;
- `ELECTRUM_PUBLIC_CONNECTION_PORT` (or `ELECTRUM_PORT`), `ELECTRUM_LOCAL_SERVICE`, and `ELECTRUM_HIDDEN_SERVICE` for wallet instructions.

The Bitcoin wallet port is `50002`; Fulcrum administration remains private on `8000`. The backend requests Bitcoin Core `getblockchaininfo` and `getindexinfo("txindex")`, plus Fulcrum `server.version` / `blockchain.headers.subscribe`, through bounded native HTTP/TCP clients. Core transaction-index percentages are emitted only when Core supplies `best_block_height`; Fulcrum initial-index percentages come only from its live tip or the canonical package's bounded mounted-log fallback.

## Compatibility routes

- `GET /ping`;
- `GET /v1/fulcrum/electrum-connection-details`;
- `GET /v1/fulcrum/version`;
- `GET /v1/fulcrum/syncPercent`.

## Development

Requires Node.js 24 and npm 12.0.2.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

`docker compose up --build` provides an inert local regtest topology with the retained Fulcrum `2.1.2` daemon. It is not an Umbrel deployment recipe.

## Container

The production image uses digest-pinned Node 24 build stages and a Distroless Node 24 Debian 13 runtime, installs only production dependencies, runs as UID/GID `1000:1000`, and exposes only GUI port `3006`.

Image publication is intentionally left to the upstream maintainers.

## License

This repository retains the inherited PolyForm Noncommercial License 1.0.0. See [`LICENSE.md`](LICENSE.md), [`LICENSE.legacy`](LICENSE.legacy), and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
