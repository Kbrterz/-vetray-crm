import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, formatPhone, formatTime } from "@/lib/crm";

const FILTERS = [
  { id: "", label: "Tümü" },
  { id: "bot", label: "Bot" },
  { id: "human", label: "Ekipte" },
  { id: "closed", label: "Kapalı" },
];

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const { status } = await searchParams;
  const filter = typeof status === "string" ? status : "";
  const supabase = await createClient();

  let query = supabase
    .from("conversations")
    .select("id, status, last_message_at, contacts!inner(name, wa_number, company, is_personal)")
    .eq("contacts.is_personal", false)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);
  if (filter) query = query.eq("status", filter);
  const { data } = await query;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Gelen kutusu</h1>
      <nav className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/inbox?status=${f.id}` : "/inbox"}
            className={`border px-3 py-1 text-sm ${filter === f.id ? "border-ink bg-ink text-paper" : "border-line bg-white"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {data?.length ? (
        <ul className="divide-y divide-line border border-line bg-white">
          {data.map((c) => {
            const contact = c.contacts as unknown as { name: string | null; wa_number: string; company: string | null };
            return (
              <li key={c.id}>
                <Link href={`/inbox/${c.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-paper">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{contact.name || formatPhone(contact.wa_number)}</div>
                    <div className="truncate text-xs text-muted">
                      {contact.company ?? formatPhone(contact.wa_number)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`text-xs font-semibold ${c.status === "human" ? "text-warn" : "text-muted"}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                    <div className="text-xs text-muted">{formatTime(c.last_message_at)}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border border-dashed border-line p-6 text-sm text-muted">
          Henüz konuşma yok. WhatsApp bağlandığında gelen mesajlar burada görünecek.
        </p>
      )}
    </div>
  );
}
