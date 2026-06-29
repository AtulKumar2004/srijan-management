"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Save, X, Trash2 } from "lucide-react";
import { useModalStore } from "@/store/modalStore";

interface RemarkItem {
  _id: string;
  date: string;
  remarks: string;
  status: string;
  remarkedBy: string;
}

interface ProfileRemarkTabProps {
  userId: string;
  programId?: string;
  canEdit: boolean;
}

export default function ProfileRemarkTab({ userId, programId, canEdit }: ProfileRemarkTabProps) {
  const { showConfirm } = useModalStore();
  const [remarks, setRemarks] = useState<RemarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RemarkItem | null>(null);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newRemarkText, setNewRemarkText] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRemarks, setSelectedRemarks] = useState<string[]>([]);

  const fetchRemarks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${userId}/remarks`);
      if (res.ok) {
        const data = await res.json();
        setRemarks(data.remarks || []);
        setSelectedRemarks([]);
      }
    } catch (err) {
      console.error("Failed to fetch remarks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchRemarks();
    }
  }, [userId]);

  const handleSaveRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemarkText.trim()) return;

    try {
      if (editingItem) {
        // Update existing via PATCH
        const res = await fetch(`/api/users/${userId}/remarks`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followUpId: editingItem._id, remarks: newRemarkText })
        });
        if (res.ok) {
          setMessage({ type: "success", text: "Remark updated successfully!" });
          setEditingItem(null);
          setNewRemarkText("");
          fetchRemarks();
        } else {
          const errData = await res.json();
          setMessage({ type: "error", text: errData.error || "Failed to update remark" });
        }
      } else {
        // Create new via POST
        const res = await fetch(`/api/users/${userId}/remarks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: newDate,
            remarks: newRemarkText,
            programId
          })
        });
        if (res.ok) {
          setMessage({ type: "success", text: "Remark added successfully!" });
          setShowAddModal(false);
          setNewRemarkText("");
          fetchRemarks();
        } else {
          const errData = await res.json();
          setMessage({ type: "error", text: errData.error || "Failed to add remark" });
        }
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: "Error saving remark" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDelete = async (followUpId: string) => {
    const confirmed = await showConfirm({ title: "Delete Remark", message: "Are you sure you want to delete this remark?", type: "danger", confirmText: "Delete" });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/users/${userId}/remarks?followUpId=${followUpId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Remark deleted successfully!" });
        fetchRemarks();
      } else {
        const errData = await res.json();
        setMessage({ type: "error", text: errData.error || "Failed to delete remark" });
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: "error", text: "Error deleting remark" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRemarks.length === 0) return;
    const confirmed = await showConfirm({ title: "Delete Selected Remarks", message: `Are you sure you want to delete ${selectedRemarks.length} selected remark(s)?`, type: "danger", confirmText: "Delete All" });
    if (!confirmed) return;

    try {
      await Promise.all(selectedRemarks.map(id =>
        fetch(`/api/users/${userId}/remarks?followUpId=${id}`, { method: "DELETE" })
      ));
      setMessage({ type: "success", text: `${selectedRemarks.length} remark(s) deleted successfully!` });
      fetchRemarks();
    } catch (err) {
      setMessage({ type: "error", text: "Error deleting remarks" });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredRemarks = remarks.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.remarks.toLowerCase().includes(q) ||
      item.remarkedBy.toLowerCase().includes(q) ||
      item.date.includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 sm:p-4 rounded-xl text-sm sm:text-base font-medium ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
          {message.text}
        </div>
      )}

      {/* Top Controls matching Image 1 */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-transparent pt-2 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button
              onClick={() => {
                setEditingItem(null);
                setNewDate(new Date().toISOString().split("T")[0]);
                setNewRemarkText("");
                setShowAddModal(true);
              }}
              className="px-5 py-2.5 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-all text-sm font-bold shadow-md cursor-pointer whitespace-nowrap"
            >
              Add Remark
            </button>
          )}
          {canEdit && selectedRemarks.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2.5 bg-[#A65353] text-white rounded-lg hover:bg-red-700 transition-all text-sm font-bold shadow-md cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <Trash2 size={16} />
              Delete ({selectedRemarks.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto">
          <div className="relative grow sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A65353]" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#D8C8B8] rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A65353] shadow-sm"
            />
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-[#F3EBE1] border border-[#D8C8B8] text-gray-800 rounded-lg hover:bg-[#E8DCD0] transition-colors text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Filter size={16} className="text-[#A65353]" />
            Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#A65353]"></div>
          <p className="text-gray-500 mt-2 text-sm">Loading remarks history...</p>
        </div>
      ) : filteredRemarks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium text-base">No followup remarks found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRemarks.map((item) => (
            <div
              key={item._id}
              className="bg-[#FAF8F5] border border-[#E6DCD2] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3 gap-4">
                <div className="flex items-start gap-3.5">
                  {canEdit && (
                    <input
                      type="checkbox"
                      checked={selectedRemarks.includes(item._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRemarks([...selectedRemarks, item._id]);
                        } else {
                          setSelectedRemarks(selectedRemarks.filter(id => id !== item._id));
                        }
                      }}
                      className="mt-1 rounded border-gray-400 text-[#A65353] focus:ring-[#A65353] w-4 h-4 cursor-pointer flex-shrink-0"
                    />
                  )}
                  <div className="text-gray-900 font-medium text-sm sm:text-base leading-relaxed">
                    {item.remarks}
                  </div>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-800 whitespace-nowrap ml-4">
                  {item.date}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-5 pt-3 border-t border-[#EAE2D8] gap-3">
                <div className="text-xs sm:text-sm font-semibold text-gray-900">
                  Remarked By :- <span className="font-normal text-gray-800">{item.remarkedBy}</span>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setNewRemarkText(item.remarks);
                        setShowAddModal(true);
                      }}
                      className="px-4 py-1.5 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-colors text-xs sm:text-sm font-semibold shadow-sm cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="px-4 py-1.5 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-colors text-xs sm:text-sm font-semibold shadow-sm cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-800">
                {editingItem ? "Edit Followup Remark" : "Add Followup Remark"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRemark} className="space-y-4">
              {!editingItem && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Followup Date *
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] text-sm"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Remark Details *
                </label>
                <textarea
                  rows={4}
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  placeholder="Enter detailed notes or feedback..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#A65353] focus:border-[#A65353] text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#A65353] text-white rounded-xl hover:bg-[#8B4545] transition-colors text-sm font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={16} />
                  Save Remark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
