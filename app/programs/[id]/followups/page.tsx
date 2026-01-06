"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, Users, UserPlus, Phone, Filter, ChevronDown, Save, RefreshCw, Trash2 } from "lucide-react";

interface FollowUp {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    profession?: string;
  };
  assignedVolunteer?: {
    _id: string;
    name: string;
  };
  status: string;
  remarks: string;
  calledBy?: {
    _id: string;
    name: string;
  };
  calledAt?: Date;
}

interface Volunteer {
  _id: string;
  name: string;
  email: string;
}

export default function FollowUpsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
  const [sessionTopic, setSessionTopic] = useState("");
  const [speakerName, setSpeakerName] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [expandedFollowUp, setExpandedFollowUp] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string | null>(null);

  const statusOptions = ["Coming", "Not Coming", "May Come", "Not Answered", "Not Called"];

  useEffect(() => {
    fetchVolunteers();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchFollowUps();
    }
  }, [selectedDate]);

  const fetchVolunteers = async () => {
    try {
      const res = await fetch(`/api/users/by-role?role=volunteer&programId=${programId}`);
      if (res.ok) {
        const data = await res.json();
        setVolunteers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching volunteers:", error);
    }
  };

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/followups?programId=${programId}&date=${selectedDate}&userType=participant`
      );
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data.followUps || []);
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

  const handleCreateFollowUpList = async () => {
    if (!sessionTopic.trim() || !speakerName.trim()) {
      setMessage({ type: 'error', text: 'Session topic and speaker name are required' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/followups/create-for-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          followUpDate: selectedDate,
          userType: "participant",
          volunteerIds: selectedVolunteers,
          sessionTopic: sessionTopic.trim(),
          speakerName: speakerName.trim()
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setShowCreateModal(false);
        setSelectedVolunteers([]);
        setSessionTopic("");
        setSpeakerName("");
        fetchFollowUps();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error creating follow-up list' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleUpdateFollowUp = async (followUpId: string, status: string, remarks: string) => {
    try {
      const res = await fetch(`/api/followups/${followUpId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, remarks })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Follow-up updated successfully' });
        fetchFollowUps();
        setTimeout(() => setMessage(null), 2000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating follow-up' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteFollowUpList = async () => {
    if (!window.confirm(`Are you sure you want to delete the follow-up list for ${selectedDate}? This will also delete the session for this date.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/followups/delete-for-date?programId=${programId}&date=${selectedDate}`, {
        method: "DELETE"
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchFollowUps();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting follow-up list' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  let filteredFollowUps = followUps;
  
  // Filter by volunteer
  if (selectedVolunteerId === 'unassigned') {
    filteredFollowUps = filteredFollowUps.filter(f => !f.assignedVolunteer);
  } else if (selectedVolunteerId) {
    filteredFollowUps = filteredFollowUps.filter(f => 
      f.assignedVolunteer?._id === selectedVolunteerId
    );
  }
  
  // Filter by status
  if (filterStatus) {
    filteredFollowUps = filteredFollowUps.filter(f => f.status === filterStatus);
  }

  const stats = {
    total: followUps.length,
    coming: followUps.filter(fu => fu.status === "Coming").length,
    notComing: followUps.filter(fu => fu.status === "Not Coming").length,
    mayCome: followUps.filter(fu => fu.status === "May Come").length,
    notAnswered: followUps.filter(fu => fu.status === "Not Answered").length,
    notCalled: followUps.filter(fu => fu.status === "Not Called").length,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundImage: 'url(/backgrou.png)', 
      backgroundSize: '25%', 
      backgroundRepeat: 'repeat' 
    }}>
      <Header />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Follow-ups</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage follow-ups for participants</p>
            </div>
            <button
              onClick={() => router.back()}
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
            <div className="flex items-end gap-2">
              {followUps.length > 0 && (
                <button
                  onClick={handleDeleteFollowUpList}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 cursor-pointer text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm sm:text-base whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Delete List
                </button>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={followUps.length > 0}
                className="flex-1 px-4 py-2 bg-[#A65353] cursor-pointer text-white rounded-lg hover:bg-[#8B4545] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base whitespace-nowrap flex items-center justify-center gap-2"
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
        {followUps.length > 0 && (
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
                      {followUps.length} follow-up{followUps.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {followUps.length}
                  </div>
                </div>
              </button>

              {/* Unassigned Card */}
              {(() => {
                const unassignedCount = followUps.filter(f => !f.assignedVolunteer).length;
                return unassignedCount > 0 ? (
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
                          {unassignedCount} follow-up{unassignedCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-orange-600">
                        {unassignedCount}
                      </div>
                    </div>
                  </button>
                ) : null;
              })()}

              {/* Individual Volunteer Cards */}
              {volunteers
                .map(volunteer => {
                  const assignedCount = followUps.filter(
                    f => f.assignedVolunteer?._id === volunteer._id
                  ).length;
                  return { volunteer, count: assignedCount };
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
                          {count} follow-up{count !== 1 ? 's' : ''}
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

        {/* Follow-ups List */}
        {loading ? (
          <div className="text-center py-8">
            <img src="/mrdanga.png" alt="Loading" className="w-20 h-20 animate-spin mx-auto" />
          </div>
        ) : filteredFollowUps.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
            <p className="text-gray-600 text-sm sm:text-base">
              No follow-ups found for participants on {selectedDate}
            </p>
            <p className="text-gray-500 text-xs sm:text-sm mt-2">
              Click "Create List" to generate a follow-up list for this date
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFollowUps.map((followUp, index) => (
              <FollowUpCard
                key={followUp._id}
                followUp={followUp}
                index={index}
                programId={programId}
                expanded={expandedFollowUp === followUp._id}
                onToggle={() => setExpandedFollowUp(expandedFollowUp === followUp._id ? null : followUp._id)}
                onUpdate={handleUpdateFollowUp}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                Create Follow-up List
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Fill in session details and select volunteers to assign follow-ups. The system will automatically divide participants equally among selected volunteers.
              </p>

              {/* Session Fields */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Topic *
                  </label>
                  <input
                    type="text"
                    value={sessionTopic}
                    onChange={(e) => setSessionTopic(e.target.value)}
                    placeholder="Enter session topic"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speaker Name *
                  </label>
                  <input
                    type="text"
                    value={speakerName}
                    onChange={(e) => setSpeakerName(e.target.value)}
                    placeholder="Enter speaker name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Volunteers Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Volunteers (Optional)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {volunteers.map(volunteer => (
                    <label
                      key={volunteer._id}
                      className="flex items-center p-2 sm:p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVolunteers.includes(volunteer._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVolunteers([...selectedVolunteers, volunteer._id]);
                          } else {
                            setSelectedVolunteers(selectedVolunteers.filter(id => id !== volunteer._id));
                          }
                        }}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-sm sm:text-base">{volunteer.name}</div>
                        <div className="text-xs sm:text-sm text-gray-600">{volunteer.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCreateFollowUpList}
                  disabled={loading || !sessionTopic.trim() || !speakerName.trim()}
                  className="flex-1 px-4 py-2 bg-[#A65353] cursor-pointer text-white rounded-lg hover:bg-[#8B4545] disabled:bg-gray-400 transition-colors text-sm sm:text-base"
                >
                  {loading ? 'Creating...' : 'Create List'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedVolunteers([]);
                    setSessionTopic("");
                    setSpeakerName("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm sm:text-base"
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

// Follow-up Card Component
function FollowUpCard({ 
  followUp, 
  index, 
  programId,
  expanded, 
  onToggle, 
  onUpdate 
}: { 
  followUp: FollowUp;
  index: number;
  programId: string;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, status: string, remarks: string) => void;
}) {
  const [status, setStatus] = useState(followUp.status);
  const [remarks, setRemarks] = useState(followUp.remarks);
  const [hasChanges, setHasChanges] = useState(false);

  const statusOptions = ["Coming", "Not Coming", "May Come", "Not Answered", "Not Called"];

  useEffect(() => {
    const changed = status !== followUp.status || remarks !== followUp.remarks;
    setHasChanges(changed);
  }, [status, remarks, followUp]);

  const handleSave = () => {
    onUpdate(followUp._id, status, remarks);
    setHasChanges(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Coming": return "bg-green-100 text-green-800";
      case "Not Coming": return "bg-red-100 text-red-800";
      case "May Come": return "bg-yellow-100 text-yellow-800";
      case "Not Answered": return "bg-orange-100 text-orange-800";
      case "Busy": return "bg-purple-100 text-purple-800";
      case "Not Sure": return "bg-blue-100 text-blue-800";
      case "Not Called": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 overflow-hidden">
      {/* Main Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-yellow-100 transition-colors gap-2 sm:gap-0">
        {/* Serial Number & Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
          <span className="text-sm sm:text-base font-bold text-gray-600 flex-shrink-0">#{index + 1}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 truncate">
              <a 
                href={`/programs/${programId}/participants/${followUp.user._id}`}
                className="hover:underline cursor-pointer"
              >
                {followUp.user.name}
              </a>
            </h3>
            {followUp.user.phone && (
              <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                <Phone size={14} />
                {followUp.user.phone}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            {/* Assigned To */}
            {followUp.assignedVolunteer && (
              <span className="text-gray-600">
                Assigned: <span className="font-medium">{followUp.assignedVolunteer.name}</span>
              </span>
            )}
            
            {/* Status Badge */}
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(followUp.status)}`}>
              {followUp.status}
            </span>
          </div>

          {/* Expand Button */}
          <button
            onClick={onToggle}
            className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
          >
            <ChevronDown 
              size={18} 
              className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-yellow-300 bg-yellow-50 px-4 sm:px-6 py-3 sm:py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            {/* User Info */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <p className="text-sm text-gray-800 break-all">{followUp.user.email}</p>
            </div>
            {followUp.user.profession && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Profession</label>
                <p className="text-sm text-gray-800">{followUp.user.profession}</p>
              </div>
            )}
          </div>

          {/* Update Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks..."
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-4 py-2 bg-[#A65353] cursor-pointer text-white rounded-lg hover:bg-[#8B4545] transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>
          )}

          {/* Call History */}
          {followUp.calledBy && (
            <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-600">
              Last updated by <span className="font-medium">{followUp.calledBy.name}</span>
              {followUp.calledAt && (
                <span suppressHydrationWarning> on {new Date(followUp.calledAt).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
