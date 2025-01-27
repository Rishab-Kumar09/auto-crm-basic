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

async function verifyTickets() {
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

    // Get admin's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', signInData.user.id)
      .single();

    console.log('Admin profile:', profile);

    // Get all tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*');

    if (ticketsError) {
      console.error('Error getting tickets:', ticketsError.message);
      return;
    }

    console.log('Total tickets:', tickets.length);
    console.log('Tickets:', JSON.stringify(tickets, null, 2));

    // Get tickets for admin's company
    const { data: companyTickets, error: companyTicketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('company_id', profile.company_id);

    if (companyTicketsError) {
      console.error('Error getting company tickets:', companyTicketsError.message);
      return;
    }

    console.log('Company tickets:', JSON.stringify(companyTickets, null, 2));

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

verifyTickets(); 