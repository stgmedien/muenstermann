import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/portal-auth";

export async function POST(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/portal/login", req.url));
}
