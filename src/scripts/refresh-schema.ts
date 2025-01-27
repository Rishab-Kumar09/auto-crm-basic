import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../.env');
const envConfig = dotenv.parse(readFileSync(envPath));

const supabase = createClient(
  envConfig.VITE_SUPABASE_URL,
  envConfig.VITE_SUPABASE_ANON_KEY
);

async function refreshSchema() {
  try {
    // Sign in as admin
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@test.com',
      password: 'admin123456'
    });

    if (signInError) {
      console.error('Error signing in:', signInError.message);
      return;
    }

    console.log('Signed in as admin');

    // Make a simple query to refresh the schema cache
    const { data, error } = await supabase
      .from('tickets')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error refreshing schema:', error.message);
      return;
    }

    console.log('Schema refreshed successfully');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

refreshSchema(); 