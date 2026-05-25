"use server";

import { writeAsUser, db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Lädt ein Foto via FormData hoch (file + task_id + caption + redirect_path).
 * Server Action — wird aus einem <form encType="multipart/form-data"> aufgerufen.
 */
export async function uploadInspectionPhoto(formData: FormData) {
  const user = await getCurrentUser();
  const taskId = Number(formData.get("task_id"));
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const redirectPath = String(formData.get("redirect_path") ?? "").trim() || null;
  const file = formData.get("file");

  if (!Number.isFinite(taskId)) throw new Error("task_id fehlt.");
  if (!(file instanceof File)) throw new Error("Keine Datei hochgeladen.");
  if (file.size === 0) throw new Error("Datei ist leer.");
  if (file.size > MAX_BYTES) throw new Error(`Datei zu groß (max 10 MB, ist ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
  if (!ALLOWED_MIME.has(file.type))
    throw new Error(`Nicht erlaubter Dateityp: ${file.type}. Erlaubt: JPEG, PNG, WebP, HEIC.`);

  const arrayBuf = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuf);

  await writeAsUser(user, async (tx) => {
    await tx.execute(sql`
      insert into ops.inspection_photo
        (inspection_task_id, uploaded_by, mime_type, file_size_bytes, photo_data, caption)
      values
        (${taskId}, ${user}, ${file.type}, ${bytes.length}, ${bytes}, ${caption})
    `);
  });

  if (redirectPath) revalidatePath(redirectPath);
}

/**
 * Listet alle Fotos einer Inspection — gibt nur Metadaten zurück, kein BLOB.
 * Bilder werden über /api/photo/[id] geholt.
 */
export async function listInspectionPhotos(taskId: number) {
  return await db.execute<{
    id: number;
    uploaded_by: string;
    uploaded_at: string;
    mime_type: string;
    file_size_bytes: number;
    caption: string | null;
  }>(sql`
    select id, uploaded_by, uploaded_at::text, mime_type, file_size_bytes, caption
    from ops.inspection_photo
    where inspection_task_id = ${taskId}
    order by uploaded_at desc
  `);
}

/**
 * Löscht ein Foto. CASCADE löscht zwar bei Task-Löschung, aber manueller
 * Delete soll auch gehen (z. B. wenn falsches Foto hochgeladen wurde).
 */
export async function deleteInspectionPhoto(photoId: number, redirectPath: string | null = null) {
  const user = await getCurrentUser();
  await writeAsUser(user, async (tx) => {
    await tx.execute(sql`delete from ops.inspection_photo where id = ${photoId}`);
  });
  if (redirectPath) revalidatePath(redirectPath);
}
