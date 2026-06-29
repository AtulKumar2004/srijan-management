"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Filter, X, Edit, ChevronDown, Plus, UserPlus, Phone, Mail, MapPin, Briefcase, Archive, Download, Trash2 } from "lucide-react";
import Pagination from "@/components/Pagination";
import { useModalStore } from "@/store/modalStore";

interface Volunteer {
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
  participantsUnder?: number;
  isActive?: boolean;
  isArchived?: boolean;
  handledBy?: string;
  registeredBy?: string;
  maritalStatus?: string;
  createdAt: Date;
}

interface Program {
  _id: string;
  name: string;
}

export default function VolunteersPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  const { showConfirm, showAlert } = useModalStore();

  const [program, setProgram] = useState<Program | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [filteredVolunteers, setFilteredVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterHomeTown, setFilterHomeTown] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterNumberOfRounds, setFilterNumberOfRounds] = useState("");
  const [filterMentoring, setFilterMentoring] = useState("");
  const [filterHandledBy, setFilterHandledBy] = useState("");
  const [handlerNames, setHandlerNames] = useState<{ [key: string]: string }>({});
  const [expandedVolunteer, setExpandedVolunteer] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Add volunteer form state
  const [newVolunteer, setNewVolunteer] = useState({
    name: "",
    email: "",
    phone: "",
    profession: "",
    homeTown: "",
    address: "",
    gender: "",
    connectedToTemple: "",
    numberOfRounds: 0,
    level: "",
    grade: "",
    maritalStatus: "",
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Bulk action states
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkAssignMentorId, setBulkAssignMentorId] = useState("");
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
    participantsUnder: string;
  }>({
    level: "",
    grade: "",
    numberOfRounds: "",
    isActive: "true",
    homeTown: "",
    profession: "",
    connectedToTemple: "",
    gender: "",
    maritalStatus: "",
    participantsUnder: ""
  });

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updates: any = {};
    if (bulkEditFields.level && bulkEditValues.level !== "") updates.level = parseInt(bulkEditValues.level);
    if (bulkEditFields.grade && bulkEditValues.grade !== "") updates.grade = bulkEditValues.grade;
    if (bulkEditFields.numberOfRounds && bulkEditValues.numberOfRounds !== "") updates.numberOfRounds = parseInt(bulkEditValues.numberOfRounds);
    if (bulkEditFields.isActive) updates.isActive = bulkEditValues.isActive === "true";
    if (bulkEditFields.homeTown) updates.homeTown = bulkEditValues.homeTown;
    if (bulkEditFields.profession) updates.profession = bulkEditValues.profession;
    if (bulkEditFields.connectedToTemple) updates.connectedToTemple = bulkEditValues.connectedToTemple;
    if (bulkEditFields.gender && bulkEditValues.gender !== "") updates.gender = bulkEditValues.gender;
    if (bulkEditFields.maritalStatus && bulkEditValues.maritalStatus !== "") updates.maritalStatus = bulkEditValues.maritalStatus;
    if (bulkEditFields.participantsUnder && bulkEditValues.participantsUnder !== "") updates.participantsUnder = parseInt(bulkEditValues.participantsUnder);

    if (Object.keys(updates).length === 0) {
      await showAlert({ title: "No Fields Selected", message: "Please select and enter at least one field to update.", type: "warning" });
      return;
    }

    setBulkUpdating(true);
    try {
      const res = await fetch("/api/volunteers/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerIds: selectedVolunteers, updates }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: "success", text: data.message });
        setShowBulkEditModal(false);
        setSelectedVolunteers([]);
        setBulkEditFields({});
        fetchData();
      } else {
        await showAlert({ title: "Update Failed", message: data.error || "Bulk update failed", type: "danger" });
      }
    } catch (err) {
      console.error(err);
      await showAlert({ title: "Error", message: "An error occurred during bulk update", type: "danger" });
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkUpdating(true);
    try {
      const res = await fetch("/api/volunteers/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerIds: selectedVolunteers, updates: { handledBy: bulkAssignMentorId } }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: "success", text: data.message });
        setShowBulkAssignModal(false);
        setSelectedVolunteers([]);
        fetchData();
      } else {
        await showAlert({ title: "Assign Failed", message: data.error || "Bulk assign failed", type: "danger" });
      }
    } catch (err) {
      console.error(err);
      await showAlert({ title: "Error", message: "An error occurred during bulk assign", type: "danger" });
    } finally {
      setBulkUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [programId]);

  useEffect(() => {
    applyFilters();
  }, [volunteers, searchTerm, filterGender, filterLevel, filterGrade, filterHomeTown, filterActive, filterNumberOfRounds, filterMentoring, filterHandledBy, showArchived]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

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

      // Fetch volunteers for this program
      const volunteersRes = await fetch(`/api/users/by-role?role=volunteer&programId=${programId}&includeArchived=true`);
      if (volunteersRes.ok) {
        const data = await volunteersRes.json();
        const volsList = data.users || [];
        setVolunteers(volsList);

        const handlerIds = new Set<string>();
        volsList.forEach((v: Volunteer) => {
          if (v.handledBy && v.handledBy !== 'unassigned') handlerIds.add(v.handledBy);
          if (v.registeredBy && v.registeredBy !== 'unassigned') handlerIds.add(v.registeredBy);
        });

        const namesMap: { [key: string]: string } = {};
        await Promise.all(
          Array.from(handlerIds).map(async (id) => {
            try {
              const res = await fetch(`/api/users/${id}`);
              if (res.ok) {
                const uData = await res.json();
                namesMap[id] = uData.user.name;
              }
            } catch (err) {
              console.error(err);
            }
          })
        );
        setHandlerNames(namesMap);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...volunteers];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone?.includes(searchTerm)
      );
    }

    // Gender filter
    if (filterGender) {
      filtered = filtered.filter(v => v.gender === filterGender);
    }

    // Level filter
    if (filterLevel) {
      const levelNum = parseInt(filterLevel);
      filtered = filtered.filter(v => {
        if (v.level === undefined || v.level === null) return false;
        // Handle both string and number types
        return parseInt(String(v.level)) === levelNum;
      });
    }

    // Grade filter
    if (filterGrade) {
      filtered = filtered.filter(v => v.grade === filterGrade);
    }

    // HomeTown filter
    if (filterHomeTown) {
      filtered = filtered.filter(v =>
        v.homeTown?.toLowerCase().includes(filterHomeTown.toLowerCase())
      );
    }

    // Active status / Archived split
    filtered = filtered.filter(v => showArchived ? v.isArchived === true : !v.isArchived);

    // Active status filter (if manually chosen inside active view)
    if (filterActive && !showArchived) {
      const isActive = filterActive === "active";
      filtered = filtered.filter(v => v.isActive === isActive);
    }

    // Number of Rounds filter
    if (filterNumberOfRounds) {
      filtered = filtered.filter(v => v.numberOfRounds === parseInt(filterNumberOfRounds));
    }

    // Mentoring filter
    if (filterMentoring !== "") {
      const menteeNum = parseInt(filterMentoring);
      filtered = filtered.filter(v => (v.participantsUnder || 0) === menteeNum);
    }

    // Handled By filter
    if (filterHandledBy) {
      if (filterHandledBy === "unassigned") {
        filtered = filtered.filter(v => !v.handledBy || v.handledBy === "");
      } else {
        filtered = filtered.filter(v => v.handledBy === filterHandledBy);
      }
    }

    setFilteredVolunteers(filtered);
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
    setFilterMentoring("");
    setFilterHandledBy("");
  };

  const handleDeleteVolunteer = async (volunteerId: string, volunteerName: string, isPermanent = false) => {
    const promptMsg = isPermanent
      ? `Are you sure you want to PERMANENTLY delete ${volunteerName}? This action cannot be undone.`
      : `Are you sure you want to move ${volunteerName} to archived list?`;
    const confirmed = await showConfirm({ title: isPermanent ? "Permanently Delete" : "Archive Volunteer", message: promptMsg, type: "danger", confirmText: isPermanent ? "Permanently Delete" : "Archive" });
    if (!confirmed) {
      return;
    }

    try {
      const url = isPermanent ? `/api/users/${volunteerId}?permanent=true` : `/api/users/${volunteerId}`;
      const res = await fetch(url, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: isPermanent ? 'Volunteer permanently deleted!' : 'Volunteer archived successfully!' });
        fetchData(); // Refresh the list
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed action' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error deleting volunteer:", error);
      setMessage({ type: 'error', text: 'Error executing action' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleBulkDeleteVolunteers = async (isPermanent = false) => {
    if (selectedVolunteers.length === 0) return;
    const toDelete = selectedVolunteers.filter(id => id !== currentUserId);
    if (toDelete.length === 0) {
      await showAlert({ title: "Cannot Delete", message: "You cannot delete your own record.", type: "warning" });
      return;
    }
    const promptMsg = isPermanent
      ? `Are you sure you want to PERMANENTLY delete ${toDelete.length} selected volunteer(s)? This action cannot be undone.`
      : `Are you sure you want to move ${toDelete.length} selected volunteer(s) to archived list?`;
    const confirmed = await showConfirm({ title: isPermanent ? "Permanently Delete" : "Archive Volunteers", message: promptMsg, type: "danger", confirmText: isPermanent ? "Permanently Delete" : "Archive" });
    if (!confirmed) return;

    try {
      await Promise.all(
        toDelete.map(id => {
          const url = isPermanent ? `/api/users/${id}?permanent=true` : `/api/users/${id}`;
          return fetch(url, { method: 'DELETE' });
        })
      );
      setMessage({ type: 'success', text: isPermanent ? `${toDelete.length} volunteer(s) permanently deleted!` : `${toDelete.length} volunteer(s) archived successfully!` });
      setSelectedVolunteers([]);
      fetchData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error in bulk delete:", error);
      setMessage({ type: 'error', text: 'Error executing bulk action' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleUnarchiveVolunteer = async (volunteerId: string, volunteerName: string) => {
    const confirmed = await showConfirm({ title: "Unarchive Volunteer", message: `Are you sure you want to unarchive ${volunteerName}?`, type: "info", confirmText: "Unarchive" });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/users/${volunteerId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Volunteer unarchived successfully!' });
        fetchData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed action' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error unarchiving volunteer:", error);
      setMessage({ type: 'error', text: 'Error executing action' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleBulkUnarchiveVolunteers = async () => {
    const confirmed = await showConfirm({ title: "Unarchive Volunteers", message: `Are you sure you want to unarchive ${selectedVolunteers.length} selected volunteer(s)?`, type: "info", confirmText: "Unarchive All" });
    if (!confirmed) return;
    try {
      const res = await fetch("/api/volunteers/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerIds: selectedVolunteers, updates: { isArchived: false } }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Volunteers unarchived successfully!' });
        setSelectedVolunteers([]);
        fetchData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed action' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error bulk unarchiving volunteers:", error);
      setMessage({ type: 'error', text: 'Error executing action' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleAddVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/volunteers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newVolunteer,
          programs: [programId]
        }),
      });

      const data = await res.json();

      if (res.status === 202) {
        setMessage({ type: 'success', text: data.message || 'Volunteer request sent to program admin for approval.' });
        setToast({ type: 'success', text: data.message || 'Volunteer request sent to program admin for approval.' });
        setShowAddModal(false);
        setNewVolunteer({
          name: "",
          email: "",
          phone: "",
          profession: "",
          homeTown: "",
          address: "",
          gender: "",
          connectedToTemple: "",
          numberOfRounds: 0,
          level: "",
          grade: "",
          maritalStatus: "",
        });
        setTimeout(() => setMessage(null), 4000);
      } else if (res.ok) {
        setMessage({ type: 'success', text: 'Volunteer added successfully!' });
        setToast({ type: 'success', text: 'Volunteer added successfully!' });
        setShowAddModal(false);
        setNewVolunteer({
          name: "",
          email: "",
          phone: "",
          profession: "",
          homeTown: "",
          address: "",
          gender: "",
          connectedToTemple: "",
          numberOfRounds: 0,
          level: "",
          grade: "",
          maritalStatus: "",
        });
        fetchData(); // Refresh the list
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add volunteer' });
        setToast({ type: 'error', text: data.error || 'Failed to add volunteer' });
      }
    } catch (error) {
      console.error("Error adding volunteer:", error);
      setMessage({ type: 'error', text: 'Error adding volunteer' });
      setToast({ type: 'error', text: 'Error adding volunteer' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setNewVolunteer(prev => ({
      ...prev,
      [name]: type === 'number' ? (value !== "" ? parseInt(value) : "") : value
    }));
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
  const totalPages = Math.max(1, Math.ceil(filteredVolunteers.length / itemsPerPage));
  const paginatedVolunteers = filteredVolunteers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDownloadCSV = async () => {
    if (filteredVolunteers.length === 0) {
      await showAlert({ title: "No Data", message: "No data available to download.", type: "info" });
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

    const rows = filteredVolunteers.map(v => {
      const mentorName = v.handledBy && v.handledBy !== 'unassigned'
        ? (handlerNames[v.handledBy] || volunteers.find(vol => vol._id === v.handledBy)?.name || 'N/A')
        : 'N/A';
      const dob = v.dateOfBirth ? new Date(v.dateOfBirth).toLocaleDateString() : '';
      const created = v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '';

      return [
        `"${(v.name || '').replace(/"/g, '""')}"`,
        `"${(v.email || '').replace(/"/g, '""')}"`,
        `"${(v.phone || '').replace(/"/g, '""')}"`,
        `"${(v.role || '').replace(/"/g, '""')}"`,
        `"${(v.profession || '').replace(/"/g, '""')}"`,
        `"${(v.homeTown || '').replace(/"/g, '""')}"`,
        `"${(v.connectedToTemple || '').replace(/"/g, '""')}"`,
        `"${(v.gender || '').replace(/"/g, '""')}"`,
        `"${dob}"`,
        `"${(v.address || '').replace(/"/g, '""')}"`,
        `"${v.level !== undefined ? v.level : ''}"`,
        `"${(v.grade || '').replace(/"/g, '""')}"`,
        `"${v.numberOfRounds !== undefined ? v.numberOfRounds : ''}"`,
        `"${mentorName.replace(/"/g, '""')}"`,
        `"${v.isActive ? 'Active' : 'Inactive'}"`,
        `"${v.isArchived ? 'Archived' : 'Not Archived'}"`,
        `"${created}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = showArchived ? "archived_volunteers.csv" : "volunteers_list.csv";
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

      {toast && (
        <div className={`fixed top-24 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.text}
        </div>
      )}

      <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Volunteers</h1>
              {program && (
                <p className="text-sm sm:text-base text-gray-600 mt-1">Program: {program.name}</p>
              )}
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
              <button
                onClick={handleDownloadCSV}
                className="flex-1 sm:flex-none flex items-center justify-center cursor-pointer gap-2 px-3 sm:px-4 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white font-bold rounded-lg transition-colors text-sm sm:text-base shadow"
              >
                <Download size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Download Data</span>
                <span className="sm:hidden">CSV</span>
              </button>
              {currentUserRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 font-bold cursor-pointer rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base shadow ${showArchived ? 'bg-gray-800 text-white' : 'bg-[#A65353] text-white hover:bg-[#8e4545]'
                    }`}
                >
                  <Archive size={18} className="sm:w-5 sm:h-5" />
                  <span>{showArchived ? 'Active List' : `Archived (${volunteers.filter(v => v.isArchived).length})`}</span>
                </button>
              )}
              {(!showArchived && (currentUserRole === 'admin' || currentUserRole === 'volunteer')) && (
                <button
                  onClick={() => {
                    console.log("Add Volunteer clicked");
                    setShowAddModal(true);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center cursor-pointer gap-2 px-3 sm:px-4 py-2 bg-[#A65353] text-white rounded-lg transition-colors text-sm sm:text-base"
                >
                  <UserPlus size={18} className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Add Volunteer</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
              <button
                onClick={() => router.back()}
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
              {(searchTerm || filterGender || filterLevel || filterGrade || filterHomeTown || filterActive || filterNumberOfRounds || filterMentoring !== "" || filterHandledBy !== "") && (
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Mentoring</label>
                <select
                  value={filterMentoring}
                  onChange={(e) => setFilterMentoring(e.target.value)}
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
                    const volMenteesCount = volunteers.filter(v => v.handledBy === vol._id).length;
                    const totalMentees = (vol.participantsUnder || 0) + volMenteesCount;
                    return (
                      <option key={vol._id} value={vol._id}>
                        {vol.name} (Level: {vol.level || 'N/A'}, {totalMentees} mentees)
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
            Showing {filteredVolunteers.length === 0 ? 0 : (currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredVolunteers.length)} of {filteredVolunteers.length} volunteers
          </div>
          {(currentUserRole === 'admin' || currentUserRole === 'volunteer') && (() => {
            const selectableVisible = paginatedVolunteers.filter(v => currentUserRole === 'admin' || v.handledBy === currentUserId || v._id === currentUserId);
            const allSelected = selectableVisible.length > 0 && selectableVisible.every(v => selectedVolunteers.includes(v._id));
            return (
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {selectedVolunteers.length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-semibold text-xs sm:text-sm whitespace-nowrap bg-[#A65353] text-white px-2.5 py-1.5 rounded-lg shadow-sm">
                      {selectedVolunteers.length} Selected
                    </span>
                    {!showArchived && (
                      <button
                        onClick={() => setShowBulkEditModal(true)}
                        className="px-3 py-1.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-sm"
                      >
                        Bulk Edit Fields
                      </button>
                    )}
                    {!showArchived && currentUserRole === 'admin' && (
                      <button
                        onClick={() => setShowBulkAssignModal(true)}
                        className="px-3 py-1.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-sm"
                      >
                        Bulk Assign Mentor
                      </button>
                    )}
                    {!showArchived && (
                      <button
                        onClick={() => handleBulkDeleteVolunteers(false)}
                        className="px-3 py-1.5 bg-[#A65353] hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete ({selectedVolunteers.length})
                      </button>
                    )}
                    {showArchived && currentUserRole === 'admin' && (
                      <>
                        <button
                          onClick={handleBulkUnarchiveVolunteers}
                          className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Unarchive
                        </button>
                        <button
                          onClick={() => handleBulkDeleteVolunteers(true)}
                          className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Permanently Delete ({selectedVolunteers.length})
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedVolunteers([])}
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
                        const newSet = new Set([...selectedVolunteers, ...selectableVisible.map(v => v._id)]);
                        setSelectedVolunteers(Array.from(newSet));
                      } else {
                        const visibleIds = new Set(selectableVisible.map(v => v._id));
                        setSelectedVolunteers(selectedVolunteers.filter(id => !visibleIds.has(id)));
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

        {/* Volunteers List */}
        <div className="space-y-2">
          {paginatedVolunteers.map((volunteer) => (
            <div
              key={volunteer._id}
              className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 overflow-hidden"
            >
              {/* Main Row */}
              <div
                onClick={() => setExpandedVolunteer(
                  expandedVolunteer.includes(volunteer._id)
                    ? expandedVolunteer.filter(id => id !== volunteer._id)
                    : [...expandedVolunteer, volunteer._id]
                )}
                className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 hover:bg-yellow-100 transition-colors gap-2 sm:gap-4 cursor-pointer"
              >
                {/* Top Header Row on mobile / Left group on desktop */}
                <div className="flex items-center justify-between gap-2 w-full xl:w-auto min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 xl:flex-initial">
                    {(currentUserRole === 'admin' || currentUserRole === 'volunteer') && (() => {
                      const canSelect = currentUserRole === 'admin' || volunteer.handledBy === currentUserId || volunteer._id === currentUserId;
                      return (
                        <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            disabled={!canSelect}
                            checked={selectedVolunteers.includes(volunteer._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVolunteers([...selectedVolunteers, volunteer._id]);
                              } else {
                                setSelectedVolunteers(selectedVolunteers.filter(id => id !== volunteer._id));
                              }
                            }}
                            title={!canSelect ? "You can only select volunteers you mentor or yourself" : "Select volunteer"}
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
                            router.push(`/programs/${programId}/volunteers/${volunteer._id}`);
                          }}
                          className="hover:underline cursor-pointer text-left w-full truncate block"
                        >
                          {volunteer.name}
                        </button>
                      </h3>
                    </div>
                  </div>

                  {/* Expand Button for mobile */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedVolunteer(
                        expandedVolunteer.includes(volunteer._id)
                          ? expandedVolunteer.filter(id => id !== volunteer._id)
                          : [...expandedVolunteer, volunteer._id]
                      );
                    }}
                    className="xl:hidden p-1.5 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                  >
                    <ChevronDown
                      size={18}
                      className={`transform transition-transform ${expandedVolunteer.includes(volunteer._id) ? 'rotate-180' : ''
                        }`}
                    />
                  </button>
                </div>

                {/* Right Side Stats Group (Wraps cleanly on mobile) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-700 xl:ml-auto mr-1 sm:mr-2 pl-6 sm:pl-0">
                  {/* Contact Icons */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {volunteer.phone && (
                      <>
                        <a
                          href={`https://wa.me/${volunteer.phone.replace(/\D/g, '')}`}
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
                          href={`tel:${volunteer.phone}`}
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
                    {volunteer.phone || 'N/A'}
                  </div>

                  {/* Level */}
                  <div className="xl:w-24 flex-shrink-0">
                    <span className="text-gray-500 xl:hidden">Level: </span>{volunteer.level ? (String(volunteer.level).startsWith('Level') ? volunteer.level : `Level ${volunteer.level}`) : 'N/A'}
                  </div>

                  {/* Grade */}
                  <div className="xl:w-24 flex-shrink-0">
                    <span className="text-gray-500 xl:hidden">Grade: </span>{volunteer.grade || 'N/A'}
                  </div>

                  {/* Mentoring / Participants Under */}
                  <div className="font-medium text-[#A65353] xl:w-44 flex-shrink-0 truncate">
                    Mentoring: {volunteer.participantsUnder || 0}
                  </div>
                </div>

                {/* Expand Button for desktop */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedVolunteer(
                      expandedVolunteer.includes(volunteer._id)
                        ? expandedVolunteer.filter(id => id !== volunteer._id)
                        : [...expandedVolunteer, volunteer._id]
                    );
                  }}
                  className="hidden xl:block p-1.5 sm:p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 ml-1"
                >
                  <ChevronDown
                    size={18}
                    className={`transform transition-transform ${expandedVolunteer.includes(volunteer._id) ? 'rotate-180' : ''
                      }`}
                  />
                </button>
              </div>

              {/* Expanded Details */}
              {expandedVolunteer.includes(volunteer._id) && (
                <div className="border-t border-yellow-300 bg-yellow-50 px-4 sm:px-6 py-3 sm:py-4">
                  <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                    The Details Review of Volunteer:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Profession:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{volunteer.profession || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Home Town:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{volunteer.homeTown || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Email:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800 break-all">{volunteer.email}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Gender:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{volunteer.gender || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Connected to Temple:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{volunteer.connectedToTemple || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Number of Rounds:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{volunteer.numberOfRounds || 0}</span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Mentor:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">
                        {volunteer.handledBy && volunteer.handledBy !== 'unassigned' ? (handlerNames[volunteer.handledBy] || volunteers.find(v => v._id === volunteer.handledBy)?.name || 'N/A') : 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Registered By:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">
                        {volunteer.registeredBy || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
                    <button
                      onClick={() => router.push(`/programs/${programId}/volunteers/${volunteer._id}`)}
                      className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                    >
                      Overview
                    </button>
                    {(currentUserRole === 'admin' || volunteer.handledBy === currentUserId || volunteer._id === currentUserId) && (
                      <button
                        onClick={() => router.push(`/programs/${programId}/volunteers/${volunteer._id}?edit=true`)}
                        className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                      >
                        Edit
                      </button>
                    )}
                    {showArchived ? (
                      currentUserRole === 'admin' && (
                        <>
                          <button
                            onClick={() => handleUnarchiveVolunteer(volunteer._id, volunteer.name)}
                            className="flex-1 px-4 sm:px-6 py-2 bg-green-700 hover:bg-green-800 text-white cursor-pointer rounded transition-colors text-sm sm:text-base font-bold"
                          >
                            Unarchive
                          </button>
                          <button
                            onClick={() => handleDeleteVolunteer(volunteer._id, volunteer.name, true)}
                            className="flex-1 px-4 sm:px-6 py-2 bg-red-700 hover:bg-red-800 text-white cursor-pointer rounded transition-colors text-sm sm:text-base font-bold"
                          >
                            Permanently Delete
                          </button>
                        </>
                      )
                    ) : (
                      (volunteer._id !== currentUserId && (currentUserRole === 'admin' || volunteer.handledBy === currentUserId)) && (
                        <button
                          onClick={() => handleDeleteVolunteer(volunteer._id, volunteer.name, false)}
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

        {filteredVolunteers.length === 0 && (
          <div className="text-center py-8 sm:py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 text-base sm:text-lg">No volunteers found</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </main>

      {/* Add Volunteer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Add New Volunteer</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setMessage(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddVolunteer} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newVolunteer.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newVolunteer.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={newVolunteer.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={newVolunteer.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Profession */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profession *
                  </label>
                  <input
                    type="text"
                    name="profession"
                    value={newVolunteer.profession}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Home Town */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home Town *
                  </label>
                  <input
                    type="text"
                    name="homeTown"
                    value={newVolunteer.homeTown}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Connected to Temple */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connected to Temple *
                  </label>
                  <input
                    type="text"
                    name="connectedToTemple"
                    value={newVolunteer.connectedToTemple}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marital Status *
                  </label>
                  <select
                    name="maritalStatus"
                    value={newVolunteer.maritalStatus}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                {/* Number of Rounds */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Rounds *
                  </label>
                  <input
                    type="number"
                    name="numberOfRounds"
                    value={newVolunteer.numberOfRounds}
                    onChange={handleInputChange}
                    min="0"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level (Spiritual Education) *
                  </label>
                  <select
                    name="level"
                    value={newVolunteer.level}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Level</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade *
                  </label>
                  <select
                    name="grade"
                    value={newVolunteer.grade}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Grade</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={newVolunteer.address}
                    onChange={handleInputChange}
                    rows={3}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Modal Message */}
              {message && (
                <div className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {message.text}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setMessage(null);
                  }}
                  className="px-4 sm:px-6 py-2.5 sm:py-2 border cursor-pointer border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 sm:px-6 py-2.5 sm:py-2 bg-[#A65353] text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Add Volunteer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-100 text-gray-800">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Bulk Edit Volunteer Fields</h3>
              <button onClick={() => setShowBulkEditModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleBulkEditSubmit} className="space-y-4">
              <p className="text-sm text-gray-500 mb-4 bg-yellow-50 p-3 rounded-xl border border-yellow-200 font-medium">
                Check the box next to any field you want to modify across all <strong>{selectedVolunteers.length}</strong> selected volunteer(s).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Level */}
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <input type="checkbox" checked={bulkEditFields.level || false} onChange={e => setBulkEditFields({ ...bulkEditFields, level: e.target.checked })} className="mt-1 w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] cursor-pointer" />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700">Level</label>
                    <select disabled={!bulkEditFields.level} value={bulkEditValues.level} onChange={e => setBulkEditValues({ ...bulkEditValues, level: e.target.value })} className="mt-1 w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50">
                      <option value="">Select Level</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>
                </div>

                {/* Grade */}
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <input type="checkbox" checked={bulkEditFields.grade || false} onChange={e => setBulkEditFields({ ...bulkEditFields, grade: e.target.checked })} className="mt-1 w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] cursor-pointer" />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700">Grade</label>
                    <select disabled={!bulkEditFields.grade} value={bulkEditValues.grade} onChange={e => setBulkEditValues({ ...bulkEditValues, grade: e.target.value })} className="mt-1 w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50">
                      <option value="">Select Grade</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </div>

                {/* Number of Rounds */}
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <input type="checkbox" checked={bulkEditFields.numberOfRounds || false} onChange={e => setBulkEditFields({ ...bulkEditFields, numberOfRounds: e.target.checked })} className="mt-1 w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] cursor-pointer" />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700">Number of Rounds</label>
                    <input type="number" min="0" disabled={!bulkEditFields.numberOfRounds} value={bulkEditValues.numberOfRounds} onChange={e => setBulkEditValues({ ...bulkEditValues, numberOfRounds: e.target.value })} placeholder="e.g. 16" className="mt-1 w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50" />
                  </div>
                </div>



                {/* Gender */}
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <input type="checkbox" checked={bulkEditFields.gender || false} onChange={e => setBulkEditFields({ ...bulkEditFields, gender: e.target.checked })} className="mt-1 w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] cursor-pointer" />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700">Gender</label>
                    <select disabled={!bulkEditFields.gender} value={bulkEditValues.gender} onChange={e => setBulkEditValues({ ...bulkEditValues, gender: e.target.value })} className="mt-1 w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50">
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                {/* Marital Status */}
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <input type="checkbox" checked={bulkEditFields.maritalStatus || false} onChange={e => setBulkEditFields({ ...bulkEditFields, maritalStatus: e.target.checked })} className="mt-1 w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] cursor-pointer" />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700">Marital Status</label>
                    <select disabled={!bulkEditFields.maritalStatus} value={bulkEditValues.maritalStatus} onChange={e => setBulkEditValues({ ...bulkEditValues, maritalStatus: e.target.value })} className="mt-1 w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50">
                      <option value="">Select Marital Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </div>

                {/* Profession */}
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <input type="checkbox" checked={bulkEditFields.profession || false} onChange={e => setBulkEditFields({ ...bulkEditFields, profession: e.target.checked })} className="mt-1 w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] cursor-pointer" />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700">Profession</label>
                    <input type="text" disabled={!bulkEditFields.profession} value={bulkEditValues.profession} onChange={e => setBulkEditValues({ ...bulkEditValues, profession: e.target.value })} placeholder="Enter profession" className="mt-1 w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50" />
                  </div>
                </div>

                {/* Home Town */}
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <input type="checkbox" checked={bulkEditFields.homeTown || false} onChange={e => setBulkEditFields({ ...bulkEditFields, homeTown: e.target.checked })} className="mt-1 w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] cursor-pointer" />
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700">Home Town</label>
                    <input type="text" disabled={!bulkEditFields.homeTown} value={bulkEditValues.homeTown} onChange={e => setBulkEditValues({ ...bulkEditValues, homeTown: e.target.value })} placeholder="Enter hometown" className="mt-1 w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowBulkEditModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={bulkUpdating} className="px-5 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg font-medium shadow transition-all cursor-pointer disabled:opacity-50">
                  {bulkUpdating ? "Saving..." : "Apply Bulk Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Mentor Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100 text-gray-800">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Bulk Assign Mentor</h3>
              <button onClick={() => setShowBulkAssignModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleBulkAssignSubmit} className="space-y-4">
              <p className="text-sm text-gray-500 bg-yellow-50 p-3 rounded-xl border border-yellow-200 font-medium">
                Select a senior volunteer to assign as mentor for <strong>{selectedVolunteers.length}</strong> selected volunteer(s).
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Assign Mentor Volunteer</label>
                <select value={bulkAssignMentorId} onChange={e => setBulkAssignMentorId(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#A65353]">
                  <option value="">-- Unassigned --</option>
                  {volunteers.map(vol => {
                    const volMenteesCount = volunteers.filter(v => v.handledBy === vol._id).length;
                    const totalMentees = (vol.participantsUnder || 0) + volMenteesCount;
                    return (
                      <option key={vol._id} value={vol._id}>
                        {vol.name} (Level: {vol.level || 'N/A'}, {totalMentees} mentees)
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowBulkAssignModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={bulkUpdating} className="px-5 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg font-medium shadow transition-all cursor-pointer disabled:opacity-50">
                  {bulkUpdating ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
