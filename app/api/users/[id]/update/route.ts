import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Program from "@/models/Program";
import RoleChangeRequest from "@/models/RoleChangeRequest";
import { sendRoleChangeRequestEmail } from "@/lib/sendRoleChangeRequestEmail";
import jwt from "jsonwebtoken";

const ROLE_RANK: any = {
  admin: 3,
  volunteer: 2,
  participant: 1,
  guest: 0,
  outreach: -1
};

function canEdit(actorRole: string, targetRole: string, actorId: string, targetId: string) {
  // USERS CAN ALWAYS EDIT THEIR OWN PROFILE
  if (actorId === targetId) return true;

  // Admin can edit anyone
  if (actorRole === "admin") return true;

  // Volunteer editing someone ELSE
  if (actorRole === "volunteer") {
    // volunteer cannot edit admins or other volunteers
    if (targetRole === "admin" || targetRole === "volunteer") return false;

    // guest / participant / outreach → allowed
    return true;
  }

  // participant or guest → cannot edit others
  return false;
}

async function updateUserHandler(req: NextRequest, params: Promise<{ id: string }>) {
  try {
    await connectDB();

    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const actorId = decoded.userId;
    const actorRole = decoded.role;
    const { id: targetUserId } = await params;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetRole = targetUser.role;

    // Permission check
    const allowed = canEdit(actorRole, targetRole, actorId, targetUserId);
    if (!allowed) {
      return NextResponse.json({ error: "Not allowed to edit this user" }, { status: 403 });
    }

    const body = await req.json();
    let roleApprovalRequestId: string | null = null;
    let roleApprovalEmailSent = false;

    // Fields that participants/guests/volunteers can update
    const editableFields = [
      "name", "phone", "email", "address", "gender",
      "dateOfBirth", "profession", "homeTown",
      "connectedToTemple", "numberOfRounds", "level", 
      "grade", "howDidYouHearAboutUs", "isActive",
      "maritalStatus", "registeredBy", "handledBy",
      "participantsUnder"
    ];

    // Role change validation
    if (body.role && body.role !== targetUser.role) {
      // Admin can change anyone's role to anything
      if (actorRole === "admin") {
        targetUser.role = body.role;
      } 
      // Volunteer can change participant/guest/outreach roles (but not to admin)
      else if (actorRole === "volunteer") {
        const allowedTargetRoles = ["participant", "guest", "outreach"];
        const allowedNewRoles = ["participant", "guest", "volunteer"];

        if (!(allowedTargetRoles.includes(targetRole) && allowedNewRoles.includes(body.role))) {
          return NextResponse.json({
            error: "Volunteers cannot assign admin role"
          }, { status: 403 });
        }

        // Volunteer -> participant to volunteer promotion requires program admin approval.
        if (targetRole === "participant" && body.role === "volunteer") {
          const programId = body.programId || targetUser.programs?.[0];

          if (!programId) {
            return NextResponse.json({
              error: "Participant is not mapped to a program. Cannot request volunteer promotion."
            }, { status: 400 });
          }

          if (targetUser.programs?.length && !targetUser.programs.includes(programId)) {
            return NextResponse.json({
              error: "Selected program does not belong to this participant."
            }, { status: 400 });
          }

          const program: any = await Program.findById(programId).populate("createdBy", "_id name email");
          if (!program || !program.createdBy) {
            return NextResponse.json({
              error: "Program admin not found for approval request"
            }, { status: 404 });
          }

          const existingPending = await RoleChangeRequest.findOne({
            participant: targetUserId,
            requestedBy: actorId,
            program: programId,
            requestedRole: "volunteer",
            status: "pending",
          });

          if (existingPending) {
            return NextResponse.json({
              error: "A pending approval request already exists for this participant.",
              approvalRequired: true,
              requestId: existingPending._id,
            }, { status: 409 });
          }

          const request = await RoleChangeRequest.create({
            participant: targetUserId,
            currentRole: targetRole,
            requestedRole: "volunteer",
            requestedBy: actorId,
            program: programId,
            programAdmin: program.createdBy._id,
            status: "pending",
          });

          roleApprovalRequestId = String(request._id);

          const volunteer = await User.findById(actorId).select("name");
          const emailResult = await sendRoleChangeRequestEmail({
            adminEmail: program.createdBy.email,
            adminName: program.createdBy.name,
            participantName: targetUser.name,
            participantEmail: targetUser.email,
            participantPhone: targetUser.phone,
            volunteerName: volunteer?.name || "Volunteer",
            programName: program.name,
            requestId: roleApprovalRequestId,
          });

          roleApprovalEmailSent = Boolean(emailResult.ok);

          // Keep current role unchanged until admin approval.
          delete body.role;
        } else {
          targetUser.role = body.role;
        }
      } else {
        return NextResponse.json({ 
          error: "You don't have permission to change roles" 
        }, { status: 403 });
      }
    }

    // Apply allowed fields only
    editableFields.forEach((field) => {
      if (body[field] !== undefined) {
        targetUser[field] = body[field];
      }
    });

    await targetUser.save();

    const userObj = targetUser.toObject();
    delete userObj.password;

    if (roleApprovalRequestId) {
      return NextResponse.json({
        message: "Participant details saved. Volunteer role change request sent to the program admin for approval.",
        approvalRequired: true,
        requestId: roleApprovalRequestId,
        emailSent: roleApprovalEmailSent,
        user: userObj,
      }, { status: 202 });
    }

    return NextResponse.json({ message: "User updated", user: userObj }, { status: 200 });

  } catch (err) {
    console.error("USER_UPDATE_ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateUserHandler(req, params);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateUserHandler(req, params);
}
