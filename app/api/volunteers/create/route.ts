import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Program from "@/models/Program";
import VolunteerCreationRequest from "@/models/VolunteerCreationRequest";
import { sendVolunteerCreationRequestEmail } from "@/lib/sendVolunteerCreationRequestEmail";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (!["admin", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Only admin or volunteer can submit this action" }, { status: 403 });
    }

    const body = await req.json();

    const {
      name,
      email,
      phone,
      profession,
      homeTown,
      address,
      gender,
      connectedToTemple,
      numberOfRounds,
      maritalStatus,
      programs,
      level,
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const primaryProgramId = Array.isArray(programs) && programs.length ? programs[0] : null;
    if (!primaryProgramId) {
      return NextResponse.json(
        { error: "Program is required to add a volunteer" },
        { status: 400 }
      );
    }

    const program: any = await Program.findById(primaryProgramId).populate("createdBy", "_id name email");
    if (!program || !program.createdBy) {
      return NextResponse.json(
        { error: "Program admin not found" },
        { status: 404 }
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Admin can create volunteers directly without approval.
    if (decoded.role === "admin") {
      const defaultPassword = "Volunteer@123";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const user = await User.create({
        name,
        email,
        phone,
        password: hashedPassword,
        profession,
        homeTown,
        address,
        gender,
        connectedToTemple,
        numberOfRounds,
        maritalStatus,
        programs,
        level,
        role: "volunteer",
        registeredBy: decoded.userId,
        handledBy: decoded.userId,
        isActive: false,
      });

      const obj = user.toObject();
      delete obj.password;

      return NextResponse.json(
        { message: "Volunteer created successfully", user: obj },
        { status: 201 }
      );
    }

    // Volunteer-created volunteers require admin approval request.
    const requester: any = await User.findById(decoded.userId).select("name email phone level programs");
    if (!requester) {
      return NextResponse.json({ error: "Requester not found" }, { status: 404 });
    }

    const requesterProgramIds = (requester.programs || []).map((p: any) => String(p));
    if (!requesterProgramIds.includes(String(primaryProgramId))) {
      return NextResponse.json(
        { error: "You can only request volunteers for your own program" },
        { status: 403 }
      );
    }

    const existingPending = await VolunteerCreationRequest.findOne({
      email,
      program: primaryProgramId,
      status: "pending",
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error: "A pending volunteer approval request already exists for this email in this program.",
          approvalRequired: true,
          requestId: existingPending._id,
        },
        { status: 409 }
      );
    }

    const request: any = await VolunteerCreationRequest.create({
      name,
      email,
      phone,
      profession,
      homeTown,
      address,
      gender,
      connectedToTemple,
      numberOfRounds,
      level,
      maritalStatus,
      program: primaryProgramId,
      programAdmin: program.createdBy._id,
      requestedBy: decoded.userId,
      status: "pending",
    });

    const emailResult = await sendVolunteerCreationRequestEmail({
      adminEmail: program.createdBy.email,
      adminName: program.createdBy.name,
      programName: program.name,
      requesterName: requester.name,
      requesterEmail: requester.email,
      requesterPhone: requester.phone,
      requesterLevel: requester.level,
      candidateName: name,
      candidateEmail: email,
      candidatePhone: phone,
      candidateLevel: level,
      requestId: String(request._id),
    });

    return NextResponse.json(
      {
        message: "Volunteer request sent to program admin for approval",
        approvalRequired: true,
        requestId: request._id,
        emailSent: Boolean(emailResult.ok),
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("CREATE VOLUNTEER ERROR:", error);
    return NextResponse.json({ error: "Server error", details: error.message }, { status: 500 });
  }
}
