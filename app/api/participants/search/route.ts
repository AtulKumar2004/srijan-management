import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const programId = searchParams.get("programId");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Build query to find volunteer or participant by phone and optionally filter by program
    const query: any = {
      phone: phone,
      role: { $in: ["participant", "volunteer"] }
    };

    // If programId is provided, only return user if enrolled in that program
    if (programId) {
      query.programs = programId;
    }

    const participant = await User.findOne(query).select("-password");

    if (!participant) {
      return NextResponse.json(
        { error: "Volunteer or participant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      participant
    }, { status: 200 });

  } catch (error: any) {
    console.error("SEARCH_PARTICIPANT_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
