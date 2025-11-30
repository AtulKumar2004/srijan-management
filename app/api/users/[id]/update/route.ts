import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

const ROLE_RANK: any = {
  admin: 3,
  volunteer: 2,
  participant: 1,
  guest: 0,
  outreach: -1
};

function canEdit(actorRole: string, targetRole: string, actorId: string, targetId: string) {
  // USERS CAN ALWAYS EDIT THEIR OWN PROFILE
  if (actorId === targetId) return true;

  // Admin can edit anyone
  if (actorRole === "admin") return true;

  // Volunteer editing someone ELSE
  if (actorRole === "volunteer") {
    // volunteer cannot edit admins or other volunteers
    if (targetRole === "admin" || targetRole === "volunteer") return false;

    // guest / participant / outreach → allowed
    return true;
  }

  // participant or guest → cannot edit others
  return false;
}

export async function PATCH(req: NextRequest, { params }: any) {
  try {
    await connectDB();

    const token = req.cookies.get("jwt")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const actorId = decoded.userId;
    const actorRole = decoded.role;
    const targetUserId = params.id;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetRole = targetUser.role;

    // Permission check
    const allowed = canEdit(actorRole, targetRole, actorId, targetUserId);
    if (!allowed) {
      return NextResponse.json({ error: "Not allowed to edit this user" }, { status: 403 });
    }

    const body = await req.json();

    // Fields that participants/guests/volunteers can update
    const editableFields = [
      "name", "phone", "email", "address", "gender",
      "dateOfBirth", "profession", "homeTown",
      "connectedToTemple", "numberOfRounds"
    ];

    // Admin can update ANY field including "role"
    if (actorRole === "admin") {
      if (body.role) targetUser.role = body.role; 
    }

    // Apply allowed fields only
    editableFields.forEach((field) => {
      if (body[field] !== undefined) {
        targetUser[field] = body[field];
      }
    });

    await targetUser.save();

    const userObj = targetUser.toObject();
    delete userObj.password;

    return NextResponse.json({ message: "User updated", user: userObj }, { status: 200 });

  } catch (err) {
    console.error("USER_UPDATE_ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
