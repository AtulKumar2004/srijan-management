import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import User from "@/models/User";
import Outreach from "@/models/Outreach";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// POST /api/followups/create-for-date - Admin creates follow-up for a date, system handles everything automatically
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // Only admins can create follow-ups
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create follow-ups" }, { status: 403 });
    }

    const body = await req.json();
    const { programDate, programId } = body;

    if (!programDate) {
      return NextResponse.json(
        { error: "Program date is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get all active volunteers
    const volunteers = await User.find({
      role: { $in: ["volunteer", "admin"] },
      isActive: true
    }).select("_id name email");

    if (volunteers.length === 0) {
      return NextResponse.json(
        { error: "No active volunteers available. Please add volunteers first." },
        { status: 400 }
      );
    }

    // Get ALL participants (active users)
    const participants = await User.find({ 
      role: { $in: ["participant", "guest"] },
      isActive: true 
    }).select("_id name email phone");

    // Get ALL outreach contacts
    const outreachContacts = await Outreach.find().select("_id name phone");

    const allContacts = [
      ...participants.map(p => ({ id: p._id, type: "user", name: p.name })),
      ...outreachContacts.map(o => ({ id: o._id, type: "outreach", name: o.name }))
    ];

    if (allContacts.length === 0) {
      return NextResponse.json(
        { error: "No contacts found. Please add participants or outreach contacts first." },
        { status: 400 }
      );
    }

    // Check for previous week's follow-ups to maintain consistency
    const oneWeekAgo = new Date(programDate);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const previousFollowUps = await FollowUp.find({
      programDate: { $gte: oneWeekAgo },
      isDeleted: false
    }).select("targetUser targetOutreach assignedTo");

    // Build assignment map: contactId -> volunteerId (for consistency)
    const existingAssignments: Map<string, string> = new Map();
    previousFollowUps.forEach(fu => {
      const contactId = (fu.targetUser || fu.targetOutreach).toString();
      existingAssignments.set(contactId, fu.assignedTo.toString());
    });

    // Prepare assignments
    const followUps = [];
    const errors = [];
    let volunteerIndex = 0;

    for (const contact of allContacts) {
      try {
        // Check if follow-up already exists for this date
        const existingFollowUp = await FollowUp.findOne({
          ...(contact.type === "user" 
            ? { targetUser: contact.id } 
            : { targetOutreach: contact.id }),
          programDate: new Date(programDate),
          isDeleted: false
        });

        if (existingFollowUp) {
          continue; // Skip if already exists
        }

        const followUpData: any = {
          targetType: contact.type,
          createdBy: decoded.userId,
          programDate: new Date(programDate),
          status: "pending",
          channel: "phone"
        };

        if (programId) {
          followUpData.program = programId;
        }

        // Assign volunteer: Use previous assignment if exists, otherwise round-robin
        const contactKey = contact.id.toString();
        if (existingAssignments.has(contactKey)) {
          // Keep same volunteer from last week
          followUpData.assignedTo = existingAssignments.get(contactKey);
        } else {
          // New contact: Assign to next volunteer in round-robin
          followUpData.assignedTo = volunteers[volunteerIndex % volunteers.length]._id;
          volunteerIndex++;
        }

        // Set target reference
        if (contact.type === "user") {
          followUpData.targetUser = contact.id;
        } else {
          followUpData.targetOutreach = contact.id;
        }

        // Create the follow-up
        const followUp = await FollowUp.create(followUpData);
        followUps.push(followUp);

      } catch (error: any) {
        errors.push({ 
          contactId: contact.id,
          contactName: contact.name,
          error: error.message || "Failed to create follow-up" 
        });
      }
    }

    // Calculate distribution stats
    const distribution: any = {};
    for (const volunteer of volunteers) {
      const count = followUps.filter(
        (fu: any) => fu.assignedTo.toString() === volunteer._id.toString()
      ).length;
      
      if (count > 0) {
        distribution[volunteer.name] = count;
      }
    }

    // Count existing vs new assignments
    const existingCount = followUps.filter((fu: any) => 
      existingAssignments.has((fu.targetUser || fu.targetOutreach).toString())
    ).length;
    const newCount = followUps.length - existingCount;

    return NextResponse.json({
      success: true,
      message: `✅ Follow-ups created for ${new Date(programDate).toLocaleDateString()}`,
      data: {
        totalContacts: allContacts.length,
        followUpsCreated: followUps.length,
        volunteers: volunteers.length,
        distribution: distribution,
        consistency: {
          existingPeople: existingCount,
          newPeople: newCount,
          message: existingCount > 0 
            ? `${existingCount} people assigned to same volunteer as last week`
            : "First time assignment - all new"
        },
        errors: errors.length > 0 ? errors : undefined
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error creating follow-ups:", error);
    return NextResponse.json(
      { error: "Failed to create follow-ups", details: error.message },
      { status: 500 }
    );
  }
}
