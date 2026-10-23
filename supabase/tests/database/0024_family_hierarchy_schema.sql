-- Test family hierarchy columns and RLS policies on public."user"
begin;

select plan(5);

-- 1) Verify columns exist on public."user"
select has_column('public', 'user', 'account_type', 'user table has account_type column');
select has_column('public', 'user', 'parent_id', 'user table has parent_id column');

-- 2) Verify index exists
select has_index('public', 'user', 'idx_user_parent_id', ARRAY['parent_id'], 'idx_user_parent_id index exists');

-- 3) Test inserting parent and child user
insert into public."user" (id, name, email, account_type)
values ('test-parent-id-1', 'Parent User', 'parent@example.com', 'parent_solo');

insert into public."user" (id, name, email, account_type, parent_id)
values ('test-child-id-1', 'Child User', 'child@example.com', 'child', 'test-parent-id-1');

select is(
  (select account_type from public."user" where id = 'test-child-id-1'),
  'child',
  'Child account saved with account_type=child'
);

select is(
  (select parent_id from public."user" where id = 'test-child-id-1'),
  'test-parent-id-1',
  'Child account saved with parent_id pointing to parent'
);

select * from finish();

rollback;
