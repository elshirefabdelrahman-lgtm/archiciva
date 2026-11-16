begin;
alter table public.categories add constraint category_route_not_reserved check (
 slug !~ '^(admin|cart|products|assets|src|scripts|source-assets|supabase|about|contact|wholesale|faq|privacy|shipping-returns|custom-design|product-finder)(/|$)'
);
create function private.guard_category_tree() returns trigger language plpgsql set search_path = '' as $$
begin
 if exists(with recursive parents as (
  select id,parent_id from public.categories where id=NEW.parent_id
  union select c.id,c.parent_id from public.categories c join parents p on c.id=p.parent_id
 )select 1 from parents where id=NEW.id) then raise exception 'Category hierarchy cannot contain a cycle'; end if;
 return NEW;
end $$;
revoke all on function private.guard_category_tree() from public;
create trigger category_tree before insert or update on public.categories for each row execute function private.guard_category_tree();
commit;
