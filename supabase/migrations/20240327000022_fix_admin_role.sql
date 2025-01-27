-- Ensure admin user has correct role and company_id
UPDATE public.profiles p
SET role = 'admin'
WHERE email = 'admin@test.com';

-- Refresh the materialized view to ensure it has the latest data
REFRESH MATERIALIZED VIEW admin_company_relationships; 