-- Transactional integration tests. No test products or price changes persist.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ declare affected integer; begin
 update public.products set name=name where id='AC-P002'; get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Non-admin update unexpectedly succeeded'; end if;
 begin
  perform public.save_catalog_product('{}',null);
  raise exception 'Non-admin RPC unexpectedly succeeded';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','72796a88-4922-4cd7-8249-b111719d3bb7',true);
do $$ declare payload jsonb; ver integer; begin
 payload := jsonb_build_object('id','AC-SMOKE-ROLLBACK','slug','smoke-rollback','category_id','round',
  'name','اختبار مؤقت','price_minor',10000,'compare_at_price_minor',12500,'status','draft',
  'details',jsonb_build_object('description','وصف اختبار'),
  'colors',jsonb_build_array(jsonb_build_object('id','aaaaaaaa-1111-4111-8111-111111111111','name','اختبار','hex','#123456','sort_order',0)),
  'sizes',jsonb_build_array(jsonb_build_object('id','bbbbbbbb-1111-4111-8111-111111111111','label','اختبار','dimensions',jsonb_build_object('diameterCm',20),'sort_order',0)),
  'images',jsonb_build_array(jsonb_build_object('id','cccccccc-1111-4111-8111-111111111111','color_id','aaaaaaaa-1111-4111-8111-111111111111','bucket','legacy','path','/assets/images/products/gray-square-planter-with-base-800.webp','sort_order',0,'is_primary',true)));
 perform public.save_catalog_product(payload,null);
 select version into ver from public.products where id='AC-SMOKE-ROLLBACK';
 perform public.save_catalog_product(payload||'{"status":"published","price_minor":9000}',ver);
 begin
  perform public.save_catalog_product(payload,ver);
  raise exception 'Stale write unexpectedly succeeded';
 exception when serialization_failure then null; end;
 select version into ver from public.products where id='AC-SMOKE-ROLLBACK';
 begin
  perform public.save_catalog_product(payload||'{"price_minor":20000}',ver);
  raise exception 'Invalid discount unexpectedly succeeded';
 exception when check_violation then null; end;
 perform public.save_catalog_product(payload||'{"status":"hidden"}',ver);
end $$;
reset role;
set local role anon;
do $$ begin
 if exists(select 1 from public.products where id='AC-SMOKE-ROLLBACK') then raise exception 'Hidden product exposed'; end if;
 if exists(select 1 from public.product_colors where product_id='AC-SMOKE-ROLLBACK') then raise exception 'Hidden colors exposed'; end if;
 if exists(select 1 from public.product_images where product_id='AC-SMOKE-ROLLBACK') then raise exception 'Hidden images exposed'; end if;
end $$;
reset role;
select 'PASS: admin CRUD, optimistic concurrency, discount checks, non-admin denial, hidden product and child RLS' as result;
rollback;
