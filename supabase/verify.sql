-- Execute after schema and import. All tests roll back; no catalog changes persist.
begin;
select 'products' as kind,count(*) from public.products
union all select 'categories',count(*) from public.categories;
select tablename,rowsecurity from pg_tables where schemaname='public'
and tablename in ('products','categories','product_colors','product_sizes','product_images','admin_users','audit_log');
set local role anon;
select count(*) as visitor_published_products from public.products;
select count(*) as visitor_draft_images from public.product_images where bucket='catalog-drafts';
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
-- Must return zero even for a signed-in non-admin.
with changed as (update public.products set name=name where id='AC-P002' returning id)
select count(*) as unauthorized_updates_must_be_zero from changed;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','72796a88-4922-4cd7-8249-b111719d3bb7',true);
-- Must return one after bootstrap-admin.sql.
with changed as (update public.products set name=name where id='AC-P002' returning id)
select count(*) as admin_updates_must_be_one from changed;
rollback;
