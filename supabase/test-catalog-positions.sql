begin;
savepoint catalog_position_test;
set local role authenticated;
select set_config('request.jwt.claim.sub','72796a88-4922-4cd7-8249-b111719d3bb7',true);
do $$
declare moved public.products%rowtype; first_id text; total integer; body jsonb;
begin
 select id into first_id from public.products where status='published' order by sort_order,id limit 1;
 select * into moved from public.products where status='published' order by sort_order desc,id desc limit 1;
 select count(*) into total from public.products where status='published';
 body:=to_jsonb(moved)||jsonb_build_object('desired_position',1,
  'colors',coalesce((select jsonb_agg(c) from public.product_colors c where product_id=moved.id),'[]'::jsonb),
  'sizes',coalesce((select jsonb_agg(s) from public.product_sizes s where product_id=moved.id),'[]'::jsonb),
  'images',coalesce((select jsonb_agg(i) from public.product_images i where product_id=moved.id),'[]'::jsonb));
 perform public.save_catalog_product(body,moved.version);
 if (select sort_order from public.products where id=moved.id)<>0 then raise exception 'Move to first failed'; end if;
 if (select sort_order from public.products where id=first_id)<>1 then raise exception 'Displacement failed'; end if;
 if (select count(*) from public.products where status='published')<>total then raise exception 'Product count changed'; end if;
 if (select count(distinct sort_order) from public.products where status='published')<>total then raise exception 'Duplicate positions'; end if;
 -- Exercise a move down as well, with the fresh optimistic version.
 select version into moved.version from public.products where id=moved.id;
 body:=body||jsonb_build_object('desired_position',total);
 perform public.save_catalog_product(body,moved.version);
 if (select sort_order from public.products where id=moved.id)<>total-1 then raise exception 'Move to last failed'; end if;
 -- Removing the first product closes the resulting gap.
 select version into moved.version from public.products where id=moved.id;
 body:=body||jsonb_build_object('desired_position',1);
 perform public.save_catalog_product(body,moved.version);
 select version into moved.version from public.products where id=moved.id;
 body:=body||jsonb_build_object('status','archived');
 perform public.save_catalog_product(body,moved.version);
 if (select min(sort_order) from public.products where status='published')<>0 or (select max(sort_order) from public.products where status='published')<>total-2 then raise exception 'Removal did not close the position gap'; end if;
 -- A non-admin must fail before it can reorder anything.
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
 begin
  perform public.save_catalog_product(body,null);
  raise exception 'Unauthorized save succeeded';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback to catalog_position_test;
release savepoint catalog_position_test;
commit;
select 'Position, displacement, count and authorization tests passed; test writes rolled back' as result;
