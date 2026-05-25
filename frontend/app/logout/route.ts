import { NextRequest, NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  await destroyAdminSession();
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
