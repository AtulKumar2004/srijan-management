"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";
import { Trash } from "lucide-react";
import { useModalStore } from "@/store/modalStore";

interface Program {
  _id: string;
  name: string;
  description?: string;
  minAge?: number;
  maxAge?: number;
  photo?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  temple?: string;
}

const compressImageToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Unable to process image'));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        resolve(compressed);
      };

      image.onerror = () => reject(new Error('Invalid image file'));
      image.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
};

export default function AdminDashboard() {
  const router = useRouter();
  const { showConfirm, showAlert } = useModalStore();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [user, setUser] = useState<{ name: String; email: string; role: string; _id: string } | null>(null);
  const [newProgram, setNewProgram] = useState({
    name: "",
    description: "",
    minAge: "",
    maxAge: "",
    photo: "",
    temple: "",
  });
  const [editProgram, setEditProgram] = useState({
    name: "",
    description: "",
    minAge: "",
    maxAge: "",
    photo: "",
    temple: "",
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      if (target === 'new') {
        setNewProgram(prev => ({ ...prev, photo: compressed }));
      } else {
        setEditProgram(prev => ({ ...prev, photo: compressed }));
      }
    } catch (error) {
      console.error('Error compressing image:', error);
      await showAlert({ title: "Error", message: "Failed to process photo. Please select a valid image file.", type: "danger" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const contentType = res.headers.get("content-type");

      if (res.ok && contentType?.includes("application/json")) {
        const data = await res.json();
        if (data.user) {
          // Allow admins, volunteers, and participants
          if (["admin", "volunteer", "participant"].includes(data.user.role)) {
            setUser(data.user);
            fetchPrograms(data.user);
          } else {
            // Redirect guests
            setLoading(false);
            router.push("/login");
          }
        } else {
          setLoading(false);
          router.push("/login");
        }
      } else {
        console.error("Auth check failed - invalid response");
        if (!contentType?.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response:", text.substring(0, 200));
        }
        setLoading(false);
        router.push("/login");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setLoading(false);
      router.push("/login");
    }
  };

  const fetchPrograms = async (currentUser: { email: string; role: string; _id: string }) => {
    try {
      const res = await fetch("/api/programs");
      const contentType = res.headers.get("content-type");

      if (res.ok && contentType?.includes("application/json")) {
        const data = await res.json();
        let filteredPrograms = data.programs || [];

        // Programs are already filtered by the API based on role
        // Volunteers only get their enrolled programs
        // Admins get all programs

        setPrograms(filteredPrograms);
      } else if (!contentType?.includes("application/json")) {
        console.error("API returned non-JSON response");
        const text = await res.text();
        console.error("Response:", text.substring(0, 200));
      } else {
        console.error("Failed to fetch programs", res.status);
      }
    } catch (error) {
      console.error("Error fetching programs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProgram = async (programId: string, programName: string) => {
    const confirmed = await showConfirm({ title: "Delete Program", message: `Are you sure you want to delete "${programName}"? This action cannot be undone.`, type: "danger", confirmText: "Delete Program" });
    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/programs/${programId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (user) fetchPrograms(user); // Refresh the list
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const error = await res.json();
          await showAlert({ title: "Delete Failed", message: error.error || "Failed to delete program", type: "danger" });
        } else {
          await showAlert({ title: "Delete Failed", message: "Failed to delete program", type: "danger" });
        }
      }
    } catch (error) {
      console.error("Error deleting program:", error);
      await showAlert({ title: "Error", message: "Failed to delete program", type: "danger" });
    }
  };

  const handleEditClick = (program: Program) => {
    setEditingProgram(program);
    setEditProgram({
      name: program.name,
      description: program.description || "",
      minAge: program.minAge?.toString() || "",
      maxAge: program.maxAge?.toString() || "",
      photo: program.photo || "",
      temple: program.temple || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;

    try {
      const res = await fetch(`/api/programs/${editingProgram._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editProgram.name,
          description: editProgram.description,
          minAge: editProgram.minAge ? parseInt(editProgram.minAge) : undefined,
          maxAge: editProgram.maxAge ? parseInt(editProgram.maxAge) : undefined,
          photo: editProgram.photo,
          temple: editProgram.temple,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setEditingProgram(null);
        setEditProgram({ name: "", description: "", minAge: "", maxAge: "", photo: "", temple: "" });
        if (user) fetchPrograms(user);
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const error = await res.json();
          await showAlert({ title: "Update Failed", message: error.error || "Failed to update program", type: "danger" });
        } else {
          await showAlert({ title: "Update Failed", message: "Failed to update program", type: "danger" });
        }
      }
    } catch (error) {
      console.error("Error updating program:", error);
      await showAlert({ title: "Error", message: "Failed to update program", type: "danger" });
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/programs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProgram.name,
          description: newProgram.description,
          minAge: newProgram.minAge ? parseInt(newProgram.minAge) : undefined,
          maxAge: newProgram.maxAge ? parseInt(newProgram.maxAge) : undefined,
          photo: newProgram.photo,
          temple: newProgram.temple,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewProgram({ name: "", description: "", minAge: "", maxAge: "", photo: "", temple: "" });
        if (user) fetchPrograms(user); // Refresh the list
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const error = await res.json();
          await showAlert({ title: "Create Failed", message: error.error || "Failed to create program", type: "danger" });
        } else {
          await showAlert({ title: "Create Failed", message: "Failed to create program", type: "danger" });
        }
      }
    } catch (error) {
      console.error("Error creating program:", error);
      await showAlert({ title: "Error", message: "Failed to create program", type: "danger" });
    }
  };

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
    <div className="min-h-screen flex flex-col"
      style={{ backgroundImage: 'url(/backgrou.png)', backgroundSize: '30%', backgroundRepeat: 'repeat' }}>
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Hare Krishna {user?.name}
          </h1>

          <div className="flex flex-wrap gap-4">
            {/* Guests Card - only for admins */}
            {user?.role === "admin" && (
              <button
                onClick={() => router.push('/guests')}
                className="flex bg-green-200 items-center cursor-pointer gap-3 px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all border-2 border-emerald-600 group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                  <svg className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800">Guests</div>
                  <div className="text-xs text-gray-500">View all guests</div>
                </div>
              </button>
            )}

            {/* Outreach Card - only for admins and volunteers */}
            {user?.role !== "participant" && (
              <button
                onClick={() => setShowOutreachModal(true)}
                className="flex bg-red-200 items-center gap-3 px-6 py-3 cursor-pointer rounded-lg shadow-md hover:shadow-lg transition-all border-2 border-red-600 group"
              >
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                  <svg className="w-6 h-6 text-red-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800">Outreach</div>
                  <div className="text-xs text-gray-500">View outreach activities</div>
                </div>
              </button>
            )}

            {/* Create Program Button - only for admins */}
            {user?.role === "admin" && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 text-white rounded-lg transition-colors font-medium"
                style={{ backgroundColor: '#A65353' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B4545'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A65353'}
              >
                + Create Program
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <div
              key={program._id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative"
              onClick={() => router.push(`/programs/${program._id}`)}
            >
              {/* Edit and Delete buttons - only for admins and only for programs they created */}
              {user?.role === "admin" && program.createdBy && String(program.createdBy._id) === String(user._id) && (
                <div className="absolute bottom-5 right-5 flex gap-2 z-10">
                  {/* Edit button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(program);
                    }}
                    className="bg-[#A65353] hover:bg-[#8B4545] text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                    title="Edit program"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProgram(program._id, program.name);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                    title="Delete program"
                  >
                    <Trash />
                  </button>
                </div>
              )}
              {program.photo && (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <img
                    src={program.photo}
                    alt={program.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent && !parent.querySelector('.fallback-text')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'fallback-text text-gray-400 text-sm';
                        fallback.textContent = 'Image unavailable';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
              )}
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-3">{program.name}</h2>
                {program.description && (
                  <p className="text-gray-600 mb-4">{program.description}</p>
                )}
                {(program.minAge || program.maxAge) && (
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <span className="font-medium">Age Range:</span>
                    <span className="ml-2">
                      {program.minAge || "N/A"} - {program.maxAge || "N/A"} years
                    </span>
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <span className="font-medium">Temple:</span>
                  <span className="ml-2">{program.temple || "Not specified"}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <span className="font-medium">Created by:</span>
                  <span className="ml-2">{program.createdBy?.name || "Not specified"}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button className="font-medium cursor-pointer" style={{ color: '#A65353' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#8B4545'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#A65353'}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {programs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white text-xl">No programs found. Create your first program!</p>
          </div>
        )}
      </main>

      <Footer />

      {/* Create Program Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 sm:p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Program</h2>

            <form onSubmit={handleCreateProgram}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Program Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                  placeholder="e.g., Little Vaishnavas"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                  placeholder="Program description"
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Program Photo
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-4 py-2 text-sm font-semibold text-[#A65353] bg-red-50 border border-[#A65353]/30 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 shadow-sm">
                      <span>{uploadingPhoto ? "Uploading..." : "📁 Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingPhoto}
                        onChange={(e) => handlePhotoUpload(e, 'new')}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-gray-500">or paste URL below</span>
                  </div>
                  <input
                    type="text"
                    value={newProgram.photo}
                    onChange={(e) => setNewProgram({ ...newProgram, photo: e.target.value })}
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                    placeholder="https://example.com/image.jpg"
                  />
                  {newProgram.photo && (
                    <div className="mt-1 relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <img src={newProgram.photo} alt="Preview" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setNewProgram({ ...newProgram, photo: "" })}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full px-2 py-0.5 text-xs font-bold hover:bg-black/80 cursor-pointer"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Temple <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProgram.temple}
                  onChange={(e) => setNewProgram({ ...newProgram, temple: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                  placeholder="e.g., ISKCON Delhi"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Min Age
                  </label>
                  <input
                    type="number"
                    value={newProgram.minAge}
                    onChange={(e) => setNewProgram({ ...newProgram, minAge: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Max Age
                  </label>
                  <input
                    type="number"
                    value={newProgram.maxAge}
                    onChange={(e) => setNewProgram({ ...newProgram, maxAge: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                    placeholder="12"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProgram({ name: "", description: "", minAge: "", maxAge: "", photo: "", temple: "" });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: '#A65353' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B4545'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A65353'}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Program Modal */}
      {showEditModal && editingProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Program</h2>

            <form onSubmit={handleUpdateProgram}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Program Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editProgram.name}
                  onChange={(e) => setEditProgram({ ...editProgram, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={editProgram.description}
                  onChange={(e) => setEditProgram({ ...editProgram, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Program Photo
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-4 py-2 text-sm font-semibold text-[#A65353] bg-red-50 border border-[#A65353]/30 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 shadow-sm">
                      <span>{uploadingPhoto ? "Uploading..." : "📁 Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingPhoto}
                        onChange={(e) => handlePhotoUpload(e, 'edit')}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-gray-500">or paste URL below</span>
                  </div>
                  <input
                    type="text"
                    value={editProgram.photo}
                    onChange={(e) => setEditProgram({ ...editProgram, photo: e.target.value })}
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                    placeholder="https://example.com/image.jpg"
                  />
                  {editProgram.photo && (
                    <div className="mt-1 relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <img src={editProgram.photo} alt="Preview" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setEditProgram({ ...editProgram, photo: "" })}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full px-2 py-0.5 text-xs font-bold hover:bg-black/80 cursor-pointer"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Temple <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editProgram.temple}
                  onChange={(e) => setEditProgram({ ...editProgram, temple: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                  placeholder="e.g., ISKCON Delhi"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Min Age
                  </label>
                  <input
                    type="number"
                    value={editProgram.minAge}
                    onChange={(e) => setEditProgram({ ...editProgram, minAge: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Max Age
                  </label>
                  <input
                    type="number"
                    value={editProgram.maxAge}
                    onChange={(e) => setEditProgram({ ...editProgram, maxAge: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': '#A65353' } as React.CSSProperties}
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProgram(null);
                    setEditProgram({ name: "", description: "", minAge: "", maxAge: "", photo: "", temple: "" });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ backgroundColor: '#A65353' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B4545'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A65353'}
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outreach Selection Modal */}
      {showOutreachModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border-2 border-red-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Outreach Options</h2>
                  <p className="text-xs sm:text-sm text-gray-500">Select an action to proceed</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOutreachModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Outreach Form Button */}
              <button
                type="button"
                onClick={() => {
                  setShowOutreachModal(false);
                  router.push('/outreach-form');
                }}
                className="w-full flex bg-red-50 hover:bg-red-100 items-center gap-4 px-5 py-4 cursor-pointer rounded-xl shadow-sm hover:shadow transition-all border-2 border-red-300 hover:border-red-600 group text-left"
              >
                <div className="w-12 h-12 rounded-full bg-red-100 group-hover:bg-red-600 flex items-center justify-center text-red-600 group-hover:text-white transition-colors shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-800 group-hover:text-red-700 transition-colors text-base sm:text-lg">Outreach Form</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-0.5">Register new contacts</div>
                </div>
              </button>

              {/* Followups Button */}
              <button
                type="button"
                onClick={() => {
                  setShowOutreachModal(false);
                  router.push('/outreach');
                }}
                className="w-full flex bg-red-50 hover:bg-red-100 items-center gap-4 px-5 py-4 cursor-pointer rounded-xl shadow-sm hover:shadow transition-all border-2 border-red-300 hover:border-red-600 group text-left"
              >
                <div className="w-12 h-12 rounded-full bg-red-100 group-hover:bg-red-600 flex items-center justify-center text-red-600 group-hover:text-white transition-colors shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-gray-800 group-hover:text-red-700 transition-colors text-base sm:text-lg">Followups</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-0.5">View & manage followups</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
