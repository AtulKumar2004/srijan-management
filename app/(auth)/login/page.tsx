'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Loader, Mail, Lock, HandHeart, ClipboardList, Target } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading, error: authError, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Check for verification success message
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email/Phone verified successfully! Please login to continue.');
    }
    // Clear any previous errors
    clearError();
  }, [searchParams, clearError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage('');

    try {
      const { redirect } = await login(formData);
      // Use the redirect URL from the API response
      router.push(redirect);
    } catch (err: any) {
      // Error is already set in the store and displayed to the user
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      backgroundImage: 'url(/backgrou.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '25%'
    }}>
      {/* Login Card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-cyan-900 mb-2">
              Hare Krishna
            </h1>
            <p className="text-black font-bold">Sign in to continue your spiritual journey</p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-cyan-100">
            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm">
                {successMessage}
              </div>
            )}
            
            {authError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                  placeholder="your@email.com"
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700">
                    <Lock className="w-4 h-4" />
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                  placeholder="Enter your password"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 cursor-pointer px-6 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <HandHeart className="w-5 h-5" />
                    Sign In
                  </span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-cyan-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-gray-600">
                New to our temple community?{' '}
                <Link
                  href="/signup"
                  className="font-semibold text-cyan-600 hover:text-cyan-700"
                >
                  Create Account 🌸
                </Link>
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-cyan-200">
              <p className="text-center text-sm text-gray-600 mb-3 font-semibold">Quick Actions</p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/attendance"
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-lg border border-cyan-200 transition-all shadow-sm hover:shadow-md"
                >
                  <ClipboardList className="w-8 h-8 text-cyan-600 mb-2" />
                  <span className="text-sm font-semibold text-cyan-700">Attendance</span>
                  <span className="text-xs text-gray-500 text-center mt-1">Mark attendance</span>
                </Link>
                
                <Link
                  href="/outreach-form"
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 rounded-lg border border-orange-200 transition-all shadow-sm hover:shadow-md"
                >
                  <Target className="w-8 h-8 text-orange-600 mb-2" />
                  <span className="text-sm font-semibold text-orange-700">Outreach</span>
                  <span className="text-xs text-gray-500 text-center mt-1">Register contacts</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer Quote */}
          <div className="text-center mt-8 text-cyan-700 italic">
            <p className="text-sm text-black font-bold">🕉️ "The soul is neither born, and nor does it die" - Bhagavad Gita</p>
          </div>
        </div>
      </div>
    </div>
  );
}
