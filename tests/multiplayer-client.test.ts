import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { MultiplayerClient } from "../src/net/client";
import { type NetState } from "../src/net/protocol";
class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  onopen: (() => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor(
    readonly url: string,
    readonly protocols: string[],
  ) {
    Socket.instances.push(this);
  }
  send(text: string) {
    this.sent.push(JSON.parse(text));
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1006 });
  }
  state(ack = 0) {
    this.onmessage?.({
      data: JSON.stringify({
        type: "state",
        v: 1,
        phase: "playing",
        side: 1,
        room: "room",
        code: "code",
        mapId: 0,
        players: [
          { name: "Other", connected: true, ready: true },
          { name: "Me", connected: true, ready: true },
        ],
        ack,
        state: null,
        reason: "",
        serverNow: Date.now(),
      } satisfies NetState),
    });
  }
}
const ticket = { room: "room", code: "code", side: 1, name: "Me" };
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("sessionStorage", {
    getItem: () => null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(ticket)),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("multiplayer browser connection", () => {
  it("reconnects even when a match has already been running longer than the grace window", async () => {
    const client = new MultiplayerClient();
    await client.join("Me");
    const socket = Socket.instances[0];
    socket.open();
    socket.state();
    await vi.advanceTimersByTimeAsync(90_000);
    socket.close();
    expect(client.status).toContain("Rejoining");
    await vi.advanceTimersByTimeAsync(1200);
    expect(Socket.instances).toHaveLength(2);
    client.leave();
  });
  it("maps commands to the assigned side and resends unacknowledged orders only once per reconnect", async () => {
    const client = new MultiplayerClient();
    await client.join("Me");
    const socket = Socket.instances[0];
    socket.open();
    socket.state();
    expect(
      client.command({ type: "move", id: 0, point: { x: 200, y: 200 } }),
    ).toBe(true);
    expect(socket.sent.at(-1)).toMatchObject({
      type: "command",
      seq: 1,
      command: { id: 5 },
    });
    socket.close();
    expect(client.command({ type: "select", id: 1 })).toBe(false);
    await vi.advanceTimersByTimeAsync(1200);
    const replacement = Socket.instances[1];
    replacement.open();
    replacement.state();
    replacement.state();
    expect(replacement.sent.filter((m) => m.type === "command")).toHaveLength(
      1,
    );
    replacement.state(1);
    replacement.close();
    await vi.advanceTimersByTimeAsync(1200);
    const third = Socket.instances[2];
    third.open();
    third.state(1);
    expect(third.sent.filter((m) => m.type === "command")).toHaveLength(0);
    client.leave();
  });
  it("does not open a socket after cancelling a queue request that is still in flight", async () => {
    let resolve!: (r: Response) => void;
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((r) => {
            resolve = r;
          }),
      )
      .mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    const client = new MultiplayerClient();
    const joining = client.join("Me");
    client.leave();
    resolve(Response.json(ticket));
    await joining;
    expect(Socket.instances).toHaveLength(0);
    expect(fetch.mock.calls[1][0]).toMatch(/\/cancel$/);
    expect(client.active).toBe(false);
  });
});
