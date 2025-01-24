// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!SUPABASE_URL) {
  throw new Error(
    'Missing VITE_SUPABASE_URL environment variable. ' +
      'Please check your .env file or deployment environment variables.'
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
      'Please check your .env file or deployment environment variables.'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
