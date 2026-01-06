import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import Session from "@/models/Session";
import jwt from "jsonwebtoken";

// DELETE /api/followups/delete-for-date - Delete follow-up list for a specific date
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Allow admins and volunteers to delete follow-up lists
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Only admins and volunteers can delete follow-up lists" }, { status: 403 });
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

    // Normalize date
    const dateObj = new Date(date);
    const normalizedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

    // Delete follow-ups for this date
    const deleteFollowUpsResult = await FollowUp.deleteMany({
      program: programId,
      followUpDate: { $gte: normalizedDate, $lte: endOfDay }
    });

    // Delete session for this date
    const deleteSessionResult = await Session.deleteMany({
      programId: programId,
      sessionDate: { $gte: normalizedDate, $lte: endOfDay }
    });

    return NextResponse.json({
      message: `Successfully deleted ${deleteFollowUpsResult.deletedCount} follow-ups and ${deleteSessionResult.deletedCount} session(s)`,
      followUpsDeleted: deleteFollowUpsResult.deletedCount,
      sessionsDeleted: deleteSessionResult.deletedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error("DELETE_FOLLOWUP_LIST_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
