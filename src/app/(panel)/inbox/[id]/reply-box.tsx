"use client";

import { useActionState, useRef } from "react";
import { sendReply } from "../../actions";

type QuickReply = { id: string; title: string; body: string };

export function ReplyBox({ conversationId, quickReplies }: { conversationId: string; quickReplies: QuickReply[] }) {
  const [error, action, pending] = useActionState(sendReply.bind(null, conversationId), null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  return (
    <form action={action} className="space-y-2 border-t border-line p-4">
      {quickReplies.length > 0 && (
        <select
          defaultValue=""
          onChange={(e) => {
            const q = quickReplies.find((r) => r.id === e.target.value);
            if (q && textRef.current) {
              textRef.current.value = q.body;
              textRef.current.focus();
            }
            e.target.value = "";
          }}
          className="field"
          aria-label="Hızlı yanıt seç"
        >
          <option value="">Hızlı yanıt seçin</option>
          {quickReplies.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      )}
      <textarea ref={textRef} name="text" rows={3} placeholder="Yanıt yazın" className="field" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-warn">{error}</span>
        <button className="btn" disabled={pending}>
          {pending ? "Gönderiliyor" : "Gönder"}
        </button>
      </div>
    </form>
  );
}
