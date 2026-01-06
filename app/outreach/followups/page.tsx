"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, Users, UserPlus, Phone, Filter, ChevronDown, Save, RefreshCw } from "lucide-react";

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

  const [editingFollowUp, setEditingFollowUp] = useState<{
    contactId: string;
    status: string;
    remarks: string;
  } | null>(null);

  const statusOptions = ["Coming", "Not Coming", "May Come", "Not Answered", "Not Called"];

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (adminName) {
      // Reset filters when date changes
      setSelectedVolunteerId(null);
      setFilterStatus("");
      fetchContacts(adminName);
    }
  }, [selectedDate, adminName]);

  const checkAuthAndFetch = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (!authRes.ok) {
        router.push("/login");
        return;
      }

      const authData = await authRes.json();
      if (!authData.user || !["admin", "volunteer"].includes(authData.user.role)) {
        router.push("/dashboard");
        return;
      }

      setCurrentUser(authData.user);

      // If user is admin, use their name. If volunteer, we need to get their admin's name from programs
      let adminNameToUse = "";
      if (authData.user.role === "admin") {
        adminNameToUse = authData.user.name;
        setAdminName(adminNameToUse);
        await fetchContacts(adminNameToUse);
      } else {
        // For volunteers, use their programs array to find their admin
        if (authData.user.programs && authData.user.programs.length > 0) {
          // Get the first program to find the admin
          const programId = authData.user.programs[0];
          const programRes = await fetch(`/api/programs/${programId}`);
          if (programRes.ok) {
            const programData = await programRes.json();
            if (programData.program && programData.program.createdBy) {
              // Get the admin who created this program
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
      
      // Fetch volunteers after currentUser is set
      await fetchVolunteers(adminNameToUse, authData.user);
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    }
  };

  const fetchContacts = async (adminNameParam?: string) => {
    setLoading(true);
    setContacts([]); // Clear old data first
    try {
      const nameToUse = adminNameParam || adminName;
      const response = await fetch(`/api/outreach/followups/by-admin?adminName=${nameToUse}&date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched contacts for date:', selectedDate, 'Count:', data.contacts?.length || 0);
        setContacts(data.contacts || []);
      } else {
        console.error('Failed to fetch contacts:', response.status);
        setContacts([]);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVolunteers = async (adminNameParam?: string, user?: any) => {
    try {
      const userToUse = user || currentUser;
      
      // If user is admin, fetch by admin name. If volunteer, fetch from their programs
      if (userToUse?.role === "admin") {
        const nameToUse = adminNameParam || adminName;
        const response = await fetch(`/api/outreach/followups/volunteers-by-admin?adminName=${nameToUse}`);
        if (response.ok) {
          const data = await response.json();
          setVolunteers(data.volunteers || []);
        }
      } else if (userToUse?.role === "volunteer" && userToUse.programs?.length > 0) {
        // Fetch volunteers from the same programs
        const response = await fetch(`/api/outreach/followups/volunteers-by-programs?programs=${userToUse.programs.join(',')}`);
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
    // Filter by volunteer first
    if (selectedVolunteerId === 'unassigned') {
      if (!contact.assignedVolunteer) {
        // Then apply status filter if set
        if (filterStatus) {
          return contact.followup?.status === filterStatus;
        }
        return true;
      }
      return false;
    } else if (selectedVolunteerId) {
      if (contact.assignedVolunteer?._id === selectedVolunteerId) {
        // Then apply status filter if set
        if (filterStatus) {
          return contact.followup?.status === filterStatus;
        }
        return true;
      }
      return false;
    }
    
    // No volunteer filter selected - apply only status filter if set
    if (filterStatus) {
      return contact.followup?.status === filterStatus;
    }
    return true;
  });

  console.log('Filter state:', { 
    contactsCount: contacts.length, 
    filteredCount: filteredContacts.length,
    selectedVolunteerId,
    filterStatus 
  });

  const stats = {
    total: contacts.length,
    coming: contacts.filter(c => c.followup?.status === "Coming").length,
    notComing: contacts.filter(c => c.followup?.status === "Not Coming").length,
    mayCome: contacts.filter(c => c.followup?.status === "May Come").length,
    notAnswered: contacts.filter(c => c.followup?.status === "Not Answered").length,
    notCalled: contacts.filter(c => c.followup?.status === "Not Called" || !c.followup).length,
  };

  const unassignedCount = contacts.filter(c => !c.assignedVolunteer).length;
  const assignedCount = contacts.filter(c => c.assignedVolunteer).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundImage: 'url(/backgrou.png)', 
      backgroundSize: '25%', 
      backgroundRepeat: 'repeat' 
    }}>
      <Header />
      
      <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
                Outreach Follow-ups
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Manage follow-ups for outreach contacts                {adminName && currentUser?.role === "volunteer" && (
                  <span className="ml-2 text-xs sm:text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Under: {adminName}
                  </span>
                )}              </p>
            </div>
            <button
              onClick={() => router.push('/outreach')}
              className="px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 sm:p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                <Filter className="inline w-4 h-4 mr-1" />
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Create Button */}
            <div className="flex items-end">
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={loading}
                className="w-full px-4 py-2 bg-[#A65353] cursor-pointer text-white rounded-lg hover:bg-[#8B4545] transition-colors font-medium text-sm sm:text-base whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus size={18} />
                Create List
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mt-4 sm:mt-6">
            <div className="bg-gray-100 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-lg sm:text-2xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-green-100 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-800">{stats.coming}</div>
              <div className="text-xs sm:text-sm text-gray-600">Coming</div>
            </div>
            <div className="bg-red-100 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-lg sm:text-2xl font-bold text-red-800">{stats.notComing}</div>
              <div className="text-xs sm:text-sm text-gray-600">Not Coming</div>
            </div>
            <div className="bg-yellow-100 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-lg sm:text-2xl font-bold text-yellow-800">{stats.mayCome}</div>
              <div className="text-xs sm:text-sm text-gray-600">May Come</div>
            </div>
            <div className="bg-orange-100 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-lg sm:text-2xl font-bold text-orange-800">{stats.notAnswered}</div>
              <div className="text-xs sm:text-sm text-gray-600">Not Answered</div>
            </div>
            <div className="bg-blue-100 p-2 sm:p-3 rounded-lg text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-800">{stats.notCalled}</div>
              <div className="text-xs sm:text-sm text-gray-600">Not Called</div>
            </div>
          </div>
        </div>

        {/* Volunteer Filter Cards */}
        {contacts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Filter by Volunteer</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {/* All Volunteers Card */}
              <button
                onClick={() => setSelectedVolunteerId(null)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedVolunteerId === null
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm sm:text-base">All Volunteers</div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">
                      {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {contacts.length}
                  </div>
                </div>
              </button>

              {/* Unassigned Card */}
              {unassignedCount > 0 && (
                <button
                  onClick={() => setSelectedVolunteerId('unassigned')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedVolunteerId === 'unassigned'
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-300 bg-white hover:border-orange-400 hover:bg-orange-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800 text-sm sm:text-base">Unassigned</div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        {unassignedCount} contact{unassignedCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {unassignedCount}
                    </div>
                  </div>
                </button>
              )}

              {/* Individual Volunteer Cards */}
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
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedVolunteerId === volunteer._id
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-sm sm:text-base truncate">
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

        {/* Contacts List */}
        {loading ? (
          <div className="text-center py-8">
            <img src="/mrdanga.png" alt="Loading" className="w-20 h-20 animate-spin mx-auto" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
            <p className="text-gray-600 text-sm sm:text-base">
              No follow-ups found for outreach contacts on {selectedDate}
            </p>
            <p className="text-gray-500 text-xs sm:text-sm mt-2">
              Click "Create List" to generate a follow-up list for this date
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact, index) => (
              <div
                key={contact._id}
                className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                  {/* Main Row */}
                  <div className="flex items-center px-4 sm:px-6 py-3 sm:py-4 gap-3 sm:gap-6 hover:bg-yellow-100 transition-colors">
                    <span className="text-sm sm:text-base font-bold text-gray-600 shrink-0">#{index + 1}</span>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                        <a 
                          href={`/outreach/${contact._id}`}
                          className="hover:underline cursor-pointer"
                        >
                          {contact.name}
                        </a>
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone size={14} className="text-gray-500 shrink-0" />
                        <p className="text-xs sm:text-sm text-gray-600">{contact.phone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-4">
                      {contact.assignedVolunteer && (
                        <div className="hidden sm:block text-sm">
                          <span className="text-gray-600">Volunteer: </span>
                          <span className="font-medium">{contact.assignedVolunteer.name}</span>
                        </div>
                      )}
                      
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        contact.followup?.status === 'Coming' ? 'bg-green-100 text-green-800' :
                        contact.followup?.status === 'Not Coming' ? 'bg-red-100 text-red-800' :
                        contact.followup?.status === 'May Come' ? 'bg-yellow-100 text-yellow-800' :
                        contact.followup?.status === 'Not Answered' ? 'bg-orange-100 text-orange-800' :
                        contact.followup?.status === 'Not Called' || !contact.followup ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {contact.followup?.status || 'Not Called'}
                      </span>
                      
                      <button
                        onClick={() => setExpandedContact(
                          expandedContact.includes(contact._id)
                            ? expandedContact.filter(id => id !== contact._id)
                            : [...expandedContact, contact._id]
                        )}
                        className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0"
                      >
                        <ChevronDown 
                          size={18} 
                          className={`transform transition-transform ${
                            expandedContact.includes(contact._id) ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedContact.includes(contact._id) && (
                    <div className="border-t border-yellow-300 bg-yellow-50 px-4 sm:px-6 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                        <div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-600">Profession:</span>
                          <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.profession}</span>
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-600">Branch:</span>
                          <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.branch}</span>
                        </div>
                        {contact.assignedVolunteer && (
                          <div className="sm:hidden col-span-full">
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Assigned Volunteer:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.assignedVolunteer.name}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-xs sm:text-sm font-semibold text-gray-600">Payment Status:</span>
                          <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.paidStatus}</span>
                        </div>
                        {contact.currentLocation && (
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Location:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.currentLocation}</span>
                          </div>
                        )}
                        {contact.motherTongue && (
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Mother Tongue:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.motherTongue}</span>
                          </div>
                        )}
                      </div>

                      {/* Followup Form */}
                      <div className="mt-4 p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-300">
                        <h4 className="text-sm sm:text-base font-semibold mb-3">Follow-up Status</h4>
                        
                        {editingFollowUp?.contactId === contact._id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Status</label>
                              <select
                                value={editingFollowUp.status}
                                onChange={(e) => setEditingFollowUp({ ...editingFollowUp, status: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              >
                                {statusOptions.map(status => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs sm:text-sm font-medium mb-1 text-gray-700">Remarks</label>
                              <textarea
                                value={editingFollowUp.remarks}
                                onChange={(e) => setEditingFollowUp({ ...editingFollowUp, remarks: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Add your remarks here..."
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => handleUpdateFollowUp(contact._id)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium"
                              >
                                <Save size={16} />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingFollowUp(null)}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {contact.followup ? (
                              <div className="space-y-2">
                                <div>
                                  <span className="text-xs sm:text-sm font-semibold text-gray-700">Status:</span>
                                  <span className={`ml-2 text-xs sm:text-sm px-2 py-1 rounded ${
                                    contact.followup.status === 'Coming' ? 'bg-green-100 text-green-800' :
                                    contact.followup.status === 'Not Coming' ? 'bg-red-100 text-red-800' :
                                    contact.followup.status === 'May Come' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-300 text-gray-800'
                                  }`}>
                                    {contact.followup.status}
                                  </span>
                                </div>
                                {contact.followup.remarks && (
                                  <div>
                                    <span className="text-xs sm:text-sm font-semibold text-gray-700">Remarks:</span>
                                    <p className="text-xs sm:text-sm text-gray-600 mt-1 bg-yellow-50 p-2 rounded">{contact.followup.remarks}</p>
                                  </div>
                                )}
                                {contact.followup.calledBy && (
                                  <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                                    Called by <span className="font-medium">{contact.followup.calledBy.name}</span>
                                    {contact.followup.calledAt && (
                                      <> on {new Date(contact.followup.calledAt).toLocaleString()}</>
                                    )}
                                  </div>
                                )}
                                <button
                                  onClick={() => setEditingFollowUp({
                                    contactId: contact._id,
                                    status: contact.followup?.status || 'Not Called',
                                    remarks: contact.followup?.remarks || ''
                                  })}
                                  className="mt-2 px-4 py-2 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] text-sm font-medium"
                                >
                                  Update Follow-up
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingFollowUp({
                                  contactId: contact._id,
                                  status: 'Not Called',
                                  remarks: ''
                                })}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                              >
                                <Phone size={16} />
                                Add Follow-up
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Create List Modal */}
          {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Create Follow-up List</h2>
                <p className="text-gray-600 mb-4">
                  Select volunteers to create follow-up assignments for {selectedDate}
                </p>
                
                <div className="space-y-2 mb-6">
                  {volunteers.map(volunteer => (
                    <label
                      key={volunteer._id}
                      className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVolunteers.includes(volunteer._id)}
                        onChange={() => toggleVolunteerSelection(volunteer._id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <div className="font-medium">{volunteer.name}</div>
                        <div className="text-sm text-gray-500">{volunteer.email}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAssignVolunteers}
                    disabled={selectedVolunteers.length === 0 || loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : `Create List (${selectedVolunteers.length} Volunteer${selectedVolunteers.length !== 1 ? 's' : ''})`}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedVolunteers([]);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    disabled={loading}
                  >
                    Cancel
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
