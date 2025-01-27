-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their comments" ON public.comments;

-- Policy for users to view comments
CREATE POLICY "Users can view comments"
ON public.comments FOR SELECT
TO authenticated
USING (
  -- Users can view comments on tickets they have access to
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id
    AND (
      t.created_by = auth.uid()
      OR t.assigned_to = auth.uid()
      OR t.customer_id = auth.uid()
      OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'agent')
    )
  )
);

-- Policy for users to create comments
CREATE POLICY "Users can create comments"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can comment on tickets they have access to
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id
    AND (
      t.created_by = auth.uid()
      OR t.assigned_to = auth.uid()
      OR t.customer_id = auth.uid()
      OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'agent')
    )
  )
  AND created_by = auth.uid()
);

-- Policy for users to update their own comments
CREATE POLICY "Users can update their comments"
ON public.comments FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  created_by = auth.uid()
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy for users to delete their own comments
CREATE POLICY "Users can delete their comments"
ON public.comments FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
); 