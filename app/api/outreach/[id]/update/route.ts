import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachContact from "@/models/Outreach";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    console.log("Update request for ID:", id);
    console.log("Received body:", body);

    const {
      name,
      phone,
      profession,
      motherTongue,
      currentLocation,
      registeredBy,
      numberOfRounds,
      branch,
      paidStatus,
      underWhichAdmin,
      comment
    } = body;

    // Validate required fields
    if (!name || !phone || !profession || !registeredBy || !branch || !paidStatus) {
      console.log("Validation failed - missing fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const updatePayload = {
      name,
      phone,
      profession,
      motherTongue,
      currentLocation,
      registeredBy,
      numberOfRounds: numberOfRounds || 0,
      branch,
      paidStatus,
      underWhichAdmin,
      comment,
      updatedAt: new Date()
    };

    console.log("Update payload:", updatePayload);

    const updatedContact = await OutreachContact.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true }
    );

    console.log("Updated contact:", updatedContact);

    if (!updatedContact) {
      return NextResponse.json(
        { error: "Outreach contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Outreach contact updated successfully",
      contact: updatedContact
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error updating outreach contact:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update outreach contact" },
      { status: 500 }
    );
  }
}
