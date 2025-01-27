-- Create a materialized view for admin company relationships
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_company_relationships AS
SELECT 
    p.id as admin_id,
    p.company_id
FROM public.profiles p
WHERE p.role = 'admin';

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS admin_company_relationships_admin_id_idx 
ON admin_company_relationships(admin_id);

CREATE INDEX IF NOT EXISTS admin_company_relationships_company_id_idx 
ON admin_company_relationships(company_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create simplified policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id
    OR
    EXISTS (
        SELECT 1 
        FROM admin_company_relationships acr
        WHERE acr.admin_id = auth.uid()
        AND acr.company_id = profiles.company_id
    )
);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW admin_company_relationships; 