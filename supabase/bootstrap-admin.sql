-- Security-sensitive step: grants this existing Auth user catalog administration.
-- Run only after confirming this is the intended administrator.
begin;
do $$ begin
 if not exists(select 1 from auth.users where id='72796a88-4922-4cd7-8249-b111719d3bb7' and email='admin@archiciva.store')
 then raise exception 'Expected administrator identity does not match'; end if;
end $$;
insert into public.admin_users(user_id) values ('72796a88-4922-4cd7-8249-b111719d3bb7')
on conflict(user_id) do update set active=true;
commit;
