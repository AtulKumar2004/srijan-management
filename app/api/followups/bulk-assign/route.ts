import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import User from "@/models/User";
import Outreach from "@/models/Outreach";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// POST /api/followups/bulk-assign - Automatically distribute follow-ups among volunteers
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // Only admins can bulk assign
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Only admins can bulk assign follow-ups" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      contacts, 
      programId, 
      programDate, 
      assignmentMode = "auto", // "auto", "equal", "manual"
      volunteers = [] // Array of volunteer IDs (optional for auto mode)
    } = body;

    // Validate required fields
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "Contacts array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!programDate) {
      return NextResponse.json(
        { error: "Program date is required" },
        { status: 400 }
      );
    }

    await connectDB();

    let availableVolunteers = [];

    // Get available volunteers
    if (assignmentMode === "manual" && volunteers.length > 0) {
      // Use provided volunteer list
      availableVolunteers = await User.find({
        _id: { $in: volunteers },
        role: { $in: ["volunteer", "admin"] },
        isActive: true
      }).select("_id name");
    } else {
      // Auto-detect all active volunteers
      availableVolunteers = await User.find({
        role: { $in: ["volunteer", "admin"] },
        isActive: true
      }).select("_id name");
    }

    if (availableVolunteers.length === 0) {
      return NextResponse.json(
        { error: "No active volunteers available for assignment" },
        { status: 400 }
      );
    }

    // Create follow-ups with smart distribution
    const followUps = [];
    const errors = [];
    let volunteerIndex = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        const followUpData: any = {
          targetType: contact.type,
          createdBy: decoded.userId,
          programDate: new Date(programDate),
          status: "pending",
          channel: "phone"
        };

        // Round-robin assignment to distribute evenly
        followUpData.assignedTo = availableVolunteers[volunteerIndex % availableVolunteers.length]._id;
        volunteerIndex++;

        if (programId) {
          followUpData.program = programId;
        }

        // Set target reference based on type
        if (contact.type === "user") {
          const user = await User.findById(contact.id);
          if (!user) {
            errors.push({ contactId: contact.id, error: "User not found" });
            continue;
          }
          followUpData.targetUser = contact.id;
        } else if (contact.type === "outreach") {
          const outreach = await Outreach.findById(contact.id);
          if (!outreach) {
            errors.push({ contactId: contact.id, error: "Outreach contact not found" });
            continue;
          }
          followUpData.targetOutreach = contact.id;
        } else {
          errors.push({ contactId: contact.id, error: "Invalid contact type" });
          continue;
        }

        // Check if follow-up already exists
        const existingFollowUp = await FollowUp.findOne({
          ...(contact.type === "user" 
            ? { targetUser: contact.id } 
            : { targetOutreach: contact.id }),
          programDate: new Date(programDate),
          isDeleted: false
        });

        if (existingFollowUp) {
          errors.push({ 
            contactId: contact.id, 
            error: "Follow-up already exists for this contact and program date" 
          });
          continue;
        }

        // Create the follow-up
        const followUp = await FollowUp.create(followUpData);
        followUps.push(followUp);

      } catch (error: any) {
        errors.push({ 
          contactId: contact.id, 
          error: error.message || "Failed to create follow-up" 
        });
      }
    }

    // Calculate distribution stats
    const distribution: any = {};
    for (const volunteer of availableVolunteers) {
      const count = followUps.filter(
        (fu: any) => fu.assignedTo.toString() === volunteer._id.toString()
      ).length;
      
      distribution[volunteer.name] = count;
    }

    return NextResponse.json({
      success: true,
      message: `Automatically assigned ${followUps.length} follow-ups to ${availableVolunteers.length} volunteers`,
      data: {
        created: followUps.length,
        volunteers: availableVolunteers.length,
        distribution: distribution,
        errors: errors.length > 0 ? errors : undefined
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error in bulk assignment:", error);
    return NextResponse.json(
      { error: "Failed to bulk assign follow-ups", details: error.message },
      { status: 500 }
    );
  }
}
