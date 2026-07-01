import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import RoleChangeRequest from "@/models/RoleChangeRequest";
import User from "@/models/User";
import { sendRoleChangeConfirmationEmail } from "@/lib/sendRoleChangeConfirmationEmail";

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

    const request: any = await RoleChangeRequest.findById(id);
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
      const participant: any = await User.findById(request.participant);
      if (!participant) {
        return NextResponse.json({ error: "Participant not found" }, { status: 404 });
      }

      const oldRole = participant.role;
      participant.role = request.requestedRole;
      if (request.requestedRole === "program_manager" || oldRole === "program_manager") {
        participant.participantsUnder = 0;
        participant.handledBy = "unassigned";
        if (request.requestedRole === "program_manager") {
          await User.updateMany({ handledBy: String(participant._id) }, { $set: { handledBy: "unassigned" } });
        }
      }
      await participant.save();
      if (oldRole !== participant.role) {
        sendRoleChangeConfirmationEmail(participant.email, participant.name, oldRole, participant.role).catch(console.error);
      }

      request.status = "approved";
      request.reviewedBy = actorId;
      request.reviewedAt = new Date();
      await request.save();

      const participantObj = participant.toObject();
      delete participantObj.password;

      return NextResponse.json({
        message: "Role change approved successfully",
        request,
        user: participantObj,
      }, { status: 200 });
    }

    request.status = "rejected";
    request.reviewedBy = actorId;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason || "Rejected by admin";
    await request.save();

    return NextResponse.json({
      message: "Role change request rejected",
      request,
    }, { status: 200 });
  } catch (error: any) {
    console.error("REVIEW_ROLE_CHANGE_REQUEST_ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
