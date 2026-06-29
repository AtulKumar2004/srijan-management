"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Filter, X, ChevronDown, Phone } from "lucide-react";
import { useModalStore } from "@/store/modalStore";

interface Guest {
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
  numberOfRounds?: number;
  isActive?: boolean;
  createdAt: Date;
}

export default function GuestsPage() {
  const router = useRouter();
  const { showConfirm, showAlert } = useModalStore();
  
  const [guests, setGuests] = useState<Guest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedGuest, setExpandedGuest] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [programs, setPrograms] = useState<{ _id: string; name: string; temple?: string }[]>([]);
  
  // Bulk edit states
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [bulkEditFields, setBulkEditFields] = useState<Record<string, boolean>>({});
  const [bulkEditValues, setBulkEditValues] = useState<{
    role: string;
    programId: string;
    level: string;
    grade: string;
    numberOfRounds: string;
    isActive: string;
    gender: string;
    profession: string;
    homeTown: string;
    connectedToTemple: string;
    maritalStatus: string;
  }>({
    role: "participant",
    programId: "",
    level: "",
    grade: "",
    numberOfRounds: "",
    isActive: "true",
    gender: "",
    profession: "",
    homeTown: "",
    connectedToTemple: "",
    maritalStatus: ""
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterHomeTown, setFilterHomeTown] = useState("");
  const [filterActive, setFilterActive] = useState("");

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [guests, searchTerm, filterGender, filterHomeTown, filterActive]);

  const checkAuthAndFetchData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (!authRes.ok) {
        router.push("/login");
        return;
      }

      const authData = await authRes.json();
      if (!authData.user || authData.user.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      setCurrentUser(authData.user);
      await fetchGuests();
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    }
  };

  const fetchGuests = async () => {
    try {
      const [guestsRes, progRes] = await Promise.all([
        fetch(`/api/users/by-role?role=guest`),
        fetch(`/api/programs/all`)
      ]);
      if (guestsRes.ok) {
        const data = await guestsRes.json();
        setGuests(data.users || []);
      }
      if (progRes.ok) {
        const progData = await progRes.json();
        setPrograms(progData.programs || []);
      }
    } catch (error) {
      console.error("Error fetching guests or programs:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...guests];

    if (searchTerm) {
      filtered = filtered.filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.phone?.includes(searchTerm)
      );
    }

    if (filterGender) {
      filtered = filtered.filter(g => g.gender === filterGender);
    }

    if (filterHomeTown) {
      filtered = filtered.filter(g => 
        g.homeTown?.toLowerCase().includes(filterHomeTown.toLowerCase())
      );
    }

    if (filterActive) {
      const isActive = filterActive === "active";
      filtered = filtered.filter(g => g.isActive === isActive);
    }

    setFilteredGuests(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterGender("");
    setFilterHomeTown("");
    setFilterActive("");
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkUpdating(true);
    setMessage(null);

    try {
      if (bulkEditFields.role && (bulkEditValues.role === 'participant' || bulkEditValues.role === 'volunteer') && !bulkEditValues.programId) {
        setMessage({ type: 'error', text: 'Please select a program for the participant/volunteer to join.' });
        setBulkUpdating(false);
        return;
      }

      const updates: any = {};
      if (bulkEditFields.role) {
        updates.role = bulkEditValues.role;
        if (bulkEditValues.programId) {
          updates.programId = bulkEditValues.programId;
          if (bulkEditValues.role === 'participant') {
            updates.level = 1;
            updates.grade = 'N/A';
          } else if (bulkEditValues.role === 'volunteer') {
            updates.level = 1;
            updates.grade = 'D';
          }
        }
      }
      if (bulkEditFields.level && !updates.level) updates.level = bulkEditValues.level;
      if (bulkEditFields.grade && !updates.grade) updates.grade = bulkEditValues.grade;
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

      const res = await fetch('/api/guests/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestIds: selectedGuests,
          updates
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Guests updated successfully!' });
        setShowBulkEditModal(false);
        setSelectedGuests([]);
        setBulkEditFields({});
        fetchGuests();
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update guests' });
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

  const handleDeleteGuest = async (guestId: string, guestName: string) => {
    const confirmed = await showConfirm({
      title: "Delete Guest",
      message: `Are you sure you want to delete ${guestName}? This action will permanently remove their guest profile.`,
      type: "danger",
      confirmText: "Delete Guest"
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/users/${guestId}?permanent=true`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Guest deleted successfully!' });
        setExpandedGuest(expandedGuest.filter(id => id !== guestId));
        fetchGuests();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        await showAlert({ title: "Delete Failed", message: data.error || 'Failed to delete guest', type: "danger" });
      }
    } catch (error) {
      console.error("Error deleting guest:", error);
      await showAlert({ title: "Error", message: 'Error executing action', type: "danger" });
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

  return (
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundImage: 'url(/backgrou.png)', 
      backgroundSize: '25%', 
      backgroundRepeat: 'repeat' 
    }}>
      <Header />
      
      {message && (
        <div className={`container mx-auto px-4 mt-4 max-w-7xl`}>
          <div className={`p-4 rounded-lg shadow font-medium ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">All Guests</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage all guests</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <Filter size={18} />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Home Town</label>
                  <input
                    type="text"
                    value={filterHomeTown}
                    onChange={(e) => setFilterHomeTown(e.target.value)}
                    placeholder="Filter by town..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={filteredGuests.length > 0 && filteredGuests.every(g => selectedGuests.includes(g._id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    const newSet = new Set([...selectedGuests, ...filteredGuests.map(g => g._id)]);
                    setSelectedGuests(Array.from(newSet));
                  } else {
                    const visibleIds = new Set(filteredGuests.map(g => g._id));
                    setSelectedGuests(selectedGuests.filter(id => !visibleIds.has(id)));
                  }
                }}
                className="w-5 h-5 text-[#A65353] rounded focus:ring-[#A65353] cursor-pointer"
              />
              <h2 className="text-lg font-semibold text-gray-800">
                {filteredGuests.length} Guest{filteredGuests.length !== 1 ? 's' : ''}
              </h2>
            </div>

            {selectedGuests.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-xs sm:text-sm bg-[#A65353] text-white px-2.5 py-1.5 rounded-lg shadow-sm">
                  {selectedGuests.length} Selected
                </span>
                <button
                  onClick={() => setShowBulkEditModal(true)}
                  className="px-3 py-1.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-sm"
                >
                  Bulk Edit Fields
                </button>
              </div>
            )}
          </div>

          {filteredGuests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No guests found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGuests.map((guest, index) => (
                <div
                  key={guest._id}
                  className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 overflow-hidden"
                >
                  {/* Main Row */}
                  <div 
                    onClick={() => setExpandedGuest(
                      expandedGuest.includes(guest._id)
                        ? expandedGuest.filter(id => id !== guest._id)
                        : [...expandedGuest, guest._id]
                    )}
                    className="flex flex-col sm:flex-row items-start sm:items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-yellow-100 transition-colors gap-3 sm:gap-8 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <input
                        type="checkbox"
                        checked={selectedGuests.includes(guest._id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedGuests([...selectedGuests, guest._id]);
                          } else {
                            setSelectedGuests(selectedGuests.filter(id => id !== guest._id));
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-[#A65353] rounded focus:ring-[#A65353] cursor-pointer flex-shrink-0"
                      />
                      {/* Name */}
                      <div className="w-full sm:w-48 lg:w-56">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                          {guest.name}
                        </h3>
                      </div>
                    </div>
                    
                    {/* Contact Icons */}
                    <div className="flex items-center gap-6 flex-shrink-0 sm:ml-96">
                      {guest.phone && (
                        <>
                          <a
                            href={`https://wa.me/${guest.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </a>
                          <a
                            href={`tel:${guest.phone}`}
                            className="text-red-600 hover:text-red-700 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={18} />
                          </a>
                        </>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="text-gray-700 font-medium text-sm w-32 flex-shrink-0">
                      {guest.phone || 'N/A'}
                    </div>

                    {/* Level */}
                    <div className="text-gray-700 text-sm w-24 flex-shrink-0">
                      Level N/A
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                        guest.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {guest.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Expand Button */}
                    <button
                      onClick={() => setExpandedGuest(
                        expandedGuest.includes(guest._id)
                          ? expandedGuest.filter(id => id !== guest._id)
                          : [...expandedGuest, guest._id]
                      )}
                      className="p-1.5 sm:p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 ml-auto"
                    >
                      <ChevronDown 
                        size={18} 
                        className={`transform transition-transform ${
                          expandedGuest.includes(guest._id) ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedGuest.includes(guest._id) && (
                    <>
                      <div className="border-t border-yellow-300 bg-yellow-50 px-4 sm:px-6 py-3 sm:py-4">
                        <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                          The Details Review of Guest:
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Profession:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{guest.profession || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Home Town:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{guest.homeTown || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Email:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800 break-all">{guest.email}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Gender:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{guest.gender || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Connected to Temple:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{guest.connectedToTemple || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Number of Rounds:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{guest.numberOfRounds || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/guests/${guest._id}`);
                            }}
                            className="px-3 sm:px-4 py-2 sm:py-3 bg-[#A65353] hover:bg-[#8B4545] text-white rounded-lg transition-colors font-medium text-xs sm:text-base"
                          >
                            Overview
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/guests/${guest._id}?edit=true`);
                            }}
                            className="px-3 sm:px-4 py-2 sm:py-3 bg-[#A65353] hover:bg-[#8B4545] text-white rounded-lg transition-colors font-medium text-xs sm:text-base"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGuest(guest._id, guest.name);
                            }}
                            className="px-3 sm:px-4 py-2 sm:py-3 bg-[#A65353] hover:bg-[#8B4545] text-white rounded-lg transition-colors font-medium text-xs sm:text-base"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bulk Edit Fields Modal */}
        {showBulkEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Bulk Edit Fields</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Updating {selectedGuests.length} selected guest(s). Check the box beside any field you want to update.
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
                    {/* Role */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.role}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, role: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Role</span>
                      </label>
                      <select
                        disabled={!bulkEditFields.role}
                        value={bulkEditValues.role}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, role: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="participant">Participant</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="guest">Guest</option>
                        <option value="admin">Admin</option>
                      </select>

                      {bulkEditFields.role && (bulkEditValues.role === 'participant' || bulkEditValues.role === 'volunteer') && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <label className="block text-xs font-semibold text-red-600 mb-1">
                            Select Program to Join *
                          </label>
                          <select
                            value={bulkEditValues.programId}
                            onChange={(e) => setBulkEditValues({ ...bulkEditValues, programId: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border border-red-300 rounded-md bg-red-50 focus:ring-red-500"
                            required
                          >
                            <option value="">-- Select Program --</option>
                            {programs.map(prog => (
                              <option key={prog._id} value={prog._id}>
                                {prog.name} {prog.temple ? `(${prog.temple})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

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
                      >
                      </input>
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
                      >
                      </input>
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
                      >
                      </input>
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
      </main>

      <Footer />
    </div>
  );
}
