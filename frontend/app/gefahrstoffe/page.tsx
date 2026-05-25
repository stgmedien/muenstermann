import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Image from "next/image";

export const dynamic = "force-dynamic";

async function getHazardSymbols() {
  return await db.execute<{ id: number; code: string; name: string; image_url: string | null }>(sql`
    select id, code, name, image_url
    from catalog.hazard_symbol
    order by id
  `);
}

async function getPpeSymbols() {
  return await db.execute<{ id: number; code: string; name: string; image_url: string | null }>(sql`
    select id, code, name, image_url
    from catalog.ppe_symbol
    order by id
  `);
}

async function getHazardPhrases() {
  return await db.execute<{
    code: string;
    description: string;
    category_name: string | null;
  }>(sql`
    select hp.code, hp.description, hpc.name as category_name
    from catalog.hazard_phrase hp
    left join catalog.hazard_phrase_category hpc on hpc.id = hp.category_id
    order by hp.code
  `);
}

async function getStorageClasses() {
  return await db.execute<{ code: string; description: string }>(sql`
    select code, description
    from catalog.storage_class
    order by code
  `);
}

async function getHazardSubstances() {
  return await db.execute<{
    name: string;
    sds_document_path: string | null;
    customer_count: string;
  }>(sql`
    select hs.name, hs.sds_document_path,
           (select count(*) from ops.customer_hazard_substance chs
              where chs.master_hazard_substance_id = hs.id)::text as customer_count
    from catalog.hazard_substance hs
    order by hs.name
  `);
}

async function getHazardFactors() {
  return await db.execute<{
    code: string;
    name: string;
    parent_code: string | null;
    is_category: boolean;
  }>(sql`
    select code, name, parent_code, is_category
    from catalog.hazard_factor
    order by string_to_array(code, '-')::int[]
  `);
}

export default async function HazardsPage() {
  const [phrases, classes, substances, factors, hazardSymbols, ppeSymbols] = await Promise.all([
    getHazardPhrases(),
    getStorageClasses(),
    getHazardSubstances(),
    getHazardFactors(),
    getHazardSymbols(),
    getPpeSymbols(),
  ]);

  const categories = factors.filter((f) => f.is_category);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Gefahrstoffe & Compliance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Stammdaten für GefStoffV / CLP / TRGS 510 / Gefährdungsbeurteilung.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          GHS-Gefahrenpiktogramme ({hazardSymbols.length})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {hazardSymbols.map((s) => (
            <div
              key={s.id}
              className="rounded-lg bg-white border border-slate-200 p-3 flex flex-col items-center text-center"
            >
              {s.image_url ? (
                <Image
                  src={s.image_url}
                  alt={s.name}
                  width={80}
                  height={80}
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <div className="h-20 w-20 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400">
                  ohne Bild
                </div>
              )}
              <div className="mt-2 font-mono text-xs text-slate-500">{s.code}</div>
              <div className="text-sm text-slate-900 whitespace-pre-line">{s.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          PSA-Piktogramme ({ppeSymbols.length})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ppeSymbols.map((s) => (
            <div
              key={s.id}
              className="rounded-lg bg-white border border-slate-200 p-3 flex flex-col items-center text-center"
            >
              {s.image_url ? (
                <Image
                  src={s.image_url}
                  alt={s.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain"
                />
              ) : (
                <div className="h-16 w-16 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400">
                  ohne Bild
                </div>
              )}
              <div className="mt-2 text-sm text-slate-900">{s.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          H-Sätze nach CLP-Verordnung ({phrases.length})
        </h2>
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2 w-20">Code</th>
                <th className="px-4 py-2">Beschreibung</th>
                <th className="px-4 py-2 w-48">Kategorie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {phrases.map((p) => (
                <tr key={p.code}>
                  <td className="px-4 py-1.5 font-mono text-xs">{p.code}</td>
                  <td className="px-4 py-1.5">{p.description}</td>
                  <td className="px-4 py-1.5 text-xs text-slate-500">
                    {p.category_name?.split(":")[0] ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Lagerklassen nach TRGS 510 ({classes.length})
        </h2>
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2 w-32">LGK-Code</th>
                <th className="px-4 py-2">Beschreibung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map((c) => (
                <tr key={c.code}>
                  <td className="px-4 py-1.5 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-1.5">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Master-Gefahrstoffverzeichnis ({substances.length})
        </h2>
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-2">Gefahrstoff</th>
                <th className="px-4 py-2">SDS-Pfad</th>
                <th className="px-4 py-2 text-right w-32">Kunden-Nutzung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {substances.map((s, i) => (
                <tr key={i}>
                  <td className="px-4 py-1.5 font-medium">{s.name}</td>
                  <td className="px-4 py-1.5 text-xs text-slate-500 truncate max-w-md">
                    {s.sds_document_path ?? "—"}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums">{s.customer_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Gefährdungsfaktoren (GefStoffV) — {factors.length}
        </h2>
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {categories.map((cat) => {
              const subs = factors.filter((f) => f.parent_code === cat.code);
              return (
                <div key={cat.code}>
                  <h3 className="font-semibold text-slate-900">
                    <span className="text-slate-400 mr-2">{cat.code}</span>
                    {cat.name}
                  </h3>
                  <ul className="mt-1 ml-4 space-y-0.5 text-slate-700">
                    {subs.map((s) => (
                      <li key={s.code} className="text-xs">
                        <span className="text-slate-400 font-mono mr-1.5">{s.code}</span>
                        {s.name}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
