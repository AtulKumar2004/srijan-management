import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Session from "@/models/Session";
import FollowUp from "@/models/FollowUp";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// GET /api/programs/[id]/sessions - Get all sessions for a program
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Clean up any old auto-created dummy sessions from previous followups sync logic
    await Session.deleteMany({
      programId: id,
      sessionTopic: "Session",
      speakerName: "To be updated"
    });

    // Get existing sessions created explicitly by admins
    let sessions = await Session.find({
      programId: id,
      isDeleted: false
    }).lean();

    // Sort by date (most recent first)
    sessions.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

    // Compute attendance summary per session date matching exact level.
    const allProgramStudents = await User.find({
      programs: id,
      role: { $in: ["volunteer", "participant"] }
    }).select("_id level").lean();

    const allPresentAttendance = await Attendance.find({
      programId: id,
      status: "present"
    }).select("participantId date").lean();

    const sessionsWithAttendance = sessions.map((session: any) => {
      const sessionLevel = session.level !== undefined && session.level !== null ? Number(session.level) : 1;
      const eligibleStudentIds = new Set(
        allProgramStudents.filter(s => Number(s.level || 1) === sessionLevel).map(s => s._id.toString())
      );
      const eligibleCount = eligibleStudentIds.size;
      const sessionDateStr = new Date(session.sessionDate).toISOString().split("T")[0];

      const presentForSession = allPresentAttendance.filter(a => {
        const aDateStr = new Date(a.date).toISOString().split("T")[0];
        return aDateStr === sessionDateStr && eligibleStudentIds.has(a.participantId.toString());
      });
      const presentCount = new Set(presentForSession.map(a => a.participantId.toString())).size;

      return {
        ...session,
        level: sessionLevel,
        description: session.description || "",
        presentCount,
        absentCount: Math.max(eligibleCount - presentCount, 0)
      };
    });

    return NextResponse.json({
      success: true,
      sessions: sessionsWithAttendance
    });
  } catch (error: any) {
    console.error("GET_SESSIONS_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions", details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/programs/[id]/sessions - Create a new session
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create sessions" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { sessionTopic, sessionDate, speakerName, level, description } = body;

    if (!sessionDate || !sessionTopic) {
      return NextResponse.json({ error: "Date and topic are required" }, { status: 400 });
    }

    const newSession = await Session.create({
      programId: id,
      sessionDate: new Date(sessionDate),
      sessionTopic,
      speakerName: speakerName || "To be updated",
      level: level ? Number(level) : 1,
      description: description || "",
      isDeleted: false
    });

    return NextResponse.json({ success: true, session: newSession }, { status: 201 });
  } catch (error: any) {
    console.error("POST_SESSION_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create session", details: error.message },
      { status: 500 }
    );
  }
}
