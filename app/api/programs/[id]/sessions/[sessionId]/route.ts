import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Session from "@/models/Session";
import User from "@/models/User";
import Attendance from "@/models/Attendance";

// GET /api/programs/[id]/sessions/[sessionId] - Get session details with attendance
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    await connectDB();

    const { id: programId, sessionId } = await params;

    // Get session details
    const session = await Session.findById(sessionId).lean();
    
    if (!session || session.isDeleted) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const sessionLevel = session.level !== undefined && session.level !== null ? Number(session.level) : 1;

    // Get all volunteers and participants in this program matching the session level
    const allStudents = await User.find({
      programs: programId,
      role: { $in: ["volunteer", "participant"] }
    }).select("_id name email phone role level grade").lean();

    const eligibleStudents = allStudents.filter(student => Number(student.level || 1) === sessionLevel);

    // Get attendance records for this session date
    const sessionDate = new Date(session.sessionDate);
    const startOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 23, 59, 59);

    const attendanceRecords = await Attendance.find({
      programId: programId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: "present"
    }).select("participantId").lean();

    const presentUserIds = new Set(attendanceRecords.map(a => a.participantId.toString()));

    // Separate present and absent users from eligible students
    const presentUsers = eligibleStudents.filter(student => presentUserIds.has(student._id.toString()));
    const absentUsers = eligibleStudents.filter(student => !presentUserIds.has(student._id.toString()));

    return NextResponse.json({
      success: true,
      session: {
        ...session,
        level: sessionLevel,
        description: session.description || ""
      },
      presentUsers,
      absentUsers
    });
  } catch (error: any) {
    console.error("GET_SESSION_DETAIL_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch session details", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/programs/[id]/sessions/[sessionId] - Update session details
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    await connectDB();
    const { sessionId } = await params;
    const body = await req.json();
    const { sessionTopic, sessionDate, speakerName, description, level } = body;

    const updated = await Session.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          sessionTopic,
          sessionDate: sessionDate ? new Date(sessionDate) : undefined,
          speakerName,
          description: description || "",
          level: level ? Number(level) : 1
        }
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (error: any) {
    console.error("PUT_SESSION_ERROR:", error);
    return NextResponse.json({ error: "Failed to update session", details: error.message }, { status: 500 });
  }
}

// DELETE /api/programs/[id]/sessions/[sessionId] - Soft delete session
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    await connectDB();
    const { sessionId } = await params;

    const deleted = await Session.findByIdAndUpdate(sessionId, { isDeleted: true });
    if (!deleted) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE_SESSION_ERROR:", error);
    return NextResponse.json({ error: "Failed to delete session", details: error.message }, { status: 500 });
  }
}
