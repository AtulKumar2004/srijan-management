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

    if (actorRole !== "admin" && actorRole !== "volunteer") {
      return NextResponse.json({ error: "Forbidden: Only admins and volunteers can bulk update participants" }, { status: 403 });
    }

    const body = await req.json();
    const { participantIds, updates } = body;

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: "No participants selected" }, { status: 400 });
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const allowedFields = [
      "level", "grade", "numberOfRounds", "isActive", 
      "homeTown", "profession", "connectedToTemple", 
      "gender", "maritalStatus", "handledBy", "isArchived"
    ];

    // Volunteers cannot reassign handledBy
    if (actorRole === "volunteer" && updates.handledBy !== undefined) {
      return NextResponse.json({ error: "Volunteers cannot assign mentees to volunteers" }, { status: 403 });
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

    const targets = await User.find({ _id: { $in: participantIds } });

    let modifiedCount = 0;
    for (const target of targets) {
      let canUpdate = false;
      if (actorRole === "admin") {
        canUpdate = true;
      } else if (actorRole === "volunteer") {
        if (target.handledBy && String(target.handledBy) === String(actorId)) {
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
      return NextResponse.json({ error: "You do not have permission to update any of the selected participants" }, { status: 403 });
    }

    return NextResponse.json({
      message: `Successfully updated ${modifiedCount} participant(s)`,
      modifiedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error("BULK_UPDATE_ERROR:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
