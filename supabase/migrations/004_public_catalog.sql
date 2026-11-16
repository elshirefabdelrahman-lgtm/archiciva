begin;
-- One consistent MVCC snapshot; RLS is evaluated as the calling visitor.
create function public.get_store_catalog() returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object(
  'products',(select coalesce(jsonb_agg(t order by t.id),'[]') from public.products t),
  'categories',(select coalesce(jsonb_agg(t order by t.id),'[]') from public.categories t),
  'product_colors',(select coalesce(jsonb_agg(t order by t.id),'[]') from public.product_colors t),
  'product_sizes',(select coalesce(jsonb_agg(t order by t.id),'[]') from public.product_sizes t),
  'product_images',(select coalesce(jsonb_agg(t order by t.id),'[]') from public.product_images t)
 );
$$;
revoke all on function public.get_store_catalog() from public;
grant execute on function public.get_store_catalog() to anon,authenticated;
commit;
