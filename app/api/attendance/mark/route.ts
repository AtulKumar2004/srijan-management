import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
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
