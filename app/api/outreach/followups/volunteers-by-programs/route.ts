import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // Only volunteers and admins can access
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const programsParam = searchParams.get("programs");

    if (!programsParam) {
      return NextResponse.json({ error: "Programs parameter is required" }, { status: 400 });
    }

    const programIds = programsParam.split(',');

    // Find volunteers who are in any of these programs
    const volunteers = await User.find({
      role: { $in: ["volunteer", "admin"] },
      isActive: true,
      programs: { $in: programIds }
    }).select("_id name email");

    return NextResponse.json({
      success: true,
      volunteers
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching volunteers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch volunteers" },
      { status: 500 }
    );
  }
}
