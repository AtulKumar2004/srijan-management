import { create } from 'zustand';

interface SignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
  profession?: string;
  homeTown?: string;
  connectedToTemple?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  howDidYouHearAboutUs?: string;
  numberOfRounds?: number;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthState {
  loading: boolean;
  error: string;
  signup: (data: SignupData) => Promise<{ userId: string; target: string; channel: string }>;
  login: (data: LoginData) => Promise<{ role: string; redirect: string }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: false,
  error: '',

  signup: async (data: SignupData) => {
    set({ loading: true, error: '' });

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          numberOfRounds: data.numberOfRounds || 0,
          joinedAt: new Date()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      set({ loading: false });
      
      return {
        userId: result.userId,
        target: result.target,
        channel: result.target
      };
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  login: async (data: LoginData) => {
    set({ loading: true, error: '' });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      set({ loading: false });
      return { 
        role: result.user?.role || 'guest',
        redirect: result.redirect || '/dashboard'
      };
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  clearError: () => set({ error: '' })
}));
