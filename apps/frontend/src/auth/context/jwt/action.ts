'use client';

import axios, { endpoints } from 'src/lib/axios';

import { setSession } from './utils';
import { JWT_STORAGE_KEY } from './constant';

// ----------------------------------------------------------------------

export type SignInParams = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

/** **************************************
 * Sign in
 *************************************** */
export const signInWithPassword = async ({
  email,
  password,
  rememberMe,
}: SignInParams): Promise<void> => {
  try {
    const params = {
      email,
      password,
    };

    const res = await axios.post(endpoints.auth.signIn, params);

    // Handle both response formats: our API format and Minimals UI format
    const accessToken = res.data.accessToken || res.data.data?.token;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    setSession(accessToken, { remember: !!rememberMe });
  } catch (error) {
    console.error('Error during sign in:', error);
    throw error;
  }
};

/** **************************************
 * Sign up
 *************************************** */
export const signUp = async ({
  email,
  password,
  firstName,
  lastName,
}: SignUpParams): Promise<void> => {
  const params = {
    email,
    password,
    firstName,
    lastName,
  };

  try {
    const res = await axios.post(endpoints.auth.signUp, params);

    // Handle both response formats: our API format and Minimals UI format
    const accessToken = res.data.accessToken || res.data.data?.token;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    sessionStorage.setItem(JWT_STORAGE_KEY, accessToken);
  } catch (error) {
    console.error('Error during sign up:', error);
    throw error;
  }
};

/** **************************************
 * Sign out
 *************************************** */
export const signOut = async (): Promise<void> => {
  try {
    // Call backend logout endpoint if we have a token
    const token =
      sessionStorage.getItem('jwt_access_token') ||
      localStorage.getItem('jwt_access_token');

    if (token) {
      try {
        await axios.post(endpoints.auth.signOut);
      } catch (error) {
        // Don't throw if logout endpoint fails - we still want to clear local session
        console.warn('Backend logout failed:', error);
      }
    }

    // Clear local session
    await setSession(null);
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};
