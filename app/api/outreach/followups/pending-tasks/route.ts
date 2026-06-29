import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachFollowUp from "@/models/OutreachFollowUp";
import OutreachContact from "@/models/Outreach";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

    if (decoded.role !== "volunteer") {
      return NextResponse.json({ success: true, tasks: [] }, { status: 200 });
    }

    // Ensure model registration
    OutreachContact.init();

    const followups = await OutreachFollowUp.find({
      assignedVolunteer: decoded.userId,
      status: "Not Called"
    }).populate("outreachContact", "underWhichAdmin branch name").lean();

    // Group by followUpDate string (YYYY-MM-DD)
    const taskMap = new Map<string, { count: number; adminName: string; followUpDate: string }>();

    for (const f of followups) {
      if (!f.followUpDate || !f.outreachContact) continue;
      const dateStr = new Date(f.followUpDate).toISOString().split("T")[0];
      const adminName = (f.outreachContact as any).underWhichAdmin || "Admin";
      const key = `${dateStr}_${adminName}`;

      if (!taskMap.has(key)) {
        taskMap.set(key, { count: 0, adminName, followUpDate: dateStr });
      }
      taskMap.get(key)!.count += 1;
    }

    const tasks = Array.from(taskMap.entries()).map(([key, val], idx) => ({
      _id: `outreach-task-${key}-${idx}`,
      requestType: "outreach-followup",
      status: "pending",
      createdAt: val.followUpDate,
      outreachTask: val
    }));

    return NextResponse.json({ success: true, tasks }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching pending outreach tasks:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch pending tasks" }, { status: 500 });
  }
}
