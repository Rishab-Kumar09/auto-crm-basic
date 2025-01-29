-- Add AI metadata to comments table
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_metadata jsonb;

-- Add AI metadata to tickets table
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS ai_metadata jsonb;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS comments_ai_generated_idx ON public.comments(ai_generated);
CREATE INDEX IF NOT EXISTS comments_ai_metadata_idx ON public.comments USING gin(ai_metadata);
CREATE INDEX IF NOT EXISTS tickets_ai_metadata_idx ON public.tickets USING gin(ai_metadata);

-- Update RLS policies to allow access to AI metadata
DROP POLICY IF EXISTS "Users can view AI metadata" ON public.comments;
CREATE POLICY "Users can view AI metadata"
ON public.comments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update AI metadata" ON public.comments;
CREATE POLICY "Users can update AI metadata"
ON public.comments FOR UPDATE
USING (
    -- Allow agents and admins to update AI metadata
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'agent')
); 