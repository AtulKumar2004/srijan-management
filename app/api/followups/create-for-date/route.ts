import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import User from "@/models/User";
import Session from "@/models/Session";
import jwt from "jsonwebtoken";

// POST /api/followups/create-for-date - Create follow-up list for a specific date
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Allow admins and volunteers to create follow-up lists
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Only admins and volunteers can create follow-up lists" }, { status: 403 });
    }

    const body = await req.json();
    const { programId, followUpDate, userType, volunteerIds, sessionTopic, speakerName } = body;

    if (!programId || !followUpDate || !userType) {
      return NextResponse.json(
        { error: "Program ID, follow-up date, and user type are required" },
        { status: 400 }
      );
    }

    if (!sessionTopic || !speakerName) {
      return NextResponse.json(
        { error: "Session topic and speaker name are required" },
        { status: 400 }
      );
    }

    if (!["participant", "guest"].includes(userType)) {
      return NextResponse.json(
        { error: "User type must be 'participant' or 'guest'" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get all users of specified type enrolled in this program (active and inactive)
    const users = await User.find({
      role: userType,
      programs: programId
    }).select("_id name email phone");

    if (users.length === 0) {
      return NextResponse.json(
        { error: `No active ${userType}s found` },
        { status: 404 }
      );
    }

    // Normalize date to start of day
    const dateObj = new Date(followUpDate);
    const normalizedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

    // Check if follow-ups already exist for this date
    const existingCount = await FollowUp.countDocuments({
      program: programId,
      followUpDate: { $gte: normalizedDate, $lte: endOfDay },
      userType: userType,
      isDeleted: false
    });

    if (existingCount > 0) {
      return NextResponse.json(
        { error: `Follow-up list already exists for ${userType}s on this date` },
        { status: 400 }
      );
    }

    // Verify volunteers if provided (must be in this program)
    let volunteers = [];
    if (volunteerIds && volunteerIds.length > 0) {
      volunteers = await User.find({
        _id: { $in: volunteerIds },
        role: { $in: ["volunteer", "admin"] },
        isActive: true,
        programs: programId
      }).select("_id name");

      // Just use the volunteers we found, don't fail if some are missing
      if (volunteers.length === 0) {
        return NextResponse.json(
          { error: "No valid volunteers found. Please select active volunteers." },
          { status: 400 }
        );
      }
    }

    // Create follow-ups
    const followUps = [];
    let volunteerIndex = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Assign volunteer in round-robin fashion if volunteers are provided
      let assignedVolunteer = null;
      if (volunteers.length > 0) {
        assignedVolunteer = volunteers[volunteerIndex]._id;
        volunteerIndex = (volunteerIndex + 1) % volunteers.length;
      }

      const followUp = {
        program: programId,
        followUpDate: normalizedDate,
        userType: userType,
        user: user._id,
        assignedVolunteer: assignedVolunteer,
        status: "Not Called",
        remarks: "",
        createdBy: decoded.userId
      };

      followUps.push(followUp);
    }

    // Bulk insert
    const created = await FollowUp.insertMany(followUps);

    // Create session record
    await Session.create({
      programId: programId,
      sessionDate: normalizedDate,
      sessionTopic: sessionTopic,
      speakerName: speakerName,
      createdBy: decoded.userId,
    });

    return NextResponse.json({
      message: `Successfully created ${created.length} follow-ups and session for ${userType}s`,
      count: created.length,
      assignedVolunteers: volunteers.map(v => ({ _id: v._id, name: v.name }))
    }, { status: 201 });

  } catch (error: any) {
    console.error("CREATE_FOLLOWUP_LIST_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
