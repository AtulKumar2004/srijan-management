'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            // User is already logged in, redirect immediately
            const redirectUrl = data.user.role === 'guest' ? '/profile' : '/dashboard';
            router.replace(redirectUrl);
            // Don't set isChecking to false - keep showing loading during redirect
            return;
          }
        }
        // Only set to false if user is NOT logged in
        setIsChecking(false);
      } catch (error) {
        // Not logged in, continue
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // Show loading spinner while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50">
        <div className="text-center">
          <img 
            src="/mrdanga.png" 
            alt="Loading" 
            className="w-20 h-20 mx-auto mb-4 animate-spin"
            style={{ animationDuration: '1s' }}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
