import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('API - Received user ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid user ID format" }, { status: 404 });
    }

    await connectDB();

    const user = await User.findById(id).select("-password");
    console.log('API - User found:', user ? 'Yes' : 'No');

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const isPermanent = req.nextUrl.searchParams.get("permanent") === "true";

    // Get token from cookie
    const token = req.cookies.get("token");
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as { userId: string; role: string };

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (String(id) === String(decoded.userId)) {
      return NextResponse.json(
        { error: "Unauthorized - You cannot delete your own record" },
        { status: 403 }
      );
    }

    if (isPermanent) {
      if (decoded.role !== "admin") {
        return NextResponse.json(
          { error: "Unauthorized - Only admin can permanently delete users" },
          { status: 403 }
        );
      }
      if (targetUser.role === "volunteer") {
        await User.updateMany(
          { handledBy: { $in: [id, String(id)] } },
          { $set: { handledBy: "unassigned" } }
        );
      }
      await User.findByIdAndDelete(id);
      return NextResponse.json(
        { message: "User permanently deleted successfully" },
        { status: 200 }
      );
    }

    if (decoded.role !== "admin") {
      const isMentee = Boolean(targetUser.handledBy && String(targetUser.handledBy) === String(decoded.userId));
      const isUnassigned = !targetUser.handledBy || targetUser.handledBy === "unassigned";
      
      if (decoded.role === "volunteer") {
        if (targetUser.role === "volunteer" && !isMentee) {
          return NextResponse.json(
            { error: "Unauthorized - A volunteer cannot delete those volunteers who are not his mentees" },
            { status: 403 }
          );
        }
        if (targetUser.role !== "volunteer" && !(isMentee || isUnassigned)) {
          return NextResponse.json(
            { error: "Unauthorized - You can only delete participants you mentor or unassigned participants" },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Unauthorized - You do not have permission to delete records" },
          { status: 403 }
        );
      }
    }

    if (targetUser.role === "volunteer") {
      await User.updateMany(
        { handledBy: { $in: [id, String(id)] } },
        { $set: { handledBy: "unassigned" } }
      );
    }

    // Soft delete (Archive)
    await User.findByIdAndUpdate(id, { isArchived: true, handledBy: "unassigned", participantsUnder: 0 });

    return NextResponse.json(
      { message: "User archived successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
