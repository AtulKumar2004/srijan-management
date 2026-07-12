"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Pagination from "@/components/Pagination";
import { Calendar, Users, UserPlus, Phone, Filter, ChevronDown, ChevronLeft, ChevronRight, Save, RefreshCw, Search, Building2 } from "lucide-react";

interface OutreachContact {
  _id: string;
  name: string;
  phone: string;
  profession: string;
  motherTongue?: string;
  currentLocation?: string;
  branch: string;
  paidStatus: string;
  underWhichAdmin?: string;
  assignedVolunteer?: {
    _id: string;
    name: string;
  };
  followup?: {
    status: string;
    remarks: string;
    calledBy?: {
      _id: string;
      name: string;
    };
    calledAt?: Date;
  };
}

interface Volunteer {
  _id: string;
  name: string;
  email: string;
}

interface Program {
  _id: string;
  name: string;
}

export default function OutreachFollowUpsPage() {
  const router = useRouter();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [expandedContact, setExpandedContact] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminName, setAdminName] = useState<string>("");

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [volunteerSearchQuery, setVolunteerSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Program & Session Calendar state
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [generatedDates, setGeneratedDates] = useState<string[]>([]);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const [editingFollowUp, setEditingFollowUp] = useState<{
    contactId: string;
    status: string;
    remarks: string;
  } | null>(null);

  const statusOptions = ["Coming", "Not Coming", "May Come", "Not Answered", "Not Called"];

  useEffect(() => {
    checkAuthAndFetch();
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/programs");
      if (res.ok) {
        const data = await res.json();
        const progs = data.programs || [];
        setPrograms(progs);
        if (progs.length > 0) {
          setSelectedProgramId(progs[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch programs:", err);
    }
  };

  useEffect(() => {
    const fetchSessionDates = async () => {
      if (!selectedProgramId) return;
      try {
        const res = await fetch(`/api/programs/${selectedProgramId}/sessions`);
        if (res.ok) {
          const data = await res.json();
          const dates: string[] = Array.from(
            new Set(
              (data.sessions || []).map((s: any) => {
                const dString = typeof s.sessionDate === 'string' ? s.sessionDate : new Date(s.sessionDate).toISOString();
                return dString.split('T')[0];
              })
            )
          );
          setAvailableDates(dates);
          if (dates.length > 0) {
            if (!dates.includes(selectedDate)) {
              setSelectedDate(dates[0]);
            }
            const targetMonthDate = dates.includes(selectedDate) ? selectedDate : dates[0];
            setCalendarMonth(new Date(targetMonthDate));
          }
        }
      } catch (err) {
        console.error("Failed to fetch session dates:", err);
      }
    };
    fetchSessionDates();
    if (adminName) {
      fetch(`/api/outreach/followups/dates?adminName=${encodeURIComponent(adminName)}&programId=${encodeURIComponent(selectedProgramId || '')}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && Array.isArray(data.generatedDates)) {
            setGeneratedDates(data.generatedDates);
          }
        })
        .catch(err => console.error("Failed to fetch generated dates:", err));
    }
    if (currentUser && adminName) {
      fetchVolunteers(adminName, currentUser, selectedProgramId);
    }
  }, [selectedProgramId, currentUser, adminName]);

  useEffect(() => {
    if (adminName) {
      setSelectedVolunteerId(null);
      setFilterStatus("");
      fetchContacts(adminName);

      const interval = setInterval(() => {
        fetchContacts(adminName, true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedDate, adminName, selectedProgramId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, filterStatus, selectedVolunteerId, searchQuery, selectedProgramId]);

  const checkAuthAndFetch = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const authData = await response.json();
        setCurrentUser(authData.user);

        let adminNameToUse = "";
        if (authData.user.role === "admin") {
          adminNameToUse = authData.user.name;
          setAdminName(adminNameToUse);
          await fetchContacts(adminNameToUse);
        } else {
          if (authData.user.programs && authData.user.programs.length > 0) {
            const programId = authData.user.programs[0];
            const programRes = await fetch(`/api/programs/${programId}`);
            if (programRes.ok) {
              const programData = await programRes.json();
              if (programData.program && programData.program.createdBy) {
                const adminId = typeof programData.program.createdBy === 'object' 
                  ? programData.program.createdBy._id 
                  : programData.program.createdBy;
                
                const adminRes = await fetch(`/api/users/${adminId}`);
                if (adminRes.ok) {
                  const adminData = await adminRes.json();
                  adminNameToUse = adminData.user?.name || "";
                  setAdminName(adminNameToUse);
                  await fetchContacts(adminNameToUse);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    }
  };

  const fetchContacts = async (adminToFetch?: string, silent = false) => {
    const targetAdmin = adminToFetch || adminName;
    if (!targetAdmin) return;
    
    if (!silent) setLoading(true);
    try {
      const url = `/api/outreach/followups/by-admin?adminName=${encodeURIComponent(targetAdmin)}&followUpDate=${selectedDate}&programId=${encodeURIComponent(selectedProgramId || '')}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
        if (data.generatedDates && Array.isArray(data.generatedDates)) {
          setGeneratedDates(data.generatedDates);
        }
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      if (!silent) setMessage({ type: 'error', text: 'Failed to load followups' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchVolunteers = async (adminToFetch?: string, userObj?: any, progId?: string) => {
    const targetAdmin = adminToFetch || adminName;
    const user = userObj || currentUser;
    const targetProg = progId !== undefined ? progId : selectedProgramId;
    if (!targetAdmin || !user) return;

    try {
      if (user.role === "volunteer") {
        if (user.programs && user.programs.length > 0) {
          const programsParam = user.programs.join(',');
          const response = await fetch(`/api/outreach/followups/volunteers-by-programs?programs=${encodeURIComponent(programsParam)}`);
          if (response.ok) {
            const data = await response.json();
            setVolunteers(data.volunteers || []);
          }
        }
      } else {
        if (!targetProg) return;
        const url = `/api/outreach/followups/volunteers-by-programs?programs=${encodeURIComponent(targetProg)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setVolunteers(data.volunteers || []);
        }
      }
    } catch (error) {
      console.error("Error fetching volunteers:", error);
    }
  };

  const handleAssignVolunteers = async () => {
    if (selectedVolunteers.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one volunteer' });
      return;
    }

    if (!adminName) {
      setMessage({ type: 'error', text: 'Admin information not loaded. Please refresh the page.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/outreach/followups/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName,
          volunteerIds: selectedVolunteers,
          followUpDate: selectedDate
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setShowCreateModal(false);
        setSelectedVolunteers([]);
        await fetchContacts();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create follow-up list' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create follow-up list' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFollowUp = async (contactId: string) => {
    if (!editingFollowUp || editingFollowUp.contactId !== contactId) return;

    try {
      const response = await fetch('/api/outreach/followups/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          followUpDate: selectedDate,
          status: editingFollowUp.status,
          remarks: editingFollowUp.remarks
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Followup updated successfully' });
        setEditingFollowUp(null);
        await fetchContacts();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update followup' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update followup' });
    }
  };

  const toggleVolunteerSelection = (volunteerId: string) => {
    setSelectedVolunteers(prev =>
      prev.includes(volunteerId)
        ? prev.filter(id => id !== volunteerId)
        : [...prev, volunteerId]
    );
  };

  const filteredContacts = contacts.filter(contact => {
    // Search filter (Temple Name / Branch, Contact Name, or Phone)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchBranch = contact.branch?.toLowerCase().includes(q);
      const matchName = contact.name?.toLowerCase().includes(q);
      const matchPhone = contact.phone?.includes(q);
      if (!matchBranch && !matchName && !matchPhone) return false;
    }

    // Filter by volunteer first
    if (selectedVolunteerId === 'unassigned') {
      if (!contact.assignedVolunteer) {
        if (filterStatus) {
          return contact.followup?.status === filterStatus;
        }
        return true;
      }
      return false;
    } else if (selectedVolunteerId) {
      if (contact.assignedVolunteer?._id === selectedVolunteerId) {
        if (filterStatus) {
          return contact.followup?.status === filterStatus;
        }
        return true;
      }
      return false;
    }
    
    if (filterStatus) {
      return contact.followup?.status === filterStatus;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredContacts.length / 20) || 1;
  const paginatedContacts = filteredContacts.slice((currentPage - 1) * 20, currentPage * 20);

  const stats = {
    total: contacts.length,
    coming: contacts.filter(c => c.followup?.status === "Coming").length,
    notComing: contacts.filter(c => c.followup?.status === "Not Coming").length,
    mayCome: contacts.filter(c => c.followup?.status === "May Come").length,
    notAnswered: contacts.filter(c => c.followup?.status === "Not Answered").length,
    notCalled: contacts.filter(c => c.followup?.status === "Not Called" || !c.followup).length,
  };

  const unassignedCount = contacts.filter(c => !c.assignedVolunteer).length;

  // Calendar helpers
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

  const filteredModalVolunteers = volunteers.filter(v =>
    v.name.toLowerCase().includes(volunteerSearchQuery.toLowerCase()) ||
    v.email.toLowerCase().includes(volunteerSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundImage: 'url(/backgrou.png)', 
      backgroundSize: '25%', 
      backgroundRepeat: 'repeat' 
    }}>
      <Header />
      
      <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6 border-l-4 border-[#A65353]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
                Outreach Follow-ups
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Manage follow-ups for outreach contacts
                {adminName && currentUser?.role === "volunteer" && (
                  <span className="ml-2 text-xs sm:text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                    Under: {adminName}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => router.push('/outreach')}
              className="px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-semibold whitespace-nowrap cursor-pointer"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 sm:p-4 rounded-lg font-semibold ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Program Selector */}
            {programs.length > 0 && (
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#A65353]" />
                  Select Program
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] font-semibold"
                >
                  {programs.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Picker Tool (Green Marked Session Dates) */}
            <div className="relative">
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#A65353]" />
                Session Date
              </label>
              
              <button
                type="button"
                onClick={() => {
                  if (!showCalendarPopup && selectedDate) {
                    setCalendarMonth(new Date(selectedDate));
                  }
                  setShowCalendarPopup(!showCalendarPopup);
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#A65353] text-sm font-semibold cursor-pointer shadow-sm flex items-center justify-between transition-all ${
                  availableDates.includes(selectedDate) && !generatedDates.includes(selectedDate)
                    ? "bg-emerald-100 border-emerald-500 text-emerald-950 font-bold"
                    : availableDates.includes(selectedDate) && generatedDates.includes(selectedDate)
                    ? "bg-orange-100 border-orange-500 text-orange-950 font-bold"
                    : !availableDates.includes(selectedDate) && generatedDates.includes(selectedDate)
                    ? "bg-yellow-100 border-yellow-500 text-yellow-950 font-bold"
                    : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50"
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
                      const isGenerated = generatedDates.includes(dayObj.dateStr);
                      const isSelected = selectedDate === dayObj.dateStr;

                      let btnStyle = "text-gray-700 hover:bg-gray-100";
                      if (isSelected) {
                        if (isSession && !isGenerated) {
                          btnStyle = "bg-emerald-600 text-white shadow-md font-bold ring-2 ring-emerald-300";
                        } else if (isSession && isGenerated) {
                          btnStyle = "bg-orange-600 text-white shadow-md font-bold ring-2 ring-orange-300";
                        } else if (!isSession && isGenerated) {
                          btnStyle = "bg-yellow-600 text-white shadow-md font-bold ring-2 ring-yellow-300";
                        } else {
                          btnStyle = "bg-[#A65353] text-white shadow-md font-bold";
                        }
                      } else if (isSession && !isGenerated) {
                        btnStyle = "bg-emerald-100 text-emerald-950 hover:bg-emerald-200 border border-emerald-400 font-bold shadow-sm";
                      } else if (isSession && isGenerated) {
                        btnStyle = "bg-orange-100 text-orange-950 hover:bg-orange-200 border border-orange-400 font-bold shadow-sm";
                      } else if (!isSession && isGenerated) {
                        btnStyle = "bg-yellow-100 text-yellow-950 hover:bg-yellow-200 border border-yellow-400 font-bold shadow-sm";
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedDate(dayObj.dateStr);
                            setShowCalendarPopup(false);
                          }}
                          className={`p-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center relative ${btnStyle}`}
                        >
                          {dayObj.dayNumber}
                          {(isSession || isGenerated) && (
                            <span className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${
                              isSelected 
                                ? 'bg-white' 
                                : isSession && isGenerated 
                                ? 'bg-orange-600' 
                                : isSession 
                                ? 'bg-emerald-600' 
                                : 'bg-yellow-600'
                            }`}></span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Color Legend */}
                  <div className="mt-3 pt-2 border-t border-gray-100 grid grid-cols-1 gap-1 text-[11px] text-gray-600 font-medium text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 border border-emerald-600 inline-block shrink-0"></span>
                      <span>Session exists (No list generated)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-orange-500 border border-orange-600 inline-block shrink-0"></span>
                      <span>Session + List generated</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-yellow-400 border border-yellow-500 inline-block shrink-0"></span>
                      <span>List generated (No session)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search Input (Temple Name / Contact) */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#A65353]" />
                Search Temple / Contact
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search temple name..."
                className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353]"
              />
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-[#A65353]" />
                Filter by Status
              </label>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] font-semibold"
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                {(currentUser?.role === "admin" || currentUser?.role === "program_manager") && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    disabled={loading}
                    className="px-4 py-2.5 bg-[#A65353] cursor-pointer text-white rounded-lg hover:bg-[#8B4545] transition-colors font-bold text-sm sm:text-base whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <UserPlus size={18} />
                    Create List
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mt-6">
            <div className="bg-gray-100 p-3 rounded-lg text-center border border-gray-200">
              <div className="text-lg sm:text-2xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-semibold">Total</div>
            </div>
            <div className="bg-green-100 p-3 rounded-lg text-center border border-green-200">
              <div className="text-lg sm:text-2xl font-bold text-green-800">{stats.coming}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-semibold">Coming</div>
            </div>
            <div className="bg-red-100 p-3 rounded-lg text-center border border-red-200">
              <div className="text-lg sm:text-2xl font-bold text-red-800">{stats.notComing}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-semibold">Not Coming</div>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg text-center border border-yellow-200">
              <div className="text-lg sm:text-2xl font-bold text-yellow-800">{stats.mayCome}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-semibold">May Come</div>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg text-center border border-orange-200">
              <div className="text-lg sm:text-2xl font-bold text-orange-800">{stats.notAnswered}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-semibold">Not Answered</div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg text-center border border-blue-200">
              <div className="text-lg sm:text-2xl font-bold text-blue-800">{stats.notCalled}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-semibold">Not Called</div>
            </div>
          </div>
        </div>

        {/* Volunteer Filter Cards */}
        {contacts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Filter by Volunteer</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <button
                onClick={() => setSelectedVolunteerId(null)}
                className={`p-4 rounded-lg border-2 transition-all text-left cursor-pointer ${
                  selectedVolunteerId === null
                    ? 'border-[#A65353] bg-amber-50/50'
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-800 text-sm sm:text-base">All Volunteers</div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">
                      {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#A65353]">
                    {contacts.length}
                  </div>
                </div>
              </button>

              {unassignedCount > 0 && (
                <button
                  onClick={() => setSelectedVolunteerId('unassigned')}
                  className={`p-4 rounded-lg border-2 transition-all text-left cursor-pointer ${
                    selectedVolunteerId === 'unassigned'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-300 bg-white hover:border-red-400 hover:bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800 text-sm sm:text-base">Unassigned</div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        {unassignedCount} contact{unassignedCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {unassignedCount}
                    </div>
                  </div>
                </button>
              )}

              {volunteers
                .map(volunteer => {
                  const assignedContactsCount = contacts.filter(
                    c => c.assignedVolunteer?._id === volunteer._id
                  ).length;
                  return { volunteer, count: assignedContactsCount };
                })
                .filter(({ count }) => count > 0)
                .map(({ volunteer, count }) => (
                  <button
                    key={volunteer._id}
                    onClick={() => setSelectedVolunteerId(volunteer._id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left cursor-pointer ${
                      selectedVolunteerId === volunteer._id
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-800 text-sm sm:text-base truncate">
                          {volunteer.name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-1">
                          {count} contact{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-green-600 ml-2">
                        {count}
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        )}

        {/* Contacts List & Pagination */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A65353] mx-auto"></div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 font-semibold text-base">
              No follow-ups found matching your criteria on {selectedDate}
            </p>
            {(currentUser?.role === "admin" || currentUser?.role === "program_manager") && (
              <p className="text-gray-500 text-sm mt-2">
                Click "Create List" to randomly distribute temple outreach contacts to your volunteers
              </p>
            )}
          </div>
        ) : (
          <div>
            {totalPages > 1 && (
              <div className="mb-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}

            <div className="space-y-3">
              {paginatedContacts.map((contact, index) => (
                <div
                  key={contact._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      <span className="text-sm sm:text-base font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md shrink-0">
                        #{(currentPage - 1) * 20 + index + 1}
                      </span>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                            <a href={`/outreach/${contact._id}`} className="hover:text-[#A65353] transition-colors">
                              {contact.name}
                            </a>
                          </h3>
                          {contact.branch && (
                            <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                              Temple: {contact.branch}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 mt-1 text-xs sm:text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold">
                            <Phone size={14} className="text-gray-400" />
                            {contact.phone}
                          </span>
                          {contact.profession && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">
                              {contact.profession}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center w-full sm:w-auto justify-end">
                      {editingFollowUp?.contactId === contact._id ? (
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 bg-gray-50 p-3 rounded-lg border w-full sm:w-auto">
                          <select
                            value={editingFollowUp.status}
                            onChange={(e) => setEditingFollowUp({ ...editingFollowUp, status: e.target.value })}
                            className="px-3 py-1.5 border rounded-lg text-sm font-semibold w-full sm:w-auto"
                          >
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <input
                            type="text"
                            value={editingFollowUp.remarks}
                            onChange={(e) => setEditingFollowUp({ ...editingFollowUp, remarks: e.target.value })}
                            placeholder="Add remarks..."
                            className="px-3 py-1.5 border rounded-lg text-sm w-full sm:w-48"
                          />
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleUpdateFollowUp(contact._id)}
                              className="flex-1 sm:flex-none px-3 py-1.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Save size={16} /> Save
                            </button>
                            <button
                              onClick={() => setEditingFollowUp(null)}
                              className="px-3 py-1.5 bg-gray-400 text-white rounded-lg font-semibold text-sm hover:bg-gray-500 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-right">
                            <span className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full inline-block ${
                              contact.followup?.status === 'Coming' ? 'bg-green-100 text-green-800 border border-green-300' :
                              contact.followup?.status === 'Not Coming' ? 'bg-red-100 text-red-800 border border-red-300' :
                              contact.followup?.status === 'May Come' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                              'bg-gray-100 text-gray-700 border border-gray-300'
                            }`}>
                              {contact.followup?.status || "Not Called"}
                            </span>
                            {contact.followup?.remarks && (
                              <p className="text-xs text-gray-600 mt-1 italic max-w-xs truncate">
                                "{contact.followup.remarks}"
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => setEditingFollowUp({
                              contactId: contact._id,
                              status: contact.followup?.status || 'Coming',
                              remarks: contact.followup?.remarks || ''
                            })}
                            className="px-4 py-2 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] font-bold text-xs sm:text-sm whitespace-nowrap cursor-pointer shadow-sm"
                          >
                            Update
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </div>
        )}

        {/* Create List Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden border">
              <div className="p-6 border-b bg-gray-50">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create Follow-up List</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Randomly assign temple outreach contacts for <b className="text-[#A65353]">{selectedDate}</b> without creating a session record.
                </p>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-3">
                {/* Volunteer Search Box */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={volunteerSearchQuery}
                    onChange={(e) => setVolunteerSearchQuery(e.target.value)}
                    placeholder="Search volunteers across all programs..."
                    className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#A65353]"
                  />
                </div>

                <div className="flex justify-between items-center pb-1">
                  <span className="text-sm font-bold text-gray-700">Select Volunteers ({filteredModalVolunteers.length} shown):</span>
                  <button
                    type="button"
                    onClick={() => {
                      const visibleIds = filteredModalVolunteers.map(v => v._id);
                      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedVolunteers.includes(id));
                      if (allVisibleSelected) {
                        setSelectedVolunteers(selectedVolunteers.filter(id => !visibleIds.includes(id)));
                      } else {
                        const newSelected = new Set([...selectedVolunteers, ...visibleIds]);
                        setSelectedVolunteers(Array.from(newSelected));
                      }
                    }}
                    className="text-xs text-[#A65353] font-bold hover:underline cursor-pointer"
                  >
                    {filteredModalVolunteers.length > 0 && filteredModalVolunteers.every(v => selectedVolunteers.includes(v._id)) ? "Deselect Shown" : "Select Shown"}
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredModalVolunteers.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">No volunteers found matching search query.</p>
                  ) : (
                    filteredModalVolunteers.map(volunteer => (
                      <label
                        key={volunteer._id}
                        className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedVolunteers.includes(volunteer._id)
                            ? "bg-emerald-50 border-emerald-300"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedVolunteers.includes(volunteer._id)}
                          onChange={() => toggleVolunteerSelection(volunteer._id)}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353]"
                        />
                        <div className="ml-3">
                          <div className="font-bold text-gray-900 text-sm">{volunteer.name}</div>
                          <div className="text-xs text-gray-500">{volunteer.email}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={handleAssignVolunteers}
                  disabled={selectedVolunteers.length === 0 || loading}
                  className="flex-1 px-5 py-2.5 bg-[#A65353] text-white rounded-xl font-bold hover:bg-[#8B4545] disabled:opacity-50 cursor-pointer shadow-md transition-colors"
                >
                  {loading ? 'Creating...' : `Randomly Assign (${selectedVolunteers.length})`}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedVolunteers([]);
                  }}
                  className="px-5 py-2.5 bg-gray-400 text-white rounded-xl font-bold hover:bg-gray-500 cursor-pointer transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
