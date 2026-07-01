"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { UserPlus, Eye, Edit, Trash2, Shield, Search, X, CheckCircle2, AlertCircle, ArrowLeft, Phone, ChevronDown } from "lucide-react";

interface ProgramManager {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  programs?: string[];
  programName?: string;
  level?: number;
  grade?: string;
  createdAt: string;
}

interface Program {
  _id: string;
  name: string;
}

export default function ProgramScopedManagersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: programId } = use(params);
  const router = useRouter();
  const [managers, setManagers] = useState<ProgramManager[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedManager, setExpandedManager] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    level: "1",
    grade: "A"
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, [programId]);

  const checkAuthAndFetch = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (!authRes.ok) {
        router.push("/login");
        return;
      }
      const authData = await authRes.json();
      if (authData.user?.role !== "admin") {
        router.push(`/programs/${programId}`);
        return;
      }

      await Promise.all([fetchManagers(), fetchProgramDetails()]);
    } catch (err) {
      console.error("Error loading program managers page:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch(`/api/program-managers?programId=${programId}`);
      if (res.ok) {
        const data = await res.json();
        setManagers(data.programManagers || []);
      }
    } catch (err) {
      console.error("Error fetching program managers:", err);
    }
  };

  const fetchProgramDetails = async () => {
    try {
      const res = await fetch(`/api/programs/${programId}`);
      if (res.ok) {
        const data = await res.json();
        setProgram(data.program || null);
      }
    } catch (err) {
      console.error("Error fetching program:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/program-managers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          programId
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Program Manager added successfully! Invite email sent." });
        setShowAddModal(false);
        setFormData({ name: "", phone: "", email: "", address: "", level: "1", grade: "A" });
        fetchManagers();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add Program Manager" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete Program Manager "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/program-managers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: `Program Manager "${name}" deleted successfully.` });
        fetchManagers();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to delete Program Manager" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete Program Manager" });
    }
  };

  const filteredManagers = managers.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <img src="/mrdanga.png" alt="Loading" className="w-20 h-20 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50"
      style={{ backgroundImage: "url(/backgrou.png)", backgroundSize: "30%", backgroundRepeat: "repeat" }}>
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <button
          onClick={() => router.push(`/programs/${programId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-semibold text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Program Details
        </button>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-purple-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  Program Managers ({program?.name || "Program"})
                </h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Manage administrators specifically assigned to {program?.name || "this program"}
              </p>
            </div>

            <button
              onClick={() => { setMessage(null); setShowAddModal(true); }}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm"
            >
              <UserPlus size={18} />
              Add Program Manager
            </button>
          </div>

          {message && (
            <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success" ? "bg-green-100 text-green-800 border border-green-300" : "bg-red-100 text-red-800 border border-red-300"
            }`}>
              {message.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-gray-100 pt-6">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="text-sm text-gray-500 font-medium">
              Showing {filteredManagers.length} of {managers.length} managers
            </div>
          </div>
        </div>

        {/* Managers List */}
        <div className="space-y-2">
          {filteredManagers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
              No Program Managers found for {program?.name || "this program"}. Click "Add Program Manager" to create one.
            </div>
          ) : (
            filteredManagers.map((pm) => (
              <div
                key={pm._id}
                className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 overflow-hidden"
              >
                {/* Main Row */}
                <div
                  onClick={() =>
                    setExpandedManager(
                      expandedManager.includes(pm._id)
                        ? expandedManager.filter((id) => id !== pm._id)
                        : [...expandedManager, pm._id]
                    )
                  }
                  className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 hover:bg-yellow-100 transition-colors gap-2 sm:gap-4 cursor-pointer"
                >
                  {/* Top Header Row on mobile / Left group on desktop */}
                  <div className="flex items-center justify-between gap-2 w-full xl:w-auto min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 xl:flex-initial">
                      {/* Name */}
                      <div className="min-w-0 flex-1 xl:w-48 2xl:w-56">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/program-managers/${pm._id}`);
                            }}
                            className="hover:underline cursor-pointer text-left w-full truncate block"
                          >
                            {pm.name}
                          </button>
                        </h3>
                      </div>
                    </div>

                    {/* Expand Button for mobile */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedManager(
                          expandedManager.includes(pm._id)
                            ? expandedManager.filter((id) => id !== pm._id)
                            : [...expandedManager, pm._id]
                        );
                      }}
                      className="xl:hidden p-1.5 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                    >
                      <ChevronDown
                        size={18}
                        className={`transform transition-transform ${
                          expandedManager.includes(pm._id) ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Right Side Stats Group */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-700 xl:ml-auto mr-1 sm:mr-2 pl-6 sm:pl-0">
                    {/* Contact Icons */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {pm.phone && (
                        <>
                          <a
                            href={`https://wa.me/${pm.phone.replace(/\D/g, "")}`}
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
                            href={`tel:${pm.phone}`}
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
                      {pm.phone || "N/A"}
                    </div>

                    {/* Level */}
                    <div className="xl:w-24 flex-shrink-0">
                      <span className="text-gray-500 xl:hidden">Level: </span>
                      {pm.level ? (String(pm.level).startsWith("Level") ? pm.level : `Level ${pm.level}`) : "Level 1"}
                    </div>

                    {/* Grade */}
                    <div className="xl:w-24 flex-shrink-0">
                      <span className="text-gray-500 xl:hidden">Grade: </span>
                      {pm.grade || "N/A"}
                    </div>
                  </div>

                  {/* Expand Button for desktop */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedManager(
                        expandedManager.includes(pm._id)
                          ? expandedManager.filter((id) => id !== pm._id)
                          : [...expandedManager, pm._id]
                      );
                    }}
                    className="hidden xl:block p-1.5 sm:p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 ml-1"
                  >
                    <ChevronDown
                      size={18}
                      className={`transform transition-transform ${
                        expandedManager.includes(pm._id) ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedManager.includes(pm._id) && (
                  <div className="border-t border-yellow-300 bg-yellow-50 px-4 sm:px-6 py-3 sm:py-4">
                    <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                      The Details Review of Program Manager:
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-600">Email:</span>
                        <span className="ml-2 text-xs sm:text-sm text-gray-800 break-all">{pm.email}</span>
                      </div>

                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-600">Address:</span>
                        <span className="ml-2 text-xs sm:text-sm text-gray-800">{pm.address || "N/A"}</span>
                      </div>

                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-600">Registered:</span>
                        <span className="ml-2 text-xs sm:text-sm text-gray-800">
                          {pm.createdAt ? new Date(pm.createdAt).toLocaleDateString() : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
                      <button
                        onClick={() => router.push(`/program-managers/${pm._id}`)}
                        className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => router.push(`/program-managers/${pm._id}?edit=true`)}
                        className="flex-1 px-4 sm:px-6 py-2 bg-[#A65353] text-white cursor-pointer rounded transition-colors text-sm sm:text-base"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(pm._id, pm.name)}
                        className="flex-1 px-4 sm:px-6 py-2 bg-red-700 hover:bg-red-800 text-white cursor-pointer rounded transition-colors text-sm sm:text-base flex items-center justify-center gap-1 font-bold"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add Program Manager Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-purple-600 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus size={20} />
                Add Program Manager
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-purple-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 font-medium">
                Adding administrator for program: <span className="font-bold">{program?.name || "Selected Program"}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Address *</label>
                <textarea
                  name="address"
                  required
                  rows={2}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter full residential address"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Level *</label>
                  <select
                    name="level"
                    required
                    value={formData.level}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  >
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Grade *</label>
                  <select
                    name="grade"
                    required
                    value={formData.grade}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  >
                    <option value="A+">A+</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  {submitting ? "Adding..." : "Add Program Manager"}
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
