"use client";

import { useActionState } from "react";
import { saveBotSettings } from "../actions";

const DAYS = [
  { n: 1, label: "Pzt" },
  { n: 2, label: "Sal" },
  { n: 3, label: "Çar" },
  { n: 4, label: "Per" },
  { n: 5, label: "Cum" },
  { n: 6, label: "Cmt" },
  { n: 0, label: "Paz" },
];

type Settings = {
  enabled: boolean;
  reply_only_unknown: boolean;
  system_prompt: string;
  business_info: string;
  work_hours: { start: string; end: string; days: number[] };
};

export function BotSettingsForm({ settings }: { settings: Settings }) {
  const [message, action, pending] = useActionState(saveBotSettings, null);
  const hours = settings.work_hours;

  return (
    <form action={action} className="space-y-5 border border-line bg-white p-4">
      <label className="flex items-center gap-3">
        <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="size-4" />
        <span className="font-medium">Bot açık</span>
      </label>
      <label className="flex items-center gap-3">
        <input type="checkbox" name="reply_only_unknown" defaultChecked={settings.reply_only_unknown} className="size-4" />
        <span className="text-sm">
          Yalnızca rehberde olmayan numaralara cevap ver (kişisel sohbetleriniz korunur)
        </span>
      </label>

      <div>
        <span className="label">Çalışma saatleri</span>
        <div className="flex flex-wrap items-center gap-2">
          <input type="time" name="start" defaultValue={hours.start} className="field w-auto" />
          <span>ile</span>
          <input type="time" name="end" defaultValue={hours.end} className="field w-auto" />
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          {DAYS.map((d) => (
            <label key={d.n} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="days" value={d.n} defaultChecked={hours.days.includes(d.n)} />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="system_prompt">Botun konuşma tarzı</label>
        <textarea
          id="system_prompt"
          name="system_prompt"
          rows={4}
          defaultValue={settings.system_prompt}
          placeholder="Örnek: Vetray adına resmi ve kibar konuşun, 'siz' dili kullanın, kısa cevap verin."
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="business_info">İşletme bilgisi</label>
        <textarea
          id="business_info"
          name="business_info"
          rows={8}
          defaultValue={settings.business_info}
          placeholder="Hizmetler, fiyatlar, çalışma şekli, sık sorulan sorular"
          className="field"
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending}>
          {pending ? "Kaydediliyor" : "Kaydet"}
        </button>
        <span className="text-sm text-muted">{message}</span>
      </div>
    </form>
  );
}
