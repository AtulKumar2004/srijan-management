"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { UserPlus, Eye, Edit, Trash2, Shield, Search, X, CheckCircle2, AlertCircle } from "lucide-react";

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

export default function ProgramManagersPage() {
  const router = useRouter();
  const [managers, setManagers] = useState<ProgramManager[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    programId: "",
    level: "1",
    grade: "A"
  });

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (!authRes.ok) {
        router.push("/login");
        return;
      }
      const authData = await authRes.json();
      if (authData.user?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      await Promise.all([fetchManagers(), fetchPrograms()]);
    } catch (err) {
      console.error("Error loading program managers page:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch("/api/program-managers");
      if (res.ok) {
        const data = await res.json();
        setManagers(data.programManagers || []);
      }
    } catch (err) {
      console.error("Error fetching program managers:", err);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await fetch("/api/programs");
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs || []);
      }
    } catch (err) {
      console.error("Error fetching programs:", err);
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
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Program Manager added successfully! Invite email sent." });
        setShowAddModal(false);
        setFormData({ name: "", phone: "", email: "", address: "", programId: "", level: "1", grade: "A" });
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
    m.phone.includes(searchTerm) ||
    (m.programName && m.programName.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-purple-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Program Managers</h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Manage administrators assigned to specific programs
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
                placeholder="Search by name, email, phone, program..."
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

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Name & Contact</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Assigned Program</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Level & Grade</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredManagers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No Program Managers found. Click "Add Program Manager" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredManagers.map((pm) => (
                    <tr key={pm._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900 text-sm">{pm.name}</div>
                        <div className="text-xs text-gray-500">{pm.email}</div>
                        <div className="text-xs text-gray-500">{pm.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                          {pm.programName || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800">Level {pm.level || 1}</div>
                        <div className="text-xs text-gray-500">Grade: {pm.grade || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => router.push(`/program-managers/${pm._id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                            title="View Profile Overview"
                          >
                            <Eye size={14} />
                            Overview
                          </button>
                          <button
                            onClick={() => router.push(`/program-managers/${pm._id}?edit=true`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-colors"
                            title="Edit Profile"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(pm._id, pm.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors"
                            title="Permanently Delete"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Assigned Program *</label>
                <select
                  name="programId"
                  required
                  value={formData.programId}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="">Select Program</option>
                  {programs.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
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
