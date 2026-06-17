// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expirationTime = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expirationTime)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sets a cookie named auth-token", async () => {
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
  });

  test("token is a valid JWT (three dot-separated parts)", async () => {
    await createSession("user-1", "user@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  test("cookie is httpOnly with lax sameSite and root path", async () => {
    await createSession("user-1", "user@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie expires in approximately 7 days", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    expect(options.expires).toBeInstanceOf(Date);
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  test("cookie is not secure outside production", async () => {
    const original = process.env.NODE_ENV;
    // jsdom sets NODE_ENV to "test"
    await createSession("user-1", "user@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(false);
    process.env.NODE_ENV = original;
  });

  test("encodes userId and email inside the token", async () => {
    await createSession("user-42", "hello@test.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@test.com");
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no auth-token cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when the token is malformed", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.jwt" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when the token is expired", async () => {
    const expiredToken = await makeToken(
      { userId: "user-1", email: "user@example.com" },
      "0s"
    );
    mockCookieStore.get.mockReturnValue({ value: expiredToken });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-99", email: "test@example.com" });
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("test@example.com");
  });

  test("looks up the auth-token cookie by name", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    await getSession();

    expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
  });
});
