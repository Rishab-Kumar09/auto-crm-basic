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

async function verifyAdminCompany() {
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

    // Get admin's profile with company details
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        company_id,
        company:companies!profiles_company_id_fkey (
          id,
          name
        )
      `)
      .eq('id', signInData.user.id)
      .single();

    if (profileError) {
      console.error('Error getting profile:', profileError.message);
      return;
    }

    console.log('Admin profile:', JSON.stringify(profileData, null, 2));
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

verifyAdminCompany(); 