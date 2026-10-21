import type { SupabaseClient } from "@supabase/supabase-js";

// Conversations handed to the team ('human') whose latest message is from the contact.
export async function getWaitingConversationIds(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, contacts!inner(is_personal), messages(direction, created_at)")
    .eq("status", "human")
    .eq("contacts.is_personal", false)
    .order("created_at", { ascending: false, referencedTable: "messages" })
    .limit(1, { referencedTable: "messages" })
    .limit(200);
  if (error) console.error("getWaitingConversationIds failed:", error.code, error.message);
  const ids = (data ?? [])
    .filter((c) => (c.messages as unknown as { direction: string }[])[0]?.direction === "in")
    .map((c) => c.id as string);
  return new Set(ids);
}
