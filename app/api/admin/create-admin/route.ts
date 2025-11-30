import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // AUTH: read JWT token
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // Only admin can access
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    // Request body
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Promote to admin
    user.role = "admin";
    user.handledBy = decoded.userId;
    if (!user.registeredBy) user.registeredBy = decoded.userId;

    await user.save();

    const u = user.toObject();
    delete u.password;

    return NextResponse.json({
      message: "User successfully promoted to admin",
      user: u
    });

  } catch (err: any) {
    console.error("CREATE_ADMIN_ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
