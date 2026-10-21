"use client";

import { useActionState, useRef, useState } from "react";
import { addKnowledgeDoc } from "../actions";

const MAX_BYTES = 100 * 1024;

export function AddKnowledgeForm() {
  const [error, action, pending] = useActionState(addKnowledgeDoc, null);
  const [fileError, setFileError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) return setFileError("Yalnızca .txt veya .md dosyası yükleyin.");
    if (file.size > MAX_BYTES) return setFileError("Dosya 100 KB sınırını aşıyor.");
    const text = await file.text();
    if (contentRef.current) contentRef.current.value = text;
    if (titleRef.current && !titleRef.current.value) titleRef.current.value = file.name.replace(/\.(txt|md)$/i, "");
  }

  return (
    <form action={action} className="space-y-2 border border-line bg-white p-4">
      <h2 className="label">Yeni belge</h2>
      <input ref={titleRef} name="title" required placeholder="Başlık (ör. 2026 fiyat listesi)" className="field" />
      <textarea
        ref={contentRef}
        name="content"
        required
        rows={8}
        maxLength={100000}
        placeholder="Metni yapıştırın"
        className="field"
      />
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={onFile} className="text-xs" />
        <span className="text-xs text-muted">.txt veya .md, en fazla 100 KB</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending}>
          Kaydet
        </button>
        <span className="text-xs text-warn">{fileError ?? error}</span>
      </div>
    </form>
  );
}
