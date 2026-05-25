import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/photo/[id]
 *
 * Liefert das Bild aus ops.inspection_photo als binary stream.
 * Auth läuft über die Middleware (Basic Auth) — wenn der Aufrufer
 * eingeloggt ist, kommt das Bild raus.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isFinite(n)) {
    return new NextResponse("invalid id", { status: 400 });
  }

  const rows = await db.execute<{ mime_type: string; photo_data: Uint8Array | Buffer }>(sql`
    select mime_type, photo_data
    from ops.inspection_photo
    where id = ${n}
    limit 1
  `);

  if (rows.length === 0) {
    return new NextResponse("not found", { status: 404 });
  }

  const photo = rows[0];
  const buf =
    photo.photo_data instanceof Uint8Array
      ? photo.photo_data
      : Buffer.from(photo.photo_data as unknown as ArrayBuffer);

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": photo.mime_type,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(buf.length),
    },
  });
}
