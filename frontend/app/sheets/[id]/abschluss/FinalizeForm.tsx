"use client";

import { SignaturePad } from "@/app/m/[tourId]/abnahme/SignaturePad";
import { finalizeSheet } from "../../actions";

export function FinalizeForm({
  sheetId,
  disputeCount,
}: {
  sheetId: number;
  disputeCount: number;
}) {
  return (
    <form action={finalizeSheet} className="space-y-4">
      <input type="hidden" name="sheet_id" value={sheetId} />

      {disputeCount > 0 && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
          ⚠ <strong>{disputeCount}</strong> Plan-Punkt{disputeCount === 1 ? " ist" : "e sind"} beanstandet —
          das Sheet wird als <code>DISPUTED</code> abgenommen, Nacharbeit folgt.
        </div>
      )}

      <div className="rounded-lg bg-white border border-slate-200 p-5 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name der abnehmenden Person
          </label>
          <input
            type="text"
            name="signer_name"
            required
            placeholder="z. B. Maria Schmidt"
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-base focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Position (optional)
          </label>
          <input
            type="text"
            name="signer_role"
            placeholder="z. B. Produktionsleiter"
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-base focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Unterschrift
          </label>
          <SignaturePad />
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-4 rounded-lg bg-slate-900 text-white font-semibold text-base"
      >
        Sheet unterschreiben & abschließen
      </button>
    </form>
  );
}
