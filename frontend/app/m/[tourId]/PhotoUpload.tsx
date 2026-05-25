"use client";

import { useRef, useState, useTransition } from "react";
import { uploadInspectionPhoto } from "@/lib/photos";

type ExistingPhoto = {
  id: number;
  caption: string | null;
  uploaded_at: string;
  uploaded_by: string;
};

export function PhotoUpload({
  taskId,
  existing,
  redirectPath,
}: {
  taskId: number;
  existing: ExistingPhoto[];
  redirectPath: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const captionRef = useRef<HTMLInputElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticPhotos, setOptimisticPhotos] = useState(existing);

  async function onChange() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("task_id", String(taskId));
    fd.append("file", file);
    fd.append("redirect_path", redirectPath);
    if (captionRef.current?.value) fd.append("caption", captionRef.current.value);

    // Optimistic: temporäres Item einfügen
    const tempId = -Date.now();
    setOptimisticPhotos((prev) => [
      {
        id: tempId,
        caption: captionRef.current?.value || null,
        uploaded_at: new Date().toISOString(),
        uploaded_by: "...",
      },
      ...prev,
    ]);

    startTransition(async () => {
      try {
        await uploadInspectionPhoto(fd);
        // Force reload to fetch real ids
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setOptimisticPhotos((prev) => prev.filter((p) => p.id !== tempId));
      }
    });

    if (inputRef.current) inputRef.current.value = "";
    if (captionRef.current) captionRef.current.value = "";
  }

  return (
    <div className="mt-3 space-y-2">
      {optimisticPhotos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {optimisticPhotos.map((p) => (
            <a
              key={p.id}
              href={p.id > 0 ? `/api/photo/${p.id}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-20 h-20 rounded-md border border-slate-300 bg-slate-100 overflow-hidden relative"
              title={p.caption ?? ""}
            >
              {p.id > 0 ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/api/photo/${p.id}`}
                  alt={p.caption ?? "Foto"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                  …
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input
          type="text"
          ref={captionRef}
          placeholder="Bildunterschrift (optional)"
          className="flex-1 px-2 py-1 rounded border border-slate-300 text-sm focus:border-blue-500 focus:outline-none"
        />
        <label
          className={`px-3 py-1.5 rounded-md text-sm cursor-pointer ${
            pending
              ? "bg-slate-200 text-slate-500"
              : "bg-slate-700 text-white hover:bg-slate-900"
          }`}
        >
          {pending ? "Lade hoch…" : "📷 Foto"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            capture="environment"
            onChange={onChange}
            disabled={pending}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
