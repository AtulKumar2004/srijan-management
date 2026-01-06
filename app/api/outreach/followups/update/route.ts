import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachFollowUp from "@/models/OutreachFollowUp";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    const body = await req.json();
    const { contactId, followUpDate, status, remarks } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    if (!followUpDate) {
      return NextResponse.json(
        { error: "Follow-up date is required" },
        { status: 400 }
      );
    }

    // Find existing followup for this contact on this specific date
    const targetDate = new Date(followUpDate);
    let followup = await OutreachFollowUp.findOne({ 
      outreachContact: contactId,
      followUpDate: targetDate
    });

    if (followup) {
      // Update existing followup
      followup.status = status || followup.status;
      followup.remarks = remarks !== undefined ? remarks : followup.remarks;
      followup.calledBy = decoded.userId;
      followup.calledAt = new Date();
      await followup.save();
    } else {
      return NextResponse.json(
        { error: "Follow-up not found for this date. Please create a list first." },
        { status: 404 }
      );
    }

    await followup.populate("calledBy", "name");
    await followup.populate("assignedVolunteer", "name");

    return NextResponse.json({
      success: true,
      followup
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error updating followup:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update followup" },
      { status: 500 }
    );
  }
}
