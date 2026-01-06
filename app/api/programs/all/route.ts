import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Program from "@/models/Program";

// Public endpoint to get all programs for attendance marking
export async function GET() {
  try {
    await connectDB();

    const programs = await Program.find({})
      .select('name temple')
      .sort({ createdAt: -1 })
      .exec();

    return NextResponse.json({ programs }, { status: 200 });
  } catch (error: any) {
    console.error("GET ALL PROGRAMS ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
