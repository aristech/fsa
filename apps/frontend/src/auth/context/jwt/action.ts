'use client';

import axios, { endpoints } from 'src/lib/axios';

import { setSession } from './utils';
import { JWT_STORAGE_KEY } from './constant';

// ----------------------------------------------------------------------

export type SignInParams = {
  email: string;
  password: string;
  tenantSlug?: string;
};

export type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantSlug?: string;
};

/** **************************************
 * Sign in
 *************************************** */
export const signInWithPassword = async ({
  email,
  password,
  tenantSlug,
}: SignInParams): Promise<void> => {
  try {
    const params = {
      email,
      password,
      ...(tenantSlug && { tenantSlug }),
    };

    const res = await axios.post(endpoints.auth.signIn, params);

    // Handle both response formats: our API format and Minimals UI format
    const accessToken = res.data.accessToken || res.data.data?.token;

    if (!accessToken) {
      throw new Error('Access token not found in response');
    }

    setSession(accessToken);
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
  tenantSlug,
}: SignUpParams): Promise<void> => {
  const params = {
    email,
    password,
    firstName,
    lastName,
    ...(tenantSlug && { tenantSlug }),
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
    await setSession(null);
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};
