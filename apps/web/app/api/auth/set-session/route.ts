import { type NextRequest, NextResponse } from "next/server";

// This route stamps the fc_session cookie on the Next.js domain
// after a successful login via the Express API backend.
// It accepts the raw encrypted session token and sets it as HttpOnly.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.sessionToken as string | undefined;

  if (!token || typeof token !== "string" || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("fc_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
