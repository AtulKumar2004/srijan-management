'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOtpStore } from '@/store/otpStore';
import { useAuthStore } from '@/store/authStore';
import { Loader, User, Mail, Phone, Briefcase, Home, Building, Users, Cake, Megaphone, Sparkles, MapPin, Lock, HandHeart, Flower } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { setOtpData } = useOtpStore();
  const { signup, loading, error: authError } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profession: '',
    homeTown: '',
    connectedToTemple: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    howDidYouHearAboutUs: '',
    numberOfRounds: ''
  });
  const [validationError, setValidationError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    try {
      const result = await signup({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        profession: formData.profession,
        homeTown: formData.homeTown,
        connectedToTemple: formData.connectedToTemple,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        howDidYouHearAboutUs: formData.howDidYouHearAboutUs,
        numberOfRounds: formData.numberOfRounds ? parseInt(formData.numberOfRounds) : 0
      });

      // Store OTP data in Zustand store
      setOtpData(result.userId, result.channel === 'phone' ? formData.phone : formData.email, result.channel as 'phone' | 'email');

      // Redirect to verify OTP page
      router.push('/verify-otp');
    } catch (err: any) {
      // Error is already set in the store
      console.error('Signup error:', err);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      backgroundImage: 'url(/backgrou.png)',
      backgroundRepeat: 'repeat',
      backgroundSize: '25%'
    }}>
      {/* Signup Card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-cyan-900 mb-2">
              Join Our Sangha
            </h1>
            <p className="text-slate-700 font-bold">Begin your spiritual journey with us</p>
          </div>

          {/* Signup Form Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-cyan-100">
            {(validationError || authError) && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {validationError || authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Basic Information Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <User className="w-4 h-4" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Mail className="w-4 h-4" />
                    Email Address *
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

                {/* Phone Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                    placeholder="+91 9876543210"
                  />
                </div>

                {/* Profession Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Briefcase className="w-4 h-4" />
                    Profession
                  </label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                    placeholder="Your profession"
                  />
                </div>

                {/* Home Town Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Home className="w-4 h-4" />
                    Home Town
                  </label>
                  <input
                    type="text"
                    value={formData.homeTown}
                    onChange={(e) => setFormData({ ...formData, homeTown: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                    placeholder="Your home town"
                  />
                </div>

                {/* Connected To Temple Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Building className="w-4 h-4" />
                    Connected To Temple
                  </label>
                  <input
                    type="text"
                    value={formData.connectedToTemple}
                    onChange={(e) => setFormData({ ...formData, connectedToTemple: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                    placeholder="Which temple are you connected to?"
                  />
                </div>

                {/* Gender Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Users className="w-4 h-4" />
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Date of Birth Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Cake className="w-4 h-4" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                  />
                </div>

                {/* How Did You Hear About Us Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Megaphone className="w-4 h-4" />
                    How Did You Hear About Us?
                  </label>
                  <select
                    value={formData.howDidYouHearAboutUs}
                    onChange={(e) => setFormData({ ...formData, howDidYouHearAboutUs: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                  >
                    <option value="">Select an option</option>
                    <option value="Friend">Friend</option>
                    <option value="Family">Family</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Temple Visit">Temple Visit</option>
                    <option value="Event">Event</option>
                    <option value="Website">Website</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Number of Rounds Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Sparkles className="w-4 h-4" />
                    Number of Rounds (Daily Chanting)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.numberOfRounds}
                    onChange={(e) => setFormData({ ...formData, numberOfRounds: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Address Field - Full Width */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                  placeholder="Your address"
                  rows={2}
                />
              </div>

              {/* Password Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Lock className="w-4 h-4" />
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                    placeholder="Create a password (min 6 characters)"
                  />
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-cyan-700 mb-2">
                    <Lock className="w-4 h-4" />
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-lg cursor-pointer bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <HandHeart className="w-5 h-5" />
                    Create Account
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

            {/* Login Link */}
            <div className="text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-cyan-600 hover:text-cyan-700 inline-flex items-center gap-1"
                >
                  Sign In 🌸
                </Link>
              </p>
            </div>
          </div>

          {/* Footer Quote */}
          <div className="text-center mt-8 text-cyan-700 italic">
            <p className="text-slate-700 font-bold">🌸 "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज ।
अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा श‍ुच:" - Bg-18.66</p>
          </div>
        </div>
      </div>
    </div>
  );
}
