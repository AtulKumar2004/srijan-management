"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, UserPlus, ArrowLeft, Calendar, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";

interface Program {
  _id: string;
  name: string;
  temple?: string;
}

interface SessionData {
  _id: string;
  sessionDate: string;
  level?: number;
  sessionTopic?: string;
}

interface Participant {
  _id: string;
  name: string;
  phone: string;
  email: string;
  profession?: string;
  homeTown?: string;
  level?: number;
  grade?: string;
  numberOfRounds?: number;
  address?: string;
}

export default function AttendancePage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLevel, setSelectedLevel] = useState("");

  // Sessions for selected program
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [availableSessionDates, setAvailableSessionDates] = useState<string[]>([]);

  // Date picker popup state
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Search state
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchedParticipant, setSearchedParticipant] = useState<Participant | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // New participant form state
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      fetchSessions(selectedProgram);
    } else {
      setSessions([]);
      setAvailableSessionDates([]);
    }
  }, [selectedProgram]);

  // Reset search when selection changes
  useEffect(() => {
    setSearchedParticipant(null);
    setSearchPerformed(false);
    setMessage(null);
  }, [selectedProgram, selectedDate, selectedLevel]);

  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/programs/all');
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const pId = params.get("programId");
          if (pId) setSelectedProgram(pId);
        }
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const fetchSessions = async (programId: string) => {
    try {
      const res = await fetch(`/api/programs/${programId}/sessions`);
      if (res.ok) {
        const data = await res.json();
        const sessList: SessionData[] = data.sessions || [];
        setSessions(sessList);

        // Extract unique formatted dates YYYY-MM-DD
        const dates = Array.from(new Set(sessList.map(s => {
          try {
            return new Date(s.sessionDate).toISOString().split('T')[0];
          } catch {
            return "";
          }
        }))).filter(Boolean);
        setAvailableSessionDates(dates);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  // Calendar logic
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay();

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ dayNumber: prevMonthDays - i, isCurrentMonth: false, dateStr: "" });
    }

    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(i).padStart(2, "0");
      days.push({ dayNumber: i, isCurrentMonth: true, dateStr: `${year}-${mStr}-${dStr}` });
    }
    return days;
  };

  // Verify if exact session exists
  const matchingSession = sessions.find(s => {
    try {
      const sDate = new Date(s.sessionDate).toISOString().split('T')[0];
      const sLevel = Number(s.level || 1);
      return sDate === selectedDate && sLevel === Number(selectedLevel);
    } catch {
      return false;
    }
  });

  const isAllSelected = Boolean(selectedProgram && selectedDate && selectedLevel);
  const sessionExists = Boolean(isAllSelected && matchingSession);

  const handleSearch = async () => {
    if (!phoneSearch.trim()) {
      setMessage({ type: 'error', text: 'Please enter a 10-digit phone number' });
      return;
    }

    if (!sessionExists) {
      setMessage({ type: 'error', text: 'Cannot mark attendance: Session does not exist.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const cleanPhone = phoneSearch.replace(/\D/g, "");
      const res = await fetch(`/api/participants/search?phone=${cleanPhone}&programId=${selectedProgram}&level=${selectedLevel}`);
      if (res.ok) {
        const data = await res.json();
        setSearchedParticipant(data.participant);
        setSearchPerformed(true);
      } else {
        setSearchedParticipant(null);
        setSearchPerformed(true);
      }
    } catch (error) {
      console.error("Error searching participant:", error);
      setMessage({ type: 'error', text: 'Error searching participant' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (participantId: string) => {
    if (!sessionExists) return;

    setLoading(true);
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: selectedProgram,
          participantId: participantId,
          date: selectedDate,
          level: parseInt(selectedLevel),
          status: 'present'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Attendance marked PRESENT successfully!' });
        setPhoneSearch("");
        setSearchedParticipant(null);
        setSearchPerformed(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to mark attendance' });
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      setMessage({ type: 'error', text: 'Error marking attendance' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAndMarkParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionExists) return;

    setLoading(true);
    setMessage(null);

    try {
      const cleanPhone = phoneSearch.replace(/\D/g, "");
      const res = await fetch('/api/participants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newParticipant.name,
          email: newParticipant.email,
          phone: cleanPhone,
          address: newParticipant.address,
          programs: [selectedProgram],
          level: 1 // Explicitly level 1 as required
        })
      });

      const data = await res.json();
      if (res.ok && data.user) {
        // Now auto-mark attendance for this participant
        await handleMarkAttendance(data.user._id);
        setMessage({ type: 'success', text: 'New participant created with Level 1 and marked PRESENT successfully!' });
        setNewParticipant({ name: "", email: "", address: "" });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create participant' });
        setLoading(false);
      }
    } catch (error) {
      console.error("Error adding participant:", error);
      setMessage({ type: 'error', text: 'Error adding participant' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8E7]" style={{
      backgroundImage: 'url(/backgrou.png)',
      backgroundSize: '25%',
      backgroundRepeat: 'repeat'
    }}>
      <Header />

      <main className="flex-1 w-full mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="bg-[#8B6B61] shadow-lg px-4 sm:px-8 py-4 sm:py-6 mb-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white hover:text-gray-200 transition-colors cursor-pointer"
            >
              <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
              Attendance Mark
            </h1>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-4 rounded-xl font-medium text-sm sm:text-base max-w-4xl mx-auto shadow-md ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
            {message.text}
          </div>
        )}

        {/* Selection Form */}
        <div className="bg-[#F5E6D3] shadow-lg px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-5xl mx-auto">

            {/* Date Tool (Similar to Followups) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCalendarPopup(!showCalendarPopup)}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 rounded-xl text-left font-semibold focus:outline-none shadow-sm flex items-center justify-between transition-all cursor-pointer bg-white text-sm sm:text-base ${availableSessionDates.includes(selectedDate)
                    ? "border-emerald-500 text-emerald-900 bg-emerald-50/50"
                    : "border-[#8B6B61] text-gray-700 hover:border-[#6B4B41]"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#8B6B61]" />
                  <span>{selectedDate || "Select Date"}</span>
                </div>
                <span className="text-xs opacity-75">▼</span>
              </button>

              {/* Custom Calendar Popup */}
              {showCalendarPopup && (
                <div className="absolute left-0 mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-72 sm:w-80 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <span className="font-bold text-gray-800 text-sm">
                      {calendarMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date())}
                        className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                      <span key={day} className="text-[11px] font-bold text-gray-400 py-1">{day}</span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center">
                    {getDaysInMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()).map((dayObj, idx) => {
                      if (!dayObj.isCurrentMonth) {
                        return <div key={idx} className="p-2"></div>;
                      }
                      const isSession = availableSessionDates.includes(dayObj.dateStr);
                      const isSelected = selectedDate === dayObj.dateStr;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedDate(dayObj.dateStr);
                            setShowCalendarPopup(false);
                          }}
                          className={`p-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center relative ${isSelected
                              ? "bg-[#A65353] text-white shadow-md font-bold"
                              : isSession
                                ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300 font-bold"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                          {dayObj.dayNumber}
                          {isSession && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute bottom-0.5"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Program Selector */}
            <div>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-[#8B6B61] rounded-xl text-gray-700 font-semibold focus:outline-none focus:border-[#6B4B41] bg-white text-sm sm:text-base shadow-sm cursor-pointer"
              >
                <option value="">Select Program</option>
                {programs.map(program => (
                  <option key={program._id} value={program._id}>
                    {program.name} {program.temple ? `- ${program.temple}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Level Selector (Only 1-4) */}
            <div>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-[#8B6B61] rounded-xl text-gray-700 font-semibold focus:outline-none focus:border-[#6B4B41] bg-white text-sm sm:text-base shadow-sm cursor-pointer"
              >
                <option value="">Select Level</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </select>
            </div>

          </div>
        </div>

        {/* Validation Status / Main Content Section */}
        <div className="mt-6 sm:mt-10 max-w-3xl mx-auto">
          {!isAllSelected ? (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 text-center shadow-md">
              <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Select Session Parameters</h3>
              <p className="text-gray-600">
                Please select Date, Program, and Level from the top bar to verify if a session exists before marking attendance.
              </p>
            </div>
          ) : !sessionExists ? (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-8 text-center shadow-md animate-in fade-in duration-200">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-red-900 mb-2">Session Does Not Exist</h3>
              <p className="text-red-700 font-medium max-w-md mx-auto">
                No session was found on <span className="underline font-bold">{selectedDate}</span> for this program at <span className="underline font-bold">Level {selectedLevel}</span>.
              </p>
              <p className="text-red-600 text-sm mt-3 bg-red-100/80 inline-block px-4 py-1.5 rounded-full font-semibold">
                🚫 Attendance marking by phone search is disabled until a valid session exists.
              </p>
            </div>
          ) : (
            /* Valid Session -> Show Attendance Tool */
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 border-[#D4A574] overflow-hidden animate-in fade-in duration-200">
              {/* Green Verified Banner */}
              <div className="bg-emerald-600 text-white px-6 py-3 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2 font-bold text-base">
                  <CheckCircle className="w-5 h-5" />
                  <span>Session Verified — Level {selectedLevel}</span>
                </div>
                <span className="text-xs bg-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider font-semibold">
                  Ready to Mark
                </span>
              </div>

              {/* Image Banner */}
              <div className="w-full h-[320px] sm:h-[400px] overflow-hidden relative">
                <img src="/Attendance.png" alt="Mark Attendance" className="w-full h-full object-cover" />
              </div>

              {/* Content section below image */}
              <div className="p-4 sm:p-6 lg:p-10">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">Search & Mark Attendance</h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Enter the candidate&apos;s 10-digit phone number to instantly mark them present
                  </p>
                </div>

                {/* Search Input */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={phoneSearch}
                      onChange={(e) => setPhoneSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search by 10-digit Phone Number"
                      maxLength={10}
                      className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#8B6B61] text-sm sm:text-base font-medium"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#8B6B61] text-white rounded-xl hover:bg-[#6B4B41] transition-colors disabled:opacity-50 font-bold text-sm sm:text-base shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? 'Searching...' : 'Search Candidate'}
                  </button>
                </div>

                {/* Search Results / Actions */}
                {searchPerformed && (
                  <div className="mt-6 border-t pt-6 animate-in fade-in duration-200">
                    {searchedParticipant ? (
                      /* Found Candidate Card */
                      <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-6 text-left shadow-sm">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-200">
                          <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            Candidate Found in Level {selectedLevel}
                          </h3>
                          <span className="text-xs font-bold bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded-md">
                            Eligible
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base mb-6">
                          <div>
                            <span className="font-semibold text-gray-600">Full Name:</span>
                            <span className="ml-2 font-bold text-gray-900">{searchedParticipant.name}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-600">Phone:</span>
                            <span className="ml-2 font-bold text-gray-900">{searchedParticipant.phone}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-600">Email:</span>
                            <span className="ml-2 text-gray-800">{searchedParticipant.email || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-600">Chanting Rounds:</span>
                            <span className="ml-2 font-bold text-purple-700">{searchedParticipant.numberOfRounds || 0}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleMarkAttendance(searchedParticipant._id)}
                          disabled={loading}
                          className="w-full py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 font-bold text-base shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          {loading ? 'Marking Present...' : 'Mark Present Now'}
                        </button>
                      </div>
                    ) : (
                      /* Not Found -> Add New Participant Form */
                      <div className="bg-amber-50/70 border-2 border-amber-300 rounded-xl p-6 text-left shadow-sm">
                        <div className="flex items-center gap-2 mb-3 text-amber-900 font-bold text-lg">
                          <UserPlus className="w-6 h-6 text-amber-600" />
                          <span>Candidate Not Found — Add New Participant</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 pb-3 border-b border-amber-200">
                          This phone number does not exist in Level {selectedLevel} candidates. Fill out their details below to automatically enroll them at <span className="font-bold text-gray-900">Level 1</span> and mark them present.
                        </p>

                        <form onSubmit={handleAddAndMarkParticipant} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number (Locked)</label>
                              <input
                                type="text"
                                disabled
                                value={phoneSearch}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-200 text-gray-700 font-bold cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name *</label>
                              <input
                                type="text"
                                required
                                placeholder="Enter full name"
                                value={newParticipant.name}
                                onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#8B6B61] outline-none font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address *</label>
                              <input
                                type="email"
                                required
                                placeholder="candidate@example.com"
                                value={newParticipant.email}
                                onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#8B6B61] outline-none font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Residential Address</label>
                              <input
                                type="text"
                                placeholder="City, Area or Street"
                                value={newParticipant.address}
                                onChange={(e) => setNewParticipant({ ...newParticipant, address: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#8B6B61] outline-none font-medium"
                              />
                            </div>
                          </div>

                          <div className="pt-4">
                            <button
                              type="submit"
                              disabled={loading}
                              className="w-full py-3.5 bg-[#8B6B61] text-white rounded-xl hover:bg-[#6B4B41] transition-colors disabled:opacity-50 font-bold text-base shadow-md cursor-pointer flex items-center justify-center gap-2"
                            >
                              <UserPlus className="w-5 h-5" />
                              {loading ? 'Creating & Marking Present...' : 'Submit & Mark Present (Level 1)'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
