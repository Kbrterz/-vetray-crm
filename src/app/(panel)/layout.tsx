import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { getWaitingConversationIds } from "@/lib/handoff";
import { NavLinks } from "./nav-links";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const waiting = await getWaitingConversationIds(await createClient());
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-ink text-paper md:w-56">
        <div className="flex items-center justify-between p-4 md:block md:p-6">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            VETRAY <span className="font-normal text-paper/60">CRM</span>
          </Link>
          <form action={signOut} className="md:hidden">
            <button className="text-xs text-paper/70 underline">Çıkış</button>
          </form>
        </div>
        <NavLinks waitingCount={waiting.size} />
        <form action={signOut} className="mt-auto hidden p-6 md:block">
          <button className="text-xs text-paper/70 underline hover:text-paper">Çıkış yap</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
