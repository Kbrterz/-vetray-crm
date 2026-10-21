"use client";

import { removePersonal } from "../actions";

type Contact = { id: string; wa_number: string | null; name: string | null };

export function PersonalRow({ contact }: { contact: Contact }) {
  return (
    <li className="flex items-center justify-between gap-4 p-3 text-sm">
      <div className="min-w-0">
        <span className="font-medium">{contact.wa_number}</span>
        {contact.name && <span className="ml-2 text-xs text-muted">{contact.name}</span>}
      </div>
      <form
        action={removePersonal.bind(null, contact.id)}
        onSubmit={(e) => {
          if (!confirm("Bu numara kişisel listeden çıkarılsın mı? Bot bu kişiye yeniden cevap verebilir.")) e.preventDefault();
        }}
      >
        <button className="text-xs text-warn underline">Çıkar</button>
      </form>
    </li>
  );
}
