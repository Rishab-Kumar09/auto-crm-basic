-- Create a storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true);

-- Set up storage policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'attachments'
);

-- Set up storage policy to allow authenticated users to read files
CREATE POLICY "Allow authenticated users to read files"
ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'attachments'
);

-- Set up storage policy to allow users to delete their own files
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'attachments' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'agent')
  )
);

-- Create attachments table
CREATE TABLE public.attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT must_belong_to_ticket_or_comment CHECK (
    (ticket_id IS NOT NULL AND comment_id IS NULL) OR
    (ticket_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Add RLS policies
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view attachments
CREATE POLICY "Users can view attachments" ON public.attachments
  FOR SELECT USING (
    -- Admin and agents can see all attachments
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'agent')
    OR
    -- For other users, they can see attachments on tickets they have access to
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE (
        t.id = attachments.ticket_id
        OR
        EXISTS (
          SELECT 1 FROM public.comments c
          WHERE c.id = attachments.comment_id
          AND c.ticket_id = t.id
        )
      )
      AND (
        t.created_by = auth.uid()
        OR t.assigned_to = auth.uid()
        OR t.company_id IN (
          SELECT company_id FROM public.profiles
          WHERE id = auth.uid()
        )
      )
    )
  );

-- Policy to allow users to upload attachments
CREATE POLICY "Users can upload attachments" ON public.attachments
  FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
  );

-- Policy to allow users to delete attachments
CREATE POLICY "Users can delete attachments" ON public.attachments
  FOR DELETE TO authenticated USING (
    uploaded_by = auth.uid()
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create trigger for updated_at
CREATE TRIGGER handle_attachments_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at(); 