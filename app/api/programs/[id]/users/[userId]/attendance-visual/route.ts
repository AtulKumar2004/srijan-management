import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Session from "@/models/Session";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await connectDB();
    const { id: programId, userId } = await params;

    // Validate ObjectIds before querying
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(programId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Try to get the student's level — default to 1 if user not found
    let studentLevel = 1;
    try {
      const student = await User.findById(userId).select("level");
      if (student) {
        studentLevel = Number(student.level || 1);
      }
    } catch {
      // User lookup failed; continue with default level 1
    }

    // Fetch all scheduled sessions for this program
    const allSessions = await Session.find({ programId }).sort({ sessionDate: 1 }).lean();

    // Filter to only those sessions where session level matches the student's level
    const candidateSessions = allSessions.filter((s: any) => Number(s.level || 1) === studentLevel);

    // Fetch all attendance records for this user in this program where status is present
    const attendanceRecords = await Attendance.find({
      programId,
      participantId: userId,
      status: "present"
    }).lean();

    // Map attended dates YYYY-MM-DD -> boolean
    // Also include the day before/after to handle timezone-offset edge cases
    const attendedDatesSet = new Set<string>();
    attendanceRecords.forEach((a: any) => {
      try {
        const d = new Date(a.date);
        // Add the UTC date string
        attendedDatesSet.add(d.toISOString().split('T')[0]);
        // Also add local date string (handles records stored with timezone offset)
        const localStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        attendedDatesSet.add(localStr);
      } catch {}
    });

    const visualSessions: any[] = [];
    const attendedLevelCounts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let totalAttended = 0;

    candidateSessions.forEach((sess: any) => {
      try {
        const d = new Date(sess.sessionDate);
        const dateStr = d.toISOString().split('T')[0];
        const localStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isPresent = attendedDatesSet.has(dateStr) || attendedDatesSet.has(localStr);

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
