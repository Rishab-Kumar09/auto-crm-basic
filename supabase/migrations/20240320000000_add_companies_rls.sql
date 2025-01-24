-- Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

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

-- Policy to allow admins to update their own company
CREATE POLICY "Admins can update their own company"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND company_id = companies.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND company_id = companies.id
  )
);

-- Policy to allow admins to delete their own company
CREATE POLICY "Admins can delete their own company"
ON public.companies
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND company_id = companies.id
  )
); 