import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');
const envConfig = dotenv.parse(readFileSync(envPath));

const supabase = createClient(
  envConfig.VITE_SUPABASE_URL,
  envConfig.VITE_SUPABASE_ANON_KEY
);

async function createCompanyForAdmin() {
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

    // Create the company
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Tech Support Inc.',
        description: 'Professional IT Support Services',
        created_by: signInData.user.id
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError.message);
      return;
    }

    console.log('Company created successfully:', companyData);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createCompanyForAdmin(); 