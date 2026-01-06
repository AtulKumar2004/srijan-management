import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import Program from "@/models/Program";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// GET /api/users/[id]/attendance-history - Get user's attendance history
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Verify authentication
    const token = req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

    // Users can only view their own attendance or admins can view anyone's
    if (decoded.userId !== id && decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch attendance records for the user
    const attendanceRecords = await Attendance.find({ participantId: id })
      .populate("programId", "name")
      .sort({ date: 1 }) // Sort by date ascending
      .lean();

    // Group attendance by month for better visualization
    const attendanceByMonth: { [key: string]: number } = {};
    const attendanceByProgram: { [key: string]: number } = {};
    const recentSessions: any[] = [];

    attendanceRecords.forEach((record: any) => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Count by month
      attendanceByMonth[monthKey] = (attendanceByMonth[monthKey] || 0) + 1;
      
      // Count by program
      const programName = record.programId?.name || 'Unknown';
      attendanceByProgram[programName] = (attendanceByProgram[programName] || 0) + 1;

      // Keep recent sessions (last 10)
      recentSessions.push({
        date: record.date,
        program: programName,
        status: record.status || 'present',
      });
    });

    // Format data for charts
    const monthlyData = Object.entries(attendanceByMonth)
      .map(([month, count]) => ({
        month,
        sessions: count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const programData = Object.entries(attendanceByProgram).map(([name, count]) => ({
      name,
      sessions: count,
    }));

    return NextResponse.json({
      success: true,
      totalSessions: attendanceRecords.length,
      monthlyData,
      programData,
      recentSessions: recentSessions.slice(-10).reverse(), // Last 10, most recent first
    });
  } catch (error: any) {
    console.error("ATTENDANCE HISTORY ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance history", details: error.message },
      { status: 500 }
    );
  }
}
