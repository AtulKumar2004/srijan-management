"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProfileFollowupTab from "@/components/ProfileFollowupTab";
import ProfileRemarkTab from "@/components/ProfileRemarkTab";
import ProfileAttendanceTab from "@/components/ProfileAttendanceTab";
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
    handledBy?: string;
    isActive?: boolean;
    programId?: string;
    programs?: string[];
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
    const [programParticipants, setProgramParticipants] = useState<UserData[]>([]);
    const [assignedIds, setAssignedIds] = useState<string[]>([]);
    const [volunteers, setVolunteers] = useState<UserData[]>([]);
    const [handledByName, setHandledByName] = useState<string>('N/A');
    const isEditMode = searchParams.get('edit') === 'true';
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(isEditMode);
    const [formData, setFormData] = useState<Partial<UserData>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'profile' | 'followup' | 'remark' | 'attendance'>('profile');

    const isSelf = Boolean(currentUserId && userId && String(currentUserId) === String(userId));
    const canEditAdministrative = currentUserRole === 'admin' || currentUserRole === 'program_manager' || (!isSelf && Boolean(user?.handledBy && String(user.handledBy) === String(currentUserId)));
    const canEditHandledBy = !isSelf && (currentUserRole === 'admin' || currentUserRole === 'program_manager');

    const canViewFollowupTab = currentUserRole === 'admin' || currentUserRole === 'program_manager' || (currentUserRole === 'volunteer' && isSelf);
    const canViewRemarkTab = currentUserRole === 'admin' || currentUserRole === 'program_manager' || (!isSelf && currentUserRole === 'volunteer');

    useEffect(() => {
        fetchUser();
        setIsEditing(searchParams.get('edit') === 'true');
    }, [userId, searchParams]);

    useEffect(() => {
        if (currentUserRole && currentUserId && user) {
            const canEdit = currentUserRole === 'admin' || currentUserRole === 'program_manager' || userId === currentUserId || (currentUserRole === 'volunteer' && user.handledBy === currentUserId);
            if (!canEdit) {
                setIsEditing(false);
            } else {
                setIsEditing(searchParams.get('edit') === 'true');
            }
        }
    }, [currentUserRole, currentUserId, userId, user, searchParams]);

    const fetchUser = async () => {
        try {
            console.log('Fetching user with ID:', userId);
            const [res, partRes, meRes, volRes] = await Promise.all([
                fetch(`/api/users/${userId}`),
                fetch(`/api/users/by-role?role=participant,volunteer&programId=${programId}`),
                fetch(`/api/auth/me`),
                fetch(`/api/users/by-role?role=volunteer`)
            ]);

            let vols: UserData[] = [];
            if (volRes.ok) {
                const vData = await volRes.json();
                vols = vData.users || [];
                setVolunteers(vols);
            }

            if (meRes.ok) {
                const meData = await meRes.json();
                const role = meData.user?.role || '';
                setCurrentUserId(meData.user?._id || '');
                setCurrentUserRole(role);

                if (role === 'participant') {
                    router.replace(`/programs/${programId}`);
                    return;
                }
            }

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setFormData(data.user);
                if (data.user.handledBy && data.user.handledBy !== 'unassigned') {
                    const m = vols.find(v => v._id === data.user.handledBy);
                    if (m) {
                        setHandledByName(m.name);
                    } else {
                        fetch(`/api/users/${data.user.handledBy}`).then(r => r.json()).then(d => {
                            if (d?.user?.name) setHandledByName(d.user.name);
                        }).catch(() => { });
                    }
                } else {
                    setHandledByName('N/A');
                }
            } else {
                const errorData = await res.json();
                setMessage({ type: 'error', text: errorData.message || 'Failed to fetch user details' });
            }

            if (partRes.ok) {
                const pData = await partRes.json();
                const parts: UserData[] = pData.users || [];
                setProgramParticipants(parts);
                setAssignedIds(parts.filter(p => p.handledBy === userId).map(p => p._id));
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
                body: JSON.stringify({ ...formData, programId: formData.programId || programId }),
            });

            const data = await res.json();

            if (res.status === 202) {
                setMessage({ type: 'success', text: data.message || 'Approval request sent to admin.' });
                await fetchUser();
                setIsEditing(false);
                setTimeout(() => setMessage(null), 4000);
            } else if (res.ok) {
                const roleChanged = formData.role && formData.role !== "volunteer";

                if (currentUserRole === 'admin' || currentUserRole === 'program_manager') {
                    // Update assigned participants
                    await Promise.all(
                        programParticipants.map(p => {
                            const shouldBeAssigned = assignedIds.includes(p._id);
                            const currentlyAssigned = p.handledBy === userId;
                            if (shouldBeAssigned !== currentlyAssigned) {
                                return fetch(`/api/users/${p._id}/update`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ handledBy: shouldBeAssigned ? userId : "" })
                                });
                            }
                            return Promise.resolve();
                        })
                    );
                }

                if (roleChanged) {
                    router.replace(`/programs/${programId}/volunteers`);
                    return;
                }

                await fetchUser();
                setMessage({ type: 'success', text: 'Volunteer & mentees updated successfully!' });
                setIsEditing(false);
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: data.error || data.message || 'Failed to update user' });
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
        setAssignedIds(programParticipants.filter(p => p.handledBy === userId).map(p => p._id));
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

                    {/* Navigation Tabs */}
                    <div className="flex border-b border-gray-200 mt-6 -mb-4 sm:-mb-6 gap-6 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setActiveTab('profile')}
                            className={`pb-3 px-1 font-bold text-base border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'profile'
                                ? 'border-[#A65353] text-[#A65353]'
                                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                                }`}
                        >
                            Profile
                        </button>
                        {canViewFollowupTab && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('followup')}
                                className={`pb-3 px-1 font-bold text-base border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'followup'
                                    ? 'border-[#A65353] text-[#A65353]'
                                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                                    }`}
                            >
                                Followup
                            </button>
                        )}
                        {canViewRemarkTab && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('remark')}
                                className={`pb-3 px-1 font-bold text-base border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'remark'
                                    ? 'border-[#A65353] text-[#A65353]'
                                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                                    }`}
                            >
                                Remark
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setActiveTab('attendance')}
                            className={`pb-3 px-1 font-bold text-base border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'attendance'
                                ? 'border-[#A65353] text-[#A65353]'
                                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                                }`}
                        >
                            Attendance
                        </button>
                    </div>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {message.text}
                    </div>
                )}

                {activeTab === 'followup' && (
                    <ProfileFollowupTab userId={userId} programId={programId} />
                )}

                {canViewRemarkTab && activeTab === 'remark' && (
                    <ProfileRemarkTab userId={userId} programId={programId} canEdit={currentUserRole === 'admin' || currentUserRole === 'program_manager' || Boolean(user?.handledBy && String(user.handledBy) === String(currentUserId))} />
                )}

                {activeTab === 'attendance' && (
                    <ProfileAttendanceTab userId={userId} programId={programId} />
                )}

                {activeTab === 'profile' && (
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        {/* Personal Information */}
                        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <User size={20} className="sm:w-6 sm:h-6" />
                                    Personal Information
                                </h2>
                                {(currentUserRole === 'admin' || currentUserRole === 'program_manager' || userId === currentUserId || (currentUserRole === 'volunteer' && user?.handledBy === currentUserId)) && (
                                    !isEditing ? (
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
                                    )
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
                                    <p className="text-gray-800 py-2">{user.email}</p>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                        <Phone size={16} />
                                        Phone
                                    </label>
                                    <p className="text-gray-800 py-2">{user.phone || 'N/A'}</p>
                                </div>

                                {/* New Password */}
                                {currentUserId === userId && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            New Password (Optional)
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="password"
                                                name="password"
                                                value={(formData as any).password || ''}
                                                onChange={handleInputChange}
                                                placeholder="Leave blank to keep current password"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        ) : (
                                            <p className="text-gray-400 py-2">••••••••</p>
                                        )}
                                    </div>
                                )}

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
                                    {isEditing && (currentUserRole === 'admin' || currentUserRole === 'program_manager' || canEditAdministrative) && !isSelf ? (
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
                                            {currentUserRole === 'admin' && <option value="program_manager">Program Manager</option>}
                                            {currentUserRole === 'admin' && <option value="admin">Admin</option>}
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

                                {/* Mentor */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Mentor
                                    </label>
                                    {isEditing && canEditHandledBy ? (
                                        <select
                                            name="handledBy"
                                            value={formData.handledBy || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Volunteer</option>
                                            {volunteers.map((v) => (
                                                <option key={v._id} value={v._id}>
                                                    {v.name} ({v.participantsUnder || 0} mentoring)
                                                </option>
                                            ))}
                                        </select>
                                    ) : user?.handledBy && user.handledBy !== 'unassigned' && handledByName !== 'N/A' && !(currentUserRole === 'participant' && !isSelf) ? (
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/programs/${programId}/volunteers/${user.handledBy}`)}
                                            className="text-[#A65353] font-bold hover:underline cursor-pointer py-2 block text-left"
                                        >
                                            {handledByName}
                                        </button>
                                    ) : (
                                        <p className="text-gray-800 py-2">{handledByName}</p>
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
                                    {isEditing && canEditAdministrative ? (
                                        <select
                                            name="level"
                                            value={formData.level || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Select Level</option>
                                            <option value="1">1</option>
                                            <option value="2">2</option>
                                            <option value="3">3</option>
                                            <option value="4">4</option>
                                        </select>
                                    ) : (
                                        <p className="text-gray-800 py-2">{user.level || 'N/A'}</p>
                                    )}
                                </div>

                                {/* Grade */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Grade
                                    </label>
                                    {isEditing && canEditAdministrative ? (
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

                                {/* Mentoring */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Mentoring
                                    </label>
                                    {isEditing && (currentUserRole === 'admin' || currentUserRole === 'program_manager') ? (
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

                        {/* Mentored Selection */}
                        {(!isEditing || (currentUserRole !== 'admin' && currentUserRole !== 'program_manager')) && programParticipants.filter(p => assignedIds.includes(p._id)).length === 0 ? (
                            <div className="bg-white rounded-lg shadow-sm px-4 py-3 mb-4 sm:mb-6 border-l-4 border-[#A65353] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <User size={18} className="text-[#A65353]" />
                                    <span className="font-bold text-gray-800 text-base">Mentored (0)</span>
                                </div>
                                <span className="text-gray-400 italic text-sm">No people assigned to mentor under this volunteer yet.</span>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6 border-l-4 border-[#A65353]">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                                            <User size={22} className="text-[#A65353]" />
                                            Mentored ({assignedIds.length})
                                        </h2>
                                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                            {isEditing && (currentUserRole === 'admin' || currentUserRole === 'program_manager') ? 'Check people that should be mentored by this volunteer' : 'List of people currently mentored by this volunteer'}
                                        </p>
                                    </div>
                                </div>

                                {programParticipants.length === 0 ? (
                                    <p className="text-gray-500 italic text-sm py-4">No participants found enrolled in this program.</p>
                                ) : isEditing && (currentUserRole === 'admin' || currentUserRole === 'program_manager') ? (
                                    (() => {
                                        const selectable = programParticipants.filter(p => {
                                            if (p._id === userId) return false;
                                            const checked = assignedIds.includes(p._id);
                                            const noMentor = !p.handledBy || p.handledBy === 'unassigned' || p.handledBy === '';
                                            return checked || noMentor;
                                        });
                                        return selectable.length === 0 ? (
                                            <p className="text-gray-500 italic text-sm py-4 text-center">No unassigned people available to mentor.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-3 border border-gray-200 rounded-xl bg-gray-50/70">
                                                {selectable.map((p) => {
                                                    const checked = assignedIds.includes(p._id);
                                                    return (
                                                        <label
                                                            key={p._id}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${checked ? 'bg-yellow-50 border-yellow-400 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setAssignedIds([...assignedIds, p._id]);
                                                                    } else {
                                                                        setAssignedIds(assignedIds.filter(id => id !== p._id));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 text-yellow-600 rounded border-gray-300 focus:ring-yellow-500"
                                                            />
                                                            <div className="overflow-hidden">
                                                                <p className="text-sm font-bold text-gray-800 truncate">{p.name} <span className="text-xs font-normal text-yellow-800 capitalize">({p.role || 'participant'})</span></p>
                                                                <p className="text-xs text-gray-500 truncate">Grade: {p.grade || 'N/A'} • Level: {p.level || 'N/A'}</p>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="space-y-2.5">
                                        {programParticipants.filter(p => assignedIds.includes(p._id)).length === 0 ? (
                                            <p className="text-gray-500 italic text-sm py-2">No people assigned to mentor under this volunteer yet.</p>
                                        ) : (
                                            programParticipants.filter(p => assignedIds.includes(p._id)).map((p) => (
                                                <div
                                                    key={p._id}
                                                    onClick={() => router.push(`/programs/${programId}/${p.role === 'volunteer' ? 'volunteers' : 'participants'}/${p._id}`)}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-all cursor-pointer shadow-sm gap-2"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-bold text-gray-800 text-base">{p.name}</div>
                                                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-yellow-200 text-yellow-900 rounded-full capitalize">{p.role || 'participant'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-700 flex-wrap">
                                                        <span>📞 {p.phone || p.email || 'N/A'}</span>
                                                        <span>Level: {p.level || 'N/A'}</span>
                                                        <span>Grade: {p.grade || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

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
                )}
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
