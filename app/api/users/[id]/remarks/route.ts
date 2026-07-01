import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import User from "@/models/User";
import jwt from "jsonwebtoken";

// GET /api/users/[id]/remarks
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (!["admin", "program_manager", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Enforce that a volunteer cannot view remarks of their own profile
    if (decoded.role === "volunteer" && String(decoded.userId) === String(id)) {
      return NextResponse.json({ error: "Volunteers cannot view remarks on their own profile" }, { status: 403 });
    }
    await connectDB();

    // Fetch all follow-ups for this user where remarks exist or call was made
    const followUps = await FollowUp.find({
      user: id,
      isDeleted: false,
      remarks: { $exists: true, $ne: "" }
    })
      .populate("calledBy", "name")
      .populate("assignedVolunteer", "name")
      .populate("createdBy", "name")
      .sort({ followUpDate: -1 })
      .lean();

    // Format remarks list
    const remarksList = followUps.map((fu: any) => ({
      _id: fu._id,
      date: fu.followUpDate ? new Date(fu.followUpDate).toISOString().split("T")[0] : "",
      remarks: fu.remarks || "",
      status: fu.status || "",
      remarkedBy: fu.calledBy?.name || fu.assignedVolunteer?.name || fu.createdBy?.name || "Volunteer"
    }));

    return NextResponse.json({ remarks: remarksList }, { status: 200 });
  } catch (error: any) {
    console.error("GET_REMARKS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/users/[id]/remarks - Add a new remark
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (!["admin", "program_manager", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { date, remarks, programId } = body;

    if (!remarks || !remarks.trim()) {
      return NextResponse.json({ error: "Remark text is required" }, { status: 400 });
    }

    await connectDB();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Enforce that only the mentor of the person or an admin/program_manager can add remarks
    if (decoded.role !== "admin" && decoded.role !== "program_manager" && String(targetUser.handledBy) !== String(decoded.userId)) {
      return NextResponse.json({ error: "Only the mentor of this person, a program manager, or an admin can add remarks" }, { status: 403 });
    }

    const followUpDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate(), 23, 59, 59, 999);

    let progId = programId;
    if (!progId && targetUser.programs && targetUser.programs.length > 0) {
      progId = targetUser.programs[0];
    }
    if (!progId) {
      const Program = (await import("@/models/Program")).default;
      const anyProg = await Program.findOne({ isActive: true });
      if (anyProg) progId = anyProg._id;
    }

    if (!progId) {
      return NextResponse.json({ error: "No program found to associate with followup" }, { status: 400 });
    }

    let followUp = await FollowUp.findOne({
      user: id,
      program: progId,
      followUpDate: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    });

    if (followUp) {
      followUp.remarks = remarks;
      followUp.calledBy = decoded.userId;
      followUp.calledAt = new Date();
      await followUp.save();
    } else {
      followUp = await FollowUp.create({
        program: progId,
        followUpDate: startOfDay,
        userType: targetUser.role === "guest" ? "guest" : "participant",
        user: id,
        assignedVolunteer: targetUser.handledBy && targetUser.handledBy !== "unassigned" ? targetUser.handledBy : decoded.userId,
        status: "Not Called",
        remarks: remarks,
        calledBy: decoded.userId,
        calledAt: new Date(),
        createdBy: decoded.userId
      });
    }

    return NextResponse.json({ message: "Remark added successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("POST_REMARKS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// PATCH /api/users/[id]/remarks - Update an existing remark
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { followUpId, remarks } = body;

    if (!followUpId || !remarks) {
      return NextResponse.json({ error: "followUpId and remarks are required" }, { status: 400 });
    }

    await connectDB();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (decoded.role !== "admin" && String(targetUser.handledBy) !== String(decoded.userId)) {
      return NextResponse.json({ error: "Only the mentor of this person or an admin can edit remarks" }, { status: 403 });
    }

    const followUp = await FollowUp.findById(followUpId);
    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    followUp.remarks = remarks;
    followUp.calledBy = decoded.userId;
    followUp.calledAt = new Date();
    await followUp.save();

    return NextResponse.json({ message: "Remark updated successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH_REMARKS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/users/[id]/remarks - Delete a remark
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const followUpId = searchParams.get("followUpId");

    if (!followUpId) {
      return NextResponse.json({ error: "followUpId is required" }, { status: 400 });
    }

    await connectDB();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (decoded.role !== "admin" && String(targetUser.handledBy) !== String(decoded.userId)) {
      return NextResponse.json({ error: "Only the mentor of this person or an admin can delete remarks" }, { status: 403 });
    }

    const followUp = await FollowUp.findById(followUpId);
    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    if (followUp.status === "Not Called") {
      await FollowUp.findByIdAndDelete(followUpId);
    } else {
      followUp.remarks = "";
      await followUp.save();
    }

    return NextResponse.json({ message: "Remark deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE_REMARKS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
