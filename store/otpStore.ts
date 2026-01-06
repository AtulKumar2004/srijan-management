import { create } from 'zustand';

interface OtpState {
  userId: string;
  target: string;
  channel: 'phone' | 'email';
  loading: boolean;
  error: string;
  setOtpData: (userId: string, target: string, channel: 'phone' | 'email') => void;
  clearOtpData: () => void;
  verifyOtp: (code: string) => Promise<string>;
}

export const useOtpStore = create<OtpState>((set, get) => ({
  userId: '',
  target: '',
  channel: 'email',
  loading: false,
  error: '',
  
  setOtpData: (userId, target, channel) => set({ userId, target, channel, error: '' }),
  
  clearOtpData: () => set({ userId: '', target: '', channel: 'email', error: '' }),
  
  verifyOtp: async (code: string) => {
    const { userId, target } = get();
    
    if (!userId || !target) {
      set({ error: 'Invalid verification session' });
      throw new Error('Invalid verification session');
    }

    set({ loading: true, error: '' });

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          target,
          code
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      set({ loading: false });
      return data.redirect || '/dashboard';
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  }
}));
