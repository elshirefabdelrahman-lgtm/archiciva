-- Apply once to archiciva-dev after reviewing permissions. No credentials here.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create table public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
create policy own_membership on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admin_users where user_id = (select auth.uid()) and active);
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

create table public.categories (
 id text primary key, parent_id text references public.categories(id),
 name text not null check(length(trim(name))>0), slug text not null unique,
 description text not null default '', image_path text, sort_order integer not null default 0,
 published boolean not null default false, metadata jsonb not null default '{}',
 check(slug ~ '^[a-z0-9-]+(/[a-z0-9-]+)*$'), check(parent_id is distinct from id)
);
create table public.products (
 id text primary key, slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 category_id text not null references public.categories(id),
 name text not null check(length(trim(name))>0),
 price_minor integer not null check(price_minor>0), compare_at_price_minor integer,
 status text not null default 'draft' check(status in ('draft','published','hidden','archived')),
 sort_order integer not null default 0,
 -- Retains all legacy copy, dimensions, SEO and display flags losslessly.
 details jsonb not null default '{}' check(jsonb_typeof(details)='object'),
 version integer not null default 1, updated_at timestamptz not null default now(),
 check(compare_at_price_minor is null or compare_at_price_minor>price_minor)
);
create index products_category_idx on public.products(category_id);
create table public.product_colors (
 id uuid primary key default gen_random_uuid(), product_id text not null references public.products(id) on delete cascade,
 name text not null check(length(trim(name))>0), hex text not null default '#dddddd' check(hex ~ '^#[0-9a-fA-F]{6}$'),
 sort_order integer not null default 0, unique(product_id,name), unique(id,product_id)
);
create table public.product_sizes (
 id uuid primary key default gen_random_uuid(), product_id text not null references public.products(id) on delete cascade,
 label text not null check(length(trim(label))>0), dimensions jsonb not null default '{}' check(jsonb_typeof(dimensions)='object'),
 raw_text text not null default '', sort_order integer not null default 0, unique(product_id,label)
);
create table public.product_images (
 id uuid primary key default gen_random_uuid(), product_id text not null references public.products(id) on delete cascade,
 color_id uuid, bucket text not null default 'catalog-drafts' check(bucket in ('catalog-drafts','catalog-public','legacy')),
 path text not null check(length(path)>0), alt text not null default '',
 sort_order integer not null default 0, is_primary boolean not null default false,
 foreign key(color_id,product_id) references public.product_colors(id,product_id),
 unique(product_id,bucket,path)
);
create unique index one_primary_image on public.product_images(product_id) where is_primary;
create index product_images_color_idx on public.product_images(color_id,product_id);
create table public.audit_log (
 id bigint generated always as identity primary key, actor uuid, changed_at timestamptz not null default now(),
 table_name text not null, operation text not null, old_row jsonb, new_row jsonb
);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
create policy admin_read on public.audit_log for select to authenticated using ((select private.is_admin()));
create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.audit_log(actor,table_name,operation,old_row,new_row)
 values(auth.uid(),TG_TABLE_NAME,TG_OP,case when TG_OP <> 'INSERT' then to_jsonb(OLD) end,case when TG_OP <> 'DELETE' then to_jsonb(NEW) end);
 return null;
end $$;
revoke all on function private.audit_change() from public;
create function private.bump_version() returns trigger language plpgsql set search_path = '' as $$
begin NEW.version := OLD.version+1; NEW.updated_at := now(); return NEW; end $$;
revoke all on function private.bump_version() from public;
create trigger product_version before update on public.products for each row execute function private.bump_version();
-- Effective visibility includes every ancestor; cycles are prevented by admin validation
-- and UNION deduplicates them here so malformed data cannot recurse forever.
create function private.category_visible(category_key text) returns boolean language sql stable security definer set search_path = '' as $$
 with recursive ancestors as (
 select id,parent_id,published from public.categories where id=category_key
 union select c.id,c.parent_id,c.published from public.categories c join ancestors a on c.id=a.parent_id
 ) select coalesce(bool_and(published),false) from ancestors;
$$;
revoke all on function private.category_visible(text) from public;
grant execute on function private.category_visible(text) to anon, authenticated;
do $$ declare tab text; begin
 foreach tab in array array['categories','products','product_colors','product_sizes','product_images'] loop
 execute format('alter table public.%I enable row level security',tab);
 execute format('revoke all on public.%I from anon, authenticated',tab);
 execute format('grant select on public.%I to anon, authenticated',tab);
 execute format('grant insert, update, delete on public.%I to authenticated',tab);
 execute format('create policy admin_manage on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',tab);
 execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function private.audit_change()',tab);
 end loop;
end $$;
create policy published_read on public.categories for select to anon, authenticated using (private.category_visible(id));
create policy published_read on public.products for select to anon, authenticated using (status='published' and private.category_visible(category_id));
create policy published_read on public.product_colors for select to anon, authenticated using (exists(select 1 from public.products p where p.id=product_id and p.status='published'));
create policy published_read on public.product_sizes for select to anon, authenticated using (exists(select 1 from public.products p where p.id=product_id and p.status='published'));
create policy published_read on public.product_images for select to anon, authenticated using (bucket <> 'catalog-drafts' and exists(select 1 from public.products p where p.id=product_id and p.status='published'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('catalog-drafts','catalog-drafts',false,10485760,array['image/jpeg','image/png','image/webp']),
 ('catalog-public','catalog-public',true,10485760,array['image/jpeg','image/png','image/webp']);
create policy archiciva_admin_media on storage.objects for all to authenticated
 using (bucket_id in ('catalog-drafts','catalog-public') and (select private.is_admin()))
 with check (bucket_id in ('catalog-drafts','catalog-public') and (select private.is_admin()));
-- Public bucket serves only deliberately published images. Draft previews use signed URLs.
commit;
