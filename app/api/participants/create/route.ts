import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get("jwt")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "admin" && decoded.role !== "volunteer") {
      return NextResponse.json(
        { error: "Not allowed" },
        { status: 403 }
      );
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
      joinedAt,
      handledBy,        // optional override
      registeredBy,     // optional override
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    const user = await User.create({
      name,
      email,
      phone,
      profession,
      homeTown,
      address,
      gender,
      numberOfRounds,
      connectedToTemple,
      joinedAt,

      role: "participant",

      // Volunteer/admin creating the participant
      registeredBy: registeredBy || decoded.userId,
      handledBy: handledBy || decoded.userId,
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
