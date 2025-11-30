import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// GET /api/auth/me - Get current logged-in user
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("jwt")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    await connectDB();
    
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profession: user.profession,
        homeTown: user.homeTown,
        isActive: user.isActive
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("Error fetching current user:", error);
    return NextResponse.json({ 
      error: "Unauthorized", 
      details: error.message 
    }, { status: 401 });
  }
}
