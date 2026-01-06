"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Filter, X, ChevronDown, Phone } from "lucide-react";

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
  
  const [guests, setGuests] = useState<Guest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedGuest, setExpandedGuest] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  
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
      if (!authData.user || !["admin", "volunteer"].includes(authData.user.role)) {
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
      const guestsRes = await fetch(`/api/users/by-role?role=guest`);
      if (guestsRes.ok) {
        const data = await guestsRes.json();
        setGuests(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching guests:", error);
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {filteredGuests.length} Guest{filteredGuests.length !== 1 ? 's' : ''}
            </h2>
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-yellow-100 transition-colors gap-3 sm:gap-8">
                    {/* Name */}
                    <div className="w-full sm:w-48 lg:w-56 sm:ml-8">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                        {guest.name}
                      </h3>
                    </div>
                    
                    {/* Contact Icons */}
                    <div className="flex items-center gap-6 flex-shrink-0 sm:ml-96">
                      {guest.phone && (
                        <>
                          <a
                            href={`https://wa.me/${guest.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </a>
                          <a
                            href={`tel:${guest.phone}`}
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
                              if (confirm(`Are you sure you want to delete ${guest.name}?`)) {
                                // Add delete functionality here
                              }
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
      </main>

      <Footer />
    </div>
  );
}
