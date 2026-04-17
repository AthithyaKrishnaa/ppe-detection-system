import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
// Replace these with your actual Supabase URL and Anon Key when you're ready
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
