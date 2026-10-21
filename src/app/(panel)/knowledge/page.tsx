import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/crm";
import { AddKnowledgeForm } from "./add-knowledge-form";
import { KnowledgeRow } from "./knowledge-row";

export default async function KnowledgePage() {
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("knowledge_docs")
    .select("id, title, content, enabled, updated_at")
    .order("title");

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Fiyat listesi</h1>
      <p className="text-sm text-muted">
        Buraya eklenen ve açık olan metinler bot tarafından bilgi kaynağı olarak kullanılır. PDF desteklenmez, PDF
        içindeki metni kopyalayıp yapıştırın.
      </p>
      <p className="text-sm font-medium">Yalnızca güvendiğiniz metni ekleyin.</p>
      <AddKnowledgeForm />
      {docs?.length ? (
        <ul className="divide-y divide-line border border-line bg-white">
          {docs.map((d) => (
            <KnowledgeRow key={d.id} doc={{ ...d, updated: formatTime(d.updated_at) }} />
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-line p-6 text-sm text-muted">Henüz belge yok.</p>
      )}
    </div>
  );
}
