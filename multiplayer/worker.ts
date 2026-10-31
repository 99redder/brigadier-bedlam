import { DurableObject } from "cloudflare:workers";
import { Battle, type Command, type Side } from "../src/sim/battle";
import {
  NET_VERSION,
  publicState,
  validCommand,
  type NetState,
  type Peer,
  type Phase,
  type Ticket,
} from "../src/net/protocol";
const ORIGINS = new Set([
  "https://99redder.github.io",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
const MAX_MATCH = 20 * 60_000,
  WAIT_LIMIT = 15 * 60_000,
  RECONNECT = 25_000;
function nameOf(v: unknown) {
  return typeof v === "string"
    ? v
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N} ._'’-]/gu, "")
        .trim()
        .slice(0, 20) || "Volunteer"
    : "Volunteer";
}
async function hash(s: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return [...new Uint8Array(bytes)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
function equal(a: string, b: string) {
  return (
    a.length === b.length &&
    crypto.subtle.timingSafeEqual(
      new TextEncoder().encode(a),
      new TextEncoder().encode(b),
    )
  );
}
export class Lobby extends DurableObject<MultiplayerEnv> {
  constructor(ctx: DurableObjectState, env: MultiplayerEnv) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,code TEXT UNIQUE,private INTEGER,created INTEGER)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS tickets(keyHash TEXT PRIMARY KEY,room TEXT,side INTEGER,name TEXT)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS rates(key TEXT PRIMARY KEY,hits INTEGER)",
    );
  }
  authorize(keyHash: string, room: string) {
    return (
      this.ctx.storage.sql
        .exec(
          "SELECT keyHash FROM tickets WHERE keyHash=? AND room=?",
          keyHash,
          room,
        )
        .toArray().length === 1
    );
  }
  cancel(keyHash: string) {
    const row = this.ctx.storage.sql
      .exec<
        Ticket & Record<string, SqlStorageValue>
      >("SELECT tickets.*,rooms.code FROM tickets JOIN rooms ON rooms.id=tickets.room WHERE keyHash=?", keyHash)
      .toArray()[0];
    this.ctx.storage.sql.exec("DELETE FROM tickets WHERE keyHash=?", keyHash);
    this.ctx.storage.sql.exec(
      "DELETE FROM rooms WHERE id NOT IN (SELECT room FROM tickets)",
    );
    return row ?? null;
  }
  join(
    keyHash: string,
    name: string,
    code: string,
    privateRoom: boolean,
    ip: string,
  ): Ticket {
    const sql = this.ctx.storage.sql,
      now = Date.now();
    sql.exec(
      "DELETE FROM tickets WHERE room IN (SELECT id FROM rooms WHERE created<?)",
      now - 60 * 60_000,
    );
    sql.exec("DELETE FROM rooms WHERE created<?", now - 60 * 60_000);
    const existing = sql
      .exec<
        Ticket & Record<string, SqlStorageValue>
      >("SELECT tickets.*,rooms.code FROM tickets JOIN rooms ON rooms.id=tickets.room WHERE keyHash=?", keyHash)
      .toArray()[0];
    if (existing) return existing;
    const key = `${Math.floor(now / 60_000)}:${ip}`;
    sql.exec(
      "INSERT INTO rates(key,hits) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET hits=hits+1",
      key,
    );
    if (
      sql
        .exec<{ hits: number }>("SELECT hits FROM rates WHERE key=?", key)
        .one().hits > 20
    )
      throw new Error("Please wait a minute before joining again.");
    sql.exec(
      "DELETE FROM rates WHERE key NOT LIKE ?",
      `${Math.floor(now / 60_000)}:%`,
    );
    let room: { id: string; code: string } | undefined;
    if (code) {
      room = sql
        .exec<{
          id: string;
          code: string;
        }>("SELECT id,code FROM rooms WHERE code=? AND private<>2", code)
        .toArray()[0];
      if (!room) throw new Error("Invite expired or not found.");
    } else if (!privateRoom)
      room = sql
        .exec<{
          id: string;
          code: string;
        }>(
          "SELECT rooms.id,rooms.code FROM rooms JOIN tickets ON rooms.id=tickets.room WHERE rooms.private=0 AND rooms.created>? GROUP BY rooms.id HAVING COUNT(*)=1 ORDER BY rooms.created LIMIT 1",
          now - WAIT_LIMIT,
        )
        .toArray()[0];
    if (!room) {
      if (sql.exec<{ n: number }>("SELECT COUNT(*) n FROM rooms").one().n >= 32)
        throw new Error("Test lobby is at capacity. Try again shortly.");
      room = {
        id: crypto.randomUUID(),
        code: crypto.randomUUID().replaceAll("-", "").slice(0, 12),
      };
      sql.exec(
        "INSERT INTO rooms VALUES(?,?,?,?)",
        room.id,
        room.code,
        privateRoom ? 1 : 0,
        now,
      );
    }
    const seats = sql
      .exec<{ side: Side }>("SELECT side FROM tickets WHERE room=?", room.id)
      .toArray();
    if (seats.length >= 2)
      throw new Error("This match already has two players.");
    const side: Side = seats.some((s) => s.side === 0) ? 1 : 0;
    const ticket = { keyHash, room: room.id, code: room.code, side, name };
    sql.exec(
      "INSERT INTO tickets VALUES(?,?,?,?)",
      keyHash,
      room.id,
      side,
      name,
    );
    if (seats.length === 1)
      sql.exec("UPDATE rooms SET private=2 WHERE id=?", room.id);
    return ticket;
  }
}
interface Seat {
  keyHash: string;
  name: string;
  ready: boolean;
  seq: number;
  lastSeen: number;
  disconnectedAt: number | null;
}
interface Stored {
  room: string;
  code: string;
  mapId: number;
  created: number;
  started: number;
  phase: Phase;
  reason: string;
  players: [Seat | null, Seat | null];
  battle: Record<string, unknown> | null;
}
export class Match extends DurableObject<MultiplayerEnv> {
  private data: Stored;
  private battle: Battle | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private lastCheckpoint = 0;
  private packets = 0;
  private bytes = 0;
  constructor(ctx: DurableObjectState, env: MultiplayerEnv) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS checkpoint(id INTEGER PRIMARY KEY,value TEXT)",
    );
    const row = ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM checkpoint WHERE id=1")
      .toArray()[0];
    this.data = row
      ? JSON.parse(row.value)
      : {
          room: "",
          code: "",
          mapId: 0,
          created: Date.now(),
          started: 0,
          phase: "waiting",
          reason: "",
          players: [null, null],
          battle: null,
        };
    if (this.data.battle) {
      const raw = this.data.battle;
      this.battle = Object.assign(
        new Battle(
          Number(raw.seed),
          0,
          false,
          10,
          { mapId: this.data.mapId, level: 1 },
          true,
        ),
        raw,
      );
    }
  }
  private save() {
    this.data.battle = this.battle
      ? JSON.parse(JSON.stringify(this.battle))
      : null;
    this.ctx.storage.sql.exec(
      "INSERT INTO checkpoint VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
      JSON.stringify(this.data),
    );
    this.lastCheckpoint = Date.now();
  }
  private sockets(side: Side) {
    return this.ctx
      .getWebSockets(`seat-${side}`)
      .filter((ws) => ws.readyState === 1);
  }
  async register(ticket: Ticket) {
    if (this.data.phase === "closed" || this.data.phase === "finished")
      throw new Error("Match ended. Join another lobby.");
    if (this.data.room && this.data.room !== ticket.room)
      throw new Error("Wrong match.");
    const existing = this.data.players[ticket.side];
    if (existing && !equal(existing.keyHash, ticket.keyHash))
      throw new Error("Seat already reserved.");
    this.data.room = ticket.room;
    this.data.code = ticket.code;
    if (!existing)
      this.data.players[ticket.side] = {
        keyHash: ticket.keyHash,
        name: ticket.name,
        ready: false,
        seq: 0,
        lastSeen: Date.now(),
        disconnectedAt: null,
      };
    this.save();
    await this.ctx.storage.setAlarm(
      this.data.phase === "playing"
        ? this.data.started + MAX_MATCH
        : this.data.created + WAIT_LIMIT,
    );
  }
  async abandon(keyHash: string) {
    const side = this.data.players.findIndex(
      (p) => p && equal(p.keyHash, keyHash),
    );
    if (side >= 0 && this.data.phase !== "finished")
      this.finish("Opponent left the match.", (side ^ 1) as Side);
  }
  async fetch(request: Request) {
    if (this.data.phase === "closed")
      return new Response("Match expired", { status: 410 });
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("WebSocket required", { status: 426 });
    const protocols = (request.headers.get("Sec-WebSocket-Protocol") ?? "")
      .split(",")
      .map((s) => s.trim());
    const token = protocols.find((p) => p.startsWith("auth."))?.slice(5);
    if (!protocols.includes("bedlam-v1") || !token || token.length > 100)
      return new Response("Invalid session", { status: 401 });
    const keyHash = await hash(token),
      side = this.data.players.findIndex((p) => p && equal(p.keyHash, keyHash));
    if (side < 0) return new Response("Unknown seat", { status: 403 });
    for (const old of this.sockets(side as Side))
      old.close(4002, "Connected from another tab");
    const pair = new WebSocketPair(),
      client = pair[0],
      server = pair[1];
    this.ctx.acceptWebSocket(server, [`seat-${side}`]);
    server.serializeAttachment({ side, window: Date.now(), messages: 0 });
    const seat = this.data.players[side as Side]!;
    seat.lastSeen = Date.now();
    seat.disconnectedAt = null;
    this.save();
    if (this.data.phase === "playing") this.startLoop();
    this.broadcast();
    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { "Sec-WebSocket-Protocol": "bedlam-v1" },
    });
  }
  private send(ws: WebSocket, side: Side) {
    const players = this.data.players.map((p, i) =>
      p
        ? {
            name: p.name,
            connected: this.sockets(i as Side).length > 0,
            ready: p.ready,
          }
        : null,
    ) as [Peer | null, Peer | null];
    const message: NetState = {
      type: "state",
      v: NET_VERSION,
      phase: this.data.phase,
      side,
      room: this.data.room,
      code: this.data.code,
      mapId: this.data.mapId,
      players,
      ack: this.data.players[side]?.seq ?? 0,
      state: this.battle ? publicState(this.battle, side) : null,
      reason: this.data.reason,
      serverNow: Date.now(),
    };
    const text = JSON.stringify(message);
    try {
      ws.send(text);
      this.bytes += text.length;
      this.packets++;
    } catch {
      /* close callback handles disconnected clients */
    }
  }
  private broadcast() {
    for (const side of [0, 1] as const)
      for (const ws of this.sockets(side)) this.send(ws, side);
  }
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const a = ws.deserializeAttachment() as {
      side: Side;
      window: number;
      messages: number;
    };
    if (typeof message !== "string" || message.length > 4096) {
      ws.close(1009, "Message too large");
      return;
    }
    const now = Date.now();
    if (now - a.window > 1000) {
      a.window = now;
      a.messages = 0;
    }
    if (++a.messages > 40) {
      ws.close(1008, "Too many commands");
      return;
    }
    ws.serializeAttachment(a);
    const seat = this.data.players[a.side];
    if (!seat) return;
    seat.lastSeen = now;
    if (this.data.phase === "playing") this.startLoop();
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(message);
    } catch {
      return;
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) return;
    if (input.type === "ping") {
      ws.send(JSON.stringify({ type: "pong", sent: input.sent }));
      return;
    }
    if (input.type === "leave") {
      this.finish("Opponent left the match.", (a.side ^ 1) as Side);
      return;
    }
    if (
      input.type === "ready" &&
      ["waiting", "ready"].includes(this.data.phase)
    ) {
      seat.ready = true;
      this.data.phase = this.data.players.every(Boolean) ? "ready" : "waiting";
      this.save();
      if (
        this.data.players.every(
          (p, i) => p?.ready && this.sockets(i as Side).length > 0,
        )
      ) {
        this.data.mapId = crypto.getRandomValues(new Uint32Array(1))[0] % 10;
        this.battle = new Battle(
          crypto.getRandomValues(new Uint32Array(1))[0],
          0,
          false,
          10,
          { mapId: this.data.mapId, level: 1 },
          true,
        );
        this.data.phase = "playing";
        this.data.started = now;
        this.save();
        this.startLoop();
        this.ctx.waitUntil(this.ctx.storage.setAlarm(now + MAX_MATCH));
      }
      this.broadcast();
      return;
    }
    if (
      input.type !== "command" ||
      this.data.phase !== "playing" ||
      !this.battle
    )
      return;
    if (!Number.isSafeInteger(input.seq) || Number(input.seq) <= seat.seq)
      return;
    if (!validCommand(input.command, this.battle, a.side)) {
      ws.send(
        JSON.stringify({
          type: "notice",
          text: "That order is not valid for your squad.",
        }),
      );
      return;
    }
    seat.seq = Number(input.seq);
    const previousNote = this.battle.log[0];
    this.battle.command(input.command as Command, false, a.side);
    if (this.battle.log[0] !== previousNote) {
      const text =
        a.side === 1
          ? this.battle.log[0].replace(/\b(Your|Enemy)\b/g, (word) =>
              word === "Your" ? "Enemy" : "Your",
            )
          : this.battle.log[0];
      ws.send(JSON.stringify({ type: "order", text }));
    }
    this.save();
    this.broadcast();
  }
  webSocketClose(ws: WebSocket) {
    this.disconnected(ws);
  }
  webSocketError(ws: WebSocket) {
    this.disconnected(ws);
  }
  private disconnected(ws: WebSocket) {
    if (this.data.phase === "closed" || this.data.phase === "finished") return;
    const a = ws.deserializeAttachment() as { side: Side } | null;
    if (!a || this.sockets(a.side).length) return;
    const seat = this.data.players[a.side];
    if (seat) seat.disconnectedAt = Date.now();
    this.save();
    this.broadcast();
    if (!this.sockets(0).length && !this.sockets(1).length) {
      this.stopLoop();
      this.ctx.waitUntil(this.ctx.storage.setAlarm(Date.now() + RECONNECT));
    }
  }
  private startLoop() {
    if (this.timer || !this.battle || this.data.phase !== "playing") return;
    this.lastTime = Date.now();
    this.accumulator = 0;
    this.timer = setInterval(() => this.advance(), 1000 / 30);
  }
  private stopLoop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  private advance() {
    const b = this.battle;
    if (!b || this.data.phase !== "playing") {
      this.stopLoop();
      return;
    }
    const now = Date.now();
    if (now - this.data.started > MAX_MATCH) {
      this.finish("Time limit reached. This test match is a draw.");
      return;
    }
    for (const side of [0, 1] as const) {
      const p = this.data.players[side]!;
      if (!this.sockets(side).length || now - p.lastSeen > 20_000) {
        p.disconnectedAt ??= now;
        if (now - p.disconnectedAt >= RECONNECT) {
          this.finish("Opponent disconnected.", (side ^ 1) as Side);
          return;
        }
      } else p.disconnectedAt = null;
    }
    this.accumulator += Math.min(500, now - this.lastTime);
    this.lastTime = now;
    let changed = false,
      steps = 0;
    while (this.accumulator >= 1000 / 30 && steps++ < 15) {
      const event = b.combatEventId,
        air = b.airstrikeEvents.at(-1)?.id,
        mortar = b.mortarEvents.at(-1)?.id;
      b.step();
      this.accumulator -= 1000 / 30;
      changed ||=
        event !== b.combatEventId ||
        air !== b.airstrikeEvents.at(-1)?.id ||
        mortar !== b.mortarEvents.at(-1)?.id;
      if (b.winner !== null) {
        this.finish("Squad defeated.", b.winner);
        return;
      }
    }
    if (now - this.lastCheckpoint > 1000) this.save();
    if (changed || b.tick % 3 === 0) this.broadcast();
  }
  private finish(reason: string, winner?: Side) {
    if (this.data.phase === "finished" || this.data.phase === "closed") return;
    this.stopLoop();
    this.data.phase = this.battle ? "finished" : "closed";
    this.data.reason = reason;
    if (this.battle && winner !== undefined) this.battle.winner = winner;
    this.save();
    this.broadcast();
    this.ctx.waitUntil(this.ctx.storage.setAlarm(Date.now() + 60_000));
    console.log(
      JSON.stringify({
        event: "match_finished",
        room: this.data.room,
        seconds: this.battle?.time ?? 0,
        packets: this.packets,
        bytes: this.bytes,
        reason,
      }),
    );
  }
  async alarm() {
    if (
      this.data.phase === "playing" &&
      (this.sockets(0).length || this.sockets(1).length) &&
      Date.now() - this.data.started < MAX_MATCH
    ) {
      this.startLoop();
      await this.ctx.storage.setAlarm(this.data.started + MAX_MATCH);
      return;
    }
    if (this.data.phase === "finished" || this.data.phase === "closed") {
      this.stopLoop();
      for (const ws of this.ctx.getWebSockets())
        try {
          ws.close(1000, "Match complete");
        } catch {}
      if (
        this.data.phase === "closed" &&
        !this.battle &&
        Date.now() - this.data.created > 60 * 60_000
      ) {
        await this.ctx.storage.deleteAll();
        return;
      }
      this.data.phase = "closed";
      this.battle = null;
      this.save();
      await this.ctx.storage.setAlarm(this.data.created + 61 * 60_000);
      return;
    }
    this.finish("Waiting session expired. Find another opponent.");
  }
}
async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request");
  let text = "",
    size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 2048) {
      await reader.cancel();
      throw new Error("Request too large");
    }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid request");
  return parsed as Record<string, unknown>;
}
export default {
  async fetch(request: Request, env: MultiplayerEnv): Promise<Response> {
    const origin = request.headers.get("Origin"),
      url = new URL(request.url);
    if (origin && !ORIGINS.has(origin))
      return new Response("Origin not allowed", { status: 403 });
    const headers = {
      "Access-Control-Allow-Origin": origin ?? "https://99redder.github.io",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
      "Cache-Control": "no-store",
    };
    const json = (data: unknown, status = 200) =>
      Response.json(data, { status, headers });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (url.pathname === "/health")
      return json({ ok: true, version: NET_VERSION });
    const match = url.pathname.match(/^\/match\/([a-f0-9-]{36})$/);
    if (match) {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
        return json({ error: "WebSocket required" }, 426);
      const protocols = (request.headers.get("Sec-WebSocket-Protocol") ?? "")
        .split(",")
        .map((p) => p.trim());
      const token = protocols.find((p) => p.startsWith("auth."))?.slice(5);
      if (!protocols.includes("bedlam-v1") || !token || token.length > 100)
        return json({ error: "Invalid session" }, 401);
      if (
        !(await env.LOBBY.getByName("test-us-east").authorize(
          await hash(token),
          match[1],
        ))
      )
        return json({ error: "Unknown seat" }, 403);
      return env.MATCHES.getByName(match[1], { locationHint: "enam" }).fetch(
        request,
      );
    }
    if (
      request.method !== "POST" ||
      !["/queue", "/cancel"].includes(url.pathname)
    )
      return json({ error: "Not found" }, 404);
    try {
      const input = await body(request);
      if (typeof input.key !== "string" || !/^[-a-f0-9]{36}$/.test(input.key))
        return json({ error: "Invalid session" }, 400);
      const keyHash = await hash(input.key),
        lobby = env.LOBBY.getByName("test-us-east");
      if (url.pathname === "/cancel" || input.force === true) {
        const old = await lobby.cancel(keyHash);
        if (old)
          await env.MATCHES.getByName(old.room, {
            locationHint: "enam",
          }).abandon(keyHash);
        if (url.pathname === "/cancel") return json({ ok: true });
      }
      const code =
        typeof input.invite === "string"
          ? input.invite.trim().toLowerCase()
          : "";
      if (code && !/^[a-f0-9]{12}$/.test(code))
        return json({ error: "Invalid invite code" }, 400);
      const ip = await hash(request.headers.get("CF-Connecting-IP") ?? "local");
      const ticket = await lobby.join(
        keyHash,
        nameOf(input.name),
        code,
        input.private === true,
        ip,
      );
      try {
        await env.MATCHES.getByName(ticket.room, {
          locationHint: "enam",
        }).register(ticket);
      } catch {
        await lobby.cancel(keyHash);
        return json(
          { error: "Previous match ended. Please join again.", retry: true },
          410,
        );
      }
      const { keyHash: _, ...publicTicket } = ticket;
      return json(publicTicket);
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error ? error.message : "Could not join the lobby",
        },
        400,
      );
    }
  },
} satisfies ExportedHandler<MultiplayerEnv>;
