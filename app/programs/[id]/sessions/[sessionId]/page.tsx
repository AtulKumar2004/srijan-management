"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, User, CheckCircle, XCircle, Users, BookOpen, Layers, Search, X } from "lucide-react";

interface SessionDetail {
  _id: string;
  sessionDate: Date;
  sessionTopic: string;
  speakerName: string;
  description?: string;
  level?: number;
  programId: string;
}

interface AttendanceUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  level?: number;
  grade?: string;
}

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [presentUsers, setPresentUsers] = useState<AttendanceUser[]>([]);
  const [absentUsers, setAbsentUsers] = useState<AttendanceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentSearch, setPresentSearch] = useState("");
  const [absentSearch, setAbsentSearch] = useState("");

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const res = await fetch(`/api/programs/${programId}/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setPresentUsers(data.presentUsers || []);
        setAbsentUsers(data.absentUsers || []);
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl text-gray-600">Session not found</div>
        </main>
        <Footer />
      </div>
    );
  }

  const totalStudents = presentUsers.length + absentUsers.length;
  const attendanceRate = totalStudents > 0 
    ? ((presentUsers.length / totalStudents) * 100).toFixed(1) 
    : 0;

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Session Overview</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Level {session.level || 1} Attendance & Details
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm cursor-pointer sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap"
            >
              ← Back
            </button>
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 text-sm">
            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Users className="w-4 h-4 text-[#A65353]" />
                <span className="font-semibold">Topic:</span>
              </div>
              <p className="text-gray-800 font-bold text-base ml-6">{session.sessionTopic}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar className="w-4 h-4 text-[#A65353]" />
                <span className="font-semibold">Date:</span>
              </div>
              <p className="text-gray-800 font-medium ml-6">{formatDate(session.sessionDate)}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <User className="w-4 h-4 text-[#A65353]" />
                <span className="font-semibold">Speaker:</span>
              </div>
              <p className="text-gray-800 font-medium ml-6">{session.speakerName}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Layers className="w-4 h-4 text-[#A65353]" />
                <span className="font-semibold">Session Level:</span>
              </div>
              <p className="text-gray-800 font-bold ml-6">Level {session.level || 1}</p>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <BookOpen className="w-4 h-4 text-[#A65353]" />
                <span className="font-semibold">Description:</span>
              </div>
              <p className="text-gray-800 ml-6 whitespace-pre-wrap">{session.description || "No description provided."}</p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 text-center border-b-4 border-blue-500">
            <div className="text-2xl sm:text-3xl font-bold text-gray-800">{totalStudents}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Total Participants (Level {session.level || 1})</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 text-center border-b-4 border-green-500">
            <div className="text-2xl sm:text-3xl font-bold text-green-600">{presentUsers.length}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Present Participants</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 text-center border-b-4 border-red-500">
            <div className="text-2xl sm:text-3xl font-bold text-red-600">{absentUsers.length}</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Absent Participants</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 text-center border-b-4 border-purple-500">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600">{attendanceRate}%</div>
            <div className="text-xs sm:text-sm text-gray-600 mt-1">Attendance Rate</div>
          </div>
        </div>

        {/* Attendance Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Present Participants */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-t-4 border-green-500">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-bold text-gray-800">
                  Present List ({presentUsers.length})
                </h2>
              </div>
            </div>

            {/* Present Search */}
            {presentUsers.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search present by name, phone, or role..."
                  value={presentSearch}
                  onChange={(e) => setPresentSearch(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white text-sm transition-all text-gray-800 placeholder-gray-400"
                />
                {presentSearch && (
                  <button
                    onClick={() => setPresentSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            
            {presentUsers.length === 0 ? (
              <p className="text-gray-500 italic text-center py-8 text-sm">No level {session.level || 1} participants marked present</p>
            ) : (() => {
              const filteredPresent = presentUsers.filter(u => {
                if (!presentSearch.trim()) return true;
                const q = presentSearch.toLowerCase();
                return (
                  u.name.toLowerCase().includes(q) ||
                  u.phone?.toLowerCase().includes(q) ||
                  u.email?.toLowerCase().includes(q) ||
                  u.role.toLowerCase().includes(q)
                );
              });
              return filteredPresent.length === 0 ? (
                <p className="text-gray-500 italic text-center py-6 text-sm">No present participants matching "{presentSearch}"</p>
              ) : (
                <div className="space-y-2.5">
                  {filteredPresent.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => router.push(`/programs/${programId}/${user.role === 'volunteer' ? 'volunteers' : 'participants'}/${user._id}`)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-all cursor-pointer shadow-sm gap-2"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="font-bold text-gray-800 text-base truncate">{user.name}</div>
                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-yellow-200 text-yellow-900 rounded-full capitalize flex-shrink-0">{user.role}</span>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-700 flex-wrap flex-shrink-0 ml-auto">
                        <span>📞 {user.phone || user.email || 'N/A'}</span>
                        <span>Level: {user.level || session.level || 1}</span>
                        <span>Grade: {user.grade || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Absent Participants */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-t-4 border-red-500">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-gray-800">
                  Absent List ({absentUsers.length})
                </h2>
              </div>
            </div>

            {/* Absent Search */}
            {absentUsers.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search absent by name, phone, or role..."
                  value={absentSearch}
                  onChange={(e) => setAbsentSearch(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition-all text-gray-800 placeholder-gray-400"
                />
                {absentSearch && (
                  <button
                    onClick={() => setAbsentSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            
            {absentUsers.length === 0 ? (
              <p className="text-gray-500 italic text-center py-8 text-sm">All level {session.level || 1} participants are present!</p>
            ) : (() => {
              const filteredAbsent = absentUsers.filter(u => {
                if (!absentSearch.trim()) return true;
                const q = absentSearch.toLowerCase();
                return (
                  u.name.toLowerCase().includes(q) ||
                  u.phone?.toLowerCase().includes(q) ||
                  u.email?.toLowerCase().includes(q) ||
                  u.role.toLowerCase().includes(q)
                );
              });
              return filteredAbsent.length === 0 ? (
                <p className="text-gray-500 italic text-center py-6 text-sm">No absent participants matching "{absentSearch}"</p>
              ) : (
                <div className="space-y-2.5">
                  {filteredAbsent.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => router.push(`/programs/${programId}/${user.role === 'volunteer' ? 'volunteers' : 'participants'}/${user._id}`)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-all cursor-pointer shadow-sm gap-2"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="font-bold text-gray-800 text-base truncate">{user.name}</div>
                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-yellow-200 text-yellow-900 rounded-full capitalize flex-shrink-0">{user.role}</span>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-700 flex-wrap flex-shrink-0 ml-auto">
                        <span>📞 {user.phone || user.email || 'N/A'}</span>
                        <span>Level: {user.level || session.level || 1}</span>
                        <span>Grade: {user.grade || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
