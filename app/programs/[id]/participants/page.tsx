"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Filter, X, ChevronDown, UserPlus, Phone, Archive, Download, Trash2, AlertCircle } from "lucide-react";
import Pagination from "@/components/Pagination";
import { useModalStore } from "@/store/modalStore";

interface Participant {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profession?: string;
  homeTown?: string;
  connectedToTemple?: string;
  gender?: string;
  dateOfBirth?: Date;
  address?: string;
  level?: number;
  grade?: string;
  numberOfRounds?: number;
  registeredBy?: string;
  registeredByName?: string;
  handledBy?: string;
  isActive?: boolean;
  isArchived?: boolean;
  createdAt: Date;
}

interface Volunteer {
  _id: string;
  name: string;
  participantsUnder?: number;
  level?: number;
}

interface Program {
  _id: string;
  name: string;
}

export default function ParticipantsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  const { showConfirm, showAlert } = useModalStore();

  const [program, setProgram] = useState<Program | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedParticipant, setExpandedParticipant] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [volunteerNames, setVolunteerNames] = useState<{ [key: string]: string }>({});
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Bulk action states
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkAssignVolunteerId, setBulkAssignVolunteerId] = useState("");
  const [bulkEditFields, setBulkEditFields] = useState<{ [key: string]: boolean }>({});
  const [bulkEditValues, setBulkEditValues] = useState<{
    level: string;
    grade: string;
    numberOfRounds: string;
    isActive: string;
    homeTown: string;
    profession: string;
    connectedToTemple: string;
    gender: string;
    maritalStatus: string;
  }>({
    level: "",
    grade: "",
    numberOfRounds: "",
    isActive: "true",
    homeTown: "",
    profession: "",
    connectedToTemple: "",
    gender: "",
    maritalStatus: ""
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterHomeTown, setFilterHomeTown] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterNumberOfRounds, setFilterNumberOfRounds] = useState("");
  const [filterHandledBy, setFilterHandledBy] = useState("");

  // Add participant form state
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    email: "",
    phone: "",
    level: "",
  });

  useEffect(() => {
    fetchData();
  }, [programId]);

  useEffect(() => {
    applyFilters();
  }, [participants, searchTerm, filterGender, filterLevel, filterGrade, filterHomeTown, filterActive, filterNumberOfRounds, filterHandledBy, showArchived]);

  const fetchData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUserId(meData.user?._id || '');
        setCurrentUserRole(meData.user?.role || '');
      }

      // Fetch program details
      const programRes = await fetch(`/api/programs/${programId}`);
      if (programRes.ok) {
        const programData = await programRes.json();
        setProgram(programData.program);
      }

      // Fetch participants for this program
      const participantsRes = await fetch(`/api/users/by-role?role=participant&programId=${programId}&includeArchived=true`);
      if (participantsRes.ok) {
        const data = await participantsRes.json();
        const participantsList = data.users || [];
        setParticipants(participantsList);

        // Fetch volunteer names for registeredBy and handledBy
        const volunteerIds = new Set<string>();
        participantsList.forEach((p: Participant) => {
          if (p.registeredBy) volunteerIds.add(p.registeredBy);
          if (p.handledBy) volunteerIds.add(p.handledBy);
        });

        const namesMap: { [key: string]: string } = {};
        await Promise.all(
          Array.from(volunteerIds).map(async (id) => {
            try {
              const res = await fetch(`/api/users/${id}`);
              if (res.ok) {
                const data = await res.json();
                namesMap[id] = data.user.name;
              }
            } catch (err) {
              console.error(`Error fetching volunteer ${id}:`, err);
            }
          })
        );
        setVolunteerNames(namesMap);
      }

      // Fetch volunteers for dropdown (only those in this program)
      const volunteersRes = await fetch(`/api/users/by-role?role=volunteer&programId=${programId}`);
      if (volunteersRes.ok) {
        const data = await volunteersRes.json();
        setVolunteers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...participants];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm)
      );
    }

    // Gender filter
    if (filterGender) {
      filtered = filtered.filter(p => p.gender === filterGender);
    }

    // Level filter
    if (filterLevel) {
      const levelNum = parseInt(filterLevel);
      filtered = filtered.filter(p => {
        if (p.level === undefined || p.level === null) return false;
        return parseInt(String(p.level)) === levelNum;
      });
    }

    // Grade filter
    if (filterGrade) {
      filtered = filtered.filter(p => p.grade === filterGrade);
    }

    // HomeTown filter
    if (filterHomeTown) {
      filtered = filtered.filter(p =>
        p.homeTown?.toLowerCase().includes(filterHomeTown.toLowerCase())
      );
    }

    // Active status / Archived split
    filtered = filtered.filter(p => showArchived ? p.isArchived === true : !p.isArchived);



    // Number of Rounds filter
    if (filterNumberOfRounds) {
      filtered = filtered.filter(p => p.numberOfRounds === parseInt(filterNumberOfRounds));
    }

    // Handled By filter
    if (filterHandledBy) {
      if (filterHandledBy === "unassigned") {
        filtered = filtered.filter(p => !p.handledBy || p.handledBy === "" || p.handledBy === "unassigned");
      } else {
        filtered = filtered.filter(p => p.handledBy === filterHandledBy);
      }
    }

    setFilteredParticipants(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterGender("");
    setFilterLevel("");
    setFilterGrade("");
    setFilterHomeTown("");
    setFilterActive("");
    setFilterNumberOfRounds("");
    setFilterHandledBy("");
  };

  const handleDeleteParticipant = async (participantId: string, participantName: string, isPermanent = false) => {
    const promptMsg = isPermanent
      ? `Are you sure you want to PERMANENTLY delete ${participantName}? This action cannot be undone.`
      : `Are you sure you want to move ${participantName} to archived list?`;
    const confirmed = await showConfirm({ title: isPermanent ? "Permanently Delete" : "Archive Participant", message: promptMsg, type: "danger", confirmText: isPermanent ? "Permanently Delete" : "Archive" });
    if (!confirmed) {
      return;
    }

    try {
      const url = isPermanent ? `/api/users/${participantId}?permanent=true` : `/api/users/${participantId}`;
      const res = await fetch(url, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: isPermanent ? 'Participant permanently deleted!' : 'Participant archived successfully!' });
        fetchData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed action' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error deleting participant:", error);
      setMessage({ type: 'error', text: 'Error executing action' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleBulkDeleteParticipants = async (isPermanent = false) => {
    if (selectedParticipants.length === 0) return;
    const promptMsg = isPermanent
      ? `Are you sure you want to PERMANENTLY delete ${selectedParticipants.length} selected participant(s)? This action cannot be undone.`
      : `Are you sure you want to move ${selectedParticipants.length} selected participant(s) to archived list?`;
    const confirmed = await showConfirm({ title: isPermanent ? "Permanently Delete" : "Archive Participants", message: promptMsg, type: "danger", confirmText: isPermanent ? "Permanently Delete" : "Archive" });
    if (!confirmed) return;

    try {
      await Promise.all(
        selectedParticipants.map(id => {
          const url = isPermanent ? `/api/users/${id}?permanent=true` : `/api/users/${id}`;
          return fetch(url, { method: 'DELETE' });
        })
      );
      setMessage({ type: 'success', text: isPermanent ? `${selectedParticipants.length} participant(s) permanently deleted!` : `${selectedParticipants.length} participant(s) archived successfully!` });
      setSelectedParticipants([]);
      fetchData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error in bulk delete:", error);
      setMessage({ type: 'error', text: 'Error executing bulk action' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleUnarchiveParticipant = async (participantId: string, participantName: string) => {
    const confirmed = await showConfirm({ title: "Unarchive Participant", message: `Are you sure you want to unarchive ${participantName}?`, type: "info", confirmText: "Unarchive" });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/users/${participantId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Participant unarchived successfully!' });
        fetchData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed action' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error unarchiving participant:", error);
      setMessage({ type: 'error', text: 'Error executing action' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleBulkUnarchiveParticipants = async () => {
    const confirmed = await showConfirm({ title: "Unarchive Participants", message: `Are you sure you want to unarchive ${selectedParticipants.length} selected participant(s)?`, type: "info", confirmText: "Unarchive All" });
    if (!confirmed) return;
    try {
      const res = await fetch("/api/participants/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: selectedParticipants, updates: { isArchived: false } }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Participants unarchived successfully!' });
        setSelectedParticipants([]);
        fetchData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed action' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error bulk unarchiving participants:", error);
      setMessage({ type: 'error', text: 'Error executing action' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/participants/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newParticipant.name,
          email: newParticipant.email,
          phone: newParticipant.phone,
          programs: [programId],
          level: newParticipant.level ? parseInt(newParticipant.level) : 1,
          grade: "D"
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Participant created successfully! Default password: 108jayradheshyam108' });
        setShowAddModal(false);
        setNewParticipant({
          name: "",
          email: "",
          phone: "",
          level: "",
        });
        fetchData();
        setTimeout(() => setMessage(null), 5000);
      } else {
        setModalError(data.error || 'Failed to create participant');
      }
    } catch (error) {
      console.error("Error creating participant:", error);
      setModalError('Error creating participant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkUpdating(true);
    setMessage(null);

    try {
      const updates: any = {};
      if (bulkEditFields.level) updates.level = bulkEditValues.level !== "" ? parseInt(bulkEditValues.level) : null;
      if (bulkEditFields.grade) updates.grade = bulkEditValues.grade;
      if (bulkEditFields.numberOfRounds) updates.numberOfRounds = bulkEditValues.numberOfRounds !== "" ? parseInt(bulkEditValues.numberOfRounds) : 0;
      if (bulkEditFields.isActive) updates.isActive = bulkEditValues.isActive === "true";
      if (bulkEditFields.gender) updates.gender = bulkEditValues.gender;
      if (bulkEditFields.profession) updates.profession = bulkEditValues.profession;
      if (bulkEditFields.homeTown) updates.homeTown = bulkEditValues.homeTown;
      if (bulkEditFields.connectedToTemple) updates.connectedToTemple = bulkEditValues.connectedToTemple;
      if (bulkEditFields.maritalStatus) updates.maritalStatus = bulkEditValues.maritalStatus;

      if (Object.keys(updates).length === 0) {
        setMessage({ type: 'error', text: 'Please check at least one field to update' });
        setBulkUpdating(false);
        return;
      }

      const res = await fetch('/api/participants/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: selectedParticipants,
          updates
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Participants updated successfully!' });
        setShowBulkEditModal(false);
        setSelectedParticipants([]);
        setBulkEditFields({});
        fetchData();
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update participants' });
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (err) {
      console.error("Bulk edit error:", err);
      setMessage({ type: 'error', text: 'Error performing bulk update' });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAssignVolunteerId) {
      setMessage({ type: 'error', text: 'Please select a volunteer' });
      return;
    }
    setBulkUpdating(true);
    setMessage(null);

    try {
      const res = await fetch('/api/participants/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: selectedParticipants,
          updates: {
            handledBy: bulkAssignVolunteerId
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Volunteer assigned successfully!' });
        setShowBulkAssignModal(false);
        setSelectedParticipants([]);
        setBulkAssignVolunteerId("");
        fetchData();
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to assign volunteer' });
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (err) {
      console.error("Bulk assign error:", err);
      setMessage({ type: 'error', text: 'Error performing bulk assign' });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setBulkUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow flex items-center justify-center">
          <img src="/mrdanga.png" alt="Loading" className="w-20 h-20 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredParticipants.length / itemsPerPage));
  const paginatedParticipants = filteredParticipants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDownloadCSV = async () => {
    const dataToDownload = selectedParticipants.length > 0
      ? filteredParticipants.filter(p => selectedParticipants.includes(p._id))
      : filteredParticipants;

    if (dataToDownload.length === 0) {
      await showAlert({
        title: "No Data",
        message: selectedParticipants.length > 0
          ? "No selected participants match the current view/filters."
          : "No data available to download.",
        type: "info"
      });
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Role",
      "Profession",
      "Home Town",
      "Connected To Temple",
      "Gender",
      "Date of Birth",
      "Address",
      "Level",
      "Grade",
      "Number of Rounds",
      "Mentor Name",
      "Active Status",
      "Archived Status",
      "Created At"
    ];

    const rows = dataToDownload.map(p => {
      const mentorName = p.handledBy && p.handledBy !== 'unassigned'
        ? (volunteerNames[p.handledBy] || 'N/A')
        : 'N/A';
      const dob = p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '';
      const created = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '';

      return [
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.email || '').replace(/"/g, '""')}"`,
        `"${(p.phone || '').replace(/"/g, '""')}"`,
        `"${(p.role || '').replace(/"/g, '""')}"`,
        `"${(p.profession || '').replace(/"/g, '""')}"`,
        `"${(p.homeTown || '').replace(/"/g, '""')}"`,
        `"${(p.connectedToTemple || '').replace(/"/g, '""')}"`,
        `"${(p.gender || '').replace(/"/g, '""')}"`,
        `"${dob}"`,
        `"${(p.address || '').replace(/"/g, '""')}"`,
        `"${p.level !== undefined ? p.level : ''}"`,
        `"${(p.grade || '').replace(/"/g, '""')}"`,
        `"${p.numberOfRounds !== undefined ? p.numberOfRounds : ''}"`,
        `"${mentorName.replace(/"/g, '""')}"`,
        `"${p.isActive ? 'Active' : 'Inactive'}"`,
        `"${p.isArchived ? 'Archived' : 'Not Archived'}"`,
        `"${created}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = showArchived ? "archived_participants.csv" : "participants_list.csv";
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" style={{
      backgroundImage: 'url(/backgrou.png)',
      backgroundSize: '25%',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <Header />

      <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Participants</h1>
              {program && (
                <p className="text-sm sm:text-base text-gray-600 mt-1">Program: {program.name}</p>
              )}
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
              {currentUserRole !== 'participant' && (
                <button
                  onClick={handleDownloadCSV}
                  className="flex-1 sm:flex-none flex items-center justify-center cursor-pointer gap-2 px-3 sm:px-4 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white font-bold rounded-lg transition-colors text-sm sm:text-base shadow"
                >
                  <Download size={18} className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Download Data</span>
                  <span className="sm:hidden">CSV</span>
                </button>
              )}
              {(currentUserRole === 'admin' || currentUserRole === 'program_manager') && (
                <button
                  type="button"
                  onClick={() => {
                    setShowArchived(!showArchived);
                    setSelectedParticipants([]);
                  }}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 font-bold cursor-pointer rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base shadow ${showArchived ? 'bg-gray-800 text-white' : 'bg-[#A65353] text-white hover:bg-[#8e4545]'
                    }`}
                >
                  <Archive size={18} className="sm:w-5 sm:h-5" />
                  <span>{showArchived ? 'Active List' : `Archived (${participants.filter(p => p.isArchived).length})`}</span>
                </button>
              )}
              {(!showArchived && (currentUserRole === 'admin' || currentUserRole === 'program_manager' || currentUserRole === 'volunteer')) && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#A65353] text-white cursor-pointer rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <UserPlus size={18} className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Add Participant</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 sm:px-4 py-2 text-gray-600 cursor-pointer hover:text-gray-800 font-medium text-sm sm:text-base"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            {message.text}
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search */}
            <div className="grow relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#A65353] cursor-pointer text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                <Filter size={18} className="sm:w-5 sm:h-5" />
                <span>Filters</span>
                <ChevronDown
                  size={16}
                  className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Clear Filters */}
              {(searchTerm || filterGender || filterLevel || filterGrade || filterHomeTown || filterActive || filterNumberOfRounds || filterHandledBy) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
                >
                  <X size={18} className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Home Town</label>
                <input
                  type="text"
                  placeholder="Filter by hometown"
                  value={filterHomeTown}
                  onChange={(e) => setFilterHomeTown(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rounds</label>
                <select
                  value={filterNumberOfRounds}
                  onChange={(e) => setFilterNumberOfRounds(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                  <option value="13">13</option>
                  <option value="14">14</option>
                  <option value="15">15</option>
                  <option value="16">16</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mentor</label>
                <select
                  value={filterHandledBy}
                  onChange={(e) => setFilterHandledBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="unassigned">Unassigned</option>
                  {volunteers.map(vol => {
                    const count = participants.filter(p => p.handledBy === vol._id).length;
                    const displayCount = vol.participantsUnder !== undefined ? Math.max(vol.participantsUnder || 0, count) : count;
                    return (
                      <option key={vol._id} value={vol._id}>
                        {vol.name} (Level: {vol.level || 'N/A'}, {displayCount} mentees)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Count & Select All */}
        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="text-sm sm:text-base text-gray-600 font-bold">
            Showing {filteredParticipants.length === 0 ? 0 : (currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredParticipants.length)} of {filteredParticipants.length} participants
          </div>
          {(currentUserRole === 'admin' || currentUserRole === 'program_manager' || currentUserRole === 'volunteer') && (() => {
            const selectableVisible = paginatedParticipants.filter(p => currentUserRole === 'admin' || currentUserRole === 'program_manager' || p.handledBy === currentUserId);
            const allSelected = selectableVisible.length > 0 && selectableVisible.every(p => selectedParticipants.includes(p._id));
            return (
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {selectedParticipants.length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-semibold text-xs sm:text-sm whitespace-nowrap bg-[#A65353] text-white px-2.5 py-1.5 rounded-lg shadow-sm">
                      {selectedParticipants.length} Selected
                    </span>
                    {!showArchived && (
                      <button
                        onClick={() => setShowBulkEditModal(true)}
                        className="px-3 py-1.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-sm"
                      >
                        Bulk Edit Fields
                      </button>
                    )}
                    {!showArchived && (currentUserRole === 'admin' || currentUserRole === 'program_manager') && (
                      <button
                        onClick={() => setShowBulkAssignModal(true)}
                        className="px-3 py-1.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-sm"
                      >
                        Bulk Assign Volunteer
                      </button>
                    )}
                    {!showArchived && (
                      <button
                        onClick={() => handleBulkDeleteParticipants(false)}
                        className="px-3 py-1.5 bg-[#A65353] hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete ({selectedParticipants.length})
                      </button>
                    )}
                    {showArchived && (currentUserRole === 'admin' || currentUserRole === 'program_manager') && (
                      <>
                        <button
                          onClick={handleBulkUnarchiveParticipants}
                          className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Unarchive
                        </button>
                        <button
                          onClick={() => handleBulkDeleteParticipants(true)}
                          className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Permanently Delete ({selectedParticipants.length})
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedParticipants([])}
                      className="p-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors cursor-pointer"
                      title="Clear Selection"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm transition-colors">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={selectableVisible.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newSet = new Set([...selectedParticipants, ...selectableVisible.map(p => p._id)]);
                        setSelectedParticipants(Array.from(newSet));
                      } else {
                        const visibleIds = new Set(selectableVisible.map(p => p._id));
                        setSelectedParticipants(selectedParticipants.filter(id => !visibleIds.has(id)));
                      }
                    }}
                    className="w-4 h-4 text-[#A65353] rounded border-gray-300 focus:ring-[#A65353] cursor-pointer accent-[#A65353] disabled:opacity-30"
                  />
                  <span>Select All Visible ({selectableVisible.length})</span>
                </label>
              </div>
            );
          })()}
        </div>

        {/* Participants List */}
        <div className="space-y-2">
          {paginatedParticipants.map((participant) => (
            <div
              key={participant._id}
              className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 overflow-hidden"
            >
              {/* Main Row */}
              <div
                onClick={() => setExpandedParticipant(
                  expandedParticipant.includes(participant._id)
                    ? expandedParticipant.filter(id => id !== participant._id)
                    : [...expandedParticipant, participant._id]
                )}
                className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 hover:bg-yellow-100 transition-colors gap-2 sm:gap-4 cursor-pointer"
              >
                {/* Top Header Row on mobile / Left group on desktop */}
                <div className="flex items-center justify-between gap-2 w-full xl:w-auto min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 xl:flex-initial">
                    {(currentUserRole === 'admin' || currentUserRole === 'program_manager' || currentUserRole === 'volunteer') && (() => {
                      const canSelect = currentUserRole === 'admin' || currentUserRole === 'program_manager' || participant.handledBy === currentUserId;
                      return (
                        <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            disabled={!canSelect}
                            checked={selectedParticipants.includes(participant._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParticipants([...selectedParticipants, participant._id]);
                              } else {
                                setSelectedParticipants(selectedParticipants.filter(id => id !== participant._id));
                              }
                            }}
                            title={!canSelect ? "You can only select your mentees" : "Select participant"}
                            className="w-4 h-4 sm:w-5 sm:h-5 text-[#A65353] rounded border-gray-300 focus:ring-[#A65353] cursor-pointer accent-[#A65353] disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </div>
                      );
                    })()}
                    {/* Name */}
                    <div className="min-w-0 flex-1 xl:w-48 2xl:w-56">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/programs/${programId}/participants/${participant._id}`);
                          }}
                          className="hover:underline cursor-pointer text-left w-full truncate block"
                        >
                          {participant.name}
                        </button>
                      </h3>
                    </div>
                  </div>

                  {/* Expand Button for mobile */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedParticipant(
                        expandedParticipant.includes(participant._id)
                          ? expandedParticipant.filter(id => id !== participant._id)
                          : [...expandedParticipant, participant._id]
                      );
                    }}
                    className="xl:hidden p-1.5 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                  >
                    <ChevronDown
                      size={18}
                      className={`transform transition-transform ${expandedParticipant.includes(participant._id) ? 'rotate-180' : ''
                        }`}
                    />
                  </button>
                </div>

                {/* Right Side Stats Group (Wraps cleanly on mobile) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-700 xl:ml-auto mr-1 sm:mr-2 pl-6 sm:pl-0">
                  {/* Contact Icons */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                    {participant.phone && (
                      <>
                        <a
                          href={`https://wa.me/${participant.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                        </a>
                        <a
                          href={`tel:${participant.phone}`}
                          className="text-red-600 hover:text-red-700 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={18} />
                        </a>
                      </>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="font-medium text-gray-800 xl:w-32 flex-shrink-0">
                    {participant.phone || 'N/A'}
                  </div>

                  {/* Level */}
                  <div className="xl:w-24 flex-shrink-0">
                    <span className="text-gray-500 xl:hidden">Level: </span>{participant.level ? (String(participant.level).startsWith('Level') ? participant.level : `Level ${participant.level}`) : 'N/A'}
                  </div>

                  {/* Grade */}
                  <div className="xl:w-24 flex-shrink-0">
                    <span className="text-gray-500 xl:hidden">Grade: </span>{participant.grade || 'N/A'}
                  </div>

                  {/* Handled By */}
                  <div className="text-gray-700 xl:w-48 flex-shrink-0 truncate" title={participant.handledBy ? volunteerNames[participant.handledBy] : ''}>
                    <span className="text-gray-500 xl:hidden">Mentor: </span><span className="font-medium">{participant.handledBy && participant.handledBy !== 'unassigned' ? volunteerNames[participant.handledBy] || 'Volunteer' : 'N/A'}</span>
                  </div>
                </div>

                {/* Expand Button for desktop */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedParticipant(
                      expandedParticipant.includes(participant._id)
                        ? expandedParticipant.filter(id => id !== participant._id)
                        : [...expandedParticipant, participant._id]
                    );
                  }}
                  className="hidden xl:block p-1.5 sm:p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 ml-1"
                >
                  <ChevronDown
                    size={18}
                    className={`transform transition-transform ${expandedParticipant.includes(participant._id) ? 'rotate-180' : ''
                      }`}
                  />
                </button>
              </div>

              {/* Expanded Details */}
              {expandedParticipant.includes(participant._id) && (
                <div className="border-t border-yellow-300 bg-yellow-50 px-4 sm:px-6 py-3 sm:py-4">
                  <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                    The Details Review of Participant:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Profession:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{participant.profession || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Home Town:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{participant.homeTown || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Email:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800 break-all">{participant.email}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Gender:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{participant.gender || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Connected to Temple:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{participant.connectedToTemple || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Number of Rounds:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{participant.numberOfRounds || 0}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Registered By:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">
                        {participant.registeredByName || participant.registeredBy || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
                    <button
                      onClick={() => router.push(`/programs/${programId}/participants/${participant._id}`)}
                      className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                    >
                      Overview
                    </button>
                    {(currentUserRole === 'admin' || currentUserRole === 'program_manager' || (currentUserRole === 'volunteer' && (!participant.handledBy || participant.handledBy === currentUserId)) || participant._id === currentUserId) && (
                      <button
                        onClick={() => router.push(`/programs/${programId}/participants/${participant._id}?edit=true`)}
                        className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                      >
                        Edit
                      </button>
                    )}
                    {showArchived ? (
                      (currentUserRole === 'admin' || currentUserRole === 'program_manager') && (
                        <>
                          <button
                            onClick={() => handleUnarchiveParticipant(participant._id, participant.name)}
                            className="flex-1 px-4 sm:px-6 py-2 bg-green-700 hover:bg-green-800 text-white cursor-pointer rounded transition-colors text-sm sm:text-base font-bold"
                          >
                            Unarchive
                          </button>
                          <button
                            onClick={() => handleDeleteParticipant(participant._id, participant.name, true)}
                            className="flex-1 px-4 sm:px-6 py-2 bg-red-700 hover:bg-red-800 text-white cursor-pointer rounded transition-colors text-sm sm:text-base font-bold"
                          >
                            Permanently Delete
                          </button>
                        </>
                      )
                    ) : (
                      (participant._id !== currentUserId && (currentUserRole === 'admin' || currentUserRole === 'program_manager' || (currentUserRole === 'volunteer' && (!participant.handledBy || participant.handledBy === 'unassigned' || participant.handledBy === currentUserId)))) && (
                        <button
                          onClick={() => handleDeleteParticipant(participant._id, participant.name, false)}
                          className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                        >
                          Delete
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

        {filteredParticipants.length === 0 && (
          <div className="text-center py-8 sm:py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 text-base sm:text-lg">No participants found</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </main>


      {/* Bulk Edit Fields Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Bulk Edit Fields</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Updating {selectedParticipants.length} selected participant(s). Check the box beside any field you want to update.
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleBulkEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">


                  {/* Level */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!bulkEditFields.level}
                        onChange={(e) => setBulkEditFields({ ...bulkEditFields, level: e.target.checked })}
                        className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                      />
                      <span>Level</span>
                    </label>
                    <select
                      disabled={!bulkEditFields.level}
                      value={bulkEditValues.level}
                      onChange={(e) => setBulkEditValues({ ...bulkEditValues, level: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">N/A</option>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4</option>
                    </select>
                  </div>

                  {/* Grade */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!bulkEditFields.grade}
                        onChange={(e) => setBulkEditFields({ ...bulkEditFields, grade: e.target.checked })}
                        className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                      />
                      <span>Grade</span>
                    </label>
                    <select
                      disabled={!bulkEditFields.grade}
                      value={bulkEditValues.grade}
                      onChange={(e) => setBulkEditValues({ ...bulkEditValues, grade: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">N/A</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>

                  {/* Number of Rounds */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!bulkEditFields.numberOfRounds}
                        onChange={(e) => setBulkEditFields({ ...bulkEditFields, numberOfRounds: e.target.checked })}
                        className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                      />
                      <span>Number of Rounds</span>
                    </label>
                    <select
                      disabled={!bulkEditFields.numberOfRounds}
                      value={bulkEditValues.numberOfRounds}
                      onChange={(e) => setBulkEditValues({ ...bulkEditValues, numberOfRounds: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {Array.from({ length: 17 }, (_, i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>

                  {/* Gender */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!bulkEditFields.gender}
                        onChange={(e) => setBulkEditFields({ ...bulkEditFields, gender: e.target.checked })}
                        className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                      />
                      <span>Gender</span>
                    </label>
                    <select
                      disabled={!bulkEditFields.gender}
                      value={bulkEditValues.gender}
                      onChange={(e) => setBulkEditValues({ ...bulkEditValues, gender: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Marital Status */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!bulkEditFields.maritalStatus}
                        onChange={(e) => setBulkEditFields({ ...bulkEditFields, maritalStatus: e.target.checked })}
                        className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                      />
                      <span>Marital Status</span>
                    </label>
                    <select
                      disabled={!bulkEditFields.maritalStatus}
                      value={bulkEditValues.maritalStatus}
                      onChange={(e) => setBulkEditValues({ ...bulkEditValues, maritalStatus: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">Select Status</option>
                      <option value="Unmarried">Unmarried</option>
                      <option value="Married">Married</option>
                    </select>
                  </div>

                  {/* Profession */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!bulkEditFields.profession}
                        onChange={(e) => setBulkEditFields({ ...bulkEditFields, profession: e.target.checked })}
                        className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                      />
                      <span>Profession</span>
                    </label>
                    <input
                      type="text"
                      disabled={!bulkEditFields.profession}
                      placeholder="e.g. Engineer"
                      value={bulkEditValues.profession}
                      onChange={(e) => setBulkEditValues({ ...bulkEditValues, profession: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>

                  {/* Home Town */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!bulkEditFields.homeTown}
                        onChange={(e) => setBulkEditFields({ ...bulkEditFields, homeTown: e.target.checked })}
                        className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                      />
                      <span>Home Town</span>
                    </label>
                    <input
                      type="text"
                      disabled={!bulkEditFields.homeTown}
                      placeholder="e.g. Mumbai"
                      value={bulkEditValues.homeTown}
                      onChange={(e) => setBulkEditValues({ ...bulkEditValues, homeTown: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>

                  {/* Connected to Temple */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2 md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!bulkEditFields.connectedToTemple}
                        onChange={(e) => setBulkEditFields({ ...bulkEditFields, connectedToTemple: e.target.checked })}
                        className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                      />
                      <span>Connected to Temple</span>
                    </label>
                    <input
                      type="text"
                      disabled={!bulkEditFields.connectedToTemple}
                      placeholder="e.g. ISKCON Chowpatty"
                      value={bulkEditValues.connectedToTemple}
                      onChange={(e) => setBulkEditValues({ ...bulkEditValues, connectedToTemple: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowBulkEditModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkUpdating || Object.values(bulkEditFields).filter(Boolean).length === 0}
                    className="px-6 py-2 bg-[#A65353] text-white rounded-lg hover:bg-[#8e4545] transition-colors disabled:opacity-50 text-sm font-medium cursor-pointer shadow-md"
                  >
                    {bulkUpdating ? 'Updating...' : `Apply Bulk Edit (${Object.values(bulkEditFields).filter(Boolean).length} fields)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Volunteer Modal */}
      {showBulkAssignModal && currentUserRole === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Bulk Assign Volunteer</h2>
                <button
                  onClick={() => setShowBulkAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleBulkAssignSubmit} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Assigning {selectedParticipants.length} selected participant(s) to a volunteer mentor.
                </p>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Select Volunteer</label>
                  <select
                    value={bulkAssignVolunteerId}
                    onChange={(e) => setBulkAssignVolunteerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] text-sm"
                  >
                    <option value="">-- Select Volunteer --</option>
                    {volunteers.map(vol => {
                      const count = participants.filter(p => p.handledBy === vol._id).length;
                      const displayCount = vol.participantsUnder !== undefined ? Math.max(vol.participantsUnder || 0, count) : count;
                      return (
                        <option key={vol._id} value={vol._id}>
                          {vol.name} (Level: {vol.level || 'N/A'}, {displayCount} mentees)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowBulkAssignModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkUpdating || !bulkAssignVolunteerId}
                    className="px-6 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium cursor-pointer shadow-md"
                  >
                    {bulkUpdating ? 'Assigning...' : 'Assign Volunteer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Add New Participant</h2>
                <button
                  onClick={() => { setShowAddModal(false); setModalError(null); }}
                  className="text-gray-500 cursor-pointer hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddParticipant} className="space-y-3 sm:space-y-4">
                {/* Modal-level error banner */}
                {modalError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newParticipant.name}
                      onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newParticipant.email}
                      onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={newParticipant.phone}
                      onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      required
                      maxLength={10}
                      pattern="[0-9]{10}"
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Level <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <select
                      value={newParticipant.level}
                      onChange={(e) => setNewParticipant({ ...newParticipant, level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Default (Level 1)</option>
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 sm:py-2 bg-gray-200 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2.5 sm:py-2 bg-[#A65353] text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {saving ? 'Creating...' : 'Create Participant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
