"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Calendar, ChevronDown, X, Search } from "lucide-react";
import Pagination from "@/components/Pagination";
import { useModalStore } from "@/store/modalStore";

interface Session {
  _id: string;
  sessionDate: Date;
  sessionTopic: string;
  speakerName: string;
  description?: string;
  level?: number;
  createdAt: Date;
  presentCount?: number;
  absentCount?: number;
}

interface Program {
  _id: string;
  name: string;
}

export default function SessionsPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  const { showConfirm, showAlert } = useModalStore();

  const [program, setProgram] = useState<Program | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Accordion state
  const [expandedSessionIds, setExpandedSessionIds] = useState<string[]>([]);

  // Edit modal state
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editForm, setEditForm] = useState({
    sessionTopic: "",
    sessionDate: "",
    speakerName: "",
    description: "",
    level: "1"
  });
  // Create modal state
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    sessionTopic: "Session",
    sessionDate: "",
    speakerName: "",
    description: "",
    level: "1"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [programId]);

  const fetchData = async () => {
    try {
      // Fetch user auth info
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        const role = meData.user?.role || '';
        setCurrentUserRole(role);
        if (role === 'participant') {
          router.replace(`/programs/${programId}`);
          return;
        }
      }

      // Fetch program details
      const programRes = await fetch(`/api/programs/${programId}`);
      if (programRes.ok) {
        const programData = await programRes.json();
        setProgram(programData.program);
      }

      // Fetch sessions for this program
      const sessionsRes = await fetch(`/api/programs/${programId}/sessions`);
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleExpand = (sessionId: string) => {
    if (expandedSessionIds.includes(sessionId)) {
      setExpandedSessionIds(expandedSessionIds.filter(id => id !== sessionId));
    } else {
      setExpandedSessionIds([...expandedSessionIds, sessionId]);
    }
  };

  const openEditModal = (session: Session) => {
    setEditingSession(session);
    const dateStr = session.sessionDate ? new Date(session.sessionDate).toISOString().split('T')[0] : "";
    setEditForm({
      sessionTopic: session.sessionTopic || "",
      sessionDate: dateStr,
      speakerName: session.speakerName || "",
      description: session.description || "",
      level: String(session.level || 1)
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/programs/${programId}/sessions/${editingSession._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setEditingSession(null);
        fetchData();
      } else {
        await showAlert({ title: "Update Failed", message: "Failed to update session.", type: "danger" });
      }
    } catch (err) {
      console.error(err);
      await showAlert({ title: "Error", message: "Error saving session.", type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/programs/${programId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm)
      });
      if (res.ok) {
        setIsCreating(false);
        setCreateForm({
          sessionTopic: "Session",
          sessionDate: "",
          speakerName: "",
          description: "",
          level: "1"
        });
        fetchData();
      } else {
        const data = await res.json();
        await showAlert({ title: "Creation Failed", message: data.error || "Failed to create session.", type: "danger" });
      }
    } catch (err) {
      console.error(err);
      await showAlert({ title: "Error", message: "Error creating session.", type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    const confirmed = await showConfirm({
      title: "Delete Session",
      message: "Are you sure you want to permanently delete this session? All attendance records associated with it will be removed.",
      type: "danger",
      confirmText: "Delete Session"
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/programs/${programId}/sessions/${sessionId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchData();
      } else {
        await showAlert({ title: "Delete Failed", message: "Failed to delete session.", type: "danger" });
      }
    } catch (err) {
      console.error(err);
      await showAlert({ title: "Error", message: "Error deleting session.", type: "danger" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{
      backgroundImage: 'url(/backgrou.png)',
      backgroundSize: '25%',
      backgroundRepeat: 'repeat'
    }}>
      <Header />

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Sessions</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {program ? `${program.name} - All Sessions` : 'Loading...'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {currentUserRole === 'admin' && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-[#A65353] hover:bg-[#8B4545] text-white rounded-lg cursor-pointer transition-colors text-sm sm:text-base font-semibold shadow-sm"
                >
                  + Create Session
                </button>
              )}
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-sm cursor-pointer sm:text-base text-gray-600 hover:text-gray-800 font-medium whitespace-nowrap"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="text-center py-12">
            <img src="/mrdanga.png" alt="Loading" className="w-20 h-20 animate-spin mx-auto" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 sm:p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">No Sessions Yet</h3>
            <p className="text-gray-500">
              Please create a session.
            </p>
          </div>
        ) : (() => {
          const filteredSessions = sessions.filter(session => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              session.sessionTopic?.toLowerCase().includes(q) ||
              session.speakerName?.toLowerCase().includes(q) ||
              session.description?.toLowerCase().includes(q)
            );
          });
          const totalPages = Math.max(1, Math.ceil(filteredSessions.length / 20));
          const paginatedSessions = filteredSessions.slice((currentPage - 1) * 20, currentPage * 20);
          return (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search sessions by topic, speaker, or description..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A65353] focus:border-transparent text-sm shadow-sm transition-all text-gray-800 placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="text-sm text-gray-700 font-medium">
                Showing {filteredSessions.length === 0 ? 0 : (currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredSessions.length)} of <span className="font-bold">{filteredSessions.length}</span> sessions
              </div>

              {filteredSessions.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-8 text-center text-gray-500 italic text-sm">
                  No sessions found matching "{searchQuery}"
                </div>
              ) : (
                paginatedSessions.map((session) => (
                  <div
                    key={session._id}
                    className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 overflow-hidden"
                  >
                    {/* Main Row */}
                    <div
                      onClick={() => toggleExpand(session._id)}
                      className="flex flex-col lg:flex-row items-start lg:items-center px-4 sm:px-6 py-3 sm:py-4 hover:bg-yellow-100 transition-colors gap-3 sm:gap-4 cursor-pointer relative"
                    >
                      {/* Left: Topic & Date */}
                      <div className="flex items-start justify-between w-full lg:w-64 xl:w-80 flex-shrink-0 pr-8 lg:pr-0">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-800 break-words">
                            {session.sessionTopic}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                            {formatDate(session.sessionDate)}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Speaker & Counts */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-4 w-full lg:w-auto lg:ml-auto mr-0 lg:mr-2 text-xs sm:text-sm bg-yellow-100/60 lg:bg-transparent p-2.5 lg:p-0 rounded-lg border border-yellow-200/50 lg:border-none">
                        {/* Speaker */}
                        <div className="col-span-2 sm:col-span-1 text-gray-700 sm:w-44 truncate" title={session.speakerName}>
                          <span className="text-gray-500 font-normal">Speaker: </span><span className="font-semibold text-gray-800">{session.speakerName}</span>
                        </div>

                        {/* Level */}
                        <div className="text-gray-700 sm:w-20">
                          <span className="text-gray-500 font-normal">Level: </span><span className="font-semibold">{session.level || 1}</span>
                        </div>

                        {/* Present */}
                        <div className="text-green-700 font-semibold sm:w-24">
                          Present: {session.presentCount ?? 0}
                        </div>

                        {/* Absent */}
                        <div className="text-red-700 font-semibold sm:w-24">
                          Absent: {session.absentCount ?? 0}
                        </div>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(session._id);
                        }}
                        className="p-1.5 sm:p-2 cursor-pointer hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 absolute top-3 right-3 lg:static lg:ml-1"
                      >
                        <ChevronDown
                          size={18}
                          className={`transform transition-transform ${expandedSessionIds.includes(session._id) ? 'rotate-180' : ''
                            }`}
                        />
                      </button>
                    </div>

                    {/* Expanded Details Section */}
                    {expandedSessionIds.includes(session._id) && (
                      <div className="border-t border-yellow-200 p-4 sm:p-6 bg-yellow-100/40 space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {session.description || "No description provided."}
                          </p>
                        </div>

                        {/* Maroon Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => router.push(`/programs/${programId}/sessions/${session._id}`)}
                            className="bg-[#A65353] hover:bg-[#8C4343] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                          >
                            View Details
                          </button>

                          {currentUserRole === 'admin' && (
                            <>
                              <button
                                onClick={() => openEditModal(session)}
                                className="bg-[#A65353] hover:bg-[#8C4343] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(session._id)}
                                className="bg-[#A65353] hover:bg-[#8C4343] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              {filteredSessions.length > 0 && (
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              )}
            </div>
          );
        })()}
      </main>

      {/* Edit Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative space-y-4">
            <button
              onClick={() => setEditingSession(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-gray-800">Edit Session</h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Topic</label>
                <input
                  type="text"
                  required
                  value={editForm.sessionTopic}
                  onChange={(e) => setEditForm({ ...editForm, sessionTopic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={editForm.sessionDate}
                  onChange={(e) => setEditForm({ ...editForm, sessionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Speaker</label>
                <input
                  type="text"
                  required
                  value={editForm.speakerName}
                  onChange={(e) => setEditForm({ ...editForm, speakerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Level</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  required
                  value={editForm.level}
                  onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Add session description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold bg-[#A65353] hover:bg-[#8C4343] text-white rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
            <div className="bg-[#A65353] px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold">Create New Session</h3>
              <button onClick={() => setIsCreating(false)} className="hover:bg-[#8C4343] p-1 rounded transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Topic</label>
                <input
                  type="text"
                  required
                  value={createForm.sessionTopic}
                  onChange={(e) => setCreateForm({ ...createForm, sessionTopic: e.target.value })}
                  placeholder="e.g. Session"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={createForm.sessionDate}
                  onChange={(e) => setCreateForm({ ...createForm, sessionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Speaker</label>
                <input
                  type="text"
                  value={createForm.speakerName}
                  onChange={(e) => setCreateForm({ ...createForm, speakerName: e.target.value })}
                  placeholder="Speaker Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Level</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  required
                  value={createForm.level}
                  onChange={(e) => setCreateForm({ ...createForm, level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Add session description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] outline-none text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold bg-[#A65353] hover:bg-[#8C4343] text-white rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Session"}
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
