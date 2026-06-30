'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useOtpStore } from '@/store/otpStore';

export default function VerifyOtpPage() {
  const router = useRouter();
  const { userId, target, channel, clearOtpData, verifyOtp, loading, error: otpError, clearError } = useOtpStore();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Clear any stale error on mount
  useEffect(() => {
    clearError();
  }, []);

  useEffect(() => {
    // Only redirect to signup if no OTP data AND not currently verifying
    if (!userId || !target) {
      if (!isVerifying) {
        router.push('/signup');
      }
    }
  }, [userId, target, router, isVerifying]);

  const handleChange = (index: number, value: string) => {
    const newCode = [...code];

    // Handle pasted content
    if (value.length > 1) {
      const pastedCode = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newCode[i] = pastedCode[i] || '';
      }
      setCode(newCode);

      // Focus on the last non-empty input or the first empty one
      const lastFilledIndex = newCode.findLastIndex((digit) => digit !== '');
      const focusIndex = lastFilledIndex < 5 ? lastFilledIndex + 1 : 5;
      inputRefs.current[focusIndex]?.focus();
    } else {
      newCode[index] = value;
      setCode(newCode);

      // Move focus to the next input field if value is entered
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      return;
    }

    setIsVerifying(true);
    
    try {
      const redirectUrl = await verifyOtp(verificationCode);

      // Clear OTP data from store
      clearOtpData();

      // Redirect to the appropriate page (profile for guests, dashboard for others)
      router.push(redirectUrl || '/dashboard');
    } catch (err: any) {
      // Error is already set in the store
      // Clear the code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setIsVerifying(false);
    }
  };

  // Auto submit when all fields are filled
  useEffect(() => {
    if (code.every((digit) => digit !== '')) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [code]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      backgroundImage: 'url(/backgrou.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '25%'
    }}>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-3 sm:mb-4">
              <div className="bg-cyan-900/10 rounded-full p-4">
                <ShieldCheck size={52} className="text-cyan-900" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-cyan-900 mb-2">
              Verify Your Email
            </h1>
            <p className="text-white text-sm sm:text-base px-2 break-all">
              Enter the 6-digit code sent to<br />
              <span className="font-semibold">{target}</span>
            </p>
          </div>

          {/* Verification Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-5 sm:p-8 border border-cyan-100">
            {otpError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {otpError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center gap-1.5 sm:gap-2">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-white border-2 border-cyan-200 text-cyan-900 rounded-md sm:rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || code.some((digit) => !digit)}
                className="w-full py-3 px-6 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  '✓ Verify Code'
                )}
              </button>
            </form>

            {/* Back to Signup Link */}
            <div className="text-center mt-6">
              <p className="text-gray-600 text-sm">
                Didn't receive the code?{' '}
                <Link
                  href="/signup"
                  className="font-semibold text-cyan-600 hover:text-cyan-700"
                >
                  Sign up again
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-white text-sm italic flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-white/80" />
              Secure verification for your spiritual journey
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}