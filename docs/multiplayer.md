# Multiplayer beta — v0.48

## Play

- Title → Multiplayer beta → Find opponent matches the next two waiting players. Create private friend lobby stays outside public matchmaking. Copy friend invite shares a link opening the invite form; joining still requires an explicit click.
- Optional call sign; no account. Two players press Ready before the ten-second deployment countdown begins. Each side gets one Rifleman, Bazooka, Lobber, Torch and Sapper, with identical class stats and rules on one random map. The local squad always appears green, including when starting on the east/south edge.
- Existing individual orders, squad moves, facing, Fire all, cover, dropped gear, rewards, medics, brawls and manual Torch controls work online. No campaign AI, enemy elite bonuses, luck boosts or easier enemy collision rules. No pause in multiplayer; menus/manuals and switching tabs do not stop the server.
- A disconnected commander gets 25 seconds after detection to reconnect before forfeiting. Refresh, open Multiplayer and choose Reconnect previous match in the same tab/session. Connection trouble is shown on the HUD. A closed browser session may lose its anonymous seat credential. Opening the same seat twice replaces the older connection.
- Matches are unranked single rounds; campaign progress and shared campaign scores are separate. Return to multiplayer to find another match or create a fresh invite. There is no automatic rematch, spectator mode, region picker, skill matchmaking, chat or cross-device account recovery yet.

## Architecture and boundaries

`brigadier-bedlam-multiplayer.99redder.workers.dev` is separate from the existing scores Worker and D1 database. The static frontend remains on GitHub Pages. `VITE_MULTIPLAYER_URL` overrides the API for local testing.

The Lobby Durable Object serializes queue assignment in synchronous SQLite operations. One Match Durable Object owns each battle and its two seats. Only the Worker can register a seat through service RPC. The random per-tab bearer credential is sent in the WebSocket subprotocol, never in invite URLs; only its SHA-256 digest is stored on the server. The public invite code is not a seat credential. Names are normalized, bounded and HTML-escaped. HTTP origins, message size/rate, command shape, world bounds and squad ownership are checked. Client-supplied health, hits, positions or randomness cannot alter the simulation.

Both humans use the shared Battle simulation at 30 Hz. Snapshots are normally sent at 10 Hz, with extra snapshots for accepted orders and weapon/support events. Clients interpolate troop positions; they do not simulate combat or predict hits. Commands have monotonic per-seat sequence numbers and acknowledged commands are not replayed after reconnects. Public snapshots omit the RNG, replay history and enemy movement/facing orders; unlaunched mortar landing points are concealed. Match state and RNG are checkpointed every second and after accepted orders, so an instance restart can resume on the next socket event. A restart may roll back up to one second of unacknowledged world progress; this is a testing beta, not ranked play.

Match placement requests Cloudflare's eastern North America location hint. It is a hint, not a guaranteed region. One room remains in one location; this beta does not optimize match placement by both players' RTT. Internet latency and real-world play still need testing. Ping on the HUD is the measured WebSocket round-trip time, not the entire input-to-display latency (which also includes snapshots/interpolation).

## Workload limits and cleanup

- Public waiting sessions expire after 15 minutes; games stop after 20 minutes with a draw.
- If both sockets close, the active simulation interval stops immediately. A 25-second alarm closes an abandoned session; a single disconnected player forfeits after the grace period.
- Completed games stop simulation immediately, close remaining sockets after 60 seconds, and discard the battle checkpoint. A small closed tombstone prevents reopening a completed match; it expires after about an hour. Lobby records are pruned after 60 minutes on queue activity. Idle waiters use hibernating WebSockets, with small five-second heartbeat messages while the page is connected.
- At most 32 retained lobby rooms; joins limited to 20/minute/IP. Socket input is limited to 40 messages/second and 4 KB/message; HTTP bodies are limited to 2 KB. These are beta bounds, not a Cloudflare billing cap or complete abuse protection.
- The existing paid Workers account supplies the deployment. Test traffic is expected to be small, but no zero-cost guarantee is made: Durable Object active duration/requests/storage and any other account workloads determine usage. Active matches stay awake for simulation; hibernation saves idle time, not active play. Review the new Worker's invocation/CPU metrics and Durable Object usage in the Cloudflare dashboard after test sessions. No extra paid service, TURN relay, database subscription or machine is required for this version.
- Sampled Workers observability is enabled. End-of-match logs include room ID, simulated seconds, packet count and approximate outbound text bytes, without bearer credentials.

## Development and checks

Use Node 22 and `npm ci`. In separate terminals:

```sh
npm run multiplayer:dev
VITE_MULTIPLAYER_URL=http://127.0.0.1:8792 npm run dev -- --host 127.0.0.1 --port 5173
```

Open two separate browser sessions. The local Worker allows the localhost/127.0.0.1 frontend origins on port 5173. Local Durable Object state lives in `.wrangler` under the multiplayer configuration and never changes production scores.

```sh
npm test
npm run multiplayer:check
npm run leaderboard:check
npm run build
npm run multiplayer:smoke
```

The smoke command requires the local Worker running. It exercises actual WebSocket/SQLite Durable Objects, including concurrent pairing, friend invites, origin and seat authentication, readiness, both commanders' orders, rejected enemy orders, synchronized GO, reconnect, forfeit and keeping matched rooms out of the queue. It cancels every seat it creates, including on failure. Unit tests cover equal rules, independent selections, ownership validation, private state redaction and checkpoint reproducibility.

Generate platform/binding types with `npm run multiplayer:types` after changing Wrangler bindings/configuration. Compatibility date intentionally matches the installed Wrangler/workerd runtime (2026-03-17).

## Deploy

```sh
npm run multiplayer:deploy
MULTIPLAYER_URL=https://brigadier-bedlam-multiplayer.99redder.workers.dev npm run multiplayer:smoke
```

This creates/deploys only the dedicated multiplayer Worker and its two SQLite Durable Object namespaces. It does not deploy the scores Worker. Worker credentials stay local; no Cloudflare token is bundled into the client. GitHub Actions checks multiplayer types along with the game and leaderboard, then publishes the static frontend on pushes to main. Deploy backend changes explicitly before the compatible frontend. Do not run synthetic leaderboard writes during multiplayer QA.
