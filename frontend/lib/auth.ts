import { headers } from "next/headers";

/** Liefert den eingeloggten User aus dem x-app-user-Header (gesetzt durch middleware). */
export async function getCurrentUser(): Promise<string> {
  const h = await headers();
  return h.get("x-app-user") ?? "anonymous";
}
