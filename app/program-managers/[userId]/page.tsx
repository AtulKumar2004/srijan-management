"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProfileAttendanceTab from "@/components/ProfileAttendanceTab";
import { useModalStore } from "@/store/modalStore";
import { User, Calendar, Briefcase, Phone, Mail, MapPin, Edit, Save, X, ArrowLeft, Shield, CheckCircle2, AlertCircle } from "lucide-react";

interface UserData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profession?: string;
  homeTown?: string;
  connectedToTemple?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  numberOfRounds?: number;
  level?: number;
  grade?: string;
  maritalStatus?: string;
  programs?: string[];
  isActive?: boolean;
  createdAt: string;
}

interface Program {
  _id: string;
  name: string;
}

export default function ProgramManagerProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<Partial<UserData>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "attendance">("profile");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const { showConfirm } = useModalStore();

  useEffect(() => {
    setIsEditing(searchParams.get("edit") === "true");
    loadData();
  }, [userId, searchParams]);

  const loadData = async () => {
    try {
      const authRes = await fetch("/api/auth/me");
      if (authRes.ok) {
        const authData = await authRes.json();
        setCurrentUserRole(authData.user?.role || "");
      }

      const [userRes, progRes] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch(`/api/programs`)
      ]);

      if (userRes.ok) {
        const data = await userRes.json();
        setUser(data.user);
        setFormData(data.user);
      } else {
        setMessage({ type: "error", text: "Failed to fetch user profile" });
      }

      if (progRes.ok) {
        const pData = await progRes.json();
        setPrograms(pData.programs || []);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload: any = { ...formData };
      if (payload.role && payload.role !== user?.role && payload.role !== "program_manager") {
        const roleName = payload.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        const confirmed = await showConfirm({
          title: "Confirm Role Change",
          message: `Are you sure you want to change this person's role from Program Manager to ${roleName}? This will remove them from the Program Managers list.`,
          type: "danger",
          confirmText: "Yes, Change Role",
          cancelText: "Cancel",
        });
        if (!confirmed) {
          setSaving(false);
          return;
        }
      }

      const res = await fetch(`/api/users/${userId}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        const roleChanged = payload.role && payload.role !== "program_manager";
        
        if (roleChanged) {
          const from = searchParams.get("from");
          router.replace(from || "/program-managers");
          return;
        }

        setUser(data.user || payload);
        setIsEditing(false);
        setMessage({ type: "success", text: "Profile updated successfully" });
        loadData();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Unexpected error occurred saving profile" });
    } finally {
      setSaving(false);
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

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl text-gray-600">Profile not found</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50"
      style={{ backgroundImage: "url(/backgrou.png)", backgroundSize: "30%", backgroundRepeat: "repeat" }}>
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-semibold text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Program Managers
        </button>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xl sm:text-2xl">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-800 truncate">{user.name}</h1>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 capitalize">
                    <Shield size={12} />
                    {user.role.replace("_", " ")}
                  </span>
                  {user.email && <span className="text-xs sm:text-sm text-gray-500 break-all sm:break-normal"><span className="hidden sm:inline">• </span>{user.email}</span>}
                </div>
              </div>
            </div>

            {currentUserRole === "admin" && (
              <div className="flex gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm transition-colors shadow-sm"
                  >
                    <Edit size={16} />
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={() => { setIsEditing(false); setFormData(user); }}
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {message && (
            <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
              {message.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Navigation Tabs - Strictly limited to Profile & Attendance */}
          <div className="flex gap-4 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === "profile"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === "attendance"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              Attendance History
            </button>
          </div>
        </div>

        {activeTab === "profile" && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User size={20} className="text-purple-600" />
                Personal Information & Role
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Name *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name || ""}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium py-1">{user.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                    <span>Email *</span>
                    <span className="text-[10px] text-gray-400 font-normal">Read-only</span>
                  </label>
                  <p className="text-gray-800 font-medium py-1.5 px-3 bg-gray-50 rounded-lg border border-gray-200">{user.email}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                    <span>Phone *</span>
                    <span className="text-[10px] text-gray-400 font-normal">Read-only</span>
                  </label>
                  <p className="text-gray-800 font-medium py-1.5 px-3 bg-gray-50 rounded-lg border border-gray-200">{user.phone}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Role *</label>
                  {isEditing && currentUserRole === "admin" ? (
                    <select
                      name="role"
                      value={formData.role || user.role}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white font-semibold text-purple-900"
                    >
                      <option value="program_manager">Program Manager</option>
                      <option value="volunteer">Volunteer</option>
                      <option value="participant">Participant</option>
                      <option value="guest">Guest</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 font-medium py-1 capitalize">{user.role.replace("_", " ")}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Address</label>
                  {isEditing ? (
                    <textarea
                      name="address"
                      rows={2}
                      value={formData.address || ""}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium py-1">{user.address || "Not provided"}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Briefcase size={20} className="text-purple-600" />
                Program Assignment & Level
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                    <span>Assigned Program</span>
                    <span className="text-[10px] text-gray-400 font-normal">Read-only</span>
                  </label>
                  <p className="text-gray-800 font-medium py-1.5 px-3 bg-gray-50 rounded-lg border border-gray-200">
                    {programs.find(p => p._id === user.programs?.[0])?.name || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Level</label>
                  {isEditing ? (
                    <select
                      name="level"
                      value={formData.level || 1}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    >
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="4">Level 4</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 font-medium py-1">Level {user.level || 1}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Grade</label>
                  {isEditing ? (
                    <select
                      name="grade"
                      value={formData.grade || "A"}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    >
                      <option value="A+">A+</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 font-medium py-1">Grade {user.grade || "N/A"}</p>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setFormData(user); }}
                  className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 disabled:bg-purple-400 transition-colors shadow-sm"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </form>
        )}

        {activeTab === "attendance" && (
          user?.programs?.[0] ? (
            <ProfileAttendanceTab userId={userId} programId={user.programs[0]} />
          ) : (
            <div className="bg-white rounded-xl shadow-md p-6 text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-800">Attendance History</h3>
              <p className="text-gray-500 text-sm mt-1">
                No program assigned to this Program Manager yet. Please assign a program to view attendance history.
              </p>
            </div>
          )
        )}
      </main>

      <Footer />
    </div>
  );
}
