create or replace function public.can_access_household_storage(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  household_text text;
begin
  household_text := split_part(object_name, '/', 1);
  if household_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_household_member(household_text::uuid);
exception when others then
  return false;
end;
$$;

drop policy if exists "household_uploads_read" on storage.objects;
create policy "household_uploads_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'household-uploads' and public.can_access_household_storage(name));

drop policy if exists "household_uploads_insert" on storage.objects;
create policy "household_uploads_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'household-uploads' and public.can_access_household_storage(name));

drop policy if exists "household_uploads_update" on storage.objects;
create policy "household_uploads_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'household-uploads' and public.can_access_household_storage(name))
  with check (bucket_id = 'household-uploads' and public.can_access_household_storage(name));

drop policy if exists "household_uploads_delete" on storage.objects;
create policy "household_uploads_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'household-uploads' and public.can_access_household_storage(name));
