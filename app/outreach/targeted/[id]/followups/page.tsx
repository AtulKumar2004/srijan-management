'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Pagination from '@/components/Pagination';
import { useModalStore } from '@/store/modalStore';
import { Calendar, Users, UserPlus, Phone, Filter, ChevronDown, ChevronLeft, ChevronRight, Save, RefreshCw, Search, Building2, ArrowLeft } from 'lucide-react';

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

interface CustomForm {
  _id: string;
  title: string;
  templeName: string;
  adminName: string;
}

export default function TargetedCardFollowUpsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const { showAlert } = useModalStore();

  const [form, setForm] = useState<CustomForm | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [expandedContact, setExpandedContact] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminName, setAdminName] = useState<string>('');

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [volunteerSearchQuery, setVolunteerSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Program & Session Calendar state
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [generatedDates, setGeneratedDates] = useState<string[]>([]);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const [editingFollowUp, setEditingFollowUp] = useState<{
    contactId: string;
    status: string;
    remarks: string;
  } | null>(null);

  const statusOptions = ['Coming', 'Not Coming', 'May Come', 'Not Answered', 'Not Called'];

  useEffect(() => {
    checkAuthAndFetchForm();
    fetchPrograms();
  }, [id]);

  const checkAuthAndFetchForm = async () => {
    try {
      const response = await fetch('/api/auth/me');
      let user = null;
      if (response.ok) {
        const authData = await response.json();
        user = authData.user;
        setCurrentUser(user);
      }

      const formRes = await fetch(`/api/outreach/custom-forms/${id}`);
      if (formRes.ok) {
        const formData = await formRes.json();
        const f = formData.form;
        setForm(f);
        setAdminName(f.adminName || user?.name || 'Admin');
        await fetchContacts(f.adminName || user?.name || 'Admin');
      }
    } catch (err) {
      console.error('Error in init:', err);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/programs');
      if (res.ok) {
        const data = await res.json();
        const progs = data.programs || [];
        setPrograms(progs);
        if (progs.length > 0) {
          setSelectedProgramId(progs[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch programs:', err);
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
        console.error('Failed to fetch session dates:', err);
      }
    };
    fetchSessionDates();
    if (adminName) {
      fetch(`/api/outreach/followups/dates?adminName=${encodeURIComponent(adminName)}&programId=${encodeURIComponent(selectedProgramId || '')}&customFormId=${id}`)
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
      setFilterStatus('');
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

  const fetchContacts = async (adminToFetch?: string, silent = false) => {
    const targetAdmin = adminToFetch || adminName;
    if (!targetAdmin) return;

    if (!silent) setLoading(true);
    try {
      const url = `/api/outreach/followups/by-admin?adminName=${encodeURIComponent(targetAdmin)}&followUpDate=${selectedDate}&programId=${encodeURIComponent(selectedProgramId || '')}&customFormId=${id}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
        if (data.generatedDates && Array.isArray(data.generatedDates)) {
          setGeneratedDates(data.generatedDates);
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      if (!silent) setMessage({ type: 'error', text: 'Failed to load followups' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchVolunteers = async (adminToFetch?: string, userObj?: any, progId?: string) => {
    const user = userObj || currentUser;
    const targetProg = progId !== undefined ? progId : selectedProgramId;
    if (!user) return;

    try {
      if (user.role === 'volunteer') {
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
      console.error('Error fetching volunteers:', error);
    }
  };

  const handleAssignVolunteers = async () => {
    if (selectedVolunteers.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one volunteer' });
      return;
    }

    if (!adminName) {
      setMessage({ type: 'error', text: 'Admin information not loaded.' });
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
          followUpDate: selectedDate,
          customFormId: id
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Followups created! ${data.createdCount} contacts randomly distributed among ${selectedVolunteers.length} volunteers`
        });
        setShowCreateModal(false);
        setSelectedVolunteers([]);
        await fetchContacts(adminName);
        await showAlert({
          title: 'Followups Assigned',
          message: data.message || `Assigned followups to ${selectedVolunteers.length} volunteers.`,
          type: 'success'
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create list' });
      }
    } catch (error) {
      console.error('Error creating followup list:', error);
      setMessage({ type: 'error', text: 'Failed to create list' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFollowUp = async (contactId: string) => {
    if (!editingFollowUp) return;

    try {
      const response = await fetch('/api/outreach/followups/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outreachContactId: contactId,
          followUpDate: selectedDate,
          status: editingFollowUp.status,
          remarks: editingFollowUp.remarks
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Followup updated successfully' });
        setEditingFollowUp(null);
        await fetchContacts(adminName, true);
      } else {
        setMessage({ type: 'error', text: 'Failed to update followup' });
      }
    } catch (error) {
      console.error('Error updating followup:', error);
      setMessage({ type: 'error', text: 'Failed to update followup' });
    }
  };

  // Filter contacts logic
  const filteredContacts = contacts.filter((contact) => {
    if (selectedVolunteerId === 'unassigned') {
      if (contact.assignedVolunteer) return false;
    } else if (selectedVolunteerId) {
      if (!contact.assignedVolunteer || contact.assignedVolunteer._id !== selectedVolunteerId) {
        return false;
      }
    }
    if (filterStatus) {
      const status = contact.followup?.status || 'Not Called';
      if (status !== filterStatus) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = contact.name.toLowerCase().includes(q);
      const matchPhone = contact.phone.includes(q);
      if (!matchName && !matchPhone) return false;
    }
    return true;
  });

  const unassignedCount = contacts.filter(c => !c.assignedVolunteer).length;

  // Pagination
  const pageSize = 10;
  const totalPages = Math.ceil(filteredContacts.length / pageSize) || 1;
  const paginatedContacts = filteredContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats
  const stats = {
    total: contacts.length,
    called: contacts.filter(c => c.followup && c.followup.status !== 'Not Called').length,
    coming: contacts.filter(c => c.followup && c.followup.status === 'Coming').length,
    notComing: contacts.filter(c => c.followup && c.followup.status === 'Not Coming').length,
    mayCome: contacts.filter(c => c.followup && c.followup.status === 'May Come').length,
    notAnswered: contacts.filter(c => c.followup && c.followup.status === 'Not Answered').length,
    notCalled: contacts.filter(c => !c.followup || c.followup.status === 'Not Called').length,
  };

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

  return (
    <div className="min-h-screen flex flex-col" style={{
      backgroundImage: 'url(/backgrou.png)',
      backgroundSize: '25%',
      backgroundRepeat: 'repeat'
    }}>
      <Header />

      <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        {/* Top Header Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-l-4 border-[#A65353]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="inline-block px-2.5 py-1 bg-yellow-100 text-[#A65353] border border-yellow-300 rounded text-xs font-bold mb-1">
                Followups • Targeted Card • {form?.templeName}
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-800">
                {form?.title || 'Customized Outreach Form'}
              </h1>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'program_manager') && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 bg-[#A65353] hover:bg-[#8B4545] text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer flex-1 sm:flex-none"
                >
                  <UserPlus size={18} />
                  <span>Create List / Assign</span>
                </button>
              )}
              <button
                onClick={() => router.push(`/outreach/targeted/${id}`)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} />
                <span>Back to Card</span>
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 text-sm font-bold shadow-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Program and Date Picker Card */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 size={15} className="text-[#A65353]" />
                Select Program
              </label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] outline-none font-semibold text-gray-800 bg-white"
              >
                {programs.map((prog) => (
                  <option key={prog._id} value={prog._id}>{prog.name}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={15} className="text-[#A65353]" />
                Follow-up Date (Session Date)
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!showCalendarPopup && selectedDate) {
                    setCalendarMonth(new Date(selectedDate));
                  }
                  setShowCalendarPopup(!showCalendarPopup);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A65353] text-sm sm:text-base font-semibold cursor-pointer shadow-sm flex items-center justify-between transition-all ${
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

            <div className="flex items-end">
              <button
                onClick={() => fetchContacts()}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm sm:text-base shadow-sm"
              >
                <RefreshCw size={18} />
                <span>Refresh List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Count Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div
            onClick={() => setFilterStatus('')}
            className={`p-3 rounded-xl shadow-sm border cursor-pointer transition-all ${
              filterStatus === '' ? 'bg-[#A65353] text-white border-[#A65353]' : 'bg-white text-gray-800 border-gray-200 hover:border-[#A65353]'
            }`}
          >
            <div className="text-xs font-bold opacity-80 uppercase">Total Contacts</div>
            <div className="text-xl font-extrabold mt-1">{stats.total}</div>
          </div>

          <div
            onClick={() => setFilterStatus('Coming')}
            className={`p-3 rounded-xl shadow-sm border cursor-pointer transition-all ${
              filterStatus === 'Coming' ? 'bg-green-600 text-white border-green-600' : 'bg-green-50 text-green-900 border-green-200 hover:border-green-400'
            }`}
          >
            <div className="text-xs font-bold opacity-80 uppercase">Coming</div>
            <div className="text-xl font-extrabold mt-1">{stats.coming}</div>
          </div>

          <div
            onClick={() => setFilterStatus('Not Coming')}
            className={`p-3 rounded-xl shadow-sm border cursor-pointer transition-all ${
              filterStatus === 'Not Coming' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-900 border-red-200 hover:border-red-400'
            }`}
          >
            <div className="text-xs font-bold opacity-80 uppercase">Not Coming</div>
            <div className="text-xl font-extrabold mt-1">{stats.notComing}</div>
          </div>

          <div
            onClick={() => setFilterStatus('May Come')}
            className={`p-3 rounded-xl shadow-sm border cursor-pointer transition-all ${
              filterStatus === 'May Come' ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-yellow-50 text-yellow-900 border-yellow-200 hover:border-yellow-400'
            }`}
          >
            <div className="text-xs font-bold opacity-80 uppercase">May Come</div>
            <div className="text-xl font-extrabold mt-1">{stats.mayCome}</div>
          </div>

          <div
            onClick={() => setFilterStatus('Not Answered')}
            className={`p-3 rounded-xl shadow-sm border cursor-pointer transition-all ${
              filterStatus === 'Not Answered' ? 'bg-orange-600 text-white border-orange-600' : 'bg-orange-50 text-orange-900 border-orange-200 hover:border-orange-400'
            }`}
          >
            <div className="text-xs font-bold opacity-80 uppercase">Not Answered</div>
            <div className="text-xl font-extrabold mt-1">{stats.notAnswered}</div>
          </div>

          <div
            onClick={() => setFilterStatus('Not Called')}
            className={`p-3 rounded-xl shadow-sm border cursor-pointer transition-all ${
              filterStatus === 'Not Called' ? 'bg-gray-600 text-white border-gray-600' : 'bg-gray-50 text-gray-800 border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className="text-xs font-bold opacity-80 uppercase">Not Called</div>
            <div className="text-xl font-extrabold mt-1">{stats.notCalled}</div>
          </div>
        </div>

        {/* Volunteer Filter Cards */}
        {contacts.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
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

        {/* Search Input Bar */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by participant name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] outline-none text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Contacts Followup Table / List */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
            Contacts Followup Status ({filteredContacts.length})
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#A65353] mx-auto"></div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-medium">
              No contacts found matching the current criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedContacts.map((contact) => {
                const isEditing = editingFollowUp?.contactId === contact._id;
                const status = contact.followup?.status || 'Not Called';
                const remarks = contact.followup?.remarks || '';
                const calledBy = contact.followup?.calledBy?.name || 'N/A';

                return (
                  <div key={contact._id} className="bg-[#FFFDF9] hover:bg-[#FFF9EE] rounded-2xl border border-yellow-200/80 p-4 sm:p-5 shadow-sm transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Avatar & Contact details */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-extrabold text-[#A65353] text-base shrink-0 shadow-inner">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-extrabold text-gray-900 text-base sm:text-lg tracking-tight">
                              {contact.name}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-2.5 mt-1.5 text-xs sm:text-sm text-gray-600 flex-wrap font-medium">
                            <span className="flex items-center gap-1.5 font-bold text-gray-800 bg-white border border-gray-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                              <Phone size={13} className="text-[#A65353]" />
                              {contact.phone}
                            </span>
                            {contact.profession && (
                              <span className="bg-amber-50 text-amber-900 border border-amber-200/60 px-2.5 py-0.5 rounded-md text-xs font-semibold">
                                {contact.profession}
                              </span>
                            )}
                            {contact.assignedVolunteer && (
                              <span className="bg-red-50 text-[#A65353] border border-red-200 px-2.5 py-0.5 rounded-md text-xs font-bold">
                                Assigned: {contact.assignedVolunteer.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status / Remarks & Action */}
                      <div className="w-full md:w-auto flex flex-col sm:flex-row md:items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-amber-100 shrink-0">
                        {isEditing ? (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-yellow-50/80 p-3 rounded-xl border border-yellow-300/80 w-full md:w-auto">
                            <select
                              value={editingFollowUp.status}
                              onChange={(e) => setEditingFollowUp({ ...editingFollowUp, status: e.target.value })}
                              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#A65353]"
                            >
                              {statusOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={editingFollowUp.remarks}
                              onChange={(e) => setEditingFollowUp({ ...editingFollowUp, remarks: e.target.value })}
                              placeholder="Add remarks..."
                              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg font-medium outline-none focus:ring-2 focus:ring-[#A65353] w-full sm:w-52"
                            />
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleSaveFollowUp(contact._id)}
                                className="flex-1 sm:flex-none px-4 py-1.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-1 shadow-sm transition-all"
                              >
                                <Save size={14} /> Save
                              </button>
                              <button
                                onClick={() => setEditingFollowUp(null)}
                                className="flex-1 sm:flex-none px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold cursor-pointer transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full md:w-auto">
                            <div className="text-left sm:text-right flex-1 sm:flex-initial">
                              <div>
                                <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-block shadow-2xs ${
                                  status === 'Coming' ? 'bg-green-100 text-green-800 border border-green-300' :
                                  status === 'Not Coming' ? 'bg-red-100 text-red-800 border border-red-300' :
                                  status === 'May Come' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                  status === 'Not Answered' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                  'bg-gray-100 text-gray-700 border border-gray-300'
                                }`}>
                                  {status}
                                </span>
                              </div>
                              <div className="mt-1.5 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed pr-1">
                                {remarks ? (
                                  <span className="italic text-gray-700 font-semibold">"{remarks}"</span>
                                ) : (
                                  <span className="text-gray-400 italic">No remarks recorded</span>
                                )}
                                {calledBy !== 'N/A' && (
                                  <span className="text-gray-500 block text-[11px] not-italic mt-0.5">Called by: {calledBy}</span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => setEditingFollowUp({
                                contactId: contact._id,
                                status,
                                remarks
                              })}
                              className="px-4 py-2 bg-gradient-to-r from-[#A65353] to-[#8e4545] hover:from-[#8e4545] hover:to-[#7a3939] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
                            >
                              Update Status
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* Create List Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">Assign Follow-ups to Volunteers</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <Users size={20} />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Randomly distribute <strong>{contacts.length} contacts</strong> from this custom form across the selected volunteers below for session date <strong>{selectedDate}</strong>.
              </p>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search volunteers..."
                  value={volunteerSearchQuery}
                  onChange={(e) => setVolunteerSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#A65353]"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border border-gray-200 p-2 rounded-lg bg-gray-50">
                {volunteers
                  .filter(v => v.name.toLowerCase().includes(volunteerSearchQuery.toLowerCase()))
                  .map((v) => (
                    <label
                      key={v._id}
                      className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 hover:bg-yellow-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVolunteers.includes(v._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVolunteers([...selectedVolunteers, v._id]);
                          } else {
                            setSelectedVolunteers(selectedVolunteers.filter(vid => vid !== v._id));
                          }
                        }}
                        className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353] cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-gray-800 text-sm truncate">{v.name}</div>
                        <div className="text-xs text-gray-500 truncate">{v.email}</div>
                      </div>
                    </label>
                  ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedVolunteers.length === volunteers.length) {
                      setSelectedVolunteers([]);
                    } else {
                      setSelectedVolunteers(volunteers.map(v => v._id));
                    }
                  }}
                  className="text-xs font-bold text-[#A65353] hover:underline cursor-pointer"
                >
                  {selectedVolunteers.length === volunteers.length ? 'Deselect All' : 'Select All'}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignVolunteers}
                    disabled={loading || selectedVolunteers.length === 0}
                    className="px-5 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-sm font-bold shadow disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Assigning...' : `Assign (${selectedVolunteers.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
