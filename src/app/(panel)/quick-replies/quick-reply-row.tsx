"use client";

import { useState } from "react";
import { deleteQuickReply, updateQuickReply } from "../actions";

type QuickReply = { id: string; title: string; body: string };

export function QuickReplyRow({ reply }: { reply: QuickReply }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="p-4">
        <form
          action={async (form) => {
            await updateQuickReply(reply.id, form);
            setEditing(false);
          }}
          className="space-y-2"
        >
          <input name="title" required defaultValue={reply.title} className="field" />
          <textarea name="body" required rows={3} defaultValue={reply.body} className="field" />
          <div className="flex gap-2">
            <button className="btn-ghost">Kaydet</button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs underline">
              Vazgeç
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-4 p-4 text-sm">
      <div className="min-w-0">
        <div className="font-medium">{reply.title}</div>
        <div className="whitespace-pre-wrap text-muted">{reply.body}</div>
      </div>
      <div className="flex shrink-0 gap-3">
        <button onClick={() => setEditing(true)} className="text-xs underline">
          Düzenle
        </button>
        <form
          action={deleteQuickReply.bind(null, reply.id)}
          onSubmit={(e) => {
            if (!confirm("Bu hızlı yanıt silinsin mi?")) e.preventDefault();
          }}
        >
          <button className="text-xs text-warn underline">Sil</button>
        </form>
      </div>
    </li>
  );
}
