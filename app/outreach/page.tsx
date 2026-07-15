"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Filter, X, ChevronDown, Phone, Download, Trash2 } from "lucide-react";
import { useModalStore } from "@/store/modalStore";

interface Outreach {
  _id: string;
  name: string;
  phone: string;
  profession: string;
  motherTongue?: string;
  currentLocation?: string;
  registeredBy: string;
  numberOfRounds?: number;
  branch: string;
  paidStatus: string;
  underWhichAdmin?: string;
  comment?: string;
  createdAt: Date;
}

export default function OutreachPage() {
  const router = useRouter();
  const { showConfirm, showAlert } = useModalStore();
  
  const [outreachContacts, setOutreachContacts] = useState<Outreach[]>([]);
  const [filteredOutreach, setFilteredOutreach] = useState<Outreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedOutreach, setExpandedOutreach] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditFields, setBulkEditFields] = useState<{ [key: string]: boolean }>({});
  const [bulkEditValues, setBulkEditValues] = useState<{ [key: string]: any }>({
    name: "",
    phone: "",
    profession: "",
    motherTongue: "",
    currentLocation: "",
    registeredBy: "",
    numberOfRounds: "",
    branch: "",
    paidStatus: "",
    underWhichAdmin: "",
    comment: ""
  });
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProfession, setFilterProfession] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterPaidStatus, setFilterPaidStatus] = useState("");

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [outreachContacts, searchTerm, filterProfession, filterBranch, filterPaidStatus]);

  const checkAuthAndFetchData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (!authRes.ok) {
        router.push("/login");
        return;
      }

      const authData = await authRes.json();
      if (!authData.user || !["admin", "program_manager", "volunteer"].includes(authData.user.role)) {
        router.push("/dashboard");
        return;
      }

      setCurrentUser(authData.user);
      await fetchOutreach();
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    }
  };

  const fetchOutreach = async () => {
    try {
      const outreachRes = await fetch(`/api/outreach`);
      if (outreachRes.ok) {
        const data = await outreachRes.json();
        setOutreachContacts(data.contacts || []);
      }
    } catch (error) {
      console.error("Error fetching outreach:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...outreachContacts];

    if (searchTerm) {
      filtered = filtered.filter(o => 
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.phone?.includes(searchTerm)
      );
    }

    if (filterProfession) {
      filtered = filtered.filter(o => o.profession === filterProfession);
    }

    if (filterBranch) {
      filtered = filtered.filter(o => 
        o.branch?.toLowerCase().includes(filterBranch.toLowerCase())
      );
    }

    if (filterPaidStatus) {
      filtered = filtered.filter(o => o.paidStatus === filterPaidStatus);
    }

    setFilteredOutreach(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterProfession("");
    setFilterBranch("");
    setFilterPaidStatus("");
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm({ title: "Delete Contact", message: `Are you sure you want to delete ${name}?`, type: "danger", confirmText: "Delete" });
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/outreach/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the list
        await fetchOutreach();
        setExpandedOutreach([]);
      } else {
        await showAlert({ title: "Delete Failed", message: "Failed to delete outreach contact", type: "danger" });
      }
    } catch (error) {
      console.error('Error deleting outreach:', error);
      await showAlert({ title: "Error", message: "Error deleting outreach contact", type: "danger" });
    }
  };

  const handleDownloadCSV = async () => {
    const dataToDownload = selectedContacts.length > 0
      ? filteredOutreach.filter(c => selectedContacts.includes(c._id))
      : filteredOutreach;

    if (dataToDownload.length === 0) {
      await showAlert({
        title: "No Data",
        message: selectedContacts.length > 0
          ? "No selected outreach contacts match the current view/filters."
          : "No outreach contacts available to download.",
        type: "info"
      });
      return;
    }

    const headers = [
      "Name",
      "Phone",
      "Profession",
      "Mother Tongue",
      "Current Location",
      "Registered By",
      "Number of Rounds",
      "Branch",
      "Paid Status",
      "Under Which Admin",
      "Comment",
      "Created At"
    ];

    const rows = dataToDownload.map(c => {
      const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '';
      return [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.profession || '').replace(/"/g, '""')}"`,
        `"${(c.motherTongue || '').replace(/"/g, '""')}"`,
        `"${(c.currentLocation || '').replace(/"/g, '""')}"`,
        `"${(c.registeredBy || '').replace(/"/g, '""')}"`,
        `"${c.numberOfRounds !== undefined ? c.numberOfRounds : ''}"`,
        `"${(c.branch || '').replace(/"/g, '""')}"`,
        `"${(c.paidStatus || '').replace(/"/g, '""')}"`,
        `"${(c.underWhichAdmin || '').replace(/"/g, '""')}"`,
        `"${(c.comment || '').replace(/"/g, '""')}"`,
        `"${created}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "outreach_contacts.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkDeleteContacts = async () => {
    if (selectedContacts.length === 0) return;
    const confirmed = await showConfirm({
      title: "Delete Contacts",
      message: `Are you sure you want to delete ${selectedContacts.length} selected outreach contact(s)? This action cannot be undone.`,
      type: "danger",
      confirmText: "Delete All"
    });
    if (!confirmed) return;

    try {
      await Promise.all(
        selectedContacts.map(id => fetch(`/api/outreach/${id}`, { method: 'DELETE' }))
      );
      await fetchOutreach();
      setSelectedContacts([]);
      setExpandedOutreach([]);
      await showAlert({
        title: "Success",
        message: `${selectedContacts.length} outreach contact(s) deleted successfully!`,
        type: "success"
      });
    } catch (error) {
      console.error("Error in bulk delete:", error);
      await showAlert({
        title: "Error",
        message: "Error executing bulk delete",
        type: "danger"
      });
    }
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkUpdating(true);

    try {
      const updates: any = {};
      const allowedFields = [
        "name", "phone", "profession", "motherTongue", "currentLocation",
        "registeredBy", "numberOfRounds", "branch", "paidStatus", "underWhichAdmin", "comment"
      ];

      for (const key of allowedFields) {
        if (bulkEditFields[key]) {
          updates[key] = bulkEditValues[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        await showAlert({ title: "No Fields Selected", message: "Please check at least one field to update.", type: "warning" });
        setBulkUpdating(false);
        return;
      }

      const res = await fetch('/api/outreach/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactIds: selectedContacts,
          updates
        })
      });

      const data = await res.json();
      if (res.ok) {
        await fetchOutreach();
        setShowBulkEditModal(false);
        setSelectedContacts([]);
        setBulkEditFields({});
        await showAlert({ title: "Success", message: data.message || "Outreach contacts updated successfully!", type: "success" });
      } else {
        await showAlert({ title: "Update Failed", message: data.error || "Failed to update outreach contacts.", type: "danger" });
      }
    } catch (err) {
      console.error("Bulk edit error:", err);
      await showAlert({ title: "Error", message: "Error performing bulk update.", type: "danger" });
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

  return (
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundImage: 'url(/backgrou.png)', 
      backgroundSize: '25%', 
      backgroundRepeat: 'repeat' 
    }}>
      <Header />
      
      <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Outreach Contacts</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage outreach contacts</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <button
                onClick={handleDownloadCSV}
                className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] font-medium whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download size={18} className="text-white sm:w-5 sm:h-5" />
                <span>Download Data</span>
              </button>
              <button
                onClick={() => router.push('/outreach/targeted')}
                className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] font-medium whitespace-nowrap transition-colors cursor-pointer shadow-sm"
              >
                Targeted Outreach
              </button>
              <button
                onClick={() => router.push('/outreach/followups')}
                className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] font-medium whitespace-nowrap transition-colors cursor-pointer"
              >
                Followups
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 sm:flex-none px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Filter size={18} />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
                  <input
                    type="text"
                    value={filterProfession}
                    onChange={(e) => setFilterProfession(e.target.value)}
                    placeholder="Filter by profession..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Temple Branch</label>
                  <input
                    type="text"
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    placeholder="Filter by branch..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                  <select
                    value={filterPaidStatus}
                    onChange={(e) => setFilterPaidStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Sponsored">Sponsored</option>
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
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {filteredOutreach.length} Contact{filteredOutreach.length !== 1 ? 's' : ''}
            </h2>
            {(currentUser?.role === 'admin' || currentUser?.role === 'program_manager' || currentUser?.role === 'volunteer') && (() => {
              const allSelected = filteredOutreach.length > 0 && filteredOutreach.every(c => selectedContacts.includes(c._id));
              return (
                <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
                  {selectedContacts.length > 0 && (
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm whitespace-nowrap bg-[#A65353] text-white px-2.5 py-1.5 rounded-lg shadow-sm">
                        {selectedContacts.length} Selected
                      </span>
                      <button
                        onClick={() => setShowBulkEditModal(true)}
                        className="px-3 py-1.5 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-sm"
                      >
                        Bulk Edit Fields
                      </button>
                      <button
                        onClick={handleBulkDeleteContacts}
                        className="px-3 py-1.5 bg-[#A65353] hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete ({selectedContacts.length})
                      </button>
                      <button
                        onClick={() => setSelectedContacts([])}
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
                      disabled={filteredOutreach.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newSet = new Set([...selectedContacts, ...filteredOutreach.map(c => c._id)]);
                          setSelectedContacts(Array.from(newSet));
                        } else {
                          const visibleIds = new Set(filteredOutreach.map(c => c._id));
                          setSelectedContacts(selectedContacts.filter(id => !visibleIds.has(id)));
                        }
                      }}
                      className="w-4 h-4 text-[#A65353] rounded border-gray-300 focus:ring-[#A65353] cursor-pointer accent-[#A65353] disabled:opacity-30"
                    />
                    <span>Select All Visible ({filteredOutreach.length})</span>
                  </label>
                </div>
              );
            })()}
          </div>

          {filteredOutreach.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No outreach contacts found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOutreach.map((contact, index) => (
                <div
                  key={contact._id}
                  className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 overflow-hidden"
                >
                  {/* Main Row */}
                  <div 
                    onClick={() => setExpandedOutreach(
                      expandedOutreach.includes(contact._id)
                        ? expandedOutreach.filter(id => id !== contact._id)
                        : [...expandedOutreach, contact._id]
                    )}
                    className="px-4 lg:px-6 py-3 lg:py-4 hover:bg-yellow-100 transition-colors cursor-pointer flex items-center gap-3"
                  >
                    {(currentUser?.role === 'admin' || currentUser?.role === 'program_manager' || currentUser?.role === 'volunteer') && (
                      <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts([...selectedContacts, contact._id]);
                            } else {
                              setSelectedContacts(selectedContacts.filter(id => id !== contact._id));
                            }
                          }}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-[#A65353] rounded border-gray-300 focus:ring-[#A65353] cursor-pointer accent-[#A65353]"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                    {/* Mobile Layout */}
                    <div className="lg:hidden space-y-2">
                      {/* Name and expand button */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-800 flex-1 truncate pr-2">
                          {contact.name}
                        </h3>
                        <button
                          onClick={() => setExpandedOutreach(
                            expandedOutreach.includes(contact._id)
                              ? expandedOutreach.filter(id => id !== contact._id)
                              : [...expandedOutreach, contact._id]
                          )}
                          className="p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                        >
                          <ChevronDown 
                            size={18} 
                            className={`transform transition-transform ${
                              expandedOutreach.includes(contact._id) ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {/* Contact info row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {contact.phone && (
                            <>
                              <a
                                href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700 flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                              </a>
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-red-600 hover:text-red-700 flex-shrink-0 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone size={18} />
                              </a>
                            </>
                          )}
                          <span className="text-gray-700 font-medium text-sm">
                            {contact.phone || 'N/A'}
                          </span>
                        </div>
                        
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                          contact.paidStatus === 'Paid' 
                            ? 'bg-green-100 text-green-800' 
                            : contact.paidStatus === 'Unpaid'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {contact.paidStatus}
                        </span>
                      </div>
                    </div>
                    
                    {/* Desktop Layout */}
                    <div className="hidden lg:flex items-center gap-4">
                      {/* Name */}
                      <div className="w-48 lg:w-56">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                          {contact.name}
                        </h3>
                      </div>
                      
                      {/* Spacer to push content right */}
                      <div className="flex-1"></div>
                      
                      {/* Contact Icons */}
                      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                        {contact.phone && (
                          <>
                            <a
                              href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
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
                              href={`tel:${contact.phone}`}
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
                        {contact.phone || 'N/A'}
                      </div>

                      {/* Payment Status */}
                      <div className="flex-shrink-0 w-32 text-center">
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                          contact.paidStatus === 'Paid' 
                            ? 'bg-green-100 text-green-800' 
                            : contact.paidStatus === 'Unpaid'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {contact.paidStatus}
                        </span>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={() => setExpandedOutreach(
                          expandedOutreach.includes(contact._id)
                            ? expandedOutreach.filter(id => id !== contact._id)
                            : [...expandedOutreach, contact._id]
                        )}
                        className="p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                      >
                        <ChevronDown 
                          size={18} 
                          className={`transform transition-transform ${
                            expandedOutreach.includes(contact._id) ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                  {/* Expanded Details */}
                  {expandedOutreach.includes(contact._id) && (
                    <>
                      <div className="border-t border-yellow-300 bg-yellow-50 px-4 sm:px-6 py-3 sm:py-4">
                        <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                          The Details Review of Outreach:
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Profession:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.profession || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Mother Tongue:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.motherTongue || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Current Location:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.currentLocation || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Temple Branch:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.branch || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Registered By:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.registeredBy || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Number of Rounds:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.numberOfRounds || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Payment Status:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.paidStatus || 'N/A'}</span>
                          </div>
                          
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-600">Under Which Admin:</span>
                            <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.underWhichAdmin || 'N/A'}</span>
                          </div>
                          
                          {contact.comment && (
                            <div className="col-span-full">
                              <span className="text-xs sm:text-sm font-semibold text-gray-600">Comment:</span>
                              <span className="ml-2 text-xs sm:text-sm text-gray-800">{contact.comment}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 sm:pt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/outreach/${contact._id}`);
                            }}
                            className="px-3 sm:px-4 py-2 sm:py-3 bg-[#A65353] hover:bg-[#8B4545] text-white rounded-lg transition-colors font-medium text-xs sm:text-base"
                          >
                            Overview
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/outreach/${contact._id}?edit=true`);
                            }}
                            className="px-3 sm:px-4 py-2 sm:py-3 bg-[#A65353] hover:bg-[#8B4545] text-white rounded-lg transition-colors font-medium text-xs sm:text-base"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(contact._id, contact.name);
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
                      Updating {selectedContacts.length} selected contact(s). Check the box beside any field you want to update.
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
                    {/* Name */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.name}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, name: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Name *</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.name}
                        value={bulkEditValues.name || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, name: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter name"
                      />
                    </div>

                    {/* Phone */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.phone}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, phone: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Phone *</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.phone}
                        value={bulkEditValues.phone || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, phone: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter phone number"
                      />
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
                        <span>Profession *</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.profession}
                        value={bulkEditValues.profession || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, profession: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter profession"
                      />
                    </div>

                    {/* Mother Tongue */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.motherTongue}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, motherTongue: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Mother Tongue</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.motherTongue}
                        value={bulkEditValues.motherTongue || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, motherTongue: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter mother tongue"
                      />
                    </div>

                    {/* Current Location */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.currentLocation}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, currentLocation: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Current Location</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.currentLocation}
                        value={bulkEditValues.currentLocation || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, currentLocation: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter current location"
                      />
                    </div>

                    {/* Registered By */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.registeredBy}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, registeredBy: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Registered By *</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.registeredBy}
                        value={bulkEditValues.registeredBy || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, registeredBy: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter registered by"
                      />
                    </div>

                    {/* Temple Branch */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.branch}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, branch: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Temple Branch *</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.branch}
                        value={bulkEditValues.branch || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, branch: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter temple branch"
                      />
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
                      <input
                        type="number"
                        disabled={!bulkEditFields.numberOfRounds}
                        value={bulkEditValues.numberOfRounds || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, numberOfRounds: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter number of rounds"
                      />
                    </div>

                    {/* Payment Status */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.paidStatus}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, paidStatus: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Payment Status *</span>
                      </label>
                      <select
                        disabled={!bulkEditFields.paidStatus}
                        value={bulkEditValues.paidStatus || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, paidStatus: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">Select status</option>
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Sponsored">Sponsored</option>
                      </select>
                    </div>

                    {/* Under Which Admin */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.underWhichAdmin}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, underWhichAdmin: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Under Which Admin</span>
                      </label>
                      <input
                        type="text"
                        disabled={!bulkEditFields.underWhichAdmin}
                        value={bulkEditValues.underWhichAdmin || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, underWhichAdmin: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter admin name"
                      />
                    </div>

                    {/* Comment */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2 md:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!bulkEditFields.comment}
                          onChange={(e) => setBulkEditFields({ ...bulkEditFields, comment: e.target.checked })}
                          className="w-4 h-4 text-[#A65353] rounded focus:ring-[#A65353] accent-[#A65353]"
                        />
                        <span>Comment</span>
                      </label>
                      <textarea
                        disabled={!bulkEditFields.comment}
                        value={bulkEditValues.comment || ""}
                        onChange={(e) => setBulkEditValues({ ...bulkEditValues, comment: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        placeholder="Enter comment"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowBulkEditModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bulkUpdating}
                      className="px-6 py-2 bg-[#A65353] hover:bg-[#8e4545] text-white rounded-lg text-sm font-semibold transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {bulkUpdating ? "Updating..." : "Update Fields"}
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
