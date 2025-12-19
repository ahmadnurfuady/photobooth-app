// lib/hooks/useAuth.ts
'use client';

import { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthChange, signInWithEmail, signOut as firebaseSignOut } from '@/lib/firebase';
import { User } from '@/types';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn:  (email: string, password: string) => Promise<{ success: boolean; error?:  string }>;
  signOut:  () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser. uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);

    const { user:  firebaseUser, error:  signInError } = await signInWithEmail(email, password);

    if (signInError) {
      setError(signInError);
      setLoading(false);
      return { success: false, error: signInError };
    }

    setLoading(false);
    return { success: true };
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    const { error:  signOutError } = await firebaseSignOut();

    if (signOutError) {
      setError(signOutError);
    }

    setUser(null);
    setLoading(false);
  };

  return { user, loading, error, signIn, signOut };
}