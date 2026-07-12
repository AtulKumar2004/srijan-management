"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Save, X, Trash2, Calendar, CheckCircle2 } from "lucide-react";
import { useModalStore } from "@/store/modalStore";

interface OutreachRemarkItem {
  _id: string;
  date: string;
  remarks: string;
  status: string;
  remarkedBy: string;
}

interface OutreachRemarkTabProps {
  contactId: string;
  canEdit: boolean;
}

const statusOptions = ["Coming", "Not Coming", "May Come", "Not Answered", "Not Called", "Not Sure"];

export default function OutreachRemarkTab({ contactId, canEdit }: OutreachRemarkTabProps) {
  const { showConfirm } = useModalStore();
  const [remarks, setRemarks] = useState<OutreachRemarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OutreachRemarkItem | null>(null);
  
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newStatus, setNewStatus] = useState("Not Called");
  const [newRemarkText, setNewRemarkText] = useState("");
  
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRemarks, setSelectedRemarks] = useState<string[]>([]);

  const fetchRemarks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/outreach/${contactId}/remarks`);
      if (res.ok) {
        const data = await res.json();
        setRemarks(data.remarks || []);
        setSelectedRemarks([]);
      }
    } catch (err) {
      console.error("Failed to fetch outreach remarks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contactId) {
      fetchRemarks();
    }
  }, [contactId]);

  const handleSaveRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;

    try {
      if (editingItem) {
        const res = await fetch(`/api/outreach/${contactId}/remarks`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            followUpId: editingItem._id, 
            remarks: newRemarkText,
            status: newStatus,
            date: newDate
          })
        });
        if (res.ok) {
          setMessage({ type: "success", text: "Remark updated successfully!" });
          setEditingItem(null);
          setNewRemarkText("");
          setShowAddModal(false);
          fetchRemarks();
        } else {
          const errData = await res.json();
          setMessage({ type: "error", text: errData.error || "Failed to update remark" });
        }
      } else {
        const res = await fetch(`/api/outreach/${contactId}/remarks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: newDate,
            remarks: newRemarkText,
            status: newStatus
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
    const confirmed = await showConfirm({ 
      title: "Delete Remark", 
      message: "Are you sure you want to delete this followup remark record?", 
      type: "danger", 
      confirmText: "Delete" 
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/outreach/${contactId}/remarks?followUpId=${followUpId}`, {
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
    const confirmed = await showConfirm({ 
      title: "Delete Selected Remarks", 
      message: `Are you sure you want to delete ${selectedRemarks.length} selected remark(s)?`, 
      type: "danger", 
      confirmText: "Delete All" 
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedRemarks.map(id =>
        fetch(`/api/outreach/${contactId}/remarks?followUpId=${id}`, { method: "DELETE" })
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
      item.status.toLowerCase().includes(q) ||
      item.date.includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Coming":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Not Coming":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "May Come":
      case "Not Sure":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Not Answered":
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 sm:p-4 rounded-xl text-sm sm:text-base font-medium ${
          message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {message.text}
        </div>
      )}

      {/* Top Controls matching ProfileRemarksTab */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-transparent pt-2 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button
              onClick={() => {
                setEditingItem(null);
                setNewDate(new Date().toISOString().split("T")[0]);
                setNewStatus("Not Called");
                setNewRemarkText("");
                setShowAddModal(true);
              }}
              className="px-5 py-2.5 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-all text-sm font-bold shadow-md cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <Plus size={16} />
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
              placeholder="Search remarks, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#D8C8B8] rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A65353] shadow-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#A65353]"></div>
          <p className="text-gray-500 mt-2 text-sm">Loading remarks history...</p>
        </div>
      ) : filteredRemarks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-medium text-base">No followup remarks found for this contact.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRemarks.map((item) => (
            <div
              key={item._id}
              className="bg-[#FAF8F5] border border-[#E6DCD2] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
                <div className="flex items-center gap-3">
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
                      className="rounded border-gray-400 text-[#A65353] focus:ring-[#A65353] w-4 h-4 cursor-pointer flex-shrink-0"
                    />
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#A65353]" />
                  {item.date}
                </span>
              </div>

              <div className="text-gray-900 font-medium text-sm sm:text-base leading-relaxed mt-2 pl-7 sm:pl-7">
                {item.remarks ? item.remarks : <span className="text-gray-400 italic">No remark text entered</span>}
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
                        setNewDate(item.date);
                        setNewStatus(item.status);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Follow-up Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A65353] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Status *
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A65353] focus:bg-white font-medium"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Remark Text
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter remarks/notes from the follow-up call..."
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A65353] focus:bg-white placeholder-gray-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#A65353] text-white rounded-lg hover:bg-[#8B4545] transition-colors text-sm font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
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
