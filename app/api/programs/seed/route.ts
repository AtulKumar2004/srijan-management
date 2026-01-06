import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Program from "@/models/Program";

export async function POST(req: Request) {
  try {
    await connectDB();

    // Check if programs already exist
    const existingPrograms = await Program.find({
      name: { $in: ["Little Vaishnavas", "Srijan"] }
    });

    if (existingPrograms.length > 0) {
      return NextResponse.json(
        { message: "Programs already exist", programs: existingPrograms },
        { status: 200 }
      );
    }

    // Create the two default programs
    const programs = await Program.insertMany([
      {
        name: "Little Vaishnavas",
        description: "A spiritual education program for young children to learn about Krishna consciousness and Vedic culture.",
        minAge: 5,
        maxAge: 12,
      },
      {
        name: "Srijan",
        description: "A creative development program focusing on character building, spiritual growth, and cultural activities.",
        minAge: 13,
        maxAge: 18,
      },
    ]);

    return NextResponse.json(
      { message: "Default programs created successfully", programs },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("SEED PROGRAMS ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
