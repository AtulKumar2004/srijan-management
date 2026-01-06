"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, User } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; role: string; _id: string } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch((err) => console.error("Failed to fetch user:", err));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsMenuOpen(false);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleProfileClick = () => {
    setIsMenuOpen(false);
    router.push("/profile");
  };

  return (
    <header className="shadow-md border-b border-gray-400 relative" style={{ backgroundImage: 'url(/HeaderBack.png)', backgroundSize: '22%', backgroundRepeat: 'repeat' }}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <img src="/SrijanLogo4.png" className="rounded-full w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20" alt="Srijan Logo" />
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#A65353]">Srijan</h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-4">
            {user && user.role !== "guest" && (
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-colors text-sm whitespace-nowrap cursor-pointer"
              >
                Dashboard
              </button>
            )}
            
            {user && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleProfileClick}
                  className="px-4 py-2 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-colors text-sm whitespace-nowrap flex items-center gap-2 cursor-pointer"
                >
                  <User size={18} />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-colors text-sm whitespace-nowrap cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:text-[#A65353] transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-gray-300 pt-4 space-y-3">
            {user && user.role !== "guest" && (
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  router.push("/dashboard");
                }}
                className="w-full px-4 py-2 cursor-pointer bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-colors font-medium"
              >
                Dashboard
              </button>
            )}
            
            {user && (
              <>
                <button
                  onClick={handleProfileClick}
                  className="w-full px-4 py-2 cursor-pointer bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <User size={18} />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full cursor-pointer px-4 py-2 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-colors font-medium"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
