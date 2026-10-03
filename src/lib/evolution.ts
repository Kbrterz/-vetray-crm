import "server-only";

// Evolution API v2: POST {url}/message/sendText/{instance}
export async function sendWhatsAppText(number: string, text: string) {
  const { EVOLUTION_API_URL: url, EVOLUTION_API_KEY: key, EVOLUTION_INSTANCE: instance } = process.env;
  if (!url || !key || !instance) {
    return { ok: false as const, error: "WhatsApp bağlantısı (Evolution) henüz kurulmadı." };
  }
  const res = await fetch(`${url.replace(/\/$/, "")}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ number, text }),
  });
  if (!res.ok) return { ok: false as const, error: `WhatsApp gönderimi başarısız (${res.status}).` };
  const data = await res.json().catch(() => ({}));
  return { ok: true as const, id: (data?.key?.id as string | undefined) ?? null };
}
