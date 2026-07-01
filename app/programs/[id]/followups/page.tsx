"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, Filter, ChevronLeft, ChevronRight, User, Phone, Save, CheckCircle2, AlertCircle, Search } from "lucide-react";
import Pagination from "@/components/Pagination";

interface FollowUpItem {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    level?: number;
    grade?: string;
    profession?: string;
  };
  status: string;
  remarks: string;
}

export default function FollowUpsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(true);

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);

  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [sessionLevels, setSessionLevels] = useState<number[]>([]);
  const [activeLevelTab, setActiveLevelTab] = useState<number | null>(null);
  const [noSession, setNoSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [edits, setEdits] = useState<{ [key: string]: { status: string; remarks: string } }>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const statusOptions = ["Coming", "Not Coming", "May Come", "Not Answered", "Not Called"];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUserRole(data.user?.role || "");
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchSessionDates = async () => {
      if (!programId) return;
      try {
        setDatesLoading(true);
        const res = await fetch(`/api/programs/${programId}/sessions`);
        if (res.ok) {
          const data = await res.json();
          const dates: string[] = Array.from(
            new Set(
              (data.sessions || []).map((s: any) => {
                const d = new Date(s.sessionDate);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
              })
            )
          );
          setAvailableDates(dates);
          if (dates.length > 0) {
            setSelectedDate(dates[0]);
            setCalendarMonth(new Date(dates[0]));
          } else {
            setSelectedDate(new Date().toISOString().split("T")[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch session dates", err);
      } finally {
        setDatesLoading(false);
      }
    };
    fetchSessionDates();
  }, [programId]);

  useEffect(() => {
    if (selectedDate && (currentUserRole === "admin" || currentUserRole === "program_manager")) {
      fetchFollowUps();
    }
  }, [selectedDate, programId, currentUserRole]);

  const fetchFollowUps = async () => {
    setLoading(true);
    setNoSession(false);
    try {
      const res = await fetch(`/api/followups?programId=${programId}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        if (data.noSession) {
          setNoSession(true);
          setFollowUps([]);
          setSessionLevels([]);
          setActiveLevelTab(null);
        } else {
          setNoSession(false);
          const list: FollowUpItem[] = data.followUps || [];
          setFollowUps(list);
          const levels = data.sessionLevels || [];
          setSessionLevels(levels);
          if (levels.length > 0 && !levels.includes(activeLevelTab!)) {
            setActiveLevelTab(levels[0]);
          } else if (levels.length === 0) {
            setActiveLevelTab(null);
          }

          const initialEdits: any = {};
          list.forEach(item => {
            initialEdits[item.user._id] = {
              status: item.status || "Not Called",
              remarks: item.remarks || ""
            };
          });
          setEdits(initialEdits);
        }
      } else {
        setFollowUps([]);
      }
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
      setFollowUps([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (userId: string) => {
    const edit = edits[userId];
    if (!edit || !selectedDate) return;

    setSavingId(userId);
    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          userId,
          date: selectedDate,
          status: edit.status,
          remarks: edit.remarks
        })
      });

      if (res.ok) {
        setSavedId(userId);
        setTimeout(() => setSavedId(null), 2500);
        setMessage({ type: 'success', text: "Remark & status saved successfully!" });
        setTimeout(() => setMessage(null), 3000);
        fetchFollowUps();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || "Failed to save" });
      }
    } catch (err) {
      console.error("Save failed", err);
      setMessage({ type: 'error', text: "Network error while saving" });
    } finally {
      setSavingId(null);
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

  const followUpsForActiveLevel = followUps.filter(f => Number(f.user.level || 1) === activeLevelTab);

  const filteredFollowUps = followUpsForActiveLevel.filter(f => {
    if (filterStatus) {
      const currentStatus = edits[f.user._id]?.status || f.status;
      if (currentStatus !== filterStatus) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const { name, phone, profession } = f.user;
      if (
        !name?.toLowerCase().includes(q) &&
        !phone?.toLowerCase().includes(q) &&
        !profession?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const currentStatuses = followUpsForActiveLevel.map(f => edits[f.user._id]?.status || f.status || "Not Called");
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, filterStatus, activeLevelTab, searchTerm]);

  const stats = {
    total: followUpsForActiveLevel.length,
    coming: currentStatuses.filter(s => s === "Coming").length,
    notComing: currentStatuses.filter(s => s === "Not Coming").length,
    mayCome: currentStatuses.filter(s => s === "May Come").length,
    notAnswered: currentStatuses.filter(s => s === "Not Answered").length,
    notCalled: currentStatuses.filter(s => s === "Not Called").length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A65353]"></div>
      </div>
    );
  }

  if (currentUserRole !== "admin" && currentUserRole !== "program_manager") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-16 flex flex-col items-center justify-center max-w-lg text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">This Follow-ups section is restricted to Program Admins and Program Managers only.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-[#A65353] text-white rounded-lg font-semibold hover:bg-[#8B4545] transition-colors cursor-pointer"
          >
            ← Go Back
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundImage: 'url(/backgrou.png)', 
      backgroundSize: '25%', 
      backgroundRepeat: 'repeat' 
    }}>
      <Header />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6 border-l-4 border-[#A65353]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Follow-ups</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage follow-ups for attendees</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap cursor-pointer"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 sm:p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            <span className="font-semibold">{message.text}</span>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          {/* Search Bar */}
          <div className="mb-4 sm:mb-5">
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-[#A65353]" />
              Search People
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, or profession…"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] shadow-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            {/* Date Picker Tool */}
            <div className="relative">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#A65353]" />
                Select Date
              </label>
              
              <button
                type="button"
                onClick={() => {
                  if (!showCalendarPopup && selectedDate) {
                    setCalendarMonth(new Date(selectedDate));
                  }
                  setShowCalendarPopup(!showCalendarPopup);
                }}
                className={`w-full sm:w-64 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] text-sm font-semibold cursor-pointer shadow-sm flex items-center justify-between transition-all ${
                  availableDates.includes(selectedDate)
                    ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                    : "bg-amber-50 border-amber-400 text-amber-900"
                }`}
              >
                <span>{selectedDate || "Select Date"}</span>
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
                      const isSession = availableDates.includes(dayObj.dateStr);
                      const isSelected = selectedDate === dayObj.dateStr;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedDate(dayObj.dateStr);
                            setShowCalendarPopup(false);
                          }}
                          className={`p-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                            isSelected && isSession
                              ? "bg-emerald-600 text-white shadow-md font-bold ring-2 ring-emerald-300"
                              : isSelected
                              ? "bg-[#A65353] text-white shadow-md font-bold"
                              : isSession
                              ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-400 font-bold shadow-sm"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {dayObj.dayNumber}
                          {isSession && (
                            <span className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${isSelected ? 'bg-white' : 'bg-emerald-600'}`}></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-[#A65353]" />
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-64 px-3 py-2.5 text-sm font-semibold border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] bg-white cursor-pointer shadow-sm"
              >
                <option value="">All</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 shadow-sm">
            <div className="text-2xl font-extrabold text-slate-800">{stats.total}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Total</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100 shadow-sm">
            <div className="text-2xl font-extrabold text-emerald-800">{stats.coming}</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Coming</div>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 text-center border border-rose-100 shadow-sm">
            <div className="text-2xl font-extrabold text-rose-800">{stats.notComing}</div>
            <div className="text-xs text-rose-600 font-medium mt-1">Not Coming</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100 shadow-sm">
            <div className="text-2xl font-extrabold text-amber-800">{stats.mayCome}</div>
            <div className="text-xs text-amber-600 font-medium mt-1">May Come</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100 shadow-sm">
            <div className="text-2xl font-extrabold text-orange-800">{stats.notAnswered}</div>
            <div className="text-xs text-orange-600 font-medium mt-1">Not Answered</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100 shadow-sm">
            <div className="text-2xl font-extrabold text-blue-800">{stats.notCalled}</div>
            <div className="text-xs text-blue-600 font-medium mt-1">Not Called</div>
          </div>
        </div>

        {/* Level Tabs */}
        {sessionLevels.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {sessionLevels.map(lvl => (
              <button
                key={lvl}
                onClick={() => setActiveLevelTab(lvl)}
                className={`px-5 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${activeLevelTab === lvl ? 'bg-[#A65353] text-white shadow-md transform scale-105' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
              >
                Level {lvl}
              </button>
            ))}
          </div>
        )}

        {/* List Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <div className="p-4 sm:p-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                People List {activeLevelTab !== null && <span className="text-sm font-normal text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full ml-2">Level: {activeLevelTab}</span>}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Showing {filteredFollowUps.length === 0 ? 0 : (currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredFollowUps.length)} of {filteredFollowUps.length} matching people
              </p>
            </div>
            <span className="text-sm font-bold text-gray-600">Total: {filteredFollowUps.length}</span>
          </div>

          {(() => {
            const itemsPerPage = 20;
            const totalPages = Math.max(1, Math.ceil(filteredFollowUps.length / itemsPerPage));
            const paginatedFollowUps = filteredFollowUps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            return (
              <>
                {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#A65353] mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Loading follow-ups...</p>
            </div>
          ) : noSession ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-gray-800 font-bold text-base mb-1">No Session Found on {selectedDate}</p>
              <p className="text-gray-500 text-sm max-w-md mx-auto">Please select a highlighted green session date from the calendar above to view matching people.</p>
            </div>
          ) : filteredFollowUps.length === 0 ? (
            <div className="p-12 text-center text-gray-500 italic">
              No people found matching Level {activeLevelTab} on this date.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {paginatedFollowUps.map((item) => {
                const u = item.user;
                const edit = edits[u._id] || { status: item.status, remarks: item.remarks };
                const isSaving = savingId === u._id;
                const isSaved = savedId === u._id;

                return (
                  <div key={u._id} className="p-4 sm:p-6 hover:bg-gray-50/60 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#A65353]/10 flex items-center justify-center shrink-0 mt-1 font-bold text-[#A65353]">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => router.push(`/programs/${programId}/${u.role === 'volunteer' ? 'volunteers' : 'participants'}/${u._id}`)}
                            className="font-bold text-base text-[#A65353] hover:underline cursor-pointer text-left truncate"
                          >
                            {u.name}
                          </button>
                          <span className="px-2 py-0.5 text-xs font-bold bg-gray-200 text-gray-800 rounded-full capitalize">
                            {u.role}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">Level {u.level || 1}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-600 mt-1 flex-wrap">
                          {u.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={14} className="text-gray-400" /> {u.phone}
                            </span>
                          )}
                          {u.profession && <span>• {u.profession}</span>}
                          {u.grade && <span>• Grade: {u.grade}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Controls (Status & Remarks) */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                      <select
                        value={edit.status}
                        onChange={(e) => setEdits({ ...edits, [u._id]: { ...edit, status: e.target.value } })}
                        className={`px-3 py-2 border rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#A65353] cursor-pointer ${
                          edit.status === "Coming" ? "bg-green-50 border-green-300 text-green-800" :
                          edit.status === "Not Coming" ? "bg-red-50 border-red-300 text-red-800" :
                          edit.status === "May Come" ? "bg-amber-50 border-amber-300 text-amber-800" :
                          "bg-white border-gray-300 text-gray-700"
                        }`}
                      >
                        {statusOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2 flex-1 sm:w-64">
                        <input
                          type="text"
                          value={edit.remarks}
                          onChange={(e) => setEdits({ ...edits, [u._id]: { ...edit, remarks: e.target.value } })}
                          placeholder="Add remark..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSave(u._id)}
                          disabled={isSaving}
                          className={`p-2 rounded-xl text-white font-semibold transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                            isSaved ? "bg-green-600" : "bg-[#A65353] hover:bg-[#8B4545] disabled:bg-gray-400"
                          }`}
                          title="Save Remark & Status"
                        >
                          {isSaving ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                          ) : isSaved ? (
                            <CheckCircle2 size={20} />
                          ) : (
                            <Save size={20} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        );
      })()}
        </div>
      </main>

      <Footer />
    </div>
  );
}
