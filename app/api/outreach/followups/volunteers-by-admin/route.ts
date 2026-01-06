import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Program from "@/models/Program";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const adminName = searchParams.get("adminName");

    if (!adminName) {
      return NextResponse.json(
        { error: "Admin name is required" },
        { status: 400 }
      );
    }

    // Find the admin user
    const admin = await User.findOne({ name: adminName, role: "admin" });
    if (!admin) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    // Find all programs where this admin is the createdBy
    const programs = await Program.find({ createdBy: admin._id }).select("_id");
    const programIds = programs.map(p => p._id.toString());

    // Find all volunteers who are enrolled in these programs
    const volunteers = await User.find({
      role: "volunteer",
      programs: { $in: programIds }
    }).select("name email").lean();

    return NextResponse.json({
      success: true,
      volunteers: volunteers
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching volunteers for admin:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch volunteers" },
      { status: 500 }
    );
  }
}
