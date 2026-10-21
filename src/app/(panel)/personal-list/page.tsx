import { createClient } from "@/lib/supabase/server";
import { AddPersonalForm } from "./add-personal-form";
import { PersonalRow } from "./personal-row";

export default async function PersonalListPage() {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, wa_number, name")
    .eq("is_personal", true)
    .order("wa_number");

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Kişisel liste</h1>
      <p className="text-sm text-muted">
        Buraya eklenen numaralara bot hiç cevap vermez ve takip mesajı göndermez. Aile ve tanıdıklarınızın numaralarını
        ekleyin. Listede olmayan herkes müşteri sayılır.
      </p>
      <AddPersonalForm />
      <h2 className="label">Mevcut liste ({contacts?.length ?? 0})</h2>
      {contacts?.length ? (
        <ul className="divide-y divide-line border border-line bg-white">
          {contacts.map((c) => (
            <PersonalRow key={c.id} contact={c} />
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-line p-6 text-sm text-muted">Liste boş.</p>
      )}
    </div>
  );
}
