import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGES, STATUS_LABEL, formatPhone, formatTime } from "@/lib/crm";
import { addNote, setConversationStatus, updateContact } from "../../actions";
import { ReplyBox } from "./reply-box";

type Contact = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  wa_number: string;
  stage: string;
  is_personal: boolean;
};

export default async function ConversationPage({ params }: PageProps<"/inbox/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, status, contacts(id, name, company, email, wa_number, stage, is_personal)")
    .eq("id", id)
    .single();
  if (!conv) notFound();
  const contact = conv.contacts as unknown as Contact;

  const [{ data: messages }, { data: notes }, { data: quick }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, direction, sender, body, created_at")
      .eq("conversation_id", id)
      .order("created_at"),
    supabase
      .from("notes")
      .select("id, body, created_at")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false }),
    supabase.from("quick_replies").select("id, title, body").order("title"),
  ]);

  const path = `/inbox/${id}`;

  return (
    <div className="space-y-4">
      <Link href="/inbox" className="text-sm text-muted underline">
        ← Gelen kutusu
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-[60vh] flex-col border border-line bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
            <div>
              <h1 className="font-display text-xl font-bold">{contact.name || formatPhone(contact.wa_number)}</h1>
              <p className="text-xs text-muted">
                {formatPhone(contact.wa_number)} · {STATUS_LABEL[conv.status]}
              </p>
            </div>
            <div className="flex gap-2">
              {conv.status !== "human" && (
                <form action={setConversationStatus.bind(null, id, "human")}>
                  <button className="btn-ghost">Ekibe al</button>
                </form>
              )}
              {conv.status !== "bot" && (
                <form action={setConversationStatus.bind(null, id, "bot")}>
                  <button className="btn-ghost">Bota ver</button>
                </form>
              )}
              {conv.status !== "closed" && (
                <form action={setConversationStatus.bind(null, id, "closed")}>
                  <button className="btn-ghost">Kapat</button>
                </form>
              )}
            </div>
          </header>

          <ol className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages?.length ? (
              messages.map((m) => (
                <li key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : ""}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 text-sm ${
                      m.direction === "in" ? "bg-paper" : m.sender === "bot" ? "bg-accent/10" : "bg-ink text-paper"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[11px] opacity-60">
                      {m.sender === "bot" ? "Bot · " : m.sender === "human" ? "Ekip · " : ""}
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted">Bu konuşmada mesaj yok.</li>
            )}
          </ol>

          <ReplyBox conversationId={id} quickReplies={quick ?? []} />
        </section>

        <aside className="space-y-6">
          <form action={updateContact.bind(null, contact.id, path)} className="space-y-3 border border-line bg-white p-4">
            <h2 className="label">Kişi bilgisi</h2>
            <input name="name" defaultValue={contact.name ?? ""} placeholder="Ad soyad" className="field" />
            <input name="company" defaultValue={contact.company ?? ""} placeholder="Şirket" className="field" />
            <input name="email" type="email" defaultValue={contact.email ?? ""} placeholder="E-posta" className="field" />
            <select name="stage" defaultValue={contact.stage} className="field">
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_personal" defaultChecked={contact.is_personal} />
              Kişisel numara (bot cevap vermez)
            </label>
            <button className="btn w-full">Kaydet</button>
          </form>

          <section className="space-y-3 border border-line bg-white p-4">
            <h2 className="label">Notlar</h2>
            <form action={addNote.bind(null, contact.id, path)} className="space-y-2">
              <textarea name="body" rows={2} placeholder="Not ekle" className="field" />
              <button className="btn-ghost">Ekle</button>
            </form>
            <ul className="space-y-2">
              {notes?.map((n) => (
                <li key={n.id} className="border-l-2 border-line pl-3 text-sm">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="text-[11px] text-muted">{formatTime(n.created_at)}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
