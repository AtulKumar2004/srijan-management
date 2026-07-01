"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Phone, Save, CheckCircle, Clock, Filter, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface MenteeFollowupItem {
  user: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
    profession?: string;
    level?: number;
    grade?: string;
    role: string;
  };
  followUp: {
    _id: string;
    status: string;
    remarks?: string;
    calledAt?: string;
  } | null;
}

interface ProfileFollowupTabProps {
  userId: string;
  programId?: string;
}

const statusOptions = ["Coming", "Not Coming", "May Come", "Not Answered", "Not Called"];

export default function ProfileFollowupTab({ userId, programId }: ProfileFollowupTabProps) {
  const router = useRouter();
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [mentees, setMentees] = useState<MenteeFollowupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dateLevelMap, setDateLevelMap] = useState<Record<string, number[]>>({});
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showCalendarPopup, setShowCalendarPopup] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Local state edits before saving
  const [edits, setEdits] = useState<{ [key: string]: { status: string; remarks: string } }>({});

  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dayNumber: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const yStr = prevDate.getFullYear();
      const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(prevDate.getDate()).padStart(2, '0');
      days.push({ dayNumber: d, dateStr: `${yStr}-${mStr}-${dStr}`, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const yStr = year;
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      days.push({ dayNumber: i, dateStr: `${yStr}-${mStr}-${dStr}`, isCurrentMonth: true });
    }

    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      const yStr = nextDate.getFullYear();
      const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(nextDate.getDate()).padStart(2, '0');
      days.push({ dayNumber: i, dateStr: `${yStr}-${mStr}-${dStr}`, isCurrentMonth: false });
    }

    return days;
  };

  useEffect(() => {
    const fetchSessionDates = async () => {
      if (!programId) {
        setDatesLoading(false);
        return;
      }
      try {
        setDatesLoading(true);
        const res = await fetch(`/api/programs/${programId}/sessions`);
        if (res.ok) {
          const data = await res.json();
          const levelMap: Record<string, number[]> = {};
          const dates: string[] = Array.from(
            new Set(
              (data.sessions || []).map((s: any) => {
                const d = new Date(s.sessionDate);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${day}`;
                
                if (!levelMap[dateStr]) levelMap[dateStr] = [];
                const sLevel = s.level ?? 1;
                if (!levelMap[dateStr].includes(sLevel)) {
                  levelMap[dateStr].push(sLevel);
                }
                
                return dateStr;
              })
            )
          );
          setDateLevelMap(levelMap);
          setAvailableDates(dates);
          if (dates.length > 0) {
            setSelectedDate(dates[0]);
            setCalendarMonth(new Date(dates[0]));
          } else {
            setSelectedDate("");
          }
        }
      } catch (err) {
        console.error("Error fetching session dates:", err);
      } finally {
        setDatesLoading(false);
      }
    };
    fetchSessionDates();
  }, [programId]);

  const fetchMenteesFollowup = async () => {
    if (!userId || !selectedDate) {
      setMentees([]);
      return;
    }
    try {
      setLoading(true);
      const url = `/api/users/${userId}/mentees-followup?date=${selectedDate}${programId ? `&programId=${programId}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list = data.mentees || [];
        setMentees(list);

        // Initialize edits state
        const initialEdits: any = {};
        list.forEach((item: MenteeFollowupItem) => {
          initialEdits[item.user._id] = {
            status: item.followUp?.status || "Not Called",
            remarks: item.followUp?.remarks || ""
          };
        });
        setEdits(initialEdits);
      }
    } catch (err) {
      console.error("Failed to fetch mentees followup", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (datesLoading) return;
    if (userId && selectedDate) {
      if (!availableDates.includes(selectedDate)) {
        setMentees([]);
        return;
      }
      fetchMenteesFollowup();
    }
  }, [userId, selectedDate, programId, datesLoading]);

  const handleSaveMentee = async (menteeId: string) => {
    const currentEdit = edits[menteeId];
    if (!currentEdit || !selectedDate) return;

    try {
      setSavingId(menteeId);
      const res = await fetch(`/api/users/${userId}/mentees-followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: menteeId,
          programId,
          date: selectedDate,
          status: currentEdit.status,
          remarks: currentEdit.remarks
        })
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Followup saved successfully!" });
        fetchMenteesFollowup();
      } else {
        const errData = await res.json();
        setMessage({ type: "error", text: errData.error || "Failed to save followup" });
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: "Error saving followup" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSavingId(null);
    }
  };

  const updateEdit = (menteeId: string, field: "status" | "remarks", value: string) => {
    setEdits((prev) => ({
      ...prev,
      [menteeId]: {
        ...prev[menteeId],
        [field]: value
      }
    }));
  };

  // Calculate counts for stats cards
  const totalCount = mentees.length;
  const comingCount = mentees.filter((m) => (edits[m.user._id]?.status || m.followUp?.status || "Not Called") === "Coming").length;
  const notComingCount = mentees.filter((m) => (edits[m.user._id]?.status || m.followUp?.status || "Not Called") === "Not Coming").length;
  const mayComeCount = mentees.filter((m) => (edits[m.user._id]?.status || m.followUp?.status || "Not Called") === "May Come").length;
  const notAnsweredCount = mentees.filter((m) => (edits[m.user._id]?.status || m.followUp?.status || "Not Called") === "Not Answered").length;
  const notCalledCount = mentees.filter((m) => (edits[m.user._id]?.status || m.followUp?.status || "Not Called") === "Not Called").length;

  // Levels of the currently selected session(s) (auto-derived)
  const sessionLevels = selectedDate ? dateLevelMap[selectedDate] : undefined;

  const filteredMentees = mentees.filter((item) => {
    // Auto-filter: only show mentees matching any of the session's levels
    if (sessionLevels && sessionLevels.length > 0 && item.user.level !== undefined) {
      if (!sessionLevels.includes(Number(item.user.level))) return false;
    }
    // Status filter
    if (filterStatus !== "All") {
      const currentStatus = edits[item.user._id]?.status || item.followUp?.status || "Not Called";
      if (currentStatus !== filterStatus) return false;
    }
    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const { name, phone, email } = item.user;
      if (
        !name?.toLowerCase().includes(q) &&
        !phone?.toLowerCase().includes(q) &&
        !email?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {message && (
        <div className={`p-3 sm:p-4 rounded-xl text-sm sm:text-base font-medium ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
          {message.text}
        </div>
      )}

      {/* Date Picker Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Mentee Followup Portal</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Take followups and log remarks for assigned mentees</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto relative">
            <Calendar className="w-5 h-5 text-[#A65353]" />
            <span className="text-sm font-semibold text-gray-700">Date:</span>
            {datesLoading ? (
              <span className="text-sm text-gray-500 italic">Loading dates...</span>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCalendarPopup(!showCalendarPopup)}
                  className={`px-3 py-1.5 border rounded-xl focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] text-sm font-semibold cursor-pointer shadow-sm flex items-center gap-2 ${availableDates.includes(selectedDate)
                      ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                      : "bg-amber-50 border-amber-400 text-amber-900"
                    }`}
                >
                  <span>{selectedDate || "Select Date"}</span>
                  <span className="text-xs opacity-75">▼</span>
                </button>

                {/* Custom Interactive Calendar Popup */}
                {showCalendarPopup && (
                  <div className="absolute right-0 mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-72 sm:w-80 animate-in fade-in zoom-in-95 duration-150">
                    {/* Month Header */}
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

                    {/* Day of week header */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 mb-1">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays().map((dayObj, idx) => {
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
                            className={`h-8 rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${!dayObj.isCurrentMonth ? "opacity-30" : ""
                              } ${isSelected
                                ? "bg-[#A65353] text-white font-bold shadow-md ring-2 ring-[#A65353] ring-offset-1 scale-105 z-10"
                                : isSession
                                  ? "bg-emerald-100 text-emerald-900 font-extrabold border-2 border-emerald-400 hover:bg-emerald-200"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                          >
                            <span>{dayObj.dayNumber}</span>
                            {isSession && !isSelected && (
                              <span className="w-1 h-1 rounded-full bg-emerald-600 absolute bottom-0.5"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-400 inline-block"></span>
                        <span className="font-semibold">Session Date</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCalendarPopup(false)}
                        className="text-gray-400 hover:text-gray-600 font-medium cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {!datesLoading && availableDates.includes(selectedDate) && !loading && mentees.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-slate-800">{totalCount}</div>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">Total</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-emerald-800">{comingCount}</div>
            <div className="text-xs font-semibold text-emerald-600 mt-0.5">Coming</div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-rose-800">{notComingCount}</div>
            <div className="text-xs font-semibold text-rose-600 mt-0.5">Not Coming</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-amber-800">{mayComeCount}</div>
            <div className="text-xs font-semibold text-amber-600 mt-0.5">May Come</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-orange-800">{notAnsweredCount}</div>
            <div className="text-xs font-semibold text-orange-600 mt-0.5">Not Answered</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center shadow-sm">
            <div className="text-xl sm:text-2xl font-black text-blue-800">{notCalledCount}</div>
            <div className="text-xs font-semibold text-blue-600 mt-0.5">Not Called</div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      {!datesLoading && availableDates.includes(selectedDate) && !loading && mentees.length > 0 && (
        <div className="flex flex-col gap-3 bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm">
          {/* Session level badge */}
          {sessionLevels && sessionLevels.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Showing Level {sessionLevels.join(", ")} mentees for this session
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, email…"
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] text-sm bg-white shadow-sm"
              />
            </div>
            {/* Status filter */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter className="w-4 h-4 text-[#A65353]" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-48 px-3 py-1.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] text-sm font-semibold bg-white cursor-pointer shadow-sm"
              >
                <option value="All">All Status</option>
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {datesLoading ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#A65353]"></div>
          <p className="text-gray-500 mt-2 text-sm">Loading session dates...</p>
        </div>
      ) : availableDates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-red-600 font-bold text-base mb-1">No Active Sessions Found</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">Followups can only be logged for dates where a program session has been created by an admin.</p>
        </div>
      ) : selectedDate && !availableDates.includes(selectedDate) ? (
        <div className="text-center py-12 bg-amber-50 rounded-xl shadow-sm border-2 border-amber-200 p-6 my-4">
          <Calendar className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-amber-900 font-bold text-lg mb-1">No Session Found</p>
          <p className="text-amber-700 text-sm max-w-md mx-auto">
            No program session exists on <span className="font-semibold">{selectedDate}</span>. Followups can only be taken on colored green dates inside the calendar.
          </p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#A65353]"></div>
          <p className="text-gray-500 mt-2 text-sm">Loading mentees followup data...</p>
        </div>
      ) : mentees.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium text-base">No mentees assigned for followup.</p>
        </div>
      ) : filteredMentees.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium text-base">No mentees match the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMentees.map((item) => {
            const mentee = item.user;
            const editState = edits[mentee._id] || { status: "Not Called", remarks: "" };

            return (
              <div
                key={mentee._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  {/* Mentee Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const pId = programId || (typeof window !== "undefined" ? window.location.pathname.match(/\/programs\/([^\/]+)/)?.[1] : null);
                          if (pId) {
                            router.push(`/programs/${pId}/${mentee.role === "volunteer" ? "volunteers" : "participants"}/${mentee._id}`);
                          }
                        }}
                        className="text-base sm:text-lg font-bold text-[#A65353] hover:underline text-left truncate cursor-pointer"
                      >
                        {mentee.name}
                      </button>
                      {mentee.level && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                          L{mentee.level}
                        </span>
                      )}
                      {mentee.grade && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                          {mentee.grade}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full capitalize">
                        {mentee.role}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                      {mentee.phone && (
                        <a
                          href={`tel:${mentee.phone}`}
                          className="flex items-center gap-1 font-semibold text-[#A65353] hover:underline cursor-pointer"
                        >
                          <Phone size={14} className="text-[#A65353]" />
                          {mentee.phone}
                        </a>
                      )}
                      {mentee.email && <span>{mentee.email}</span>}
                      {mentee.profession && <span>• {mentee.profession}</span>}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                    {/* Status dropdown */}
                    <div className="w-full sm:w-44">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 sm:hidden">
                        Status
                      </label>
                      <select
                        value={editState.status}
                        onChange={(e) => updateEdit(mentee._id, "status", e.target.value)}
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E6DCD2] rounded-xl text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A65353] cursor-pointer"
                      >
                        {["Not Called", "Coming", "Not Coming", "May Come", "Not Answered"].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remarks Input */}
                    <div className="flex-1 sm:w-64">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 sm:hidden">
                        Remarks / Notes
                      </label>
                      <input
                        type="text"
                        value={editState.remarks}
                        onChange={(e) => updateEdit(mentee._id, "remarks", e.target.value)}
                        placeholder="Enter followup remarks.."
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E6DCD2] rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A65353]"
                      >
                      </input>
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={() => handleSaveMentee(mentee._id)}
                      disabled={savingId === mentee._id}
                      className="px-4 py-2 bg-[#A65353] text-white rounded-xl hover:bg-[#8B4545] transition-colors text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {savingId === mentee._id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save size={16} />
                      )}
                      Save
                    </button>
                  </div>
                </div>

                {/* Last called metadata */}
                {item.followUp && item.followUp.calledAt && (
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-400 font-medium">
                    <Clock size={13} className="text-green-600" />
                    Last updated on {new Date(item.followUp.calledAt).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
