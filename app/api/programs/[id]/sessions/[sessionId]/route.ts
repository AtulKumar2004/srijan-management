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

    // Get all volunteers and participants in this program
    const allStudents = await User.find({
      programs: programId,
      role: { $in: ["volunteer", "participant"] }
    }).select("_id name email phone role").lean();

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

    // Separate present and absent users
    const presentUsers = allStudents.filter(student => presentUserIds.has(student._id.toString()));
    const absentUsers = allStudents.filter(student => !presentUserIds.has(student._id.toString()));

    return NextResponse.json({
      success: true,
      session,
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
