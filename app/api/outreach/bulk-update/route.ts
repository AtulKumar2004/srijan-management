import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import OutreachContact from "@/models/Outreach";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get("token")?.value;
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const actorRole = decoded.role;
        if (actorRole !== "admin" && actorRole !== "volunteer" && actorRole !== "program_manager") {
          return NextResponse.json({ error: "Forbidden: Only admins, program managers, and volunteers can bulk update outreach contacts" }, { status: 403 });
        }
      } catch (e) {
        // Token verification failed or expired
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const { contactIds, updates } = body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "No outreach contacts selected" }, { status: 400 });
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const allowedFields = [
      "name", "phone", "profession", "motherTongue", "currentLocation",
      "registeredBy", "numberOfRounds", "branch", "paidStatus", "underWhichAdmin", "comment"
    ];

    const sanitizedUpdates: any = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined && updates[key] !== null) {
        if (key === "numberOfRounds") {
          const num = Number(updates[key]);
          if (!isNaN(num)) {
            sanitizedUpdates[key] = num;
          }
        } else {
          sanitizedUpdates[key] = updates[key];
        }
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json({ error: "No valid editable fields provided" }, { status: 400 });
    }

    sanitizedUpdates.updatedAt = new Date();

    const targets = await OutreachContact.find({ _id: { $in: contactIds } });

    let modifiedCount = 0;
    for (const target of targets) {
      for (const key of Object.keys(sanitizedUpdates)) {
        target[key] = sanitizedUpdates[key];
      }
      await target.save();
      modifiedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${modifiedCount} outreach contact(s)`,
      modifiedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error("OUTREACH_BULK_UPDATE_ERROR:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
