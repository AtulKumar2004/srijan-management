"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp } from "lucide-react";

type RoleChangeRequest = {
  _id: string;
  currentRole: string;
  requestedRole: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  participant?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
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
    createdAt?: string;
    updatedAt?: string;
  };
  requestedBy?: { _id: string; name: string; email?: string; phone?: string; level?: number };
  program?: { _id: string; name: string };
  programAdmin?: { _id: string; name: string; email?: string };
  reviewedBy?: { _id: string; name: string };
};

type VolunteerCreationRequest = {
  _id: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  name: string;
  email: string;
  phone?: string;
  profession?: string;
  homeTown?: string;
  address?: string;
  gender?: string;
  connectedToTemple?: string;
  numberOfRounds?: number;
  level?: number;
  maritalStatus?: string;
  requestedBy?: { _id: string; name: string; email?: string; phone?: string; level?: number };
  program?: { _id: string; name: string };
  programAdmin?: { _id: string; name: string; email?: string };
  reviewedBy?: { _id: string; name: string };
};

type NotificationItem = {
  _id: string;
  requestType: "role-change" | "volunteer-create";
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  requestedBy?: { _id: string; name: string; email?: string; phone?: string; level?: number };
  program?: { _id: string; name: string };
  roleChange?: RoleChangeRequest;
  volunteerCreation?: VolunteerCreationRequest;
};

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusRequestId = searchParams.get("requestId") || "";

  const [requests, setRequests] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [processingId, setProcessingId] = useState("");
  const [expandedRequestIds, setExpandedRequestIds] = useState<string[]>([]);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!focusRequestId) return;
    setExpandedRequestIds((prev) => (prev.includes(focusRequestId) ? prev : [...prev, focusRequestId]));
  }, [focusRequestId]);

  const checkAuthAndLoad = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }

      const meData = await meRes.json();
      const role = meData?.user?.role || "";
      setCurrentRole(role);

      if (!["admin", "volunteer"].includes(role)) {
        router.push("/dashboard");
        return;
      }

      await fetchRequests();
    } catch (error) {
      setToast({ type: "error", text: "Unable to load notifications" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    const [roleRes, volunteerRes] = await Promise.all([
      fetch("/api/role-change-requests"),
      fetch("/api/volunteer-creation-requests"),
    ]);

    const roleData = await roleRes.json();
    const volunteerData = await volunteerRes.json();

    if (!roleRes.ok) {
      throw new Error(roleData.error || "Failed to fetch role-change requests");
    }

    if (!volunteerRes.ok) {
      throw new Error(volunteerData.error || "Failed to fetch volunteer creation requests");
    }

    const roleRequests: NotificationItem[] = (roleData.requests || []).map((request: RoleChangeRequest) => ({
      _id: request._id,
      requestType: "role-change",
      status: request.status,
      rejectionReason: request.rejectionReason,
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt,
      requestedBy: request.requestedBy,
      program: request.program,
      roleChange: request,
    }));

    const volunteerRequests: NotificationItem[] = (volunteerData.requests || []).map((request: VolunteerCreationRequest) => ({
      _id: request._id,
      requestType: "volunteer-create",
      status: request.status,
      rejectionReason: request.rejectionReason,
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt,
      requestedBy: request.requestedBy,
      program: request.program,
      volunteerCreation: request,
    }));

    setRequests([...roleRequests, ...volunteerRequests]);
  };

  const handleAction = async (
    requestId: string,
    requestType: "role-change" | "volunteer-create",
    action: "approve" | "reject"
  ) => {
    try {
      setProcessingId(requestId);

      const payload: any = { action };
      if (action === "reject") {
        payload.rejectionReason = "Rejected by program admin";
      }

      const endpoint =
        requestType === "role-change"
          ? `/api/role-change-requests/${requestId}`
          : `/api/volunteer-creation-requests/${requestId}`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request action failed");
      }

      setToast({
        type: "success",
        text: action === "approve" ? "Request approved successfully" : "Request rejected",
      });

      await fetchRequests();
    } catch (error: any) {
      setToast({ type: "error", text: error.message || "Something went wrong" });
    } finally {
      setProcessingId("");
    }
  };

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const priority = (status: string) => (status === "pending" ? 0 : 1);
      const pDiff = priority(a.status) - priority(b.status);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [requests]);

  const toggleExpanded = (requestId: string) => {
    setExpandedRequestIds((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
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

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundImage: "url(/backgrou.png)", backgroundSize: "25%", backgroundRepeat: "repeat" }}>
      <Header />

      {toast && (
        <div className={`fixed top-24 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.text}
        </div>
      )}

      <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-5xl">
        <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 mb-6 border border-orange-100">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-600 mt-1">
            {currentRole === "admin"
              ? "Review promotion and volunteer-add requests for your programs."
              : "Track requests you have sent for promotions and volunteer additions."}
          </p>
        </div>

        {sortedRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-600 border border-orange-100">
            No notifications found.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRequests.map((request) => {
              const isFocused = focusRequestId === request._id;
              const isExpanded = expandedRequestIds.includes(request._id);
              const roleRequest = request.roleChange;
              const volunteerRequest = request.volunteerCreation;
              const isRoleChange = request.requestType === "role-change";
              const summaryTitle = isRoleChange
                ? `${roleRequest?.participant?.name || "Unknown Participant"} - ${roleRequest?.currentRole || "participant"} to ${roleRequest?.requestedRole || "volunteer"}`
                : `${volunteerRequest?.name || "Unknown Candidate"} - add as volunteer`;

              return (
                <div
                  key={request._id}
                  className={`bg-white rounded-xl shadow-md border p-5 ${isFocused ? "border-[#A65353] ring-2 ring-[#E6C7A0]" : "border-orange-100"}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        {summaryTitle}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">Program: {request.program?.name || "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold w-fit ${
                        request.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : request.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {request.status.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(request._id)}
                        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                        aria-label={isExpanded ? "Hide details" : "Show details"}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <>
                      {isRoleChange && roleRequest && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                          <p><strong>Participant Email:</strong> {roleRequest.participant?.email || "N/A"}</p>
                          <p><strong>Participant Phone:</strong> {roleRequest.participant?.phone || "N/A"}</p>
                          {currentRole !== "admin" && (
                            <p><strong>Requested By:</strong> {roleRequest.requestedBy?.name || "N/A"}</p>
                          )}
                          <p><strong>Raised At:</strong> {new Date(request.createdAt).toLocaleString()}</p>
                          {request.reviewedAt && <p><strong>Reviewed At:</strong> {new Date(request.reviewedAt).toLocaleString()}</p>}
                          {request.rejectionReason && <p><strong>Reason:</strong> {request.rejectionReason}</p>}
                        </div>
                      )}

                      {!isRoleChange && volunteerRequest && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                          <p><strong>Candidate Email:</strong> {volunteerRequest.email || "N/A"}</p>
                          <p><strong>Candidate Phone:</strong> {volunteerRequest.phone || "N/A"}</p>
                          <p><strong>Candidate Level:</strong> {volunteerRequest.level ?? "N/A"}</p>
                          <p><strong>Raised At:</strong> {new Date(request.createdAt).toLocaleString()}</p>
                          {request.reviewedAt && <p><strong>Reviewed At:</strong> {new Date(request.reviewedAt).toLocaleString()}</p>}
                          {request.rejectionReason && <p><strong>Reason:</strong> {request.rejectionReason}</p>}
                        </div>
                      )}

                      {currentRole === "admin" && request.requestedBy && (
                        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
                          <h3 className="text-sm font-semibold text-gray-800 mb-3">Requester Snapshot</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                            <p><strong>Name:</strong> {request.requestedBy.name || "N/A"}</p>
                            <p><strong>Email:</strong> {request.requestedBy.email || "N/A"}</p>
                            <p><strong>Phone:</strong> {request.requestedBy.phone || "N/A"}</p>
                            <p><strong>Level:</strong> {request.requestedBy.level ?? "N/A"}</p>
                            <p className="sm:col-span-2"><strong>Program:</strong> {request.program?.name || "N/A"}</p>
                          </div>
                        </div>
                      )}

                      {currentRole === "admin" && isRoleChange && roleRequest?.participant && (
                        <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50/40 p-4">
                          <h3 className="text-sm font-semibold text-gray-800 mb-3">Full Participant Details</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                            <p><strong>Role:</strong> {roleRequest.participant.role || "N/A"}</p>
                            <p><strong>Status:</strong> {roleRequest.participant.isActive ? "Active" : "Inactive"}</p>
                            <p><strong>Profession:</strong> {roleRequest.participant.profession || "N/A"}</p>
                            <p><strong>Gender:</strong> {roleRequest.participant.gender || "N/A"}</p>
                            <p><strong>Home Town:</strong> {roleRequest.participant.homeTown || "N/A"}</p>
                            <p><strong>Connected Temple:</strong> {roleRequest.participant.connectedToTemple || "N/A"}</p>
                            <p><strong>Marital Status:</strong> {roleRequest.participant.maritalStatus || "N/A"}</p>
                            <p><strong>Rounds:</strong> {roleRequest.participant.numberOfRounds ?? "N/A"}</p>
                            <p><strong>Level:</strong> {roleRequest.participant.level ?? "N/A"}</p>
                            <p><strong>Grade:</strong> {roleRequest.participant.grade || "N/A"}</p>
                            <p><strong>Date of Birth:</strong> {roleRequest.participant.dateOfBirth ? new Date(roleRequest.participant.dateOfBirth).toLocaleDateString() : "N/A"}</p>
                            <p><strong>Heard About Us:</strong> {roleRequest.participant.howDidYouHearAboutUs || "N/A"}</p>
                            <p className="sm:col-span-2"><strong>Address:</strong> {roleRequest.participant.address || "N/A"}</p>
                            <p><strong>User Created At:</strong> {roleRequest.participant.createdAt ? new Date(roleRequest.participant.createdAt).toLocaleString() : "N/A"}</p>
                            <p><strong>User Updated At:</strong> {roleRequest.participant.updatedAt ? new Date(roleRequest.participant.updatedAt).toLocaleString() : "N/A"}</p>
                          </div>
                        </div>
                      )}

                      {currentRole === "admin" && !isRoleChange && volunteerRequest && (
                        <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50/40 p-4">
                          <h3 className="text-sm font-semibold text-gray-800 mb-3">Volunteer Candidate Details</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                            <p><strong>Name:</strong> {volunteerRequest.name || "N/A"}</p>
                            <p><strong>Email:</strong> {volunteerRequest.email || "N/A"}</p>
                            <p><strong>Phone:</strong> {volunteerRequest.phone || "N/A"}</p>
                            <p><strong>Level:</strong> {volunteerRequest.level ?? "N/A"}</p>
                            <p><strong>Profession:</strong> {volunteerRequest.profession || "N/A"}</p>
                            <p><strong>Gender:</strong> {volunteerRequest.gender || "N/A"}</p>
                            <p><strong>Home Town:</strong> {volunteerRequest.homeTown || "N/A"}</p>
                            <p><strong>Connected Temple:</strong> {volunteerRequest.connectedToTemple || "N/A"}</p>
                            <p><strong>Marital Status:</strong> {volunteerRequest.maritalStatus || "N/A"}</p>
                            <p><strong>Rounds:</strong> {volunteerRequest.numberOfRounds ?? "N/A"}</p>
                            <p className="sm:col-span-2"><strong>Address:</strong> {volunteerRequest.address || "N/A"}</p>
                          </div>
                        </div>
                      )}

                      {currentRole === "admin" && request.status === "pending" && (
                        <div className="mt-5 flex gap-3">
                          <button
                            onClick={() => handleAction(request._id, request.requestType, "approve")}
                            disabled={processingId === request._id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 cursor-pointer"
                          >
                            {processingId === request._id ? "Processing..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleAction(request._id, request.requestType, "reject")}
                            disabled={processingId === request._id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                          >
                            {processingId === request._id ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
