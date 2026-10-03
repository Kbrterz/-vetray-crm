"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/evolution";
import { STAGES } from "@/lib/crm";

const STAGE_IDS: string[] = STAGES.map((s) => s.id);

export async function setConversationStatus(id: string, status: "bot" | "human" | "closed") {
  const supabase = await createClient();
  await supabase.from("conversations").update({ status }).eq("id", id);
  revalidatePath(`/inbox/${id}`);
  revalidatePath("/inbox");
}

export async function sendReply(conversationId: string, _: string | null, form: FormData) {
  const text = String(form.get("text") ?? "").trim();
  if (!text) return "Mesaj boş.";

  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, contacts(wa_number)")
    .eq("id", conversationId)
    .single();
  const wa = (conv?.contacts as unknown as { wa_number: string } | null)?.wa_number;
  if (!wa) return "Konuşma bulunamadı.";

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
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  await supabase.from("notes").insert({ contact_id: contactId, body, author_id: data?.claims?.sub ?? null });
  revalidatePath(path);
}

export async function updateContact(id: string, path: string, form: FormData) {
  const stage = String(form.get("stage"));
  const supabase = await createClient();
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

  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
  await supabase.from("quick_replies").insert({ title, body });
  revalidatePath("/settings");
}

export async function deleteQuickReply(id: string) {
  const supabase = await createClient();
  await supabase.from("quick_replies").delete().eq("id", id);
  revalidatePath("/settings");
}
