"use client";

import { useActionState } from "react";
import { addLead } from "../actions";

export function AddLeadForm() {
  const [error, action, pending] = useActionState(addLead, null);

  return (
    <form action={action} className="grid gap-2 border border-line bg-white p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <input name="wa_number" required placeholder="Telefon (0532 123 45 67)" className="field" />
      <input name="name" placeholder="Ad soyad" className="field" />
      <input name="company" placeholder="Şirket" className="field" />
      <button className="btn" disabled={pending}>
        Lead ekle
      </button>
      {error && <p className="text-xs text-warn sm:col-span-4">{error}</p>}
    </form>
  );
}
