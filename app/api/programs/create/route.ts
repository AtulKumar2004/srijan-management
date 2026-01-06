import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Program from "@/models/Program";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

export async function POST(req: Request) {
  try {
    await connectDB();

    // Verify admin access
    const token = req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    if (decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { name, description, minAge, maxAge, photo, temple } = await req.json();
    
    console.log("Creating program with data:", { name, description, minAge, maxAge, photo, temple });
    console.log("User creating program - userId:", decoded.userId, "role:", decoded.role);

    if (!name) {
      return NextResponse.json(
        { error: "Program name is required" },
        { status: 400 }
      );
    }

    // Check if program already exists
    const existingProgram = await Program.findOne({ name });
    if (existingProgram) {
      return NextResponse.json(
        { error: "Program with this name already exists" },
        { status: 400 }
      );
    }

    const program = await Program.create({
      name,
      description,
      minAge,
      maxAge,
      photo,
      createdBy: decoded.userId,
      temple,
    });

    console.log("Program created successfully:", {
      id: program._id,
      name: program.name,
      temple: program.temple,
      createdBy: program.createdBy
    });

    return NextResponse.json(
      { message: "Program created successfully", program },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("CREATE PROGRAM ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
