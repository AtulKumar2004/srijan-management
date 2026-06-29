import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Session from "@/models/Session";
import Attendance from "@/models/Attendance";
import User from "@/models/User";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await connectDB();
    const { id: programId, userId } = await params;

    const student = await User.findById(userId).select("level name");
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    const studentLevel = Number(student.level || 1);

    // Fetch all scheduled sessions for this program
    const allSessions = await Session.find({ programId }).sort({ sessionDate: 1 }).lean();
    
    // Filter to only those sessions where session level matches the candidate's level
    const candidateSessions = allSessions.filter((s: any) => Number(s.level || 1) === studentLevel);

    // Fetch all attendance records for this user in this program where status is present
    const attendanceRecords = await Attendance.find({
      programId,
      participantId: userId,
      status: "present"
    }).lean();

    // Map attended dates YYYY-MM-DD -> boolean
    const attendedDatesSet = new Set<string>();
    attendanceRecords.forEach((a: any) => {
      try {
        const dStr = new Date(a.date).toISOString().split('T')[0];
        attendedDatesSet.add(dStr);
      } catch {}
    });

    const visualSessions: any[] = [];
    const attendedLevelCounts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let totalAttended = 0;

    candidateSessions.forEach((sess: any) => {
      try {
        const dateStr = new Date(sess.sessionDate).toISOString().split('T')[0];
        const isPresent = attendedDatesSet.has(dateStr);
        if (isPresent) {
          totalAttended++;
          attendedLevelCounts[studentLevel] = (attendedLevelCounts[studentLevel] || 0) + 1;
        }

        const sDate = new Date(dateStr + "T00:00:00");
        visualSessions.push({
          dateStr,
          year: sDate.getFullYear(),
          monthName: sDate.toLocaleString("default", { month: "long" }),
          monthKey: `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`,
          level: studentLevel,
          status: isPresent ? "Present" : "Absent"
        });
      } catch {}
    });

    // Sort chronologically ascending
    visualSessions.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    return NextResponse.json({
      totalAttended,
      attendedLevelCounts,
      visualSessions
    }, { status: 200 });

  } catch (error: any) {
    console.error("ATTENDANCE_VISUAL_ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
