import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import VolunteerCreationRequest from "@/models/VolunteerCreationRequest";
import User from "@/models/User";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const actorId = decoded.userId;
    const actorRole = decoded.role;

    if (actorRole !== "admin" && actorRole !== "program_manager") {
      return NextResponse.json({ error: "Only admins and program managers can review requests" }, { status: 403 });
    }

    const { id } = await params;
    const { action, rejectionReason } = await req.json();

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const request: any = await VolunteerCreationRequest.findById(id);
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json({ error: "Request already reviewed" }, { status: 400 });
    }

    if (actorRole === "admin") {
      if (String(request.programAdmin) !== String(actorId)) {
        return NextResponse.json({ error: "You are not authorized to review this request" }, { status: 403 });
      }
    } else if (actorRole === "program_manager") {
      const pmUser = await User.findById(actorId).select("programs");
      if (!pmUser?.programs?.includes(String(request.program))) {
        return NextResponse.json({ error: "You are not authorized to review this request for this program" }, { status: 403 });
      }
    }

    if (action === "approve") {
      const existing = await User.findOne({ email: request.email });
      if (existing) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 }
        );
      }

      const defaultPassword = "Volunteer@123";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const requester = await User.findById(request.requestedBy).select("role");
      const requesterRole = requester?.role;

      const user = await User.create({
        name: request.name,
        email: request.email,
        phone: request.phone,
        password: hashedPassword,
        profession: request.profession,
        homeTown: request.homeTown,
        address: request.address,
        gender: request.gender,
        connectedToTemple: request.connectedToTemple,
        numberOfRounds: request.numberOfRounds,
        maritalStatus: request.maritalStatus,
        programs: [request.program],
        level: request.level,
        grade: request.grade,
        role: "volunteer",
        registeredBy: request.requestedBy,
        handledBy: requesterRole === "volunteer" ? request.requestedBy : "unassigned",
        isActive: true,
      });

      request.status = "approved";
      request.reviewedBy = actorId;
      request.reviewedAt = new Date();
      await request.save();

      const { sendInviteEmail } = await import("@/lib/sendInviteEmail");
      await sendInviteEmail(request.email, request.name, "Volunteer@123", "Volunteer");

      const userObj = user.toObject();
      delete userObj.password;

      return NextResponse.json({
        message: "Volunteer creation request approved",
        request,
        user: userObj,
      }, { status: 200 });
    }

    request.status = "rejected";
    request.reviewedBy = actorId;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason || "Rejected by admin";
    await request.save();

    return NextResponse.json({
      message: "Volunteer creation request rejected",
      request,
    }, { status: 200 });
  } catch (error: any) {
    console.error("REVIEW_VOLUNTEER_CREATION_REQUEST_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
