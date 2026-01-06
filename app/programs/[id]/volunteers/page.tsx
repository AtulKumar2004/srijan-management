"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Filter, X, Edit, ChevronDown, Plus, UserPlus, Phone, Mail, MapPin, Briefcase } from "lucide-react";

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
  const [expandedVolunteer, setExpandedVolunteer] = useState<string[]>([]);

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
    level: 0,
    maritalStatus: "",
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [programId]);

  useEffect(() => {
    applyFilters();
  }, [volunteers, searchTerm, filterGender, filterLevel, filterGrade, filterHomeTown, filterActive, filterNumberOfRounds]);

  const fetchData = async () => {
    try {
      // Fetch program details
      const programRes = await fetch(`/api/programs/${programId}`);
      if (programRes.ok) {
        const programData = await programRes.json();
        setProgram(programData.program);
      }

      // Fetch volunteers for this program
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

    // Active status filter
    if (filterActive) {
      const isActive = filterActive === "active";
      filtered = filtered.filter(v => v.isActive === isActive);
    }

    // Number of Rounds filter
    if (filterNumberOfRounds) {
      filtered = filtered.filter(v => v.numberOfRounds === parseInt(filterNumberOfRounds));
    }

    setFilteredVolunteers(filtered);
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

  const handleDeleteVolunteer = async (volunteerId: string, volunteerName: string) => {
    if (!confirm(`Are you sure you want to delete ${volunteerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${volunteerId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Volunteer deleted successfully!' });
        fetchData(); // Refresh the list
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete volunteer' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error deleting volunteer:", error);
      setMessage({ type: 'error', text: 'Error deleting volunteer' });
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

      if (res.ok) {
        setMessage({ type: 'success', text: 'Volunteer added successfully!' });
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
          level: 0,
          maritalStatus: "",
        });
        fetchData(); // Refresh the list
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add volunteer' });
      }
    } catch (error) {
      console.error("Error adding volunteer:", error);
      setMessage({ type: 'error', text: 'Error adding volunteer' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setNewVolunteer(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : 0) : value
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Volunteers</h1>
              {program && (
                <p className="text-sm sm:text-base text-gray-600 mt-1">Program: {program.name}</p>
              )}
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
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
          Showing {filteredVolunteers.length} of {volunteers.length} volunteers
        </div>

        {/* Volunteers List */}
        <div className="space-y-2">
          {filteredVolunteers.map((volunteer) => (
            <div
              key={volunteer._id}
              className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 overflow-hidden"
            >
              {/* Main Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-yellow-100 transition-colors gap-3 sm:gap-8">
                {/* Name */}
                <div className="w-full sm:w-48 lg:w-56 sm:ml-8">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                    <button
                      onClick={() => router.push(`/profile?userId=${volunteer._id}`)}
                      className="hover:underline cursor-pointer text-left w-full truncate"
                    >
                      {volunteer.name}
                    </button>
                  </h3>
                </div>
                
                {/* Contact Icons */}
                <div className="flex items-center gap-6 flex-shrink-0 sm:ml-96">
                  {volunteer.phone && (
                    <>
                      <a
                        href={`https://wa.me/${volunteer.phone.replace(/\D/g, '')}`}
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
                        href={`tel:${volunteer.phone}`}
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
                  {volunteer.phone || 'N/A'}
                </div>

                {/* Level */}
                <div className="text-gray-700 text-sm w-24 flex-shrink-0">
                  Level {volunteer.level || 'N/A'}
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                    volunteer.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {volunteer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Expand Button */}
                <button
                  onClick={() => setExpandedVolunteer(
                    expandedVolunteer.includes(volunteer._id)
                      ? expandedVolunteer.filter(id => id !== volunteer._id)
                      : [...expandedVolunteer, volunteer._id]
                  )}
                  className="p-1.5 sm:p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 ml-auto"
                >
                  <ChevronDown 
                    size={18} 
                    className={`transform transition-transform ${
                      expandedVolunteer.includes(volunteer._id) ? 'rotate-180' : ''
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
                      <span className="text-xs sm:text-sm font-semibold text-gray-600">Participants Under:</span>
                      <span className="ml-2 text-xs sm:text-sm text-gray-800">{volunteer.participantsUnder || 0}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
                    <button
                      onClick={() => router.push(`/programs/${programId}/volunteers/${volunteer._id}`)}
                      className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => router.push(`/programs/${programId}/volunteers/${volunteer._id}?edit=true`)}
                      className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVolunteer(volunteer._id, volunteer.name)}
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
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={newVolunteer.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={newVolunteer.gender}
                    onChange={handleInputChange}
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
                    Profession
                  </label>
                  <input
                    type="text"
                    name="profession"
                    value={newVolunteer.profession}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Home Town */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home Town
                  </label>
                  <input
                    type="text"
                    name="homeTown"
                    value={newVolunteer.homeTown}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Connected to Temple */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connected to Temple
                  </label>
                  <input
                    type="text"
                    name="connectedToTemple"
                    value={newVolunteer.connectedToTemple}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marital Status
                  </label>
                  <select
                    name="maritalStatus"
                    value={newVolunteer.maritalStatus}
                    onChange={handleInputChange}
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
                    Number of Rounds
                  </label>
                  <input
                    type="number"
                    name="numberOfRounds"
                    value={newVolunteer.numberOfRounds}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level (Spiritual Education)
                  </label>
                  <input
                    type="number"
                    name="level"
                    value={newVolunteer.level}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="e.g., 1, 2, 3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={newVolunteer.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Modal Message */}
              {message && (
                <div className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
                  message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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

      <Footer />
    </div>
  );
}
