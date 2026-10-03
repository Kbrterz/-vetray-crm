-- RPCs called by the n8n bot workflow (service role only)

-- Store an incoming (or phone-sent) WhatsApp message and decide whether the bot replies.
-- p: { wa_number, name, text, wa_message_id, from_me }
create or replace function public.handle_incoming(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact public.contacts;
  v_conv public.conversations;
  v_settings public.bot_settings;
  v_from_me boolean := coalesce((p ->> 'from_me')::boolean, false);
  v_msg_id text := nullif(p ->> 'wa_message_id', '');
  v_local timestamp;
  v_in_hours boolean;
  v_history jsonb;
  v_reason text;
begin
  -- Our own bot replies come back as from_me events: already stored, ignore
  if v_msg_id is not null and exists (select 1 from public.messages where wa_message_id = v_msg_id) then
    return jsonb_build_object('should_reply', false, 'reason', 'duplicate');
  end if;

  insert into public.contacts (wa_number, name)
  values (p ->> 'wa_number', nullif(p ->> 'name', ''))
  on conflict (wa_number) do update
    set name = coalesce(public.contacts.name, excluded.name)
  returning * into v_contact;

  select * into v_conv from public.conversations
  where contact_id = v_contact.id and status <> 'closed'
  order by created_at desc limit 1;

  if v_conv.id is null then
    insert into public.conversations (contact_id) values (v_contact.id) returning * into v_conv;
  end if;

  insert into public.messages (conversation_id, direction, sender, body, wa_message_id)
  values (
    v_conv.id,
    case when v_from_me then 'out' else 'in' end,
    case when v_from_me then 'human' else 'contact' end,
    p ->> 'text',
    v_msg_id
  );

  -- She answered from her phone: the team owns this conversation now
  if v_from_me then
    update public.conversations
      set status = 'human', last_message_at = now(), next_followup_at = null
      where id = v_conv.id;
    return jsonb_build_object('should_reply', false, 'reason', 'sent_from_phone');
  end if;

  update public.conversations
    set last_message_at = now(), next_followup_at = null, followup_count = 0
    where id = v_conv.id;
  update public.contacts set updated_at = now() where id = v_contact.id;

  select * into v_settings from public.bot_settings where id = 1;
  v_local := now() at time zone coalesce(v_settings.work_hours ->> 'tz', 'Europe/Istanbul');
  v_in_hours :=
    (v_settings.work_hours -> 'days') @> to_jsonb(extract(dow from v_local)::int)
    and v_local::time >= (v_settings.work_hours ->> 'start')::time
    and v_local::time < (v_settings.work_hours ->> 'end')::time;

  v_reason := case
    when not v_settings.enabled then 'bot_off'
    when v_contact.is_personal then 'personal'
    when v_conv.status <> 'bot' then 'with_team'
    when not v_in_hours then 'outside_hours'
    when coalesce(p ->> 'text', '') = '' then 'no_text'
  end;

  if v_reason is not null then
    return jsonb_build_object('should_reply', false, 'reason', v_reason);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'role', case when m.direction = 'in' then 'user' else 'assistant' end,
           'content', m.body) order by m.created_at), '[]'::jsonb)
  into v_history
  from (
    select direction, body, created_at from public.messages
    where conversation_id = v_conv.id and body is not null
    order by created_at desc limit 20
  ) m;

  return jsonb_build_object(
    'should_reply', true,
    'conversation_id', v_conv.id,
    'wa_number', v_contact.wa_number,
    'contact_name', v_contact.name,
    'system_prompt', v_settings.system_prompt,
    'business_info', v_settings.business_info,
    'history', v_history
  );
end;
$$;

-- Store the bot's reply after it was sent through Evolution.
-- p: { conversation_id, text, wa_message_id, handoff }
create or replace function public.record_bot_reply(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_handoff boolean := coalesce((p ->> 'handoff')::boolean, false);
begin
  insert into public.messages (conversation_id, direction, sender, body, wa_message_id)
  values ((p ->> 'conversation_id')::uuid, 'out', 'bot', p ->> 'text', nullif(p ->> 'wa_message_id', ''))
  on conflict (wa_message_id) do nothing;

  update public.conversations
    set last_message_at = now(),
        status = case when v_handoff then 'human' else status end,
        next_followup_at = case when v_handoff then null else now() + interval '6 hours' end
    where id = (p ->> 'conversation_id')::uuid;
end;
$$;

revoke all on function public.handle_incoming(jsonb) from public, anon, authenticated;
revoke all on function public.record_bot_reply(jsonb) from public, anon, authenticated;
grant execute on function public.handle_incoming(jsonb) to service_role;
grant execute on function public.record_bot_reply(jsonb) to service_role;
