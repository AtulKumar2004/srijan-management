import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const programId = searchParams.get("programId");

    if (!role) {
      return NextResponse.json(
        { message: "Role parameter is required" },
        { status: 400 }
      );
    }

    // Build query
    const query: any = { role };
    
    // If programId is provided, filter users enrolled in that program
    if (programId) {
      query.programs = programId;
    }

    // Fetch users with active filter for admins
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      users: users || [],
      count: users?.length || 0 
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching users by role:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { 
        message: "Internal server error", 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
