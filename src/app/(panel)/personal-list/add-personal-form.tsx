"use client";

import { useActionState } from "react";
import { addPersonalNumbers } from "../actions";

export function AddPersonalForm() {
  const [message, action, pending] = useActionState(addPersonalNumbers, null);
  return (
    <form action={action} className="space-y-2 border border-line bg-white p-4">
      <h2 className="label">Numara ekle</h2>
      <textarea
        name="numbers"
        required
        rows={8}
        placeholder={"Her satıra bir numara veya virgülle ayırın\n0532 123 45 67\n+90 532 123 45 67\n90 532 123 45 67"}
        className="field"
      />
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending}>
          Kişisel listeye ekle
        </button>
        <span className="text-xs text-muted">{message}</span>
      </div>
    </form>
  );
}
