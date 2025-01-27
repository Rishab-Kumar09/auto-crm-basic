-- Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update their own company" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete their own company" ON public.companies;

-- Policy to allow admins to create companies
CREATE POLICY "Admins can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy to allow all authenticated users to view companies
CREATE POLICY "Users can view companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

-- Policy to allow admins to update companies they created
CREATE POLICY "Admins can update their own company"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  created_by = auth.uid() AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy to allow admins to delete companies they created
CREATE POLICY "Admins can delete their own company"
ON public.companies
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
); 