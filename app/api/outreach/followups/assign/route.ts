import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachContact from "@/models/Outreach";
import OutreachFollowUp from "@/models/OutreachFollowUp";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { adminName, volunteerIds, followUpDate } = body;

    if (!adminName || !volunteerIds || volunteerIds.length === 0 || !followUpDate) {
      return NextResponse.json(
        { error: "Admin name, volunteer IDs, and follow-up date are required" },
        { status: 400 }
      );
    }

    // Get all outreach contacts for this admin
    const contacts = await OutreachContact.find({ 
      underWhichAdmin: adminName
    }).sort({ createdAt: 1 });

    if (contacts.length === 0) {
      return NextResponse.json(
        { message: "No contacts found for this admin" },
        { status: 200 }
      );
    }

    // Check if follow-ups already exist for this date
    const existingFollowUps = await OutreachFollowUp.find({
      outreachContact: { $in: contacts.map(c => c._id) },
      followUpDate: new Date(followUpDate)
    });

    if (existingFollowUps.length > 0) {
      return NextResponse.json(
        { error: `Follow-up list already exists for ${followUpDate}. Please delete the existing list first or choose a different date.` },
        { status: 400 }
      );
    }

    // Distribute contacts equally among volunteers
    const contactsPerVolunteer = Math.ceil(contacts.length / volunteerIds.length);
    let createdCount = 0;

    for (let i = 0; i < volunteerIds.length; i++) {
      const volunteerId = volunteerIds[i];
      const startIndex = i * contactsPerVolunteer;
      const endIndex = Math.min(startIndex + contactsPerVolunteer, contacts.length);
      
      const contactsToAssign = contacts.slice(startIndex, endIndex);

      // Create followup records for this date
      for (const contact of contactsToAssign) {
        await OutreachFollowUp.create({
          outreachContact: contact._id,
          assignedVolunteer: volunteerId,
          followUpDate: new Date(followUpDate),
          status: "Not Called",
          remarks: ""
        });

        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created follow-up list for ${followUpDate} with ${createdCount} contacts assigned to ${volunteerIds.length} volunteers`,
      createdCount
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error creating follow-up list:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create follow-up list" },
      { status: 500 }
    );
  }
}
