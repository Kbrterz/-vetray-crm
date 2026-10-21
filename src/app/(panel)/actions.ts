"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/evolution";
import { STAGES } from "@/lib/crm";

const STAGE_IDS: string[] = STAGES.map((s) => s.id);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every write/send action must call this first; throws when there is no signed-in user.
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("Oturum bulunamadı.");
  return { supabase, userId };
}

function requireId(id: string) {
  if (!UUID_RE.test(id)) throw new Error("Geçersiz kayıt.");
}

export async function setConversationStatus(id: string, status: "bot" | "human" | "closed") {
  const { supabase } = await requireUser();
  requireId(id);
  if (!["bot", "human", "closed"].includes(status)) throw new Error("Geçersiz durum.");
  const { error } = await supabase.from("conversations").update({ status }).eq("id", id);
  if (error) throw new Error("Durum güncellenemedi.");
  revalidatePath(`/inbox/${id}`);
  revalidatePath("/inbox");
}

export async function sendReply(conversationId: string, _: string | null, form: FormData) {
  const text = String(form.get("text") ?? "").trim();
  if (!text) return "Mesaj boş.";

  const { supabase } = await requireUser();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, contacts(wa_number, email)")
    .eq("id", conversationId)
    .single();
  const contact = conv?.contacts as unknown as { wa_number: string | null; email: string | null } | null;
  if (!contact) return "Konuşma bulunamadı.";
  const wa = contact.wa_number;
  if (!wa) return `Bu kişi web formundan geldi, WhatsApp numarası yok. E-posta ile yanıtlayın: ${contact.email ?? "-"}`;

  const sent = await sendWhatsAppText(wa, text);
  if (!sent.ok) return sent.error;

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    direction: "out",
    sender: "human",
    body: text,
    wa_message_id: sent.id,
  });
  await supabase
    .from("conversations")
    .update({ status: "human", last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
  revalidatePath(`/inbox/${conversationId}`);
  return null;
}

export async function addNote(contactId: string, path: string, form: FormData) {
  const body = String(form.get("body") ?? "").trim();
  if (!body) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("notes").insert({ contact_id: contactId, body, author_id: userId });
  revalidatePath(path);
}

export async function updateContact(id: string, path: string, form: FormData) {
  const stage = String(form.get("stage"));
  const { supabase } = await requireUser();
  await supabase
    .from("contacts")
    .update({
      name: String(form.get("name") ?? "").trim() || null,
      company: String(form.get("company") ?? "").trim() || null,
      email: String(form.get("email") ?? "").trim() || null,
      stage: STAGE_IDS.includes(stage) ? stage : "new",
      is_personal: form.get("is_personal") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath(path);
  revalidatePath("/leads");
}

export async function addLead(_: string | null, form: FormData) {
  const wa = String(form.get("wa_number") ?? "").replace(/\D/g, "");
  const normalized = wa.startsWith("0") ? `9${wa}` : wa;
  if (normalized.length < 11) return "Telefon numarası geçersiz. Örnek: 0532 123 45 67";

  const { supabase } = await requireUser();
  const { error } = await supabase.from("contacts").insert({
    wa_number: normalized,
    name: String(form.get("name") ?? "").trim() || null,
    company: String(form.get("company") ?? "").trim() || null,
  });
  if (error) return error.code === "23505" ? "Bu numara zaten kayıtlı." : "Kayıt eklenemedi.";
  revalidatePath("/leads");
  return null;
}

export async function saveBotSettings(_: string | null, form: FormData) {
  const days = form.getAll("days").map(Number);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("bot_settings")
    .update({
      enabled: form.get("enabled") === "on",
      reply_only_unknown: form.get("reply_only_unknown") === "on",
      system_prompt: String(form.get("system_prompt") ?? ""),
      business_info: String(form.get("business_info") ?? ""),
      work_hours: {
        start: String(form.get("start") ?? "09:00"),
        end: String(form.get("end") ?? "18:00"),
        days,
        tz: "Europe/Istanbul",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  revalidatePath("/settings");
  return error ? "Kaydedilemedi." : "Kaydedildi.";
}

export async function addQuickReply(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!title || !body) return;
  if (title.length > 100 || body.length > 4096) throw new Error("Başlık en fazla 100, metin en fazla 4096 karakter olabilir.");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("quick_replies").insert({ title, body });
  if (error) throw new Error("Hızlı yanıt kaydedilemedi.");
  revalidatePath("/settings");
  revalidatePath("/quick-replies");
}

export async function updateQuickReply(id: string, form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  requireId(id);
  if (!title || !body) return;
  if (title.length > 100 || body.length > 4096) throw new Error("Başlık en fazla 100, metin en fazla 4096 karakter olabilir.");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("quick_replies").update({ title, body }).eq("id", id);
  if (error) throw new Error("Hızlı yanıt kaydedilemedi.");
  revalidatePath("/settings");
  revalidatePath("/quick-replies");
}

export async function deleteQuickReply(id: string) {
  const { supabase } = await requireUser();
  requireId(id);
  const { error } = await supabase.from("quick_replies").delete().eq("id", id);
  if (error) throw new Error("Hızlı yanıt silinemedi.");
  revalidatePath("/settings");
  revalidatePath("/quick-replies");
}

const MAX_KNOWLEDGE_BYTES = 102_400;
const MAX_KNOWLEDGE_TITLE = 200;

export async function addKnowledgeDoc(_: string | null, form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();
  if (!title || !content) return "Başlık ve metin gerekli.";
  if (title.length > MAX_KNOWLEDGE_TITLE) return "Başlık en fazla 200 karakter olabilir.";
  if (Buffer.byteLength(content, "utf8") > MAX_KNOWLEDGE_BYTES) return "Metin çok uzun (en fazla 100 KB).";
  if (title.includes("\u0000") || content.includes("\u0000")) return "Metin geçersiz karakter içeriyor.";
  const { supabase } = await requireUser();
  const { error } = await supabase.from("knowledge_docs").insert({ title, content });
  if (error) return "Kaydedilemedi.";
  revalidatePath("/knowledge");
  return null;
}

export async function setKnowledgeEnabled(id: string, enabled: boolean) {
  const { supabase } = await requireUser();
  requireId(id);
  if (typeof enabled !== "boolean") throw new Error("Geçersiz değer.");
  const { error } = await supabase
    .from("knowledge_docs")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("Belge güncellenemedi.");
  revalidatePath("/knowledge");
}

export async function deleteKnowledgeDoc(id: string) {
  const { supabase } = await requireUser();
  requireId(id);
  const { error } = await supabase.from("knowledge_docs").delete().eq("id", id);
  if (error) throw new Error("Belge silinemedi.");
  revalidatePath("/knowledge");
}

// Normalizes to digits with country code, same format handle_incoming stores (e.g. 905xxxxxxxxx).
function normalizeWaNumber(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("5")) d = `90${d}`;
  else if (d.length === 11 && d.startsWith("05")) d = `9${d}`;
  if (d.startsWith("90")) return d.length === 12 && d[2] === "5" ? d : null;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

export async function addPersonalNumbers(_: string | null, form: FormData) {
  const raw = String(form.get("numbers") ?? "");
  const parts = raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return "Numara girilmedi.";
  if (parts.length > 2000) return "Tek seferde en fazla 2000 numara eklenebilir.";

  const valid = new Set<string>();
  let invalid = 0;
  for (const p of parts) {
    const n = normalizeWaNumber(p);
    if (n) valid.add(n);
    else invalid++;
  }
  if (!valid.size) return `Geçerli numara bulunamadı (${invalid} satır geçersiz).`;

  const { supabase } = await requireUser();
  const rows = [...valid].map((wa_number) => ({ wa_number, is_personal: true }));
  const { error } = await supabase.from("contacts").upsert(rows, { onConflict: "wa_number" });
  if (error) return "Kaydedilemedi.";
  revalidatePath("/personal-list");
  revalidatePath("/leads");
  return `${valid.size} numara kişisel listeye eklendi.${invalid ? ` ${invalid} satır geçersiz, atlandı.` : ""}`;
}

export async function removePersonal(id: string) {
  const { supabase } = await requireUser();
  requireId(id);
  const { error } = await supabase
    .from("contacts")
    .update({ is_personal: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("Kişi listeden çıkarılamadı.");
  revalidatePath("/personal-list");
  revalidatePath("/leads");
}
