"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Özet" },
  { href: "/inbox", label: "Gelen kutusu" },
  { href: "/leads", label: "Leadler" },
  { href: "/settings", label: "Bot ayarları" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap px-3 py-2 text-sm ${
              active ? "bg-paper text-ink" : "text-paper/80 hover:bg-paper/10"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
