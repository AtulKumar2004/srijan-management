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

    // Try to get the student's level and historical promotion timestamps
    let studentLevel = 1;
    let levelHistory: { level: number; joinedAt: Date }[] = [];
    try {
      const student = await User.findById(userId).select("level levelHistory");
      if (student) {
        studentLevel = Number(student.level || 1);
        levelHistory = (student.levelHistory || []).map((h: any) => ({
          level: Number(h.level),
          joinedAt: new Date(h.joinedAt)
        }));
      }
    } catch {
      // User lookup failed; continue with default level 1
    }

    // Sort levelHistory chronologically ascending
    levelHistory.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    // Fetch all scheduled sessions for this program
    const allSessions = await Session.find({ programId }).sort({ sessionDate: 1 }).lean();

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
        const d = new Date(a.date);
        attendedDatesSet.add(d.toISOString().split('T')[0]);
        const localStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        attendedDatesSet.add(localStr);
      } catch {}
    });

    const now = new Date();

    // Apply Session Visibility Rules across Level Changes:
    const candidateSessions = allSessions.filter((s: any) => {
      const sessLevel = Number(s.level || 1);
      try {
        const d = new Date(s.sessionDate);
        const dateStr = d.toISOString().split('T')[0];
        const localStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isPresent = attendedDatesSet.has(dateStr) || attendedDatesSet.has(localStr);

        // Always show if explicitly marked present
        if (isPresent) return true;

        // Rule 1: Higher levels than current level should not appear unless attended
        if (sessLevel > studentLevel) return false;

        // Rule 2: Lower levels than current level should only appear if the session occurred BEFORE the user promoted out of that level
        if (sessLevel < studentLevel) {
          const promotedOutEntry = levelHistory.find((h) => h.level > sessLevel);
          if (promotedOutEntry) {
            const promotedStartOfDay = new Date(promotedOutEntry.joinedAt);
            promotedStartOfDay.setHours(0, 0, 0, 0);
            if (d >= promotedStartOfDay) {
              return false;
            }
          } else {
            // If there is no explicit history recording when they promoted out of sessLevel,
            // do not show unattended lower-level sessions on their profile.
            return false;
          }
        }

        // Rule 3: For current level sessions (sessLevel === studentLevel), if level > 1 and joinedEntry exists, check if session was before joining
        if (sessLevel === studentLevel && sessLevel > 1) {
          const joinedEntry = levelHistory.find((h) => h.level === sessLevel);
          if (joinedEntry) {
            const joinedStartOfDay = new Date(joinedEntry.joinedAt);
            joinedStartOfDay.setHours(0, 0, 0, 0);
            if (d < joinedStartOfDay) {
              return false;
            }
          }
        }

        return true;
      } catch {
        return false;
      }
    });

    const visualSessions: any[] = [];
    const attendedLevelCounts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let totalAttended = 0;

    candidateSessions.forEach((sess: any) => {
      try {
        const sessLevel = Number(sess.level || 1);
        const d = new Date(sess.sessionDate);
        const dateStr = d.toISOString().split('T')[0];
        const localStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isPresent = attendedDatesSet.has(dateStr) || attendedDatesSet.has(localStr);

        if (isPresent) {
          totalAttended++;
          attendedLevelCounts[sessLevel] = (attendedLevelCounts[sessLevel] || 0) + 1;
        }

        const sDate = new Date(dateStr + "T00:00:00");
        visualSessions.push({
          dateStr,
          year: sDate.getFullYear(),
          monthName: sDate.toLocaleString("default", { month: "long" }),
          monthKey: `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`,
          level: sessLevel,
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
