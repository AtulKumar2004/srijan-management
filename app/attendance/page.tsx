"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, UserPlus, X, ArrowLeft } from "lucide-react";

interface Program {
  _id: string;
  name: string;
  temple?: string;
}

interface Participant {
  _id: string;
  name: string;
  phone: string;
  email: string;
  profession?: string;
  homeTown?: string;
  level?: number;
  grade?: string;
  numberOfRounds?: number;
  gender?: string;
  address?: string;
  connectedToTemple?: string;
  maritalStatus?: string;
}

export default function AttendancePage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchedParticipant, setSearchedParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/programs/all');
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const handleSearch = async () => {
    if (!phoneSearch.trim()) {
      setMessage({ type: 'error', text: 'Please enter a phone number' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!selectedProgram) {
      setMessage({ type: 'error', text: 'Please select a program first' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/participants/search?phone=${phoneSearch}&programId=${selectedProgram}`);
      if (res.ok) {
        const data = await res.json();
        setSearchedParticipant(data.participant);
      } else {
        setSearchedParticipant(null);
        setMessage({ type: 'error', text: 'Participant not found in this program. Please add participant.' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error searching participant:", error);
      setMessage({ type: 'error', text: 'Error searching participant' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedProgram || !selectedDate || !selectedLevel || !searchedParticipant) {
      setMessage({ type: 'error', text: 'Please select program, date, level and search participant' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: selectedProgram,
          participantId: searchedParticipant._id,
          date: selectedDate,
          level: parseInt(selectedLevel),
          status: 'present'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Attendance marked successfully!' });
        setPhoneSearch("");
        setSearchedParticipant(null);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to mark attendance' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      setMessage({ type: 'error', text: 'Error marking attendance' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/participants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newParticipant,
          programs: selectedProgram ? [selectedProgram] : []
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Participant added successfully!' });
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
        });
        // Auto-search the newly added participant
        setPhoneSearch(newParticipant.phone);
        setTimeout(() => handleSearch(), 500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add participant' });
      }
    } catch (error) {
      console.error("Error adding participant:", error);
      setMessage({ type: 'error', text: 'Error adding participant' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8E7]" style={{
      backgroundImage: 'url(/backgrou.png)',
      backgroundSize: '25%',
      backgroundRepeat: 'repeat'
    }}>
      <Header />

      <main className="flex-1 w-full mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="bg-[#8B6B61] shadow-lg px-4 sm:px-8 py-4 sm:py-6 mb-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
              Attendance Mark
            </h1>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Selection Form */}
        <div className="bg-[#F5E6D3] shadow-lg px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4">
            {/* Date Picker */}
            <div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-[#8B6B61] rounded text-gray-700 focus:outline-none focus:border-[#6B4B41] bg-white text-sm sm:text-base lg:text-lg"
              />
            </div>

            {/* Program Selector */}
            <div>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-[#8B6B61] rounded text-gray-700 focus:outline-none focus:border-[#6B4B41] bg-white text-sm sm:text-base lg:text-lg"
              >
                <option value="">Select Program</option>
                {programs.map(program => (
                  <option key={program._id} value={program._id}>
                    {program.name} {program.temple ? `- ${program.temple}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Level Selector */}
            <div>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-[#8B6B61] rounded text-gray-700 focus:outline-none focus:border-[#6B4B41] bg-white text-sm sm:text-base lg:text-lg"
              >
                <option value="">Select Level</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                  <option key={level} value={level}>Level {level}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="mt-6 sm:mt-12 max-w-3xl mx-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border-2 border-[#D4A574] overflow-hidden">
            {/* Image at the top - full width */}
            <div className="w-full h-[600px] sm:h-[540px] lg:h-[480px] overflow-hidden">
              <img src="/Attendance.png" alt="Mark Attendance" className="w-full h-full object-cover" />
            </div>
            
            {/* Content section below image */}
            <div className="p-4 sm:p-6 lg:p-10">
              <div className="text-center mb-6 sm:mb-10">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2 sm:mb-3">Mark Attendance Of Participants</h2>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600">
                  Search participant by phone number to mark attendance
                </p>
              </div>

              {/* Search Input */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by Phone Number"
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#8B6B61] text-sm sm:text-base lg:text-lg"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#8B6B61] text-white rounded-lg hover:bg-[#6B4B41] transition-colors disabled:opacity-50 font-semibold text-sm sm:text-base lg:text-lg"
              >
                Search
              </button>
            </div>

            {/* Searched Participant */}
            {searchedParticipant && selectedProgram && selectedDate && selectedLevel && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Participant Found</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base mb-4 sm:mb-6">
                    <div>
                      <span className="font-semibold text-gray-700">Name:</span>
                      <span className="ml-2 text-gray-900">{searchedParticipant.name}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Number of Rounds:</span>
                      <span className="ml-2 text-gray-900">{searchedParticipant.numberOfRounds || 0}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleMarkAttendance}
                    disabled={loading}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-bold text-sm sm:text-base lg:text-lg"
                  >
                    {loading ? 'Marking...' : 'Mark Attendance'}
                  </button>
                </div>
              )}

            {/* Add Participant Button */}
            {selectedProgram && (
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base lg:text-lg"
              >
                <UserPlus size={20} className="sm:w-5 sm:h-5" />
                Add New Participant
              </button>
            )}
            </div>
          </div>
        </div>

        {/* Add Participant Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">Add New Participant</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddParticipant} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={newParticipant.name}
                      onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Phone *</label>
                    <input
                      type="text"
                      required
                      value={newParticipant.phone}
                      onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={newParticipant.email}
                      onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Gender</label>
                    <select
                      value={newParticipant.gender}
                      onChange={(e) => setNewParticipant({ ...newParticipant, gender: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Profession</label>
                    <input
                      type="text"
                      value={newParticipant.profession}
                      onChange={(e) => setNewParticipant({ ...newParticipant, profession: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Home Town</label>
                    <input
                      type="text"
                      value={newParticipant.homeTown}
                      onChange={(e) => setNewParticipant({ ...newParticipant, homeTown: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Connected To Temple</label>
                    <input
                      type="text"
                      value={newParticipant.connectedToTemple}
                      onChange={(e) => setNewParticipant({ ...newParticipant, connectedToTemple: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Number of Rounds</label>
                    <input
                      type="number"
                      value={newParticipant.numberOfRounds}
                      onChange={(e) => setNewParticipant({ ...newParticipant, numberOfRounds: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Level</label>
                    <select
                      value={newParticipant.level}
                      onChange={(e) => setNewParticipant({ ...newParticipant, level: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Select Level</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                        <option key={level} value={level}>Level {level}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Marital Status</label>
                    <select
                      value={newParticipant.maritalStatus}
                      onChange={(e) => setNewParticipant({ ...newParticipant, maritalStatus: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <textarea
                      value={newParticipant.address}
                      onChange={(e) => setNewParticipant({ ...newParticipant, address: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Participant'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
