import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGES, formatPhone, formatTime } from "@/lib/crm";

export default async function OverviewPage() {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayMsgs, contacts, handoffs, settings] = await Promise.all([
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "in")
      .gte("created_at", startOfDay.toISOString()),
    supabase.from("contacts").select("stage").eq("is_personal", false),
    supabase
      .from("conversations")
      .select("id, last_message_at, contacts(name, wa_number)")
      .eq("status", "human")
      .order("last_message_at", { ascending: false })
      .limit(5),
    supabase.from("bot_settings").select("enabled").single(),
  ]);

  const byStage = Object.fromEntries(STAGES.map((s) => [s.id, 0]));
  contacts.data?.forEach((c) => (byStage[c.stage] = (byStage[c.stage] ?? 0) + 1));
  const total = contacts.data?.length ?? 0;
  const botOn = settings.data?.enabled ?? false;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">Özet</h1>
        <Link href="/settings" className="text-sm">
          Bot:{" "}
          <span className={botOn ? "font-semibold text-accent" : "font-semibold text-warn"}>
            {botOn ? "Açık" : "Kapalı"}
          </span>
        </Link>
      </header>

      <section className="grid grid-cols-1 border border-line bg-white sm:grid-cols-3">
        <Stat label="Bugün gelen mesaj" value={todayMsgs.count ?? 0} />
        <Stat label="Toplam lead" value={total} />
        <Stat label="Ekip bekleyen" value={handoffs.data?.length ?? 0} warn />
      </section>

      <section>
        <h2 className="label">Lead hunisi</h2>
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {STAGES.map((s) => (
            <Link key={s.id} href={`/leads?stage=${s.id}`} className="bg-white p-4 hover:bg-paper">
              <div className="font-display text-2xl font-bold">{byStage[s.id]}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="label">İnsana devredilen konuşmalar</h2>
        {handoffs.data?.length ? (
          <ul className="divide-y divide-line border border-line bg-white">
            {handoffs.data.map((c) => {
              const contact = c.contacts as unknown as { name: string | null; wa_number: string } | null;
              return (
                <li key={c.id}>
                  <Link href={`/inbox/${c.id}`} className="flex justify-between p-4 hover:bg-paper">
                    <span>{contact?.name || formatPhone(contact?.wa_number ?? "")}</span>
                    <span className="text-xs text-muted">{formatTime(c.last_message_at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="border border-dashed border-line p-6 text-sm text-muted">
            Ekibe devredilmiş konuşma yok.
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="border-line p-6 sm:border-r sm:last:border-r-0">
      <div className={`font-display text-4xl font-bold ${warn && value > 0 ? "text-warn" : ""}`}>{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}
