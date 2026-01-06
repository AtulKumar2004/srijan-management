import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import User from "@/models/User";
import jwt from "jsonwebtoken";

// GET /api/followups?programId=xxx&date=xxx&userType=participant|guest
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Only admins and volunteers can view follow-ups
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");
    const date = searchParams.get("date");
    const userType = searchParams.get("userType");

    if (!programId || !date) {
      return NextResponse.json(
        { error: "Program ID and date are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Create date range for the entire day
    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

    const query: any = {
      program: programId,
      followUpDate: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    };

    if (userType) {
      query.userType = userType;
    }

    const followUps = await FollowUp.find(query)
      .populate("user", "name email phone profession")
      .populate("assignedVolunteer", "name email")
      .populate("calledBy", "name")
      .sort({ "user.name": 1 });

    return NextResponse.json({
      followUps,
      count: followUps.length
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET_FOLLOWUPS_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
