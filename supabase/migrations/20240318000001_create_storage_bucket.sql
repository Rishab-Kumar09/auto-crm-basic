-- Create a storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true);

-- Set up storage policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'attachments'
);

-- Set up storage policy to allow public access to files
CREATE POLICY "Allow public access to files"
ON storage.objects FOR SELECT TO public USING (
  bucket_id = 'attachments'
);

-- Set up storage policy to allow users to delete their own files
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
); 