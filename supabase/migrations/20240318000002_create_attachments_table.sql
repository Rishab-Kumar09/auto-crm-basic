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
  FOR SELECT USING (true);

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