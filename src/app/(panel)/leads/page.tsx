import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGES, formatPhone, formatTime, stageLabel } from "@/lib/crm";
import { AddLeadForm } from "./add-lead-form";

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const { stage, q } = await searchParams;
  const stageFilter = typeof stage === "string" ? stage : "";
  const search = typeof q === "string" ? q.trim() : "";
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select("id, name, company, wa_number, stage, updated_at, conversations(id)")
    .eq("is_personal", false)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (stageFilter) query = query.eq("stage", stageFilter);
  if (search) {
    const s = search.replace(/[%,()]/g, "");
    query = query.or(`name.ilike.%${s}%,company.ilike.%${s}%,wa_number.ilike.%${s.replace(/\D/g, "") || s}%`);
  }
  const { data } = await query;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Leadler</h1>

      <AddLeadForm />

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={search} placeholder="Ad, şirket veya numara ara" className="field max-w-xs" />
        <select name="stage" defaultValue={stageFilter} className="field max-w-[200px]">
          <option value="">Tüm aşamalar</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="btn-ghost">Filtrele</button>
      </form>

      {data?.length ? (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line text-left">
              <tr>
                <th className="label p-3">Kişi</th>
                <th className="label p-3">Şirket</th>
                <th className="label p-3">Aşama</th>
                <th className="label p-3">Güncelleme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((c) => {
                const convId = (c.conversations as { id: string }[] | null)?.[0]?.id;
                const name = c.name || formatPhone(c.wa_number);
                return (
                  <tr key={c.id} className="hover:bg-paper">
                    <td className="p-3">
                      {convId ? (
                        <Link href={`/inbox/${convId}`} className="font-medium underline">
                          {name}
                        </Link>
                      ) : (
                        <span className="font-medium">{name}</span>
                      )}
                      <div className="text-xs text-muted">{formatPhone(c.wa_number)}</div>
                    </td>
                    <td className="p-3">{c.company ?? "—"}</td>
                    <td className="p-3">{stageLabel(c.stage)}</td>
                    <td className="p-3 text-xs text-muted">{formatTime(c.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-dashed border-line p-6 text-sm text-muted">Kayıt bulunamadı.</p>
      )}
    </div>
  );
}
