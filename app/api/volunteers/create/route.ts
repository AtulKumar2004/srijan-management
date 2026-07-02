import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Program from "@/models/Program";
import VolunteerCreationRequest from "@/models/VolunteerCreationRequest";
import { sendVolunteerCreationRequestEmail } from "@/lib/sendVolunteerCreationRequestEmail";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { sendInviteEmail } from "@/lib/sendInviteEmail";

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
      grade,
      handledBy,
    } = body;

    if (
      !name ||
      !email ||
      !phone ||
      !gender ||
      !profession ||
      !homeTown ||
      !connectedToTemple ||
      !maritalStatus ||
      numberOfRounds === undefined ||
      numberOfRounds === null ||
      numberOfRounds === "" ||
      level === undefined ||
      level === null ||
      level === "" ||
      !grade ||
      !address
    ) {
      return NextResponse.json(
        { error: "All fields are compulsory to add a volunteer" },
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

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      if (existing.isArchived) {
        existing.isArchived = false;
        existing.isActive = true;
        existing.name = name || existing.name;
        existing.email = email || existing.email;
        existing.phone = phone || existing.phone;
        if (profession !== undefined) existing.profession = profession;
        if (homeTown !== undefined) existing.homeTown = homeTown;
        if (address !== undefined) existing.address = address;
        if (gender !== undefined) existing.gender = gender;
        if (numberOfRounds !== undefined) existing.numberOfRounds = numberOfRounds;
        if (connectedToTemple !== undefined) existing.connectedToTemple = connectedToTemple;
        if (level !== undefined) existing.level = level;
        if (grade !== undefined) existing.grade = grade;
        if (maritalStatus !== undefined) existing.maritalStatus = maritalStatus;
        if (programs !== undefined) existing.programs = programs;

        if (existing.role === "volunteer") {
          existing.participantsUnder = 0;
          await User.updateMany(
            { handledBy: { $in: [existing._id, String(existing._id)] } },
            { $set: { handledBy: "unassigned" } }
          );
        } else if (existing.role === "participant") {
          existing.role = "participant";
        }

        await existing.save();

        const obj = existing.toObject();
        delete obj.password;

        return NextResponse.json(
          { message: "Archived user restored successfully", user: obj },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: "A user with this email or phone already exists. Email and phone must be unique." },
        { status: 400 }
      );
    }

    const isProgramAdmin = String(decoded.userId) === String(program.createdBy._id) || decoded.role === "admin";

    // That particular program's temple admin can create volunteers directly without needing approval from themselves.
    if (isProgramAdmin) {
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
        level: level || 1,
        levelHistory: [{ level: Number(level || 1), joinedAt: new Date() }],
        grade,
        role: "volunteer",
        registeredBy: decoded.userId,
        handledBy: handledBy || "unassigned",
        isActive: true,
      });

      const obj = user.toObject();
      delete obj.password;

      // Attempt to send invite email
      let emailSent = false;
      try {

        
        await sendInviteEmail(email, name, defaultPassword, "volunteer");
        emailSent = true;
      } catch (err) {
        console.error("Failed to send invite email to new volunteer:", err);
      }

      return NextResponse.json(
        { message: "Volunteer created successfully", user: obj, emailSent },
        { status: 201 }
      );
    }

    // For any other user (volunteer or another admin), adding a volunteer requires approval by that particular program's temple admin.
    const requester: any = await User.findById(decoded.userId).select("name email phone level programs");
    if (!requester) {
      return NextResponse.json({ error: "Requester not found" }, { status: 404 });
    }

    if (decoded.role !== "admin") {
      const requesterProgramIds = (requester.programs || []).map((p: any) => String(p));
      if (!requesterProgramIds.includes(String(primaryProgramId))) {
        return NextResponse.json(
          { error: "You can only request volunteers for your own program" },
          { status: 403 }
        );
      }
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
      grade,
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

    const pms = await User.find({ role: "program_manager", programs: primaryProgramId, isArchived: { $ne: true } }).select("name email");
    for (const pm of pms) {
      if (pm.email) {
        sendVolunteerCreationRequestEmail({
          adminEmail: pm.email,
          adminName: pm.name,
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
        }).catch(console.error);
      }
    }

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
