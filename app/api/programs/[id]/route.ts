import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Program from "@/models/Program";
import User from "@/models/User";
import FollowUp from "@/models/FollowUp";
import Session from "@/models/Session";
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

    // 1. Safely handle users enrolled in this program:
    //    - Remove this program from their programs[] array
    //    - Only delete the user account if they have NO remaining programs after removal
    const enrolledUsers = await User.find({
      role: { $in: ["volunteer", "participant"] },
      programs: id,
    }).select("_id programs");

    for (const user of enrolledUsers) {
      const remainingPrograms = user.programs.filter(
        (p: any) => String(p) !== String(id)
      );
      if (remainingPrograms.length === 0) {
        // No other programs — safe to delete the account
        await User.findByIdAndDelete(user._id);
      } else {
        // Still enrolled in other programs — just remove this program
        await User.findByIdAndUpdate(user._id, { $pull: { programs: id } });
      }
    }

    // 2. Remove program reference from any remaining users (e.g., admins/guests)
    await User.updateMany(
      { programs: id },
      { $pull: { programs: id } }
    );

    // 3. Delete all followup records associated with this program
    await FollowUp.deleteMany({ program: id });

    // 4. Delete all sessions associated with this program
    await Session.deleteMany({ programId: id });

    // 5. Delete the program itself
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
