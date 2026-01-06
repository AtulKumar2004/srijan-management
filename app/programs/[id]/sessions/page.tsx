"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, User, ChevronRight } from "lucide-react";

interface Session {
  _id: string;
  sessionDate: Date;
  sessionTopic: string;
  speakerName: string;
  createdAt: Date;
}

interface Program {
  _id: string;
  name: string;
}

export default function SessionsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  
  const [program, setProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [programId]);

  const fetchData = async () => {
    try {
      // Fetch program details
      const programRes = await fetch(`/api/programs/${programId}`);
      if (programRes.ok) {
        const programData = await programRes.json();
        setProgram(programData.program);
      }

      // Fetch sessions for this program
      const sessionsRes = await fetch(`/api/programs/${programId}/sessions`);
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundImage: 'url(/backgrou.png)', 
      backgroundSize: '25%', 
      backgroundRepeat: 'repeat' 
    }}>
      <Header />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Sessions</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {program ? `${program.name} - All Sessions` : 'Loading...'}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm cursor-pointer sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="text-center py-12">
            <img src="/mrdanga.png" alt="Loading" className="w-20 h-20 animate-spin mx-auto" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">No Sessions Yet</h3>
            <p className="text-gray-500">
              Sessions will appear here once you create follow-up lists
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-2">
              Total Sessions: <span className="font-bold">{sessions.length}</span>
            </div>
            
            {sessions.map((session) => (
              <div
                key={session._id}
                onClick={() => router.push(`/programs/${programId}/sessions/${session._id}`)}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group"
              >
                <div className="p-4 sm:p-6 flex items-center justify-between gap-4">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-800">
                          {session.sessionTopic}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {formatDate(session.sessionDate)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Speaker:</span>
                      <span>{session.speakerName}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div className="p-2 rounded-full bg-gray-100 group-hover:bg-purple-100 transition-colors">
                      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
