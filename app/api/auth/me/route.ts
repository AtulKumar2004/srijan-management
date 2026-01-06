import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// GET /api/auth/me - Get current logged-in user
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized - No token" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    try {
      await connectDB();
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }
    
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profession: user.profession,
        homeTown: user.homeTown,
        connectedToTemple: user.connectedToTemple,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        level: user.level,
        grade: user.grade,
        numberOfRounds: user.numberOfRounds,
        howDidYouHearAboutUs: user.howDidYouHearAboutUs,
        maritalStatus: user.maritalStatus,
        participantsUnder: user.participantsUnder,
        programs: user.programs,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("Error fetching current user:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
