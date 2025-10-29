import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  console.error('Current values:', { 
    VITE_SUPABASE_URL: supabaseUrl || 'NOT SET', 
    VITE_SUPABASE_ANON_KEY: supabaseKey ? 'SET' : 'NOT SET' 
  });
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      // Disable email confirmation requirement on client side
      confirmationUrl: undefined,
      redirectTo: undefined
    }
  }
);

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection test successful');
    return true;
  } catch (err) {
    console.error('Supabase connection test error:', err);
    return false;
  }
};
// Auth helpers
export const signIn = async (email: string, password: string) => {
  console.log('Attempting sign in for:', email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Sign in error:', error);
  } else {
    console.log('Sign in successful for:', email);
  }
  
  return { data, error };
};

export const signUp = async (email: string, password: string, name: string, role: string) => {
  console.log('Attempting sign up for:', email, 'with role:', role);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: null,
      data: {
        name,
        role,
      },
    }
  });
  
  if (error) {
    console.error('Sign up error:', error);
  } else {
    console.log('Sign up successful for:', email);
  }
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};