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

      // Filter by same temple name as admin if available
      const adminUser = await User.findOne({ name: adminName, role: "admin" });
      if (adminUser && adminUser.connectedToTemple) {
        const templeRegex = new RegExp(`^${adminUser.connectedToTemple.trim()}$`, "i");
        const sameTempleContacts = contacts.filter(c => c.branch && templeRegex.test(c.branch));
        if (sameTempleContacts.length > 0) {
          contacts = sameTempleContacts;
        }
      }
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

    // Fetch volunteer users to get their details for email notification
    const volunteerUsers = await User.find({ _id: { $in: volunteerIds } });
    const volunteerMap = new Map();
    volunteerUsers.forEach(v => volunteerMap.set(v._id.toString(), v));

    // Randomly shuffle contacts before distributing among selected volunteers
    const shuffledContacts = [...contacts].sort(() => Math.random() - 0.5);

    // Distribute contacts equally among volunteers
    const contactsPerVolunteer = Math.ceil(shuffledContacts.length / volunteerIds.length);
    let createdCount = 0;

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
          sendOutreachFollowupEmail(volUser.email, volUser.name || "Volunteer", adminName, followUpDate, contactsToAssign.length);
        }
      }
    }

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
