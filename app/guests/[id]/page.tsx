"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Edit2, Save, X, Mail, Phone, MapPin, Briefcase, Calendar, User, Home } from "lucide-react";

interface Guest {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: Date;
  address?: string;
  profession?: string;
  homeTown?: string;
  connectedToTemple?: string;
  numberOfRounds?: number;
  isActive?: boolean;
  maritalStatus?: string;
  role: string;
  createdAt: Date;
}

function GuestDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.id as string;

  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get('edit') === 'true');
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    profession: "",
    homeTown: "",
    connectedToTemple: "",
    numberOfRounds: "",
    isActive: true,
    maritalStatus: "",
    role: "",
  });

  useEffect(() => {
    checkAuthAndFetchData();
  }, [userId]);

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
      await fetchGuestDetails();
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    }
  };

  const fetchGuestDetails = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch guest details");
      }
      const data = await response.json();
      
      if (data.user && data.user.role === "guest") {
        setGuest(data.user);
        setFormData({
          name: data.user.name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          gender: data.user.gender || "",
          dateOfBirth: data.user.dateOfBirth ? new Date(data.user.dateOfBirth).toISOString().split('T')[0] : "",
          address: data.user.address || "",
          profession: data.user.profession || "",
          homeTown: data.user.homeTown || "",
          connectedToTemple: data.user.connectedToTemple || "",
          numberOfRounds: data.user.numberOfRounds?.toString() || "",
          isActive: data.user.isActive ?? true,
          maritalStatus: data.user.maritalStatus || "",
          role: data.user.role || "",
        });
      } else {
        router.push("/guests");
      }
    } catch (error) {
      console.error("Error fetching guest:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        gender: formData.gender || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address || undefined,
        profession: formData.profession || undefined,
        homeTown: formData.homeTown || undefined,
        connectedToTemple: formData.connectedToTemple || undefined,
        numberOfRounds: formData.numberOfRounds ? parseInt(formData.numberOfRounds) : undefined,
        isActive: formData.isActive,
        maritalStatus: formData.maritalStatus || undefined,
        role: formData.role || undefined,
      };

      const response = await fetch(`/api/users/${userId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        await fetchGuestDetails();
        setEditing(false);
      } else {
        alert("Failed to update guest");
      }
    } catch (error) {
      console.error("Error updating guest:", error);
      alert("Error updating guest");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (guest) {
      setFormData({
        name: guest.name || "",
        email: guest.email || "",
        phone: guest.phone || "",
        gender: guest.gender || "",
        dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth).toISOString().split('T')[0] : "",
        address: guest.address || "",
        profession: guest.profession || "",
        homeTown: guest.homeTown || "",
        connectedToTemple: guest.connectedToTemple || "",
        numberOfRounds: guest.numberOfRounds?.toString() || "",
        isActive: guest.isActive ?? true,
        maritalStatus: guest.maritalStatus || "",
        role: guest.role || "",
      });
    }
    setEditing(false);
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

  if (!guest) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl text-gray-800 mb-4">Guest not found</div>
            <button
              onClick={() => router.push("/guests")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Guests
            </button>
          </div>
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
      
      <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Guest Details</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">View and edit guest information</p>
            </div>
            <button
              onClick={() => router.push("/guests")}
              className="px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap"
            >
              ← Back to Guests
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {editing ? "Edit Guest" : "Guest Information"}
            </h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <Edit2 size={18} />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <X size={18} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Personal Information */}
            <div className="border-b pb-6">
              <h3 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <User size={20} className="text-blue-600" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-800 py-2">{guest.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  {editing ? (
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 py-2">{guest.gender || "Not specified"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  {editing ? (
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800 py-2 flex items-center gap-2">
                      <Calendar size={16} className="text-gray-500" />
                      {guest.dateOfBirth ? new Date(guest.dateOfBirth).toLocaleDateString() : "Not specified"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                  {editing ? (
                    <select
                      value={formData.maritalStatus}
                      onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 py-2">{guest.maritalStatus || "Not specified"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-b pb-6">
              <h3 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Phone size={20} className="text-green-600" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  {editing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-800 py-2 flex items-center gap-2">
                      <Mail size={16} className="text-gray-500" />
                      {guest.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800 py-2 flex items-center gap-2">
                      <Phone size={16} className="text-gray-500" />
                      {guest.phone || "Not specified"}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  {editing ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  ) : (
                    <p className="text-gray-800 py-2 flex items-start gap-2">
                      <MapPin size={16} className="text-gray-500 mt-1" />
                      {guest.address || "Not specified"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="border-b pb-6">
              <h3 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Briefcase size={20} className="text-purple-600" />
                Additional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.profession}
                      onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800 py-2 flex items-center gap-2">
                      <Briefcase size={16} className="text-gray-500" />
                      {guest.profession || "Not specified"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Home Town</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.homeTown}
                      onChange={(e) => setFormData({ ...formData, homeTown: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800 py-2 flex items-center gap-2">
                      <Home size={16} className="text-gray-500" />
                      {guest.homeTown || "Not specified"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Connected to Temple</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.connectedToTemple}
                      onChange={(e) => setFormData({ ...formData, connectedToTemple: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800 py-2">{guest.connectedToTemple || "Not specified"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Rounds</label>
                  {editing ? (
                    <input
                      type="number"
                      value={formData.numberOfRounds}
                      onChange={(e) => setFormData({ ...formData, numberOfRounds: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  ) : (
                    <p className="text-gray-800 py-2">{guest.numberOfRounds || "Not specified"}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  {editing ? (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.isActive}
                          onChange={() => setFormData({ ...formData, isActive: true })}
                          className="w-4 h-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!formData.isActive}
                          onChange={() => setFormData({ ...formData, isActive: false })}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">Inactive</span>
                      </label>
                    </div>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${guest.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {guest.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-4">Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  {editing ? (
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {(currentUser?.role === "admin" || currentUser?.role === "volunteer") && <option value="volunteer">Volunteer</option>}
                      <option value="participant">Participant</option>
                      <option value="guest">Guest</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 capitalize">{guest.role}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Registered</label>
                  <p className="text-gray-800">{new Date(guest.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function GuestDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <img src="/mrdanga.png" alt="Loading" className="w-20 h-20 animate-spin" />
      </div>
    }>
      <GuestDetailsContent />
    </Suspense>
  );
}
