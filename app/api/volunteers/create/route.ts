import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get("jwt")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // ONLY ADMIN CAN CREATE VOLUNTEERS
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
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
      connectedToTemple,
      joinedAt,
      numberOfRounds,
      handledBy,
      registeredBy,
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
        { error: "User with this email already exists" },
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
      connectedToTemple,
      joinedAt,
      numberOfRounds,
      role: "volunteer",
      registeredBy: registeredBy || decoded.userId,
      handledBy: handledBy || decoded.userId,
    });

    const obj = user.toObject();
    delete obj.password;

    return NextResponse.json(
      { message: "Volunteer created successfully", user: obj },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("CREATE VOLUNTEER ERROR:", error);
    return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 });
  }
}
