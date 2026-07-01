import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { TokenPayload } from "@/types/TokenPayload";
import { sendInviteEmail } from "@/lib/sendInviteEmail";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value || req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }

    const { name, phone, email, address, programId, level, grade } = await req.json();

    if (!name || !phone || !email || !address || !programId || level === undefined || !grade) {
      return NextResponse.json(
        { error: "Name, Phone Number, Email, Address, Program, Level, and Grade are all mandatory." },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email or phone number already exists." },
        { status: 400 }
      );
    }

    const defaultPassword = "Program_Manager@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = await User.create({
      name,
      email,
      phone,
      address,
      password: hashedPassword,
      role: "program_manager",
      programs: [programId],
      level: Number(level),
      grade,
      registeredBy: decoded.userId,
      isActive: true
    });

    // Attempt to send invite email
    try {
      await sendInviteEmail(email, name, defaultPassword, "program_manager");
    } catch (err) {
      console.error("Failed to send invite email to Program Manager:", err);
    }

    return NextResponse.json({ message: "Program Manager created successfully", user }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating program manager:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
