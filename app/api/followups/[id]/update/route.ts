import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import jwt from "jsonwebtoken";

// PATCH /api/followups/[id]/update - Update follow-up status and remarks
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Only admins and volunteers can update follow-ups
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, remarks } = body;

    await connectDB();

    const followUp = await FollowUp.findById(id);
    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    // Update fields
    if (status) followUp.status = status;
    if (remarks !== undefined) followUp.remarks = remarks;
    
    // Track who made the call and when
    followUp.calledBy = decoded.userId;
    followUp.calledAt = new Date();

    await followUp.save();

    const updated = await FollowUp.findById(id)
      .populate("user", "name email phone")
      .populate("assignedVolunteer", "name")
      .populate("calledBy", "name");

    return NextResponse.json({
      message: "Follow-up updated successfully",
      followUp: updated
    }, { status: 200 });

  } catch (error: any) {
    console.error("UPDATE_FOLLOWUP_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
