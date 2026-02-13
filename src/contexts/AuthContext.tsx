import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getCurrentUser, testSupabaseConnection } from '../lib/supabase';
import type { User as AppUser } from '../types/database';

interface AuthContextType {
  user: User | null;
  userProfile: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test Supabase connection first
    testSupabaseConnection();

    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth initialization timeout - forcing loading to false');
      setLoading(false);
    }, 5000);

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log('Initial session check:', session?.user?.email || 'No session');
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserProfile(session.user.id);
        }
        clearTimeout(loadingTimeout);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        clearTimeout(loadingTimeout);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email || 'No user');
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching user profile for:', userId);
      
      // Get the real user email from auth first
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const realEmail = authUser?.email;
      console.log('Real email from auth:', realEmail);
      
      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // User profile doesn't exist, create one
        console.log('User profile not found, creating default profile for:', userId);
        
        const userEmail = realEmail || authUser?.email || `${userId}@temp.com`;
        const userName = authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'User';
        const userRole = authUser?.user_metadata?.role || 'Read-only';
        
        console.log('Creating profile with metadata:', {
          name: userName,
          email: userEmail,
          role: userRole,
          metadata: authUser?.user_metadata
        });
        
        const newProfile = {
          id: userId,
          name: userName,
          email: userEmail,
          role: userRole as const
        };

        const { data: createData, error: createError } = await supabase
          .from('users')
          .upsert([newProfile])
          .select()
          .single();

        if (createError) {
          console.error('Error creating user profile in fetchUserProfile:', createError);
          console.error('Create error details:', {
            code: createError.code,
            message: createError.message,
            details: createError.details,
            hint: createError.hint
          });
          
          // Set fallback profile
          const fallbackProfile = {
            ...newProfile,
            created_at: new Date().toISOString()
          };
          setUserProfile(fallbackProfile);
        } else {
          console.log('✅ Created user profile in fetchUserProfile:', createData);
          setUserProfile(createData);
        }
        return;
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        const userRole = authUser?.user_metadata?.role || 'Read-only';
        const fallbackProfile = {
          id: userId,
          name: authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'User',
          email: realEmail || authUser?.email || `${userId}@temp.com`,
          role: userRole as const,
          created_at: new Date().toISOString()
        };
        setUserProfile(fallbackProfile);
        return;
      }
      
      // Check if profile has placeholder email and update it with real email
      if (profileData && profileData.email && (profileData.email === 'admin@example.com' || profileData.email.includes('@temp.com') || profileData.email.includes('@example.com')) && realEmail && realEmail !== profileData.email) {
        console.log('Updating placeholder email to real email:', realEmail);
        try {
          // First check if the real email is already in use by another user
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', realEmail)
            .neq('id', userId)
            .maybeSingle();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking for existing email:', checkError);
            setUserProfile(profileData);
            return;
          }

          if (existingUser) {
            console.warn('Email already in use by another user, keeping placeholder email');
            setUserProfile(profileData);
            return;
          }

          const { data: updatedProfile, error: updateError } = await supabase
            .from('users')
            .update({ email: realEmail })
            .eq('id', userId)
            .select()
            .single();
            
          if (updateError) {
            console.error('Failed to update email:', updateError);
            // Use the profile as-is if update fails
            setUserProfile(profileData);
          } else {
            console.log('✅ Email updated successfully');
            setUserProfile(updatedProfile);
          }
        } catch (updateErr) {
          console.error('Error updating email:', updateErr);
          setUserProfile(profileData);
        }
        return;
      }
      
      console.log('User profile data:', profileData);
      setUserProfile(profileData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const realEmail = authUser?.email;
      const userRole = authUser?.user_metadata?.role || 'Read-only';
      const fallbackProfile = {
        id: userId,
        name: authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'User',
        email: realEmail || authUser?.email || `${userId}@temp.com`,
        role: userRole as const,
        created_at: new Date().toISOString()
      };
      setUserProfile(fallbackProfile);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('=== SIGN IN ATTEMPT ===');
    console.log('Email:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('Sign in result:', { user: data.user?.id, error: error?.message });
    
    if (error) {
      console.error('Sign in error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
    }
    
    return { data, error };
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    console.log('=== SIGNUP PROCESS STARTED ===');
    console.log('Signup data:', { email, name, role });
    
    // Check if user profile already exists in database
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    console.log('Existing profile check:', { existingProfile, profileCheckError });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        captchaToken: undefined,
        data: {
          name,
          role,
        },
        // Disable email confirmation
        shouldCreateUser: true
      }
    });

    console.log('Auth signup result:', { data: data.user?.id, error });

    // Handle the case where user is created but needs confirmation
    if (data.user && !error) {
      console.log('User created successfully:', data.user.id);
      console.log('User confirmation status:', data.user.email_confirmed_at);
      
      // If email confirmation is required but not confirmed, we still create the profile
      console.log('Creating user profile for:', data.user.id);
      
      // Create user profile with explicit data
      const profileData = {
        id: data.user.id,
        name,
        email,
        role: role as AppUser['role']
      };
      
      // If profile already exists with this email, update it with the new auth user ID
      if (existingProfile && !profileCheckError) {
        console.log('Updating existing profile with new auth user ID');
        const { data: updateResult, error: updateError } = await supabase
          .from('users')
          .update({ id: data.user.id, name, role: role as AppUser['role'] })
          .eq('email', email)
          .select();
        
        console.log('Profile update result:', { updateResult, updateError });
        
        if (updateError) {
          console.error('Failed to update existing profile:', updateError);
        } else {
          console.log('✅ Successfully updated existing profile with auth user ID');
          return { data, error };
        }
      }
      
      console.log('Attempting to insert profile:', profileData);
      
      const { data: insertResult, error: profileError } = await supabase
        .from('users')
        .upsert([profileData], {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select();

      console.log('Profile insert result:', { insertResult, profileError });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        console.error('Profile error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
        
        console.log('⚠️ Profile creation failed, but auth user was created');
      } else {
        console.log('✅ Profile created successfully on first try');
        console.log('Profile data:', insertResult);
      }
    }

    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};