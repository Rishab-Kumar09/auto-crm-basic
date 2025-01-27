-- Temporarily disable RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Update admin's company_id
UPDATE public.profiles p
SET company_id = (
    SELECT id 
    FROM public.companies c 
    WHERE c.created_by = p.id 
    AND p.role = 'admin'
)
WHERE role = 'admin';

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; 