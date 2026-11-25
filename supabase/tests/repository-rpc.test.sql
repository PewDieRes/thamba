begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(4);

select ok(not has_function_privilege('anon', 'public.thamba_repository_list(text,jsonb,text)', 'execute'),
  'anon cannot read repository projections');
select ok(not has_function_privilege('authenticated', 'public.thamba_repository_commit(jsonb,text,jsonb)', 'execute'),
  'authenticated cannot commit repository writes');
select ok(has_function_privilege('service_role', 'public.thamba_repository_commit(jsonb,text,jsonb)', 'execute'),
  'service_role can execute the commit RPC');
select ok(not has_table_privilege('service_role', 'public.rider_contacts', 'select'),
  'the repository grant does not expose rider contacts');

select * from finish();
rollback;
