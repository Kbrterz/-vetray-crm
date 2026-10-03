"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <section className="hidden flex-col justify-between bg-ink p-12 text-paper md:flex">
        <span className="font-display text-xl font-bold tracking-tight">VETRAY</span>
        <div>
          <p className="font-display text-4xl font-bold leading-tight">
            Her WhatsApp mesajı
            <br />
            bir müşteri kaydı.
          </p>
          <p className="mt-4 max-w-sm text-sm text-paper/70">
            Bot ilk cevabı verir, lead kaydı açılır, gerektiğinde konuşma ekibe devredilir.
          </p>
        </div>
        <span className="text-xs text-paper/50">Vetray CRM</span>
      </section>

      <section className="flex items-center justify-center p-6">
        <form action={action} className="w-full max-w-sm space-y-5">
          <h1 className="font-display text-2xl font-bold">Panele giriş</h1>
          <div>
            <label className="label" htmlFor="email">E-posta</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="password">Şifre</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
          </div>
          {error && <p className="text-sm text-warn">{error}</p>}
          <button className="btn w-full" disabled={pending}>
            {pending ? "Giriş yapılıyor" : "Giriş yap"}
          </button>
        </form>
      </section>
    </main>
  );
}
