import { NextRequest, NextResponse } from "next/server";
import {connectDB} from "@/lib/db";
import OutreachContact from "@/models/Outreach";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    console.log("Received create request body:", body);
    
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

    console.log("Extracted underWhichAdmin:", underWhichAdmin);

    // Validate required fields
    if (!name || !phone || !profession || !registeredBy || !branch || !paidStatus || !underWhichAdmin) {
      console.log("Validation failed - missing fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create new outreach contact
    const outreachContact = await OutreachContact.create({
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
      comment
    });

    console.log("Created contact:", outreachContact);

    return NextResponse.json({
      success: true,
      message: "Outreach contact registered successfully",
      data: outreachContact
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error creating outreach contact:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register outreach contact" },
      { status: 500 }
    );
  }
}
