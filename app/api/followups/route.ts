import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import User from "@/models/User";
import Outreach from "@/models/Outreach";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// POST /api/followups - Create follow-ups for a program date
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // Only admins and volunteers can create follow-ups
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { contacts, programId, programDate, assignedTo } = body;

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

    // Create follow-ups for each contact
    const followUps = [];
    const errors = [];

    for (const contact of contacts) {
      try {
        const followUpData: any = {
          targetType: contact.type, // "user" or "outreach"
          createdBy: decoded.userId,
          assignedTo: assignedTo || decoded.userId, // Default to creator if not specified
          programDate: new Date(programDate),
          status: "pending",
          channel: "phone"
        };

        // Add program reference if provided
        if (programId) {
          followUpData.program = programId;
        }

        // Set target reference based on type
        if (contact.type === "user") {
          // Verify user exists
          const user = await User.findById(contact.id);
          if (!user) {
            errors.push({ contactId: contact.id, error: "User not found" });
            continue;
          }
          followUpData.targetUser = contact.id;
        } else if (contact.type === "outreach") {
          // Verify outreach contact exists
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

        // Check if follow-up already exists for this contact and program date
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

    return NextResponse.json({
      success: true,
      message: `Created ${followUps.length} follow-ups`,
      data: {
        created: followUps.length,
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

// GET /api/followups - Get follow-ups (filtered by query params)
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // Only admins and volunteers can access follow-ups
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const assignedTo = searchParams.get("assignedTo"); // Filter by assigned volunteer
    const status = searchParams.get("status"); // Filter by status
    const programDate = searchParams.get("programDate"); // Filter by program date
    const myFollowUps = searchParams.get("myFollowUps"); // Get only current user's follow-ups

    // Build query
    const query: any = { isDeleted: false };

    // If myFollowUps=true, show only follow-ups assigned to current user
    if (myFollowUps === "true") {
      query.assignedTo = decoded.userId;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (status) {
      query.status = status;
    }

    if (programDate) {
      query.programDate = new Date(programDate);
    }

    // Fetch follow-ups with populated references
    const followUps = await FollowUp.find(query)
      .populate("targetUser", "name email phone role profession homeTown")
      .populate("targetOutreach", "name phone location interestLevel notes")
      .populate("assignedTo", "name email phone")
      .populate("createdBy", "name email")
      .populate("program", "name description")
      .sort({ programDate: -1, createdAt: -1 });

    // Format the response
    const formattedFollowUps = followUps.map(fu => {
      const baseData: any = {
        id: fu._id,
        targetType: fu.targetType,
        status: fu.status,
        channel: fu.channel,
        notes: fu.notes,
        programDate: fu.programDate,
        nextActionAt: fu.nextActionAt,
        createdAt: fu.createdAt,
        updatedAt: fu.updatedAt,
        assignedTo: fu.assignedTo,
        createdBy: fu.createdBy,
        program: fu.program
      };

      // Add target contact details
      if (fu.targetType === "user" && fu.targetUser) {
        baseData.contact = {
          id: fu.targetUser._id,
          name: fu.targetUser.name,
          email: fu.targetUser.email,
          phone: fu.targetUser.phone,
          role: fu.targetUser.role,
          profession: fu.targetUser.profession,
          homeTown: fu.targetUser.homeTown
        };
      } else if (fu.targetType === "outreach" && fu.targetOutreach) {
        baseData.contact = {
          id: fu.targetOutreach._id,
          name: fu.targetOutreach.name,
          phone: fu.targetOutreach.phone,
          location: fu.targetOutreach.location,
          interestLevel: fu.targetOutreach.interestLevel,
          notes: fu.targetOutreach.notes
        };
      }

      return baseData;
    });

    return NextResponse.json({
      success: true,
      count: formattedFollowUps.length,
      data: formattedFollowUps
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching follow-ups:", error);
    return NextResponse.json(
      { error: "Failed to fetch follow-ups", details: error.message },
      { status: 500 }
    );
  }
}
