import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachContact from "@/models/Outreach";
import OutreachFollowUp from "@/models/OutreachFollowUp";
import User from "@/models/User";
import { sendOutreachFollowupEmail } from "@/lib/sendOutreachFollowupEmail";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { adminName, volunteerIds, followUpDate, customFormId } = body;

    if (!adminName || !volunteerIds || volunteerIds.length === 0 || !followUpDate) {
      return NextResponse.json(
        { error: "Admin name, volunteer IDs, and follow-up date are required" },
        { status: 400 }
      );
    }

    // Get outreach contacts for this admin or customFormId
    let contacts;
    if (customFormId) {
      contacts = await OutreachContact.find({ customFormId }).sort({ createdAt: 1 });
    } else {
      contacts = await OutreachContact.find({
        underWhichAdmin: adminName,
        $or: [
          { customFormId: { $exists: false } },
          { customFormId: null }
        ]
      }).sort({ createdAt: 1 });

    }

    // Check if ANY follow-ups already exist for this specific list on this date
    const existingFollowUps = await OutreachFollowUp.find({
      outreachContact: { $in: contacts.map(c => c._id) },
      followUpDate: new Date(followUpDate)
    });

    if (existingFollowUps.length > 0) {
      return NextResponse.json(
        { error: `A follow-up list has already been generated for ${followUpDate} in this section. Please delete the existing list first or choose a different date.` },
        { status: 400 }
      );
    }

    // Fetch volunteer users to get their details for email notification
    const volunteerUsers = await User.find({ _id: { $in: volunteerIds } });
    const volunteerMap = new Map();
    volunteerUsers.forEach(v => volunteerMap.set(v._id.toString(), v));

    // Randomly shuffle contacts before distributing among selected volunteers
    const shuffledContacts = [...contacts].sort(() => Math.random() - 0.5);

    // Distribute contacts equally among volunteers
    const contactsPerVolunteer = Math.ceil(shuffledContacts.length / volunteerIds.length);
    let createdCount = 0;

    const emailPromises: Promise<void>[] = [];

    for (let i = 0; i < volunteerIds.length; i++) {
      const volunteerId = volunteerIds[i];
      const startIndex = i * contactsPerVolunteer;
      const endIndex = Math.min(startIndex + contactsPerVolunteer, shuffledContacts.length);

      const contactsToAssign = shuffledContacts.slice(startIndex, endIndex);

      // Create followup records for this date without creating any new program sessions
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

      if (contactsToAssign.length > 0) {
        const volUser = volunteerMap.get(volunteerId.toString());
        if (volUser && volUser.email) {
          emailPromises.push(
            sendOutreachFollowupEmail(volUser.email, volUser.name || "Volunteer", adminName, followUpDate, contactsToAssign.length)
          );
        }
      }
    }

    // Wait for all emails to be dispatched before returning the response
    await Promise.all(emailPromises);

    return NextResponse.json({
      success: true,
      message: `Successfully created follow-up list for ${followUpDate} with ${createdCount} contacts randomly assigned to ${volunteerIds.length} volunteers`,
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
