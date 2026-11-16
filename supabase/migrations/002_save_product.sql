begin;
create function public.save_catalog_product(payload jsonb, expected_version integer default null)
returns text language plpgsql security invoker set search_path = '' as $$
declare key text := payload->>'id'; current_version integer; item jsonb;
begin
 if not private.is_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 select version into current_version from public.products where id=key for update;
 if found then
  if current_version is distinct from expected_version then raise exception 'Product changed in another session. Reload first.' using errcode='40001'; end if;
  update public.products set name=payload->>'name', category_id=payload->>'category_id',
   price_minor=(payload->>'price_minor')::integer,compare_at_price_minor=(payload->>'compare_at_price_minor')::integer,
   status=payload->>'status',details=payload->'details' where id=key;
 else
  if expected_version is not null then raise exception 'Product no longer exists'; end if;
  insert into public.products(id,slug,category_id,name,price_minor,compare_at_price_minor,status,details)
  values(key,payload->>'slug',payload->>'category_id',payload->>'name',(payload->>'price_minor')::integer,
   (payload->>'compare_at_price_minor')::integer,payload->>'status',payload->'details');
 end if;
 delete from public.product_images where product_id=key;
 delete from public.product_colors where product_id=key;
 delete from public.product_sizes where product_id=key;
 for item in select value from jsonb_array_elements(payload->'colors') loop
  insert into public.product_colors(id,product_id,name,hex,sort_order) values((item->>'id')::uuid,key,item->>'name',item->>'hex',(item->>'sort_order')::integer);
 end loop;
 for item in select value from jsonb_array_elements(payload->'sizes') loop
  insert into public.product_sizes(id,product_id,label,dimensions,raw_text,sort_order) values((item->>'id')::uuid,key,item->>'label',item->'dimensions',coalesce(item->>'raw_text',''),(item->>'sort_order')::integer);
 end loop;
 for item in select value from jsonb_array_elements(payload->'images') loop
  if payload->>'status'='published' and item->>'bucket'='catalog-drafts' then raise exception 'Publish images before product'; end if;
  insert into public.product_images(id,product_id,color_id,bucket,path,alt,sort_order,is_primary)
  values((item->>'id')::uuid,key,(item->>'color_id')::uuid,item->>'bucket',item->>'path',coalesce(item->>'alt',''),(item->>'sort_order')::integer,(item->>'is_primary')::boolean);
 end loop;
 if payload->>'status'='published' and not exists(select 1 from public.product_images where product_id=key) then raise exception 'A published product requires an image'; end if;
 return key;
end $$;
revoke all on function public.save_catalog_product(jsonb,integer) from public, anon;
grant execute on function public.save_catalog_product(jsonb,integer) to authenticated;
commit;
