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

    const normalizedPhone = phone.replace(/\D/g, "");
    const level = searchParams.get("level");

    // Build query to find volunteer or participant by phone and optionally filter by program and level
    const query: any = {
      phone: { $in: [phone, normalizedPhone] },
      role: { $in: ["participant", "volunteer"] },
      isArchived: { $ne: true }
    };

    if (programId) {
      query.programs = programId;
    }

    if (level) {
      const lvlNum = Number(level);
      if (lvlNum === 1) {
        query.$or = [{ level: 1 }, { level: { $exists: false } }, { level: null }];
      } else {
        query.level = lvlNum;
      }
    }

    let participant = await User.findOne(query).select("-password");

    if (!participant) {
      // Fallback: search by phone number across all non-archived participants or volunteers
      participant = await User.findOne({
        phone: { $in: [phone, normalizedPhone] },
        role: { $in: ["participant", "volunteer"] },
        isArchived: { $ne: true }
      }).select("-password");
    }

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
