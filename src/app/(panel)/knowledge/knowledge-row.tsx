"use client";

import { deleteKnowledgeDoc, setKnowledgeEnabled } from "../actions";

type Doc = { id: string; title: string; content: string; enabled: boolean; updated: string };

export function KnowledgeRow({ doc }: { doc: Doc }) {
  return (
    <li className="space-y-2 p-4 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-medium">{doc.title}</div>
          <div className="text-xs text-muted">
            {doc.content.length} karakter, {doc.updated}
          </div>
        </div>
        <div className="flex shrink-0 gap-3">
          <form action={setKnowledgeEnabled.bind(null, doc.id, !doc.enabled)}>
            <button className={`text-xs underline ${doc.enabled ? "" : "text-warn"}`}>
              {doc.enabled ? "Açık, kapat" : "Kapalı, aç"}
            </button>
          </form>
          <form
            action={deleteKnowledgeDoc.bind(null, doc.id)}
            onSubmit={(e) => {
              if (!confirm("Bu belge silinsin mi?")) e.preventDefault();
            }}
          >
            <button className="text-xs text-warn underline">Sil</button>
          </form>
        </div>
      </div>
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-xs text-muted">{doc.content}</pre>
    </li>
  );
}
