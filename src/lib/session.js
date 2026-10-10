import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "session";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days, in seconds

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getKey());
}

// Returns the payload, or null if the token is missing, expired or tampered with.
export async function decrypt(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId) {
  const token = await encrypt({ userId });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession() {
  return decrypt((await cookies()).get(COOKIE_NAME)?.value);
}

// For API routes: the logged-in user's id, or a 401 response to return as-is.
export async function requireUser() {
  const session = await getSession();
  if (session?.userId) return { userId: session.userId, response: null };
  return {
    userId: null,
    response: Response.json(
      { error: "Your session has expired. Please log in again." },
      { status: 401 },
    ),
  };
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_NAME);
}
