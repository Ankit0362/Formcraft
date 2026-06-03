import { NextResponse } from "next/server";

// Clears the fc_session cookie on the Next.js domain.
// Must be called client-side on logout alongside the tRPC logout mutation.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("fc_session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
