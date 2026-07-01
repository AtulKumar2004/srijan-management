import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import User from "@/models/User";
import Session from "@/models/Session";
import jwt from "jsonwebtoken";

// GET /api/followups?programId=xxx&date=xxx
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Only admins or program managers can access this section
    if (decoded.role !== "admin" && decoded.role !== "program_manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");
    const date = searchParams.get("date");

    if (!programId || !date) {
      return NextResponse.json(
        { error: "Program ID and date are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

    // 1. Find session on the selected date for this program
    const sessions = await Session.find({
      programId: programId,
      sessionDate: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    }).lean();

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        followUps: [],
        sessionLevels: [],
        noSession: true,
        message: "No session found on this date"
      }, { status: 200 });
    }

    // Use the levels of all sessions on this date
    const sessionLevels = Array.from(new Set(sessions.map((s: any) => Number(s.level || 1)))).sort((a, b) => a - b);

    // 2. Find all active participants and volunteers enrolled in this program whose level matches any of the sessionLevels
    const programUsers = await User.find({
      programs: programId,
      role: { $in: ["participant", "volunteer"] },
      isArchived: { $ne: true }
    }).select("_id name email phone role level profession grade").sort({ name: 1 }).lean();

    const matchingUsers = programUsers.filter(u => sessionLevels.includes(Number(u.level || 1)));

    if (matchingUsers.length === 0) {
      return NextResponse.json({
        followUps: [],
        sessionLevels,
        noSession: false
      }, { status: 200 });
    }

    const userIds = matchingUsers.map(u => u._id);

    // 3. Find existing FollowUp documents for these users on this date
    const existingFollowUps = await FollowUp.find({
      program: programId,
      user: { $in: userIds },
      followUpDate: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    }).lean();

    const followUpMap = new Map();
    existingFollowUps.forEach((fu: any) => {
      followUpMap.set(String(fu.user), fu);
    });

    // 4. Construct response list
    const result = matchingUsers.map((u: any) => {
      const fu = followUpMap.get(String(u._id));
      return {
        _id: fu ? fu._id : u._id,
        user: u,
        status: fu?.status || "Not Called",
        remarks: fu?.remarks || "",
        followUpDate: date
      };
    });

    return NextResponse.json({
      success: true,
      followUps: result,
      sessionLevels,
      noSession: false
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET_FOLLOWUPS_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}

// POST /api/followups - Create or update followup status and remarks for a user on a specific date
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin" && decoded.role !== "program_manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { programId, userId, date, status, remarks } = body;

    if (!programId || !userId || !date) {
      return NextResponse.json({ error: "programId, userId, and date are required" }, { status: 400 });
    }

    await connectDB();

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

    let followUp = await FollowUp.findOne({
      program: programId,
      user: userId,
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
        program: programId,
        followUpDate: startOfDay,
        userType: targetUser.role === "guest" ? "guest" : "participant",
        user: userId,
        status: status || "Not Called",
        remarks: remarks || "",
        createdBy: decoded.userId,
        calledBy: decoded.userId,
        calledAt: new Date()
      });
    }

    return NextResponse.json({ success: true, followUp }, { status: 200 });
  } catch (error: any) {
    console.error("POST_FOLLOWUP_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
