// app/admin/login/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { LoginForm } from '@/components/admin/LoginForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (! loading && user) {
      router.push('/admin/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Login
            </h1>
            <p className="text-gray-600">
              Sign in to manage your photobooth
            </p>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Footer */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              ← Back to Home
            </a>
          </div>
        </div>

        {/* Info */}
        <p className="text-center text-sm text-gray-600 mt-4">
          Demo credentials:  admin@photobooth.local
        </p>
      </div>
    </div>
  );
}