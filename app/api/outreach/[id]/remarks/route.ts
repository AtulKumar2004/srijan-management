import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachFollowUp from "@/models/OutreachFollowUp";
import OutreachContact from "@/models/Outreach";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// GET /api/outreach/[id]/remarks
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (!["admin", "program_manager", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();

    const followUps = await OutreachFollowUp.find({
      outreachContact: id,
      $or: [
        { remarks: { $exists: true, $ne: "" } },
        { status: { $ne: "Not Called" } }
      ]
    })
      .populate("calledBy", "name")
      .populate("assignedVolunteer", "name")
      .sort({ followUpDate: -1 })
      .lean();

    const remarksList = followUps.map((fu: any) => {
      let remarkedBy = "Unknown";
      if (fu.calledBy && fu.calledBy.name) {
        remarkedBy = fu.calledBy.name;
      } else if (fu.assignedVolunteer && fu.assignedVolunteer.name) {
        remarkedBy = fu.assignedVolunteer.name;
      } else {
        remarkedBy = "System/Unassigned";
      }

      return {
        _id: fu._id,
        date: fu.followUpDate ? new Date(fu.followUpDate).toISOString().split("T")[0] : "",
        remarks: fu.remarks || "",
        status: fu.status || "Not Called",
        remarkedBy
      };
    });

    return NextResponse.json({ remarks: remarksList }, { status: 200 });
  } catch (error: any) {
    console.error("GET_OUTREACH_REMARKS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/outreach/[id]/remarks
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (!["admin", "program_manager", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { date, remarks, status } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    await connectDB();

    const contact = await OutreachContact.findById(id);
    if (!contact) {
      return NextResponse.json({ error: "Outreach contact not found" }, { status: 404 });
    }

    const followUpDateObj = new Date(date);
    let followUp = await OutreachFollowUp.findOne({
      outreachContact: id,
      followUpDate: followUpDateObj
    });

    if (followUp) {
      if (remarks !== undefined) followUp.remarks = remarks;
      if (status !== undefined) followUp.status = status;
      followUp.calledBy = decoded.userId;
      followUp.calledAt = new Date();
      await followUp.save();
    } else {
      followUp = await OutreachFollowUp.create({
        outreachContact: id,
        followUpDate: followUpDateObj,
        remarks: remarks || "",
        status: status || "Not Called",
        calledBy: decoded.userId,
        calledAt: new Date()
      });
    }

    return NextResponse.json({ message: "Remark added successfully", followUp }, { status: 200 });
  } catch (error: any) {
    console.error("POST_OUTREACH_REMARKS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// PATCH /api/outreach/[id]/remarks
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (!["admin", "program_manager", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { followUpId, remarks, status, date } = body;

    if (!followUpId) {
      return NextResponse.json({ error: "followUpId is required" }, { status: 400 });
    }

    await connectDB();

    const followUp = await OutreachFollowUp.findById(followUpId);
    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    if (remarks !== undefined) followUp.remarks = remarks;
    if (status !== undefined) followUp.status = status;
    if (date !== undefined && date) followUp.followUpDate = new Date(date);
    followUp.calledBy = decoded.userId;
    followUp.calledAt = new Date();
    await followUp.save();

    return NextResponse.json({ message: "Remark updated successfully", followUp }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH_OUTREACH_REMARKS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/outreach/[id]/remarks
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (!["admin", "program_manager", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const followUpId = searchParams.get("followUpId");

    if (!followUpId) {
      return NextResponse.json({ error: "followUpId is required" }, { status: 400 });
    }

    await connectDB();

    const followUp = await OutreachFollowUp.findById(followUpId);
    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    await OutreachFollowUp.findByIdAndDelete(followUpId);

    return NextResponse.json({ message: "Remark deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE_OUTREACH_REMARKS_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
