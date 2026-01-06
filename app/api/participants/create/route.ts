import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
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

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    // Check for existing user by email or phone
    const existing = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email or phone already exists" },
        { status: 400 }
      );
    }

    // Generate a temporary random password for participants created through attendance
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await User.create({
      name,
      email,
      phone,
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
      
      // Requires OTP verification to activate
      isActive: false,
    });

    const obj = user.toObject();
    delete obj.password;

    return NextResponse.json(
      { message: "Participant created successfully", user: obj },
      { status: 201 }
    );
  } catch (error: any) {
    console.log("CREATE PARTICIPANT ERROR:", error);
    return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 });
  }
}
