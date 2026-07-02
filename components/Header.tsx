"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, User, Bell } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const isAboutPage = pathname === "/about";
  const [user, setUser] = useState<{ email: string; role: string; _id: string; isArchived?: boolean } | null>(null);
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
    <header
      className={`relative transition-colors duration-300 ${
        isAboutPage
          ? "bg-[#B58251] border-b-0 shadow-none text-white"
          : "shadow-md border-b border-gray-400"
      }`}
      style={{
        backgroundImage: isAboutPage ? "none" : "url(/HeaderBack.png)",
        backgroundSize: "22%",
        backgroundRepeat: "repeat",
      }}
    >
      <div className="container mx-auto px-4 py-1.5 sm:py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => router.push(user?.isArchived || user?.role === "guest" ? "/profile" : "/dashboard")}
              className="cursor-pointer flex justify-center items-center gap-2"
              aria-label="Go to dashboard"
            >
              <img src="/SrijanLogo4.png" className="rounded-full w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12" alt="Srijan Youth Festival Logo" />
              <h1 className={`text-lg sm:text-xl md:text-2xl font-bold tracking-tight ${isAboutPage ? "text-white" : "text-amber-700"}`}>SRIJAN</h1>
            </button>
          </div>

          <nav className="hidden md:flex items-center space-x-2 sm:space-x-3">
            {user && user.role !== "guest" && !user.isArchived && (
              <button
                onClick={() => router.push("/dashboard")}
                className="px-3.5 py-1.5 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-all text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer shadow-sm"
              >
                Dashboard
              </button>
            )}

            {user && (
              <div className="flex items-center space-x-2 sm:space-x-3">
                {(user.role === "admin" || user.role === "program_manager" || user.role === "volunteer") && !user.isArchived && (
                  <button
                    onClick={() => router.push("/notifications")}
                    className="px-3.5 py-1.5 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-all text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Bell size={16} />
                    Notifications
                  </button>
                )}
                <button
                  onClick={handleProfileClick}
                  className="px-3.5 py-1.5 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-all text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <User size={16} />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-all text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer shadow-sm"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-1.5 text-gray-700 hover:text-[#A65353] transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {isMenuOpen && (
          <nav className="md:hidden mt-3 pb-3 border-t border-gray-300 pt-3 space-y-2.5">
            {user && user.role !== "guest" && !user.isArchived && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  router.push("/dashboard");
                }}
                className="w-full px-4 py-2 cursor-pointer bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-all text-sm font-bold shadow-sm"
              >
                Dashboard
              </button>
            )}

            {user && (
              <>
                {(user.role === "admin" || user.role === "program_manager" || user.role === "volunteer") && !user.isArchived && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push("/notifications");
                    }}
                    className="w-full px-4 py-2 cursor-pointer bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-all text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Bell size={16} />
                    Notifications
                  </button>
                )}
                <button
                  onClick={handleProfileClick}
                  className="w-full px-4 py-2 cursor-pointer bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-all text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <User size={16} />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full cursor-pointer px-4 py-2 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-all text-sm font-bold shadow-sm"
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
