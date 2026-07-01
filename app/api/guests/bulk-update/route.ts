import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { sendRoleChangeConfirmationEmail } from "@/lib/sendRoleChangeConfirmationEmail";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only admins can bulk update guests" }, { status: 403 });
    }

    const body = await req.json();
    const { guestIds, updates } = body;

    if (!Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json({ error: "No guests selected" }, { status: 400 });
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    if (updates.role && !["admin", "volunteer", "participant", "guest"].includes(updates.role)) {
      return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
    }

    const allowedFields = [
      "role", "programId", "level", "grade", "numberOfRounds", "isActive", 
      "homeTown", "profession", "connectedToTemple", 
      "gender", "maritalStatus", "isArchived"
    ];

    const sanitizedUpdates: any = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json({ error: "No valid editable fields provided" }, { status: 400 });
    }

    const targets = await User.find({ _id: { $in: guestIds }, role: "guest" });

    let modifiedCount = 0;
    for (const target of targets) {
      const oldRole = target.role;
      const oldLevel = Number(target.level || 1);
      for (const key of Object.keys(sanitizedUpdates)) {
        if (key !== "programId") {
          target[key] = sanitizedUpdates[key];
        }
      }
      if (sanitizedUpdates.programId) {
        const existingPrograms = target.programs || [];
        target.programs = Array.from(new Set([...existingPrograms, sanitizedUpdates.programId]));
        if (target.role === 'participant') {
          target.level = 1;
          target.grade = 'N/A';
        } else if (target.role === 'volunteer') {
          target.level = 1;
          target.grade = 'D';
        }
      }
      const newLevel = Number(target.level || 1);
      if (!target.levelHistory || target.levelHistory.length === 0) {
        target.levelHistory = [{ level: oldLevel, joinedAt: target.createdAt || new Date() }];
      }
      if (newLevel !== oldLevel) {
        target.levelHistory.push({ level: newLevel, joinedAt: new Date() });
      }
      await target.save();
      if (oldRole !== target.role) {
        await sendRoleChangeConfirmationEmail(target.email, target.name, oldRole, target.role);
      }
      modifiedCount++;
    }

    return NextResponse.json({
      message: `Successfully updated ${modifiedCount} guest(s)`,
      modifiedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
