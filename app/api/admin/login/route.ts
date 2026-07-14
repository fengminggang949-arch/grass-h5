import { NextRequest, NextResponse } from "next/server";
import { adminToken, verifyAdminCredentials } from "@/lib/admin-auth";
import { allowRequest } from "@/lib/rate-limit";

function shouldUseSecureCookie(request: NextRequest) {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProtocol) {
    return forwardedProtocol === "https";
  }

  return request.nextUrl.protocol === "https:";
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  if (!allowRequest(`admin:${ip}`, 5, 300_000)) {
    return NextResponse.json({ message: "尝试次数过多" }, { status: 429 });
  }

  const { username, password } = await request.json();
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ message: "请输入用户名和密码" }, { status: 400 });
  }
  const admin = await verifyAdminCredentials(username.slice(0, 80), password.slice(0, 100));
  if (!admin) {
    return NextResponse.json({ message: "用户名或密码不正确" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, username: admin.username });
  response.cookies.set("recommendation_admin", adminToken(admin), {
    httpOnly: true,
    sameSite: "strict",
    secure: shouldUseSecureCookie(request),
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("recommendation_admin", "", {
    httpOnly: true,
    sameSite: "strict",
    secure: shouldUseSecureCookie(request),
    maxAge: 0,
    path: "/",
  });
  return response;
}
