import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import User from "@/models/User";
import jwt from "jsonwebtoken";

// GET /api/users/[id]/mentees-followup?date=YYYY-MM-DD&programId=xxx
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const { id } = await params;
    if (decoded.role !== "volunteer" || String(decoded.userId) !== String(id)) {
      return NextResponse.json({ error: "Forbidden: Followup tabs can only be accessed by volunteers for themselves." }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const programId = searchParams.get("programId");

    await connectDB();

    const targetUser = await User.findById(id).lean();
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find mentees handled by this user (excluding the user themselves)
    let mentees = await User.find({
      _id: { $ne: id },
      isArchived: { $ne: true },
      role: { $in: ["participant", "volunteer"] },
      $or: [{ handledBy: id }, { handledBy: String(id) }]
    })
      .select("name email phone profession level grade role")
      .sort({ name: 1 })
      .lean();

    const followUpDate = new Date(date);
    const startOfDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate(), 23, 59, 59, 999);

    // Fetch existing followups for these mentees on this date
    const menteeIds = mentees.map((m: any) => m._id);
    const existingFollowUps = await FollowUp.find({
      user: { $in: menteeIds },
      followUpDate: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    }).lean();

    const followUpMap = new Map();
    existingFollowUps.forEach((fu: any) => {
      followUpMap.set(String(fu.user), fu);
    });

    const result = mentees.map((m: any) => {
      const fu = followUpMap.get(String(m._id));
      return {
        user: m,
        followUp: fu ? {
          _id: fu._id,
          status: fu.status || "Not Called",
          remarks: fu.remarks || ""
        } : null
      };
    });

    return NextResponse.json({ mentees: result }, { status: 200 });
  } catch (error: any) {
    console.error("GET_MENTEES_FOLLOWUP_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/users/[id]/mentees-followup - Save or update followup status/remarks
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const { id } = await params;
    if (decoded.role !== "volunteer" || String(decoded.userId) !== String(id)) {
      return NextResponse.json({ error: "Forbidden: Followup tabs can only be accessed by volunteers for themselves." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, programId, date, status, remarks } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (decoded.role === "volunteer" && String(decoded.userId) === String(userId)) {
      return NextResponse.json({ error: "Volunteers cannot log followups for themselves." }, { status: 403 });
    }

    await connectDB();

    const targetMentee = await User.findById(userId);
    if (!targetMentee) {
      return NextResponse.json({ error: "Mentee not found" }, { status: 404 });
    }

    if (decoded.role !== "admin" && String(targetMentee.handledBy) !== String(decoded.userId)) {
      return NextResponse.json({ error: "Only the assigned mentor or an admin can edit followups and remarks for this person." }, { status: 403 });
    }

    const followUpDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate(), 23, 59, 59, 999);

    let progId = programId;
    if (!progId && targetMentee.programs && targetMentee.programs.length > 0) {
      progId = targetMentee.programs[0];
    }
    if (!progId) {
      const Program = (await import("@/models/Program")).default;
      const anyProg = await Program.findOne({ isActive: true });
      if (anyProg) progId = anyProg._id;
    }

    if (!progId) {
      return NextResponse.json({ error: "No program found" }, { status: 400 });
    }

    const Session = (await import("@/models/Session")).default;
    const sessionExists = await Session.findOne({
      programId: progId,
      sessionDate: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    });

    if (!sessionExists && decoded.role !== "admin") {
      return NextResponse.json({ error: "Followups can only be logged for dates where a session has been created." }, { status: 403 });
    }

    let followUp = await FollowUp.findOne({
      user: userId,
      program: progId,
      followUpDate: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    });

    if (followUp) {
      if (status !== undefined) followUp.status = status;
      if (remarks !== undefined) followUp.remarks = remarks;
      followUp.calledBy = decoded.userId;
      followUp.calledAt = new Date();
      await followUp.save();
    } else {
      followUp = await FollowUp.create({
        program: progId,
        followUpDate: startOfDay,
        userType: targetMentee.role === "guest" ? "guest" : "participant",
        user: userId,
        assignedVolunteer: targetMentee.handledBy && targetMentee.handledBy !== "unassigned" ? targetMentee.handledBy : decoded.userId,
        status: status || "Not Called",
        remarks: remarks || "",
        calledBy: decoded.userId,
        calledAt: new Date(),
        createdBy: decoded.userId
      });
    }

    return NextResponse.json({ message: "Saved successfully", followUp }, { status: 200 });
  } catch (error: any) {
    console.error("POST_MENTEES_FOLLOWUP_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
