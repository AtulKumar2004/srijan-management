import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Program from "@/models/Program";
import User from "@/models/User";
import FollowUp from "@/models/FollowUp";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const program = await Program.findById(id).populate('createdBy', 'name email');
    
    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ program }, { status: 200 });
  } catch (error: any) {
    console.error("GET PROGRAM ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Check if program exists
    const program = await Program.findById(id);
    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Cascade delete all related data
    
    // 1. Remove program from all users' programs array (volunteers, participants, guests)
    await User.updateMany(
      { programs: id },
      { $pull: { programs: id } }
    );

    // 2. Delete all followup records associated with this program
    await FollowUp.deleteMany({ program: id });

    // 3. Delete the program itself
    await Program.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Program and all related data deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE PROGRAM ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/programs/[id] - Update a program (only creator can edit)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can update programs" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const program = await Program.findById(id);

    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Check if the current user is the creator of this program
    if (program.createdBy?.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: "You can only edit programs you created" },
        { status: 403 }
      );
    }

    const { name, description, minAge, maxAge, photo, temple } = await req.json();

    // Update the program
    program.name = name;
    program.description = description;
    program.minAge = minAge;
    program.maxAge = maxAge;
    program.photo = photo;
    program.temple = temple;

    await program.save();

    console.log("Program updated successfully:", {
      id: program._id,
      name: program.name,
      temple: program.temple
    });

    return NextResponse.json(
      { message: "Program updated successfully", program },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("UPDATE PROGRAM ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
