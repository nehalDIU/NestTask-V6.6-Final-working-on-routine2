import { supabase } from '../lib/supabase';
import { getAuthErrorMessage } from '../utils/authErrors';
import { getAuthRedirectUrl } from '../utils/environment';
import type { LoginCredentials, SignupCredentials, User } from '../types/auth';

export async function loginUser({ email, password }: LoginCredentials): Promise<User> {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (authError) throw authError;
    if (!authData?.user) throw new Error('No user data received');

    // Wait briefly for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get user profile data
    const { data: profiles, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    const profile = profiles?.[0];
    if (!profile) {
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0],
          role: authData.user.user_metadata?.role || 'user',
          phone: authData.user.user_metadata?.phone,
          student_id: authData.user.user_metadata?.studentId
        })
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create user profile');
      }

      return {
        id: newProfile.id,
        email: newProfile.email,
        name: newProfile.name,
        phone: newProfile.phone,
        studentId: newProfile.student_id,
        role: newProfile.role,
        createdAt: newProfile.created_at
      };
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      studentId: profile.student_id,
      role: profile.role,
      createdAt: profile.created_at
    };
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function signupUser({ email, password, name, phone, studentId }: SignupCredentials): Promise<User> {
  try {
    if (!email || !password || !name || !phone || !studentId) {
      throw new Error('All fields are required');
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'user',
          phone,
          studentId
        },
      },
    });
    
    if (authError) throw authError;
    if (!authData?.user) throw new Error('No user data received');

    // Wait for the trigger to create the user profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get or create the user profile
    const { data: profiles, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id);

    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }

    const profile = profiles?.[0];
    if (!profile) {
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          name,
          role: 'user',
          phone,
          student_id: studentId
        })
        .select()
        .single();

      if (createError) {
        await supabase.auth.signOut();
        throw new Error('Failed to create user profile');
      }

      return {
        id: newProfile.id,
        email: newProfile.email,
        name: newProfile.name,
        phone: newProfile.phone,
        studentId: newProfile.student_id,
        role: newProfile.role,
        createdAt: newProfile.created_at
      };
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      studentId: profile.student_id,
      role: profile.role,
      createdAt: profile.created_at
    };
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.message?.includes('duplicate key') || 
        error.message?.includes('already registered')) {
      throw new Error('Email already registered');
    }
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function logoutUser(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('supabase.auth.token');
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    // Get current site URL
    const siteUrl = window.location.origin;
    
    // Define the reset URL - this is where Supabase will redirect after clicking the email link
    // Use a more standard path structure for the redirect
    const resetUrl = `${siteUrl}/reset-password`;
    
    console.log('Using redirect URL for password reset:', resetUrl);
    console.log('Email for password reset:', email);

    // Send the password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });

    if (error) {
      console.error('Supabase reset password error:', error);
      throw error;
    }
    
    console.log('Password reset email sent successfully');
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(getAuthErrorMessage(error) || 'Failed to send password reset link. Please try again.');
  }
}

export async function updatePassword(password: string, token?: string): Promise<void> {
  try {
    if (!password) {
      throw new Error('Password is required');
    }

    console.log('Starting password update process');
    
    // If we have a token parameter, we need to verify it first
    if (token) {
      console.log('Token provided, attempting to exchange code for session');
      try {
        // Exchange the token for a session - this is how Supabase processes recovery tokens
        const { error } = await supabase.auth.exchangeCodeForSession(token);
        
        if (error) {
          console.error('Error exchanging code for session:', error);
          throw error;
        }
        
        console.log('Code exchanged for session successfully');
      } catch (verifyErr) {
        console.error('Error during code exchange:', verifyErr);
        throw new Error('Invalid or expired reset token. Please request a new password reset link.');
      }
    }
    
    // Now that we have a valid session, we can update the password
    try {
      console.log('Attempting to update user password');
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        console.error('Error updating password:', error);
        throw error;
      }
      
      console.log('Password updated successfully!');
    } catch (updateErr) {
      console.error('Exception during password update:', updateErr);
      throw updateErr;
    }
  } catch (error: any) {
    console.error('Update password error:', error);
    throw new Error(getAuthErrorMessage(error) || 'Failed to update password. Please try again.');
  }
}