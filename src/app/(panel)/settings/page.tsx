import { createClient } from "@/lib/supabase/server";
import { addQuickReply, deleteQuickReply } from "../actions";
import { BotSettingsForm } from "./bot-settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: quick }] = await Promise.all([
    supabase.from("bot_settings").select("*").single(),
    supabase.from("quick_replies").select("id, title, body").order("title"),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="font-display text-3xl font-bold">Bot ayarları</h1>

      {settings && <BotSettingsForm settings={settings} />}

      <section className="space-y-3 border border-line bg-white p-4">
        <h2 className="label">Hazır yanıtlar</h2>
        <form action={addQuickReply} className="grid gap-2 sm:grid-cols-[200px_1fr_auto]">
          <input name="title" required placeholder="Başlık" className="field" />
          <input name="body" required placeholder="Mesaj metni" className="field" />
          <button className="btn-ghost">Ekle</button>
        </form>
        <ul className="divide-y divide-line">
          {quick?.map((q) => (
            <li key={q.id} className="flex items-start justify-between gap-4 py-2 text-sm">
              <div>
                <div className="font-medium">{q.title}</div>
                <div className="text-muted">{q.body}</div>
              </div>
              <form action={deleteQuickReply.bind(null, q.id)}>
                <button className="text-xs text-warn underline">Sil</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
