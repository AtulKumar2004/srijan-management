"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, User, CheckCircle, XCircle, Users } from "lucide-react";

interface SessionDetail {
  _id: string;
  sessionDate: Date;
  sessionTopic: string;
  speakerName: string;
  programId: string;
}

interface AttendanceUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Session Details</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Attendance and Information</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm cursor-pointer sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap"
            >
              ← Back
            </button>
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Calendar className="w-5 h-5" />
                <span className="font-semibold">Date:</span>
              </div>
              <p className="text-gray-800 ml-7">{formatDate(session.sessionDate)}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <User className="w-5 h-5" />
                <span className="font-semibold">Speaker:</span>
              </div>
              <p className="text-gray-800 ml-7">{session.speakerName}</p>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Users className="w-5 h-5" />
                <span className="font-semibold">Topic:</span>
              </div>
              <p className="text-gray-800 ml-7 text-lg">{session.sessionTopic}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{totalStudents}</div>
            <div className="text-sm text-gray-600 mt-1">Total Students</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{presentUsers.length}</div>
            <div className="text-sm text-gray-600 mt-1">Present</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{absentUsers.length}</div>
            <div className="text-sm text-gray-600 mt-1">Absent</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{attendanceRate}%</div>
            <div className="text-sm text-gray-600 mt-1">Attendance Rate</div>
          </div>
        </div>

        {/* Attendance Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Present Students */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Present ({presentUsers.length})
              </h2>
            </div>
            
            {presentUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No one marked present yet</p>
            ) : (
              <div className="space-y-2">
                {presentUsers.map((user) => (
                  <div
                    key={user._id}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Link href={`/profile?userId=${user._id}`}>
                          <h3 className="font-semibold text-gray-800 hover:underline cursor-pointer">{user.name}</h3>
                        </Link>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full font-medium">
                        {user.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Absent Students */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Absent ({absentUsers.length})
              </h2>
            </div>
            
            {absentUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Everyone is present!</p>
            ) : (
              <div className="space-y-2">
                {absentUsers.map((user) => (
                  <div
                    key={user._id}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Link href={`/profile?userId=${user._id}`}>
                          <h3 className="font-semibold text-gray-800 hover:underline cursor-pointer">{user.name}</h3>
                        </Link>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-red-200 text-red-800 rounded-full font-medium">
                        {user.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
