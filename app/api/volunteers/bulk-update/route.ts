import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const actorId = decoded.userId;
    const actorRole = decoded.role;

    if (actorRole !== "admin" && actorRole !== "volunteer" && actorRole !== "program_manager") {
      return NextResponse.json({ error: "Forbidden: Only admins, program managers, and volunteers can bulk update volunteers" }, { status: 403 });
    }

    const body = await req.json();
    const { volunteerIds, updates } = body;

    if (!Array.isArray(volunteerIds) || volunteerIds.length === 0) {
      return NextResponse.json({ error: "No volunteers selected" }, { status: 400 });
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const allowedFields = [
      "level", "grade", "numberOfRounds", "isActive", 
      "homeTown", "profession", "connectedToTemple", 
      "gender", "maritalStatus", "participantsUnder", "handledBy", "isArchived"
    ];

    // Only admins or program managers can reassign handledBy (mentor volunteer)
    if (actorRole !== "admin" && actorRole !== "program_manager" && updates.handledBy !== undefined) {
      return NextResponse.json({ error: "Only admins or program managers can assign mentors to volunteers" }, { status: 403 });
    }

    const sanitizedUpdates: any = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json({ error: "No valid editable fields provided" }, { status: 400 });
    }

    const targets = await User.find({ _id: { $in: volunteerIds } });

    let modifiedCount = 0;
    for (const target of targets) {
      let canUpdate = false;
      if (actorRole === "admin" || actorRole === "program_manager") {
        canUpdate = true;
      } else if (actorRole === "volunteer") {
        if (String(target._id) === String(actorId)) {
          canUpdate = true;
        } else if (target.handledBy && String(target.handledBy) === String(actorId)) {
          canUpdate = true;
        }
      }

      if (canUpdate) {
        for (const key of Object.keys(sanitizedUpdates)) {
          target[key] = sanitizedUpdates[key];
        }
        await target.save();
        modifiedCount++;
      }
    }

    if (modifiedCount === 0) {
      return NextResponse.json({ error: "You do not have permission to update any of the selected volunteers" }, { status: 403 });
    }

    return NextResponse.json({
      message: `Successfully updated ${modifiedCount} volunteer(s)`,
      modifiedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error("VOLUNTEER_BULK_UPDATE_ERROR:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
