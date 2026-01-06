"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Save, X, Calendar, Mail, Phone, MapPin, Briefcase, User, Award, Target } from "lucide-react";

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
    participantsUnder?: number;
    isActive?: boolean;
    createdAt: string;
    updatedAt: string;
}

function VolunteerDetailContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const programId = params.id as string;
    const userId = params.userId as string;

    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<UserData>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchUser();
        // Check if we should start in edit mode
        if (searchParams.get('edit') === 'true') {
            setIsEditing(true);
        }
    }, [userId, searchParams]);

    const fetchUser = async () => {
        try {
            console.log('Fetching user with ID:', userId);
            const res = await fetch(`/api/users/${userId}`);
            console.log('Response status:', res.status);

            if (res.ok) {
                const data = await res.json();
                console.log('User data:', data);
                setUser(data.user);
                setFormData(data.user);
            } else {
                const errorData = await res.json();
                console.error('Error response:', errorData);
                setMessage({ type: 'error', text: errorData.message || 'Failed to fetch user details' });
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            setMessage({ type: 'error', text: 'Error loading user details' });
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

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch(`/api/users/${userId}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'User updated successfully!' });
                setUser(data.user);
                setIsEditing(false);
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to update user' });
            }
        } catch (error) {
            console.error("Error updating user:", error);
            setMessage({ type: 'error', text: 'Error updating user' });
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
                <main className="grow flex items-center justify-center">
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
                <main className="grow flex items-center justify-center">
                    <div className="text-xl text-gray-600">User not found</div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50" style={{ 
            backgroundImage: 'url(/backgrou.png)', 
            backgroundSize: '25%',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        }}>
            <Header />

            <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="w-full sm:w-auto">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Volunteer Details</h1>
                            <p className="text-sm sm:text-base text-gray-600 mt-1">
                                {isEditing ? 'Edit volunteer information' : 'View volunteer information'}
                            </p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => router.back()}
                                className="px-4 py-2 text-gray-600 cursor-pointer hover:text-gray-800 font-medium text-sm sm:text-base"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    {/* Personal Information */}
                    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <User size={20} className="sm:w-6 sm:h-6" />
                                Personal Information
                            </h2>
                            {!isEditing ? (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="w-full sm:w-auto px-4 py-2 bg-[#A65353] text-white cursor-pointer rounded-lg transition-colors text-sm sm:text-base"
                                >
                                    Edit
                                </button>
                            ) : (
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-200 cursor-pointer text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#A65353] cursor-pointer text-white rounded-lg hover:bg-[#8B4545] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                                    >
                                        <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Name *
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name || ''}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.name}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <Mail size={16} />
                                    Email *
                                </label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email || ''}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.email}</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <Phone size={16} />
                                    Phone
                                </label>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.phone || 'N/A'}</p>
                                )}
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Gender
                                </label>
                                {isEditing ? (
                                    <select
                                        name="gender"
                                        value={formData.gender || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                ) : (
                                    <p className="text-gray-800 py-2">{user.gender || 'N/A'}</p>
                                )}
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <Calendar size={16} />
                                    Date of Birth
                                </label>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">
                                        {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A'}
                                    </p>
                                )}
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Role *
                                </label>
                                {isEditing ? (
                                    <select
                                        name="role"
                                        value={formData.role || ''}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="guest">Guest</option>
                                        <option value="participant">Participant</option>
                                        <option value="volunteer">Volunteer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                ) : (
                                    <p className="text-gray-800 py-2 capitalize">
                                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'volunteer' ? 'bg-blue-100 text-blue-800' :
                                                user.role === 'participant' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </p>
                                )}
                            </div>

                            {/* Active Status */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Status
                                </label>
                                {isEditing ? (
                                    <label className="flex items-center gap-2 py-2">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive ?? true}
                                            onChange={handleCheckboxChange}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-700">Active</span>
                                    </label>
                                ) : (
                                    <p className="py-2">
                                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </p>
                                )}
                            </div>

                            {/* Marital Status */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Marital Status
                                </label>
                                {isEditing ? (
                                    <select
                                        name="maritalStatus"
                                        value={formData.maritalStatus || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select Status</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                    </select>
                                ) : (
                                    <p className="text-gray-800 py-2">{user.maritalStatus || 'N/A'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Professional Details */}
                    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                            <Briefcase size={20} className="sm:w-6 sm:h-6" />
                            Professional & Location Details
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {/* Profession */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Profession
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="profession"
                                        value={formData.profession || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.profession || 'N/A'}</p>
                                )}
                            </div>

                            {/* Home Town */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <MapPin size={16} />
                                    Home Town
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="homeTown"
                                        value={formData.homeTown || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.homeTown || 'N/A'}</p>
                                )}
                            </div>

                            {/* Address */}
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Address
                                </label>
                                {isEditing ? (
                                    <textarea
                                        name="address"
                                        value={formData.address || ''}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.address || 'N/A'}</p>
                                )}
                            </div>

                            {/* Connected to Temple */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Connected to Temple
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="connectedToTemple"
                                        value={formData.connectedToTemple || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.connectedToTemple || 'N/A'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Spiritual Details */}
                    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                            <Award size={20} className="sm:w-6 sm:h-6" />
                            Spiritual Progress
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {/* Level */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Level
                                </label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="level"
                                        value={formData.level || 0}
                                        onChange={handleInputChange}
                                        min="0"
                                        placeholder="e.g., 1, 2, 3"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.level || 'N/A'}</p>
                                )}
                            </div>

                            {/* Grade */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Grade
                                </label>
                                {isEditing ? (
                                    <select
                                        name="grade"
                                        value={formData.grade || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select Grade</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                    </select>
                                ) : (
                                    <p className="text-gray-800 py-2">{user.grade || 'N/A'}</p>
                                )}
                            </div>

                            {/* Number of Rounds */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <Target size={16} />
                                    Number of Rounds
                                </label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="numberOfRounds"
                                        value={formData.numberOfRounds || 0}
                                        onChange={handleInputChange}
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.numberOfRounds || 0}</p>
                                )}
                            </div>

                            {/* How Did You Hear About Us */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    How Did You Hear About Us?
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="howDidYouHearAboutUs"
                                        value={formData.howDidYouHearAboutUs || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.howDidYouHearAboutUs || 'N/A'}</p>
                                )}
                            </div>

                            {/* Participants Under */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Participants Under
                                </label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        name="participantsUnder"
                                        value={formData.participantsUnder || 0}
                                        onChange={handleInputChange}
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                ) : (
                                    <p className="text-gray-800 py-2">{user.participantsUnder || 0}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Record Information</h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                                    Created At
                                </label>
                                <p className="text-sm sm:text-base text-gray-800 py-2">
                                    {new Date(user.createdAt).toLocaleString()}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                                    Last Updated
                                </label>
                                <p className="text-sm sm:text-base text-gray-800 py-2">
                                    {new Date(user.updatedAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </main>

            <Footer />
        </div>
    );
}

export default function VolunteerDetailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <img src="/mrdanga.png" alt="Loading" className="w-20 h-20 animate-spin" />
            </div>
        }>
            <VolunteerDetailContent />
        </Suspense>
    );
}
