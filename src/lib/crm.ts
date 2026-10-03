export const STAGES = [
  { id: "new", label: "Yeni" },
  { id: "contacted", label: "İletişime geçildi" },
  { id: "qualified", label: "Nitelikli" },
  { id: "proposal", label: "Teklif" },
  { id: "won", label: "Kazanıldı" },
  { id: "lost", label: "Kaybedildi" },
] as const;

export type Stage = (typeof STAGES)[number]["id"];

export const stageLabel = (id: string) => STAGES.find((s) => s.id === id)?.label ?? id;

export const STATUS_LABEL: Record<string, string> = {
  bot: "Bot",
  human: "Ekipte",
  closed: "Kapalı",
};

export function formatTime(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(iso));
}

export function formatPhone(wa: string) {
  const d = wa.replace(/\D/g, "");
  return d.startsWith("90") && d.length === 12
    ? `+90 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`
    : `+${d}`;
}
