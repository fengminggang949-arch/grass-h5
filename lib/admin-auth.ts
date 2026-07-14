import { createHmac, timingSafeEqual } from "crypto";
import { compare } from "bcryptjs";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

interface AdminSession {
  sub: string;
  username: string;
  exp: number;
}

const sessionSecret = () => process.env.ADMIN_SESSION_SECRET || "local-dev-secret";
const sign = (payload: string) => createHmac("sha256", sessionSecret()).update(payload).digest("base64url");

function signaturesMatch(actual: string, expected: string) {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function verifyAdminCredentials(username: string, password: string) {
  const admin = await prisma.adminUser.findFirst({
    where: { username: username.trim(), enabled: true, deletedAt: null },
    select: { id: true, username: true, passwordHash: true },
  });
  if (!admin || !(await compare(password, admin.passwordHash))) return null;
  return { id: admin.id, username: admin.username };
}

export function adminToken(admin: { id: string; username: string }) {
  const session: AdminSession = {
    sub: admin.id,
    username: admin.username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function isAdmin(request: NextRequest) {
  const value = request.cookies.get("recommendation_admin")?.value || "";
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !signaturesMatch(signature, sign(payload))) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    return Boolean(session.sub && session.username && session.exp > Math.floor(Date.now() / 1000));
  } catch {
    return false;
  }
}
