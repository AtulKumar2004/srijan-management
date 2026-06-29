"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface VisualSession {
  dateStr: string;
  year: number;
  monthName: string;
  monthKey: string;
  level: number;
  status: "Present" | "Absent";
}

interface AttendanceVisualData {
  totalAttended: number;
  attendedLevelCounts: { [key: number]: number };
  visualSessions: VisualSession[];
}

export default function ProfileAttendanceTab({ userId, programId }: { userId: string; programId: string }) {
  const [data, setData] = useState<AttendanceVisualData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendanceVisual();
  }, [userId, programId]);

  const fetchAttendanceVisual = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/programs/${programId}/users/${userId}/attendance-visual`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        setError("Failed to load attendance pictorial view.");
      }
    } catch (err) {
      console.error("Error loading attendance visual:", err);
      setError("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#8B6B61]"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-2xl p-6 text-center text-red-700 font-medium">
        {error || "No data found."}
      </div>
    );
  }

  // Group visual sessions by monthKey
  const groupedSessions = new Map<string, { year: number; monthName: string; sessions: VisualSession[] }>();
  data.visualSessions.forEach((s) => {
    if (!groupedSessions.has(s.monthKey)) {
      groupedSessions.set(s.monthKey, { year: s.year, monthName: s.monthName, sessions: [] });
    }
    groupedSessions.get(s.monthKey)!.sessions.push(s);
  });

  const monthKeys = Array.from(groupedSessions.keys());

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Summary Box */}
      <div className="bg-[#FFF8E7] border-2 border-[#D4A574] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-center sm:text-left items-center font-bold text-gray-800 text-sm sm:text-base">
          <div className="lg:col-span-1 text-lg sm:text-xl text-[#8B6B61] border-b sm:border-b-0 pb-2 sm:pb-0 border-[#D4A574]">
            Total Attended : <span className="text-gray-900 font-extrabold ml-1">{data.totalAttended}</span>
          </div>
          <div className="bg-white/80 px-3 py-2 rounded-xl border border-[#D4A574]/50 text-center shadow-xs">
            Attended (Level 1) : <span className="text-emerald-700 font-extrabold ml-1">{data.attendedLevelCounts[1] || 0}</span>
          </div>
          <div className="bg-white/80 px-3 py-2 rounded-xl border border-[#D4A574]/50 text-center shadow-xs">
            Attended (Level 2) : <span className="text-emerald-700 font-extrabold ml-1">{data.attendedLevelCounts[2] || 0}</span>
          </div>
          <div className="bg-white/80 px-3 py-2 rounded-xl border border-[#D4A574]/50 text-center shadow-xs">
            Attended (Level 3) : <span className="text-emerald-700 font-extrabold ml-1">{data.attendedLevelCounts[3] || 0}</span>
          </div>
          <div className="bg-white/80 px-3 py-2 rounded-xl border border-[#D4A574]/50 text-center shadow-xs">
            Attended (Level 4) : <span className="text-emerald-700 font-extrabold ml-1">{data.attendedLevelCounts[4] || 0}</span>
          </div>
        </div>
      </div>

      {/* Pictorial Months Container */}
      <div className="bg-[#FFFDF9] border-2 border-[#D4A574] rounded-2xl p-4 sm:p-6 shadow-md max-h-[650px] overflow-y-auto">
        {monthKeys.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-medium">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-60" />
            No sessions recorded for this student in this program yet.
          </div>
        ) : (
          <div className="space-y-4">
            {monthKeys.map((mKey) => {
              const group = groupedSessions.get(mKey)!;
              return (
                <div
                  key={mKey}
                  className="flex flex-col sm:flex-row border border-gray-300 rounded-xl overflow-hidden shadow-sm bg-white"
                >
                  {/* Left Year/Month Header Column */}
                  <div className="sm:w-36 bg-[#8B6B61] text-white flex sm:flex-col justify-between sm:justify-center items-center px-4 py-3 sm:py-4 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-[#6B4B41]">
                    <span className="text-xs sm:text-sm font-semibold tracking-wider opacity-90">{group.year}</span>
                    <span className="text-base sm:text-lg font-bold">{group.monthName}</span>
                  </div>

                  {/* Right Session Columns Container */}
                  <div className="flex-1 p-3 sm:p-4 flex flex-wrap gap-3 items-center bg-[#FAF6F0]/60">
                    {group.sessions.map((sess, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col rounded-lg overflow-hidden border border-gray-300 shadow-xs min-w-[135px] sm:min-w-[155px] transition-transform hover:scale-102"
                      >
                        {/* Session Date & Level Header */}
                        <div className="bg-[#8B6B61] text-white py-2 px-3 text-center font-bold text-xs sm:text-sm tracking-tight">
                          {sess.dateStr} (L{sess.level})
                        </div>

                        {/* Status Box */}
                        <div
                          className={`py-2.5 px-3 text-center font-extrabold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-1.5 ${
                            sess.status === "Present"
                              ? "bg-[#52C41A] text-white shadow-inner"
                              : "bg-[#F2C94C] text-gray-900 shadow-inner"
                          }`}
                        >
                          {sess.status === "Present" ? (
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span>{sess.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
