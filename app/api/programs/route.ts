import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Program from "@/models/Program";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

export async function GET(req: Request) {
  try {
    // Verify admin access
    const token = req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError);
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    if (!['admin', 'volunteer', 'participant'].includes(decoded.role)) {
      return NextResponse.json(
        { error: "Access denied - Invalid role" },
        { status: 403 }
      );
    }

    try {
      await connectDB();
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    try {
      let programs;
      
      // If volunteer or participant, only show programs they're enrolled in
      if (decoded.role === "volunteer" || decoded.role === "participant") {
        const user = await User.findById(decoded.userId).select('programs');
        const enrolledProgramIds = user?.programs || [];
        
        programs = await Program.find({
          _id: { $in: enrolledProgramIds }
        })
        .populate({
          path: 'createdBy',
          select: 'name email'
        })
        .exec();
      } else {
        // Admin sees all programs
        programs = await Program.find({})
          .populate({
            path: 'createdBy',
            select: 'name email'
          })
          .exec();
      }

      return NextResponse.json({ programs }, { status: 200 });
    } catch (populateError) {
      console.error("Error fetching programs:", populateError);
      return NextResponse.json(
        { error: "Error fetching programs", details: populateError instanceof Error ? populateError.message : String(populateError) },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("GET PROGRAMS ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
