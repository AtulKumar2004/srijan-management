import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Session from "@/models/Session";
import FollowUp from "@/models/FollowUp";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import mongoose from "mongoose";

// GET /api/programs/[id]/sessions - Get all sessions for a program
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Get all unique followup dates for this program
    const followUpDates = await FollowUp.aggregate([
      {
        $match: {
          program: new mongoose.Types.ObjectId(id),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$followUpDate" }
          },
          followUpDate: { $first: "$followUpDate" }
        }
      }
    ]);

    // Get existing sessions
    let sessions = await Session.find({
      programId: id,
      isDeleted: false
    }).lean();

    const existingSessionDates = new Set(
      sessions.map(s => new Date(s.sessionDate).toISOString().split('T')[0])
    );

    // Create sessions for followup dates that don't have sessions
    const newSessions = [];
    for (const { followUpDate } of followUpDates) {
      const dateStr = new Date(followUpDate).toISOString().split('T')[0];
      if (!existingSessionDates.has(dateStr)) {
        // Normalize the date to start of day
        const date = new Date(followUpDate);
        const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        
        newSessions.push({
          programId: id,
          sessionDate: normalizedDate,
          sessionTopic: "Session",
          speakerName: "To be updated",
          isDeleted: false
        });
      }
    }

    // Insert new sessions if any
    if (newSessions.length > 0) {
      await Session.insertMany(newSessions);
      
      // Fetch all sessions again
      sessions = await Session.find({
        programId: id,
        isDeleted: false
      }).lean();
    }

    // Sort by date (most recent first)
    sessions.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

    // Compute attendance summary per session date for list view.
    const totalStudents = await User.countDocuments({
      programs: id,
      role: { $in: ["volunteer", "participant"] }
    });

    const presentByDate = await Attendance.aggregate([
      {
        $match: {
          programId: new mongoose.Types.ObjectId(id),
          status: "present"
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          presentCount: { $sum: 1 }
        }
      }
    ]);

    const presentCountMap = new Map(
      presentByDate.map((item) => [item._id, item.presentCount])
    );

    const sessionsWithAttendance = sessions.map((session: any) => {
      const dateKey = new Date(session.sessionDate).toISOString().split("T")[0];
      const presentCount = presentCountMap.get(dateKey) || 0;

      return {
        ...session,
        presentCount,
        absentCount: Math.max(totalStudents - presentCount, 0)
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
