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

async function assignAdminToCompany() {
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

    // Get the company created by the admin
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('created_by', signInData.user.id)
      .single();

    if (companyError) {
      console.error('Error getting company:', companyError.message);
      return;
    }

    // Update admin's profile with company_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ company_id: companyData.id })
      .eq('id', signInData.user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError.message);
      return;
    }

    console.log('Successfully assigned admin to company:', companyData.id);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

assignAdminToCompany(); 