"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AttendanceChart from "@/components/AttendanceChart";
import { Save, X, Calendar, Mail, Phone, MapPin, Briefcase, User, Award, Target, BarChart3 } from "lucide-react";

interface UserData {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    profession?: string;
    homeTown?: string;
    connectedToTemple?: string;
    gender?: string;
    dateOfBirth?: string;
    address?: string;
    level?: number;
    grade?: string;
    numberOfRounds?: number;
    howDidYouHearAboutUs?: string;
    maritalStatus?: string;
    isActive?: boolean;
    createdAt: string;
    updatedAt: string;
}

interface AttendanceData {
    totalSessions: number;
    monthlyData: { month: string; sessions: number }[];
    programData: { name: string; sessions: number }[];
    recentSessions: { date: string; program: string; status: string }[];
}

export default function ProfilePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const viewUserId = searchParams.get('userId'); // Get userId from query params

    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<UserData>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'attendance'>('profile');
    const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [isViewingOtherUser, setIsViewingOtherUser] = useState(false);

    useEffect(() => {
        checkAuthAndFetchProfile();
    }, []);

    // Auto-switch to attendance tab for volunteers/participants after user loads
    useEffect(() => {
        if (user && (user.role === 'volunteer' || user.role === 'participant')) {
            setActiveTab('attendance');
        }
    }, [user]);

    useEffect(() => {
        if (user && activeTab === 'attendance' && !attendanceData && (user.role === 'volunteer' || user.role === 'participant')) {
            fetchAttendanceHistory();
        }
    }, [activeTab, user]);

    const fetchAttendanceHistory = async () => {
        if (!user) return;
        
        setLoadingAttendance(true);
        try {
            const res = await fetch(`/api/users/${user._id}/attendance-history`);
            if (res.ok) {
                const data = await res.json();
                setAttendanceData(data);
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
        } finally {
            setLoadingAttendance(false);
        }
    };

    const checkAuthAndFetchProfile = async () => {
        try {
            // If viewing another user's profile
            if (viewUserId) {
                setIsViewingOtherUser(true);
                const res = await fetch(`/api/users/${viewUserId}`);
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                    setFormData(data.user);
                } else {
                    router.push("/profile"); // Redirect to own profile if user not found
                }
            } else {
                // Viewing own profile
                setIsViewingOtherUser(false);
                const res = await fetch("/api/auth/me");
                if (!res.ok) {
                    router.push("/login");
                    return;
                }

                const data = await res.json();
                if (data.user) {
                    setUser(data.user);
                    setFormData(data.user);
                } else {
                    router.push("/login");
                }
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value ? parseInt(value) : 0) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch(`/api/users/${user?._id}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setUser(data.user);
                setIsEditing(false);
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to update profile' });
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ type: 'error', text: 'Error updating profile' });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData(user || {});
        setIsEditing(false);
        setMessage(null);
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
        <div className="min-h-screen flex flex-col" style={{
            backgroundImage: 'url(/backgrou.png)',
            backgroundSize: '25%',
            backgroundRepeat: 'repeat'
        }}>
            <Header />

            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-5xl">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">My Profile</h1>
                            <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage your personal information and attendance</p>
                        </div>
                        {activeTab === 'profile' && !isViewingOtherUser && (
                            <div className="flex gap-2">
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-colors font-medium text-sm sm:text-base"
                                    >
                                        Edit Profile
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm sm:text-base flex items-center gap-2"
                                        >
                                            <X size={18} />
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={saving}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium text-sm sm:text-base flex items-center gap-2"
                                        >
                                            <Save size={18} />
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {/* Tabs */}
                {(user.role === 'volunteer' || user.role === 'participant') && (
                    <div className="bg-white rounded-lg shadow-md mb-4 sm:mb-6 p-1">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                                    activeTab === 'profile'
                                        ? 'bg-cyan-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <User className="w-5 h-5" />
                                Profile
                            </button>
                            <button
                                onClick={() => setActiveTab('attendance')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                                    activeTab === 'attendance'
                                        ? 'bg-cyan-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <BarChart3 className="w-5 h-5" />
                                Attendance
                            </button>
                        </div>
                    </div>
                )}
                {/* Message */}
                {message && (
                    <div className={`mb-4 p-3 sm:p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleSubmit}>
                        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-6">
                        {/* Personal Information */}
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <User size={24} className="text-[#A65353]" />
                                Personal Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Name *
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name || ''}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Mail size={16} className="inline mr-1" />
                                        Email
                                    </label>
                                    <p className="text-gray-900">{user.email}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Phone size={16} className="inline mr-1" />
                                        Phone
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user.phone || 'Not provided'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gender
                                    </label>
                                    {isEditing ? (
                                        <select
                                            name="gender"
                                            value={formData.gender || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    ) : (
                                        <p className="text-gray-900">{user.gender || 'Not specified'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Calendar size={16} className="inline mr-1" />
                                        Date of Birth
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            name="dateOfBirth"
                                            value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">
                                            {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not provided'}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Marital Status
                                    </label>
                                    {isEditing ? (
                                        <select
                                            name="maritalStatus"
                                            value={formData.maritalStatus || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select Status</option>
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                            <option value="Divorced">Divorced</option>
                                            <option value="Widowed">Widowed</option>
                                        </select>
                                    ) : (
                                        <p className="text-gray-900">{user.maritalStatus || 'Not specified'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Location & Contact */}
                        <div className="border-t pt-6">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <MapPin size={24} className="text-[#A65353]" />
                                Location & Contact
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Home Town
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="homeTown"
                                            value={formData.homeTown || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user.homeTown || 'Not provided'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Connected to Temple
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="connectedToTemple"
                                            value={formData.connectedToTemple || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user.connectedToTemple || 'Not provided'}</p>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Address
                                    </label>
                                    {isEditing ? (
                                        <textarea
                                            name="address"
                                            value={formData.address || ''}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user.address || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Professional & Spiritual */}
                        <div className="border-t pt-6">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Briefcase size={24} className="text-[#A65353]" />
                                Professional & Spiritual Details
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Profession
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="profession"
                                            value={formData.profession || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user.profession || 'Not provided'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Number of Rounds
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            name="numberOfRounds"
                                            value={formData.numberOfRounds || 0}
                                            onChange={handleInputChange}
                                            min="0"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user.numberOfRounds || 0}</p>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        How Did You Hear About Us?
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="howDidYouHearAboutUs"
                                            value={formData.howDidYouHearAboutUs || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user.howDidYouHearAboutUs || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Account Status */}
                        <div className="border-t pt-6">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
                                Account Status
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Role
                                    </label>
                                    <p className="text-gray-900 capitalize">{user.role}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Account Status
                                    </label>
                                    <p className={`font-semibold ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                        {user.isActive ? 'Active' : 'Inactive'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    </form>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                    <div>
                        {loadingAttendance ? (
                            <div className="bg-white rounded-lg shadow-md p-12 flex items-center justify-center">
                                <img src="/mrdanga.png" alt="Loading" className="w-16 h-16 animate-spin" />
                            </div>
                        ) : attendanceData ? (
                            <AttendanceChart
                                totalSessions={attendanceData.totalSessions}
                                monthlyData={attendanceData.monthlyData}
                                programData={attendanceData.programData}
                                recentSessions={attendanceData.recentSessions}
                            />
                        ) : (
                            <div className="bg-white rounded-lg shadow-md p-12 text-center">
                                <p className="text-gray-600">No attendance data available</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
