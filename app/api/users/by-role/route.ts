import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const programId = searchParams.get("programId");
    const includeArchived = searchParams.get("includeArchived");

    if (!role) {
      return NextResponse.json(
        { message: "Role parameter is required" },
        { status: 400 }
      );
    }

    // Build query
    const query: any = {};
    if (role && role !== "all") {
      if (role.includes(",")) {
        query.role = { $in: role.split(",") };
      } else {
        query.role = role;
      }
    }
    
    // If programId is provided, filter users enrolled in that program
    if (programId) {
      query.programs = programId;
    }
    if (includeArchived !== "true") {
      query.isArchived = { $ne: true };
    }

    // Fetch users with active filter for admins
    let users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    if (role === "volunteer" && Array.isArray(users)) {
      users = await Promise.all(
        users.map(async (v: any) => {
          const count = await User.countDocuments({
            role: { $in: ["participant", "volunteer"] },
            isArchived: { $ne: true },
            $or: [{ handledBy: String(v._id) }, { handledBy: v._id }],
          });
          return {
            ...v,
            participantsUnder: count,
          };
        })
      );
    }
    
    if (Array.isArray(users)) {
      const userIds = [...new Set(users.map(u => u.registeredBy).filter(id => Boolean(id) && mongoose.Types.ObjectId.isValid(String(id))))];
      const registeredByUsers = await User.find({ _id: { $in: userIds } }).select("name").lean();
      const nameMap: any = registeredByUsers.reduce((acc: any, u: any) => {
        acc[u._id.toString()] = u.name;
        return acc;
      }, {});
      users = users.map((u: any) => ({
        ...u,
        registeredByName: u.registeredBy ? nameMap[u.registeredBy] || u.registeredBy : 'N/A'
      }));
    }

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
