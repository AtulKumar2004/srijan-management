import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Session from "@/models/Session";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

export async function GET(
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
    if (decoded.role !== "admin" && decoded.role !== "program_manager") {
      return NextResponse.json({ error: "Only admins and program managers can view graphical analysis" }, { status: 403 });
    }

    const { id: programId } = await params;
    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month"); // e.g. "2025-06"

    let targetYear = new Date().getFullYear();
    let targetMonth = new Date().getMonth(); // 0-indexed

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const parts = monthParam.split("-");
      targetYear = parseInt(parts[0], 10);
      targetMonth = parseInt(parts[1], 10) - 1;
    }

    // Start and end of month in UTC
    const startDate = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));

    // Fetch non-deleted sessions for this program in date range
    const sessions = await Session.find({
      programId,
      sessionDate: { $gte: startDate, $lte: endDate },
      isDeleted: { $ne: true }
    }).lean();

    // Fetch all program students (volunteers & participants)
    const allProgramStudents = await User.find({
      programs: programId,
      role: { $in: ["volunteer", "participant"] }
    }).select("_id level").lean();

    // Fetch present attendance records in this program in date range
    const attendances = await Attendance.find({
      programId,
      date: { $gte: startDate, $lte: endDate },
      status: { $regex: /^present$/i }
    }).select("participantId date level").lean();

    // Calculate present count per session
    const sessionPresentCountMap: Record<string, number> = {};
    sessions.forEach(session => {
      const sessionLevel = session.level !== undefined && session.level !== null ? Number(session.level) : 1;
      const eligibleStudentIds = new Set(
        allProgramStudents.filter(s => Number(s.level || 1) === sessionLevel).map(s => s._id.toString())
      );
      const sessionDateStr = new Date(session.sessionDate).toISOString().split("T")[0];

      const presentForSession = attendances.filter(a => {
        const aDateStr = new Date(a.date).toISOString().split("T")[0];
        return aDateStr === sessionDateStr && eligibleStudentIds.has(a.participantId.toString());
      });
      sessionPresentCountMap[session._id.toString()] = new Set(presentForSession.map(a => a.participantId.toString())).size;
    });

    // We only have levels 1 to 4
    const levelsData: Array<{
      level: number;
      totalPresent: number;
      dates: Array<{ date: string; presentCount: number }>;
    }> = [];

    const allDatesSet = new Set<string>();

    for (let level = 1; level <= 4; level++) {
      const levelSessions = sessions.filter(s => Number(s.level || 1) === level);
      
      // Group by date string YYYY-MM-DD
      const dateMap: Record<string, number> = {};
      levelSessions.forEach(s => {
        const dateStr = new Date(s.sessionDate).toISOString().split("T")[0];
        allDatesSet.add(dateStr);
        const count = sessionPresentCountMap[s._id.toString()] || 0;
        dateMap[dateStr] = (dateMap[dateStr] || 0) + count;
      });

      const datesList = Object.keys(dateMap).sort().map(d => ({
        date: d,
        presentCount: dateMap[d]
      }));

      const totalPresent = datesList.reduce((sum, item) => sum + item.presentCount, 0);

      levelsData.push({
        level,
        totalPresent,
        dates: datesList
      });
    }

    const categories = Array.from(allDatesSet).sort();

    const colors = ["#66B5FF", "#A5F36D", "#FF80B3", "#B380FF"];

    const series = levelsData.map((ld, index) => {
      const data = categories.map(cat => {
        const found = ld.dates.find(d => d.date === cat);
        return found ? found.presentCount : 0;
      });

      return {
        name: `Level ${ld.level}`,
        data,
        color: colors[index]
      };
    });

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    return NextResponse.json({
      success: true,
      monthName: monthNames[targetMonth],
      year: targetYear,
      levelsData,
      chartData: {
        categories,
        series
      }
    });

  } catch (error: any) {
    console.error("GET_ANALYSIS_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch graphical analysis", details: error.message },
      { status: 500 }
    );
  }
}
