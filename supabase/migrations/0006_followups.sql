-- Follow-up messages (6h and 24h) for the n8n follow-up workflow (service role only)
-- Not applied automatically: run it yourself in the Supabase SQL editor.

-- Conversations that are due a follow-up now.
-- kind: '6h' when followup_count = 0, '24h' when followup_count = 1
create or replace function public.due_followups()
returns table (
  conversation_id uuid,
  wa_number text,
  contact_name text,
  kind text,
  system_prompt text,
  business_info text,
  history jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.bot_settings;
  v_local timestamp;
  v_in_hours boolean;
begin
  select * into v_settings from public.bot_settings where id = 1;
  if not v_settings.enabled then
    return;
  end if;

  v_local := now() at time zone coalesce(v_settings.work_hours ->> 'tz', 'Europe/Istanbul');
  v_in_hours :=
    (v_settings.work_hours -> 'days') @> to_jsonb(extract(dow from v_local)::int)
    and v_local::time >= (v_settings.work_hours ->> 'start')::time
    and v_local::time < (v_settings.work_hours ->> 'end')::time;
  if not v_in_hours then
    return;
  end if;

  return query
  select
    c.id,
    ct.wa_number,
    ct.name,
    case when c.followup_count = 0 then '6h' else '24h' end,
    v_settings.system_prompt,
    v_settings.business_info,
    (
      select coalesce(jsonb_agg(jsonb_build_object(
               'role', case when m.direction = 'in' then 'user' else 'assistant' end,
               'content', m.body) order by m.created_at), '[]'::jsonb)
      from (
        select direction, body, created_at from public.messages
        where conversation_id = c.id and body is not null
        order by created_at desc limit 20
      ) m
    )
  from public.conversations c
  join public.contacts ct on ct.id = c.contact_id
  where c.status = 'bot'
    and c.next_followup_at is not null
    and c.next_followup_at <= now()
    and c.followup_count < 2
    and ct.is_personal = false
    and ct.wa_number is not null
    -- only when the last message in the conversation is ours (customer has not written since)
    and (
      select m2.direction from public.messages m2
      where m2.conversation_id = c.id
      order by m2.created_at desc limit 1
    ) = 'out'
  order by c.next_followup_at
  limit 20;
end;
$$;

-- Store a sent follow-up and schedule the next one.
-- p: { conversation_id, text, wa_message_id }
create or replace function public.record_followup(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.messages (conversation_id, direction, sender, body, wa_message_id)
  values ((p ->> 'conversation_id')::uuid, 'out', 'bot', p ->> 'text', nullif(p ->> 'wa_message_id', ''))
  on conflict (wa_message_id) do nothing;

  update public.conversations
    set last_message_at = now(),
        followup_count = followup_count + 1,
        next_followup_at = case when followup_count = 0 then now() + interval '18 hours' else null end
    where id = (p ->> 'conversation_id')::uuid
      and status = 'bot';
end;
$$;

revoke all on function public.due_followups() from public, anon, authenticated;
revoke all on function public.record_followup(jsonb) from public, anon, authenticated;
grant execute on function public.due_followups() to service_role;
grant execute on function public.record_followup(jsonb) to service_role;
