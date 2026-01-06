"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Edit2, Save, X, Mail, Phone, MapPin, Briefcase, Calendar, User, Home } from "lucide-react";

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

export default function OutreachDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.id as string;

  const [outreach, setOutreach] = useState<Outreach | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get('edit') === 'true');
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [admins, setAdmins] = useState<{ _id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
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
    comment: "",
  });

  useEffect(() => {
    if (userId) {
      checkAuthAndFetchData();
      fetchAdmins();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/users/by-role?role=admin');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

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
      await fetchOutreachDetails();
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    }
  };

  const fetchOutreachDetails = async () => {
    try {
      console.log("Fetching outreach details for ID:", userId);
      const response = await fetch(`/api/outreach/${userId}`);
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error("Failed to fetch outreach details");
      }
      const data = await response.json();
      console.log("Received data:", data);
      
      if (data.contact) {
        setOutreach(data.contact);
        setFormData({
          name: data.contact.name || "",
          phone: data.contact.phone || "",
          profession: data.contact.profession || "",
          motherTongue: data.contact.motherTongue || "",
          currentLocation: data.contact.currentLocation || "",
          registeredBy: data.contact.registeredBy || "",
          numberOfRounds: data.contact.numberOfRounds?.toString() || "",
          branch: data.contact.branch || "",
          paidStatus: data.contact.paidStatus || "",
          underWhichAdmin: data.contact.underWhichAdmin || "",
          comment: data.contact.comment || "",
        });
      } else {
        router.push("/outreach");
      }
    } catch (error) {
      console.error("Error fetching outreach:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        profession: formData.profession,
        motherTongue: formData.motherTongue || undefined,
        currentLocation: formData.currentLocation || undefined,
        registeredBy: formData.registeredBy,
        numberOfRounds: formData.numberOfRounds ? parseInt(formData.numberOfRounds) : 0,
        branch: formData.branch,
        paidStatus: formData.paidStatus,
        underWhichAdmin: formData.underWhichAdmin || undefined,
        comment: formData.comment || undefined,
      };

      console.log("Submitting update data:", updateData);

      const response = await fetch(`/api/outreach/${userId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const responseData = await response.json();
      console.log("Update response:", responseData);

      if (response.ok) {
        setEditing(false);
        await fetchOutreachDetails();
      } else {
        alert(`Failed to update outreach contact: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error updating outreach:", error);
      alert("Error updating outreach contact");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (outreach) {
      setFormData({
        name: outreach.name || "",
        phone: outreach.phone || "",
        profession: outreach.profession || "",
        motherTongue: outreach.motherTongue || "",
        currentLocation: outreach.currentLocation || "",
        registeredBy: outreach.registeredBy || "",
        numberOfRounds: outreach.numberOfRounds?.toString() || "",
        branch: outreach.branch || "",
        underWhichAdmin: outreach.underWhichAdmin || "",
        paidStatus: outreach.paidStatus || "",
        comment: outreach.comment || "",
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

  if (!outreach) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl text-gray-800 mb-4">Outreach contact not found</div>
            <button
              onClick={() => router.push("/outreach")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Outreach
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Outreach Contact Details</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">View and edit outreach contact information</p>
            </div>
            <button
              onClick={() => router.push("/outreach")}
              className="px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap"
            >
              ← Back to Outreach
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {editing ? "Edit Outreach Contact" : "Contact Information"}
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
                    <p className="text-gray-800 py-2">{outreach.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-800 py-2 flex items-center gap-2">
                      <Phone size={16} className="text-gray-500" />
                      {outreach.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profession *</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.profession}
                      onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-800 py-2 flex items-center gap-2">
                      <Briefcase size={16} className="text-gray-500" />
                      {outreach.profession}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mother Tongue</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.motherTongue}
                      onChange={(e) => setFormData({ ...formData, motherTongue: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800 py-2">{outreach.motherTongue || "Not specified"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Location</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.currentLocation}
                      onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-800 py-2 flex items-center gap-2">
                      <MapPin size={16} className="text-gray-500" />
                      {outreach.currentLocation || "Not specified"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registered By *</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.registeredBy}
                      onChange={(e) => setFormData({ ...formData, registeredBy: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-800 py-2">{outreach.registeredBy}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Temple Information */}
            <div className="border-b pb-6">
              <h3 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Home size={20} className="text-purple-600" />
                Temple Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Temple Branch *</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-800 py-2">{outreach.branch}</p>
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
                    <p className="text-gray-800 py-2">{outreach.numberOfRounds || 0}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status *</label>
                  {editing ? (
                    <select
                      value={formData.paidStatus}
                      onChange={(e) => setFormData({ ...formData, paidStatus: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Status</option>
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Sponsored">Sponsored</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      outreach.paidStatus === 'Paid' 
                        ? 'bg-green-100 text-green-800' 
                        : outreach.paidStatus === 'Unpaid'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {outreach.paidStatus}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Under Which Admin</label>
                  {editing ? (
                    <select
                      value={formData.underWhichAdmin}
                      onChange={(e) => setFormData({ ...formData, underWhichAdmin: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Admin</option>
                      {admins.map((admin) => (
                        <option key={admin._id} value={admin.name}>{admin.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-800 py-2">{outreach.underWhichAdmin || "Not specified"}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                  {editing ? (
                    <textarea
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  ) : (
                    <p className="text-gray-800 py-2">{outreach.comment || "No comment"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-4">Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Registered</label>
                  <p className="text-gray-800 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    {new Date(outreach.createdAt).toLocaleDateString()}
                  </p>
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
