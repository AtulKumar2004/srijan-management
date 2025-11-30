import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// PATCH /api/followups/[id]/update - Update follow-up after making phone call
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // Only admins and volunteers can update follow-ups
    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { status, notes, nextActionAt, channel } = body;

    // Validate status if provided
    const validStatuses = ["pending", "done", "no-response", "not-interested"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate channel if provided
    const validChannels = ["phone", "whatsapp", "email", "inperson"];
    if (channel && !validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the follow-up
    const followUp = await FollowUp.findOne({ 
      _id: params.id, 
      isDeleted: false 
    });

    if (!followUp) {
      return NextResponse.json(
        { error: "Follow-up not found" },
        { status: 404 }
      );
    }

    // Check if user is assigned to this follow-up or is admin
    if (decoded.role !== "admin" && followUp.assignedTo.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: "You can only update follow-ups assigned to you" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (status) {
      updateData.status = status;
    }

    if (notes !== undefined) {
      // Append new notes to existing notes with timestamp
      const timestamp = new Date().toLocaleString();
      const newNote = `[${timestamp}] ${notes}`;
      updateData.notes = followUp.notes 
        ? `${followUp.notes}\n\n${newNote}`
        : newNote;
    }

    if (nextActionAt) {
      updateData.nextActionAt = new Date(nextActionAt);
    }

    if (channel) {
      updateData.channel = channel;
    }

    // Update the follow-up
    const updatedFollowUp = await FollowUp.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("targetUser", "name email phone role")
      .populate("targetOutreach", "name phone location interestLevel")
      .populate("assignedTo", "name email phone")
      .populate("createdBy", "name email")
      .populate("program", "name description");

    // Format response
    const responseData: any = {
      id: updatedFollowUp._id,
      targetType: updatedFollowUp.targetType,
      status: updatedFollowUp.status,
      channel: updatedFollowUp.channel,
      notes: updatedFollowUp.notes,
      programDate: updatedFollowUp.programDate,
      nextActionAt: updatedFollowUp.nextActionAt,
      createdAt: updatedFollowUp.createdAt,
      updatedAt: updatedFollowUp.updatedAt,
      assignedTo: updatedFollowUp.assignedTo,
      createdBy: updatedFollowUp.createdBy,
      program: updatedFollowUp.program
    };

    // Add contact details
    if (updatedFollowUp.targetType === "user" && updatedFollowUp.targetUser) {
      responseData.contact = {
        id: updatedFollowUp.targetUser._id,
        name: updatedFollowUp.targetUser.name,
        email: updatedFollowUp.targetUser.email,
        phone: updatedFollowUp.targetUser.phone,
        role: updatedFollowUp.targetUser.role
      };
    } else if (updatedFollowUp.targetType === "outreach" && updatedFollowUp.targetOutreach) {
      responseData.contact = {
        id: updatedFollowUp.targetOutreach._id,
        name: updatedFollowUp.targetOutreach.name,
        phone: updatedFollowUp.targetOutreach.phone,
        location: updatedFollowUp.targetOutreach.location,
        interestLevel: updatedFollowUp.targetOutreach.interestLevel
      };
    }

    return NextResponse.json({
      success: true,
      message: "Follow-up updated successfully",
      data: responseData
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error updating follow-up:", error);
    return NextResponse.json(
      { error: "Failed to update follow-up", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/followups/[id]/update - Soft delete a follow-up
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // Only admins can delete follow-ups
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Only admins can delete follow-ups" }, { status: 403 });
    }

    await connectDB();

    // Soft delete the follow-up
    const followUp = await FollowUp.findByIdAndUpdate(
      params.id,
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!followUp) {
      return NextResponse.json(
        { error: "Follow-up not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Follow-up deleted successfully"
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error deleting follow-up:", error);
    return NextResponse.json(
      { error: "Failed to delete follow-up", details: error.message },
      { status: 500 }
    );
  }
}
