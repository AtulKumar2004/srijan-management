import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import OutreachContact from "@/models/Outreach";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Optional authentication - anyone can create a participant
    const token = req.cookies.get("token")?.value;
    let creatorUserId = null;
    let creatorRole = "guest";

    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        creatorUserId = decoded.userId;
        creatorRole = decoded.role;
      } catch (error) {
        // Invalid token, but continue as guest
        console.log("Invalid token, creating participant as guest");
      }
    }

    const body = await req.json();

    const {
      name,
      email,
      phone,
      profession,
      homeTown,
      address,
      gender,
      numberOfRounds,
      connectedToTemple,
      level,
      joinedAt,
      handledBy,        // optional override
      registeredBy,     // optional override
      maritalStatus,
      programs,
    } = body;

    const normalizedPhone = String(phone || "").replace(/\D/g, "");

    if (!name || !email || !normalizedPhone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    if (normalizedPhone.length !== 10) {
      return NextResponse.json(
        { error: "Phone number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    // Check for existing user by email or phone
    const existing = await User.findOne({ 
      $or: [{ email }, { phone: { $in: [phone, normalizedPhone] } }] 
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email or phone already exists" },
        { status: 400 }
      );
    }

    const defaultPassword = "108jayradheshyam108";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = await User.create({
      name,
      email,
      phone: normalizedPhone,
      password: hashedPassword,
      profession,
      homeTown,
      address,
      gender,
      numberOfRounds,
      connectedToTemple,
      level,
      joinedAt,
      maritalStatus,
      programs,

      role: "participant",

      // Track who created the participant if logged in
      registeredBy: registeredBy || creatorUserId,
      handledBy: handledBy || creatorUserId,
      
      // Created by admin/volunteer flow, so activate immediately
      isActive: true,
    });

    // Best-effort outreach cleanup by phone.
    // Participant creation must succeed even if there is no outreach match.
    let outreachContactsDeleted = 0;
    try {
      const outreachCandidates = await OutreachContact.find({}, "_id phone").lean();
      const outreachIdsToDelete = outreachCandidates
        .filter((contact: any) => String(contact.phone || "").replace(/\D/g, "") === normalizedPhone)
        .map((contact: any) => contact._id);

      if (outreachIdsToDelete.length) {
        const deletedOutreachResult = await OutreachContact.deleteMany({ _id: { $in: outreachIdsToDelete } });
        outreachContactsDeleted = deletedOutreachResult.deletedCount || 0;
      }
    } catch (cleanupError) {
      console.error("Outreach cleanup skipped:", cleanupError);
    }

    const obj = user.toObject();
    delete obj.password;

    return NextResponse.json(
      {
        message: "Participant created successfully",
        user: obj,
        outreachContactsDeleted,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.log("CREATE PARTICIPANT ERROR:", error);
    return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 });
  }
}
