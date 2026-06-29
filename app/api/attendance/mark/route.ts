import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { programId, participantId, date, level, status } = body;

    if (!programId || !participantId || !date || !level) {
      return NextResponse.json(
        { error: "Program, participant, date, and level are required" },
        { status: 400 }
      );
    }

    // Ensure user is enrolled in the program and update level
    const user = await User.findById(participantId);
    if (user) {
      if (!user.programs) user.programs = [];
      const progStr = programId.toString();
      if (!user.programs.map((p: any) => p.toString()).includes(progStr)) {
        user.programs.push(programId);
      }
      user.level = level;
      await user.save();
    }

    // Check if attendance already marked for this participant on this date
    const existingAttendance = await Attendance.findOne({
      programId: programId,
      participantId: participantId,
      date: new Date(date)
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status || 'present';
      existingAttendance.level = level;
      existingAttendance.markedAt = new Date();
      await existingAttendance.save();

      return NextResponse.json({
        message: "Attendance updated successfully",
        attendance: existingAttendance
      }, { status: 200 });
    }

    // Create new attendance record
    const attendance = await Attendance.create({
      programId: programId,
      participantId: participantId,
      date: new Date(date),
      level: level,
      status: status || 'present',
      markedAt: new Date()
    });

    return NextResponse.json({
      message: "Attendance marked successfully",
      attendance
    }, { status: 201 });

  } catch (error: any) {
    console.error("MARK_ATTENDANCE_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
