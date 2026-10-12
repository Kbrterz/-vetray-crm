-- Website contact form leads (kubraterzioglu.com) land in the same CRM.
-- They have an email but no WhatsApp number, so wa_number becomes optional.

alter table public.contacts alter column wa_number drop not null;

alter table public.contacts
  add column source text not null default 'whatsapp'
    check (source in ('whatsapp', 'website', 'manual'));

-- One web contact per email address (WhatsApp contacts stay unique by number).
create unique index contacts_web_email_key
  on public.contacts (lower(email))
  where wa_number is null;

-- Called by the website's server route with the service_role key only.
create or replace function public.handle_web_lead(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p ->> 'email'));
  v_name text := nullif(trim(p ->> 'name'), '');
  v_topic text := nullif(trim(p ->> 'topic'), '');
  v_body text := nullif(trim(p ->> 'message'), '');
  v_contact public.contacts;
  v_conv public.conversations;
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_body is null then
    raise exception 'invalid lead';
  end if;

  insert into public.contacts (wa_number, name, email, source, tags)
  values (null, v_name, v_email, 'website', array['web-form'])
  on conflict (lower(email)) where wa_number is null do update
    set name = coalesce(public.contacts.name, excluded.name),
        updated_at = now()
  returning * into v_contact;

  select * into v_conv from public.conversations
  where contact_id = v_contact.id and status <> 'closed'
  order by created_at desc limit 1;

  -- Web leads are always handled by a person; the WhatsApp bot never sees them.
  if v_conv.id is null then
    insert into public.conversations (contact_id, status) values (v_contact.id, 'human') returning * into v_conv;
  end if;

  insert into public.messages (conversation_id, direction, sender, body)
  values (v_conv.id, 'in', 'contact', coalesce('[' || v_topic || '] ', '') || v_body);

  update public.conversations set last_message_at = now() where id = v_conv.id;

  return jsonb_build_object('contact_id', v_contact.id, 'conversation_id', v_conv.id);
end;
$$;

revoke all on function public.handle_web_lead(jsonb) from public, anon, authenticated;
grant execute on function public.handle_web_lead(jsonb) to service_role;
