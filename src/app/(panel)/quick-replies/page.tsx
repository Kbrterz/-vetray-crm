import { createClient } from "@/lib/supabase/server";
import { addQuickReply } from "../actions";
import { QuickReplyRow } from "./quick-reply-row";

export default async function QuickRepliesPage() {
  const supabase = await createClient();
  const { data: quick } = await supabase.from("quick_replies").select("id, title, body").order("title");

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Hızlı yanıtlar</h1>
      <form action={addQuickReply} className="space-y-2 border border-line bg-white p-4">
        <h2 className="label">Yeni yanıt</h2>
        <input name="title" required placeholder="Başlık" className="field" />
        <textarea name="body" required rows={3} placeholder="Mesaj metni" className="field" />
        <button className="btn-ghost">Ekle</button>
      </form>
      {quick?.length ? (
        <ul className="divide-y divide-line border border-line bg-white">
          {quick.map((q) => (
            <QuickReplyRow key={q.id} reply={q} />
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-line p-6 text-sm text-muted">Henüz hızlı yanıt yok.</p>
      )}
    </div>
  );
}
