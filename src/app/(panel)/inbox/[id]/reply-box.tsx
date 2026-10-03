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
        <div className="flex flex-wrap gap-2">
          {quickReplies.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                if (textRef.current) textRef.current.value = q.body;
              }}
              className="border border-line px-2 py-1 text-xs hover:border-ink"
            >
              {q.title}
            </button>
          ))}
        </div>
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
