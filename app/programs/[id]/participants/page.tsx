"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Filter, X, ChevronDown, UserPlus, Phone } from "lucide-react";

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
  handledBy?: string;
  isActive?: boolean;
  createdAt: Date;
}

interface Volunteer {
  _id: string;
  name: string;
  participantsUnder?: number;
}

interface Program {
  _id: string;
  name: string;
}

export default function ParticipantsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  
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
  const [volunteerNames, setVolunteerNames] = useState<{ [key: string]: string }>({});
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterHomeTown, setFilterHomeTown] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterNumberOfRounds, setFilterNumberOfRounds] = useState("");

  // Add participant form state
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    email: "",
    phone: "",
    profession: "",
    homeTown: "",
    address: "",
    gender: "",
    connectedToTemple: "",
    numberOfRounds: 0,
    level: 0,
    maritalStatus: "",
    registeredBy: "",
    handledBy: "",
  });

  useEffect(() => {
    fetchData();
  }, [programId]);

  useEffect(() => {
    applyFilters();
  }, [participants, searchTerm, filterGender, filterLevel, filterGrade, filterHomeTown, filterActive, filterNumberOfRounds]);

  const fetchData = async () => {
    try {
      // Fetch program details
      const programRes = await fetch(`/api/programs/${programId}`);
      if (programRes.ok) {
        const programData = await programRes.json();
        setProgram(programData.program);
      }

      // Fetch participants for this program
      const participantsRes = await fetch(`/api/users/by-role?role=participant&programId=${programId}`);
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

    // Active status filter
    if (filterActive) {
      const isActive = filterActive === "active";
      filtered = filtered.filter(p => p.isActive === isActive);
    }

    // Number of Rounds filter
    if (filterNumberOfRounds) {
      filtered = filtered.filter(p => p.numberOfRounds === parseInt(filterNumberOfRounds));
    }

    setFilteredParticipants(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterGender("");
    setFilterLevel("");
    setFilterGrade("");
    setFilterHomeTown("");
    setFilterActive("");
    setFilterNumberOfRounds("");
  };

  const handleDeleteParticipant = async (participantId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to delete ${participantName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${participantId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Participant deleted successfully!' });
        fetchData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete participant' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error deleting participant:", error);
      setMessage({ type: 'error', text: 'Error deleting participant' });
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
          ...newParticipant,
          programs: [programId]
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Participant created successfully! Default password: Participant@123' });
        setShowAddModal(false);
        setNewParticipant({
          name: "",
          email: "",
          phone: "",
          profession: "",
          homeTown: "",
          address: "",
          gender: "",
          connectedToTemple: "",
          numberOfRounds: 0,
          level: 0,
          maritalStatus: "",
          registeredBy: "",
          handledBy: "",
        });
        fetchData();
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create participant' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error creating participant:", error);
      setMessage({ type: 'error', text: 'Error creating participant' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
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
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#A65353] text-white cursor-pointer rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <UserPlus size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Add Participant</span>
                <span className="sm:hidden">Add</span>
              </button>
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
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
              {(searchTerm || filterGender || filterLevel || filterGrade || filterHomeTown || filterActive || filterNumberOfRounds) && (
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
                  <option value="5">5</option>
                  <option value="6">6</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
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
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-3 sm:mb-4 text-sm sm:text-base text-gray-600 font-bold">
          Showing {filteredParticipants.length} of {participants.length} participants
        </div>

        {/* Participants List */}
        <div className="space-y-2">
          {filteredParticipants.map((participant) => (
            <div
              key={participant._id}
              className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 overflow-hidden"
            >
              {/* Main Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-yellow-100 transition-colors gap-3 sm:gap-8">
                {/* Name */}
                <div className="w-full sm:w-48 lg:w-56 sm:ml-8">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                    <button
                      onClick={() => router.push(`/profile?userId=${participant._id}`)}
                      className="hover:underline cursor-pointer text-left w-full truncate"
                    >
                      {participant.name}
                    </button>
                  </h3>
                </div>
                
                {/* Contact Icons */}
                <div className="flex items-center gap-6 flex-shrink-0 sm:ml-96">
                  {participant.phone && (
                    <>
                      <a
                        href={`https://wa.me/${participant.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                      </a>
                      <a
                        href={`tel:${participant.phone}`}
                        className="text-red-600 hover:text-red-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone size={18} />
                      </a>
                    </>
                  )}
                </div>

                {/* Phone Number */}
                <div className="text-gray-700 font-medium text-sm w-32 flex-shrink-0">
                  {participant.phone || 'N/A'}
                </div>

                {/* Level */}
                <div className="text-gray-700 text-sm w-24 flex-shrink-0">
                  Level {participant.level || 'N/A'}
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                    participant.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {participant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Expand Button */}
                <button
                  onClick={() => setExpandedParticipant(
                    expandedParticipant.includes(participant._id)
                      ? expandedParticipant.filter(id => id !== participant._id)
                      : [...expandedParticipant, participant._id]
                  )}
                  className="p-1.5 sm:p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 ml-auto"
                >
                  <ChevronDown 
                    size={18} 
                    className={`transform transition-transform ${
                      expandedParticipant.includes(participant._id) ? 'rotate-180' : ''
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
                        {participant.registeredBy ? (volunteerNames[participant.registeredBy] || participant.registeredBy) : 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Handled By:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">
                        {participant.handledBy ? (volunteerNames[participant.handledBy] || participant.handledBy) : 'N/A'}
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
                    <button
                      onClick={() => router.push(`/programs/${programId}/participants/${participant._id}?edit=true`)}
                      className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteParticipant(participant._id, participant.name)}
                      className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredParticipants.length === 0 && (
          <div className="text-center py-8 sm:py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 text-base sm:text-lg">No participants found</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </main>

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Add New Participant</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 cursor-pointer hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddParticipant} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
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
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newParticipant.phone}
                      onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={newParticipant.gender}
                      onChange={(e) => setNewParticipant({ ...newParticipant, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profession
                    </label>
                    <input
                      type="text"
                      value={newParticipant.profession}
                      onChange={(e) => setNewParticipant({ ...newParticipant, profession: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Home Town
                    </label>
                    <input
                      type="text"
                      value={newParticipant.homeTown}
                      onChange={(e) => setNewParticipant({ ...newParticipant, homeTown: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Connected to Temple
                    </label>
                    <input
                      type="text"
                      value={newParticipant.connectedToTemple}
                      onChange={(e) => setNewParticipant({ ...newParticipant, connectedToTemple: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marital Status
                    </label>
                    <select
                      value={newParticipant.maritalStatus}
                      onChange={(e) => setNewParticipant({ ...newParticipant, maritalStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Marital Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registered By
                    </label>
                    <select
                      value={newParticipant.registeredBy}
                      onChange={(e) => setNewParticipant({ ...newParticipant, registeredBy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Volunteer</option>
                      {volunteers.map((volunteer) => (
                        <option key={volunteer._id} value={volunteer._id}>
                          {volunteer.name} ({volunteer.participantsUnder || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Handled By
                    </label>
                    <select
                      value={newParticipant.handledBy}
                      onChange={(e) => setNewParticipant({ ...newParticipant, handledBy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Volunteer</option>
                      {volunteers.map((volunteer) => (
                        <option key={volunteer._id} value={volunteer._id}>
                          {volunteer.name} ({volunteer.participantsUnder || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Level
                    </label>
                    <input
                      type="number"
                      value={newParticipant.level}
                      onChange={(e) => setNewParticipant({ ...newParticipant, level: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Rounds
                    </label>
                    <input
                      type="number"
                      value={newParticipant.numberOfRounds}
                      onChange={(e) => setNewParticipant({ ...newParticipant, numberOfRounds: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      value={newParticipant.address}
                      onChange={(e) => setNewParticipant({ ...newParticipant, address: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
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
