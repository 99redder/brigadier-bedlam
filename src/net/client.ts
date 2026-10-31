import { type Command, type Side } from "../sim/battle";
import { fromView, type NetState } from "./protocol";
export const MULTIPLAYER_URL =
  import.meta.env.VITE_MULTIPLAYER_URL ||
  "https://brigadier-bedlam-multiplayer.99redder.workers.dev";
const SESSION = "bedlam-multiplayer-v1";
interface Session {
  key: string;
  room: string;
  code: string;
  side: Side;
  name: string;
}
export class MultiplayerClient {
  session: Session | null = null;
  state: NetState | null = null;
  status = "Choose a lobby or invite a friend.";
  ping = 0;
  busy = false;
  private socket: WebSocket | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private reconnectUntil = 0;
  private seq = 0;
  private pending = new Map<number, Command>();
  private generation = 0;
  onState = (state: NetState) => {};
  onOrder = (text: string) => {};
  onChange = () => {};
  constructor() {
    try {
      this.session = JSON.parse(sessionStorage.getItem(SESSION) || "null");
    } catch {}
  }
  get active() {
    return !!this.socket || !!this.retry || this.busy;
  }
  private remember() {
    try {
      if (this.session)
        sessionStorage.setItem(SESSION, JSON.stringify(this.session));
      else sessionStorage.removeItem(SESSION);
    } catch {}
  }
  private async post(path: string, data: unknown) {
    const r = await fetch(`${MULTIPLAYER_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await r.json();
    if (!r.ok)
      throw new Error(body.error || "Lobby unavailable. Please try again.");
    return body;
  }
  async join(name: string, invite = "", privateRoom = false, resume = false) {
    if (this.busy) return;
    this.disconnect();
    this.busy = true;
    this.status = "Contacting the dispatch desk…";
    this.onChange();
    const generation = this.generation;
    const key = this.session?.key ?? crypto.randomUUID();
    try {
      const ticket = await this.post("/queue", {
        key,
        name,
        invite,
        private: privateRoom,
        force: !resume,
      });
      if (generation !== this.generation) {
        void this.post("/cancel", { key }).catch(() => {});
        return;
      }
      this.session = { ...ticket, key };
      this.remember();
      this.seq = 0;
      this.pending.clear();
      this.state = null;
      this.reconnectUntil = Date.now() + 25_000;
      this.connect();
    } catch (e) {
      this.status = e instanceof Error ? e.message : "Could not connect.";
    } finally {
      this.busy = false;
      this.onChange();
    }
  }
  private connect() {
    const session = this.session;
    if (!session) return;
    const generation = this.generation;
    let resumed = false,
      opened = false;
    this.status = "Connecting to your match…";
    this.onChange();
    const ws = new WebSocket(
      `${MULTIPLAYER_URL.replace(/^http/, "ws")}/match/${session.room}`,
      ["bedlam-v1", `auth.${session.key}`],
    );
    this.socket = ws;
    ws.onopen = () => {
      if (generation !== this.generation) return;
      opened = true;
      this.status = "Connected";
      this.reconnectUntil = Date.now() + 25_000;
      this.heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: "ping", sent: Date.now() }));
      }, 5000);
      this.onChange();
    };
    ws.onmessage = (event) => {
      if (generation !== this.generation) return;
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.type === "pong") {
        this.ping = Math.max(0, Date.now() - message.sent);
        return;
      }
      if (message.type === "order") {
        this.onOrder(message.text);
        return;
      }
      if (message.type === "notice") {
        this.status = message.text;
        this.onChange();
        return;
      }
      if (message.type !== "state" || message.v !== 1) return;
      const state = message as NetState;
      this.state = state;
      this.seq = Math.max(this.seq, state.ack);
      for (const n of this.pending.keys())
        if (n <= state.ack) this.pending.delete(n);
      const previousStatus = this.status;
      this.status =
        state.phase === "closed"
          ? state.reason
          : state.phase === "finished"
            ? state.reason
            : state.phase === "playing"
              ? state.players[(state.side ^ 1) as Side]?.connected
                ? "Connected"
                : "Opponent disconnected. Reconnection grace period: 25 seconds."
              : state.players.every(Boolean)
                ? "Opponent found. Both commanders must press Ready."
                : "Waiting for another commander…";
      this.onState(state);
      if (state.phase === "playing" && previousStatus !== this.status)
        this.onChange();
      if (!resumed) {
        resumed = true;
        if (state.phase === "playing")
          for (const [seq, command] of this.pending)
            ws.send(JSON.stringify({ type: "command", seq, command }));
      }
    };
    ws.onclose = (event) => {
      if (generation !== this.generation) return;
      this.socket = null;
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.heartbeat = null;
      if (this.state?.phase === "finished" || this.state?.phase === "closed") {
        this.onChange();
        return;
      }
      if (event.code === 4002) {
        this.status = "This match was opened in another tab.";
        this.onChange();
        return;
      }
      if (opened) this.reconnectUntil = Date.now() + 25_000;
      if (Date.now() < this.reconnectUntil) {
        this.status = "Connection interrupted. Rejoining your squad…";
        this.retry = setTimeout(() => {
          this.retry = null;
          this.connect();
        }, 1200);
      } else
        this.status =
          "Connection lost. Return to the lobby to reconnect or find another match.";
      this.onChange();
    };
    ws.onerror = () => {};
  }
  ready() {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify({ type: "ready" }));
  }
  command(c: Command) {
    if (
      !this.session ||
      this.state?.phase !== "playing" ||
      this.socket?.readyState !== WebSocket.OPEN
    )
      return false;
    const command = fromView(c, this.session.side),
      seq = ++this.seq;
    this.pending.set(seq, command);
    this.socket.send(JSON.stringify({ type: "command", seq, command }));
    return true;
  }
  private disconnect() {
    this.generation++;
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }
  leave() {
    const session = this.session;
    this.disconnect();
    this.session = null;
    this.state = null;
    this.pending.clear();
    this.remember();
    this.status = "Choose a lobby or invite a friend.";
    if (session)
      void this.post("/cancel", { key: session.key }).catch(() => {});
  }
}
