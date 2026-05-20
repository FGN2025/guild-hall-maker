create or replace function public.shares_tenant_with(_viewer uuid, _target uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_admins ta
    where ta.user_id = _viewer
      and (
        exists (
          select 1 from public.user_service_interests usi
          where usi.user_id = _target and usi.tenant_id = ta.tenant_id
        )
        or exists (
          select 1 from public.tenant_subscribers ts
          where ts.user_id = _target and ts.tenant_id = ta.tenant_id
        )
        or exists (
          select 1 from public.tenant_admins ta2
          where ta2.user_id = _target and ta2.tenant_id = ta.tenant_id
        )
      )
  )
$$;

drop policy if exists "Tenant staff can view profiles of tenant members" on public.profiles;
create policy "Tenant staff can view profiles of tenant members"
on public.profiles for select
to authenticated
using (public.shares_tenant_with(auth.uid(), user_id));