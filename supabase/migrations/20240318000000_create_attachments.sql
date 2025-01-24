-- Create the set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  (storage.foldername(name))[1] = auth.uid()::text
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

-- Policy to allow users to view attachments based on their role and ticket access
CREATE POLICY "Users can view attachments" ON public.attachments
  FOR SELECT USING (
    -- Admin and agents can see all attachments
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'agent')
    OR
    -- For customers:
    (
      -- Check if user is a customer
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'customer'
      AND
      (
        -- For ticket attachments: check if they own the ticket
        (
          attachments.ticket_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.tickets t
            WHERE t.id = attachments.ticket_id
            AND t.customer_id = auth.uid()
          )
        )
        OR
        -- For comment attachments: check if they own the ticket the comment belongs to
        (
          attachments.comment_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.comments c
            JOIN public.tickets t ON t.id = c.ticket_id
            WHERE c.id = attachments.comment_id
            AND t.customer_id = auth.uid()
          )
        )
      )
    )
  );

-- Policy to allow users to upload attachments
CREATE POLICY "Users can upload attachments" ON public.attachments
  FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
  );

-- Policy to allow users to delete their own attachments
CREATE POLICY "Users can delete their own attachments" ON public.attachments
  FOR DELETE TO authenticated USING (
    uploaded_by = auth.uid()
  );

-- Create trigger to update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at(); 