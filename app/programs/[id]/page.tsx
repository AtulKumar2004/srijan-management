"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Users, UserCheck, UserPlus, Megaphone, ClipboardList, Calendar } from "lucide-react";

interface Program {
  _id: string;
  name: string;
  description?: string;
  minAge?: number;
  maxAge?: number;
  photo?: string;
}

export default function ProgramDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    checkAuth();
    fetchProgram();
  }, [programId]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    }
  };

  const fetchProgram = async () => {
    try {
      const res = await fetch(`/api/programs/${programId}`);
      if (res.ok) {
        const data = await res.json();
        setProgram(data.program);
      } else {
        console.error("Failed to fetch program");
      }
    } catch (error) {
      console.error("Error fetching program:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <img src="/mrdanga.png" alt="Loading" className="w-20 h-20 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl text-gray-600">Program not found</div>
        </main>
        <Footer />
      </div>
    );
  }

  const cards = [
    {
      title: "Volunteers",
      icon: UserCheck,
      color: "#A65353",
      bgColor: "#FEF2F2",
      route: `/programs/${programId}/volunteers`,
      description: "View all volunteers for this program",
      hideForParticipant: true
    },
    {
      title: "Participants",
      icon: Users,
      color: "#2563EB",
      bgColor: "#EFF6FF",
      route: `/programs/${programId}/participants`,
      description: "View all participants enrolled",
      hideForParticipant: false
    },
    {
      title: "Sessions",
      icon: Calendar,
      color: "#7C3AED",
      bgColor: "#F5F3FF",
      route: `/programs/${programId}/sessions`,
      description: "View all sessions and attendance",
      hideForParticipant: false
    },
    {
      title: "Follow-ups",
      icon: ClipboardList,
      color: "#059669",
      bgColor: "#ECFDF5",
      route: `/programs/${programId}/followups`,
      description: "Manage follow-ups for participants",
      hideForParticipant: true
    }
  ];

  // Filter cards based on user role
  const visibleCards = user?.role === "participant" 
    ? cards.filter(card => !card.hideForParticipant)
    : cards;

  return (
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundImage: 'url(/backgrou.png)', 
      backgroundSize: '25%', 
      backgroundRepeat: 'repeat' 
    }}>
      <Header />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Program Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {program.photo && (
              <img
                src={program.photo}
                alt={program.name}
                className="w-full sm:w-32 sm:h-32 h-48 object-cover rounded-lg"
              />
            )}
            <div className="flex-grow w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">{program.name}</h1>
              {program.description && (
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{program.description}</p>
              )}
              {(program.minAge || program.maxAge) && (
                <div className="flex items-center text-xs sm:text-sm text-gray-500">
                  <span className="font-medium">Age Range:</span>
                  <span className="ml-2">
                    {program.minAge || "N/A"} - {program.maxAge || "N/A"} years
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm cursor-pointer sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap self-start sm:self-auto"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {visibleCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.title}
                onClick={() => router.push(card.route)}
                className="cursor-pointer bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                <div
                  className="p-4 sm:p-6 transition-all duration-300"
                  style={{ backgroundColor: card.bgColor }}
                >
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <div 
                      className="p-3 sm:p-4 rounded-full"
                      style={{ backgroundColor: card.color + "20" }}
                    >
                      <IconComponent 
                        size={32}
                        className="sm:w-10 sm:h-10"
                        style={{ color: card.color }}
                      />
                    </div>
                  </div>
                  <h3 
                    className="text-lg sm:text-xl font-bold text-center mb-2"
                    style={{ color: card.color }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 text-center">
                    {card.description}
                  </p>
                </div>
                <div 
                  className="py-2 sm:py-3 text-center text-white text-sm sm:text-base font-medium group-hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: card.color }}
                >
                  View List →
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
