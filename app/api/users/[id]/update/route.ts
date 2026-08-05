import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Program from "@/models/Program";
import RoleChangeRequest from "@/models/RoleChangeRequest";
import MentorshipChangeRequest from "@/models/MentorshipChangeRequest";
import { sendRoleChangeRequestEmail } from "@/lib/sendRoleChangeRequestEmail";
import { sendMentorshipChangeRequestEmail } from "@/lib/sendMentorshipChangeRequestEmail";
import { sendRoleChangeConfirmationEmail } from "@/lib/sendRoleChangeConfirmationEmail";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const ROLE_RANK: any = {
  admin: 3,
  volunteer: 2,
  participant: 1,
  guest: 0,
  outreach: -1
};

function canEdit(actorRole: string, targetRole: string, actorId: string, targetId: string, targetHandledBy?: string) {
  // USERS CAN ALWAYS EDIT THEIR OWN PROFILE
  if (String(actorId) === String(targetId)) return true;

  // Admin can edit anyone
  if (actorRole === "admin") return true;

  // Program manager can edit non-admin / non-program-manager
  if (actorRole === "program_manager") {
    if (targetRole === "admin" || targetRole === "program_manager") return false;
    return true;
  }

  // Volunteer editing someone ELSE
  if (actorRole === "volunteer") {
    const isMentee = Boolean(targetHandledBy && String(targetHandledBy) === String(actorId));
    const isUnassigned = !targetHandledBy || targetHandledBy === "unassigned";

    if (targetRole === "volunteer") {
      // Volunteer editing another volunteer: allowed ONLY if target is their mentee
      return isMentee;
    }

    if (targetRole === "participant") {
      // Volunteer editing participant: allowed if mentee OR unassigned
      return isMentee || isUnassigned;
    }

    return false;
  }

  // participant or guest -> cannot edit others
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
    let allowed = canEdit(actorRole, targetRole, actorId, targetUserId, targetUser.handledBy);
    if (allowed && actorRole === "program_manager" && String(actorId) !== String(targetUserId)) {
      const actorUser = await User.findById(actorId).select("programs");
      const actorPrograms = (actorUser?.programs || []).map(String);
      const targetPrograms = (targetUser.programs || []).map(String);
      const hasCommon = targetPrograms.some((p: string) => actorPrograms.includes(p));
      if (!hasCommon && targetPrograms.length > 0) allowed = false;
    }
    if (!allowed) {
      return NextResponse.json({ error: "Not allowed to edit this user" }, { status: 403 });
    }

    const body = await req.json();
    let roleApprovalRequestId: string | null = null;
    let roleApprovalEmailSent = false;

    // Fields that participants/guests/volunteers can update
    const editableFields = [
      "name", "phone", "email", "address", "gender",
      "dateOfBirth", "profession", "workplace", "homeTown",
      "connectedToTemple", "numberOfRounds", "level",
      "grade", "howDidYouHearAboutUs", "isActive",
      "maritalStatus", "registeredBy", "handledBy",
      "participantsUnder", "isArchived"
    ];

    const initialRole = targetUser.role;
    const initialLevel = Number(targetUser.level || 1);

    // Role change validation
    if (body.role && body.role !== initialRole) {
      if (String(actorId) === String(targetUserId)) {
        return NextResponse.json({
          error: "You cannot change your own role"
        }, { status: 403 });
      }

      if (initialRole === "guest" && actorRole !== "admin") {
        return NextResponse.json({
          error: "Only admins can change the role of newly registered guests"
        }, { status: 403 });
      }

      if (body.role === "program_manager" || initialRole === "program_manager") {
        if (actorRole !== "admin") {
          return NextResponse.json({
            error: "Only admins can assign or remove the Program Manager role"
          }, { status: 403 });
        }
      }

      // Admin or Program Manager can change user roles directly
      if (actorRole === "admin" || actorRole === "program_manager") {
        if (actorRole === "program_manager" && (body.role === "admin" || body.role === "program_manager")) {
          return NextResponse.json({
            error: "Program Managers cannot assign Admin or Program Manager role"
          }, { status: 403 });
        }

        if (body.role === "program_manager") {
          const finalProgram = body.program || body.programId || (targetUser.programs && targetUser.programs[0]);
          const finalLevel = (body.level !== undefined && body.level !== "" && body.level !== null) ? body.level : (targetUser.level !== undefined && targetUser.level !== null ? targetUser.level : 1);
          const finalGrade = (body.grade !== undefined && body.grade !== "" && body.grade !== null) ? body.grade : (targetUser.grade || "A");
          if (!finalProgram) {
            return NextResponse.json({
              error: "Program is required when assigning Program Manager role"
            }, { status: 400 });
          }
          if (body.program || body.programId) {
            targetUser.programs = [String(body.program || body.programId)];
          } else if (finalProgram) {
            targetUser.programs = [String(finalProgram)];
          }
          targetUser.level = Number(finalLevel);
          targetUser.grade = String(finalGrade);

          // Rule: Automatically update Mentoring and Mentor to N/A
          targetUser.participantsUnder = 0;
          targetUser.handledBy = "unassigned";
          await User.updateMany({ handledBy: String(targetUserId) }, { $set: { handledBy: "unassigned" } });
          delete body.participantsUnder;
          delete body.handledBy;
          delete body.level;
          delete body.grade;
        } else if (initialRole === "program_manager" && body.role && body.role !== "program_manager") {
          // Rule: When converted back to Guest, Volunteer, or Participant, again set Mentoring: N/A and Mentor: N/A
          targetUser.participantsUnder = 0;
          targetUser.handledBy = "unassigned";
          delete body.participantsUnder;
          delete body.handledBy;
        }
        targetUser.role = body.role;

        // When admin/pm edits guest's role to volunteer or participant, enroll in selected program
        if (initialRole === "guest" && (body.role === "volunteer" || body.role === "participant")) {
          if (body.programId) {
            const existingPrograms = targetUser.programs || [];
            targetUser.programs = Array.from(new Set([...existingPrograms, body.programId]));
          } else {
            const adminPrograms = await Program.find({ createdBy: actorId }).select("_id");
            if (adminPrograms && adminPrograms.length > 0) {
              const programIds = adminPrograms.map((p: any) => String(p._id));
              const existingPrograms = targetUser.programs || [];
              targetUser.programs = Array.from(new Set([...existingPrograms, ...programIds]));
            }
          }
        }
      }
      // Volunteer can change mentee/unassigned user roles (must be approved by admin or program manager)
      else if (actorRole === "volunteer") {
        if (body.role === "admin" || body.role === "program_manager") {
          return NextResponse.json({
            error: "You cannot assign admin or program manager role"
          }, { status: 403 });
        }

        // Rule 2: A volunteer can change the role of his mentees but it must be approved by the admin or PM.
        if (body.role && body.role !== targetRole) {
          if (body.role === "volunteer") {
            const finalLevel = body.level !== undefined ? body.level : targetUser.level;
            const finalGrade = body.grade !== undefined ? body.grade : targetUser.grade;
            if (finalLevel === undefined || finalLevel === null || String(finalLevel).trim() === "" ||
              finalGrade === undefined || finalGrade === null || String(finalGrade).trim() === "") {
              return NextResponse.json({
                error: "Level and Grade are required when assigning Volunteer role"
              }, { status: 400 });
            }
          }
          const programId = body.programId || targetUser.programs?.[0];

          if (!programId) {
            return NextResponse.json({
              error: "User is not mapped to a program. Cannot request role change."
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
            status: "pending",
          });

          if (existingPending) {
            return NextResponse.json({
              error: "A pending approval request already exists for this user.",
              approvalRequired: true,
              requestId: existingPending._id,
            }, { status: 409 });
          }

          const request = await RoleChangeRequest.create({
            participant: targetUserId,
            currentRole: targetRole,
            requestedRole: body.role,
            requestedBy: actorId,
            program: programId,
            programAdmin: program.createdBy._id,
            status: "pending",
          });

          roleApprovalRequestId = String(request._id);

          const volunteer = await User.findById(actorId).select("name");
          sendRoleChangeRequestEmail({
            adminEmail: program.createdBy.email,
            adminName: program.createdBy.name,
            participantName: targetUser.name,
            participantEmail: targetUser.email,
            participantPhone: targetUser.phone,
            volunteerName: volunteer?.name || "Volunteer",
            programName: program.name,
            requestId: roleApprovalRequestId,
            currentRole: targetRole,
            requestedRole: body.role,
          }).catch(console.error);

          const pms = await User.find({ role: "program_manager", programs: programId, isArchived: { $ne: true } }).select("name email");
          for (const pm of pms) {
            if (pm.email) {
              sendRoleChangeRequestEmail({
                adminEmail: pm.email,
                adminName: pm.name,
                participantName: targetUser.name,
                participantEmail: targetUser.email,
                participantPhone: targetUser.phone,
                volunteerName: volunteer?.name || "Volunteer",
                programName: program.name,
                requestId: roleApprovalRequestId,
                currentRole: targetRole,
                requestedRole: body.role,
              }).catch(console.error);
            }
          }

          // Keep current role unchanged until approval.
          delete body.role;
        }
      } else {
        return NextResponse.json({
          error: "You don't have permission to change roles"
        }, { status: 403 });
      }
    }

    let mentorshipApprovalRequestId: string | null = null;
    let mentorshipApprovalEmailSent = false;

    if (actorRole === "volunteer" && targetUserId !== actorId) {
      delete body.participantsUnder;
      delete body.mentoredParticipants;
      if (targetUser.handledBy && String(targetUser.handledBy) === String(actorId)) {
        delete body.handledBy;
      }
    }

    if (actorRole === "volunteer" && !targetUser.handledBy && body.handledBy !== undefined && String(body.handledBy).trim() !== "") {
      const programId = body.programId || targetUser.programs?.[0];

      if (!programId) {
        return NextResponse.json({
          error: "Participant is not mapped to a program. Cannot request mentor assignment."
        }, { status: 400 });
      }

      const program: any = await Program.findById(programId).populate("createdBy", "_id name email");
      if (!program || !program.createdBy) {
        return NextResponse.json({
          error: "Program admin not found for mentor assignment approval request"
        }, { status: 404 });
      }

      const existingPending = await MentorshipChangeRequest.findOne({
        participant: targetUserId,
        requestedBy: actorId,
        program: programId,
        status: "pending",
      });

      if (existingPending) {
        return NextResponse.json({
          error: "A pending mentor assignment request already exists for this participant.",
          approvalRequired: true,
          requestId: existingPending._id,
        }, { status: 409 });
      }

      const mRequest = await MentorshipChangeRequest.create({
        participant: targetUserId,
        requestedHandledBy: body.handledBy,
        requestedBy: actorId,
        program: programId,
        programAdmin: program.createdBy._id,
        status: "pending",
      });

      mentorshipApprovalRequestId = String(mRequest._id);

      const volunteer = await User.findById(actorId).select("name");
      sendMentorshipChangeRequestEmail({
        adminEmail: program.createdBy.email,
        adminName: program.createdBy.name,
        participantName: targetUser.name,
        participantEmail: targetUser.email,
        participantPhone: targetUser.phone,
        volunteerName: volunteer?.name || "Volunteer",
        programName: program.name,
        requestId: mentorshipApprovalRequestId,
      }).catch(console.error);

      const pmsMentorship = await User.find({ role: "program_manager", programs: programId, isArchived: { $ne: true } }).select("name email");
      for (const pm of pmsMentorship) {
        if (pm.email) {
          sendMentorshipChangeRequestEmail({
            adminEmail: pm.email,
            adminName: pm.name,
            participantName: targetUser.name,
            participantEmail: targetUser.email,
            participantPhone: targetUser.phone,
            volunteerName: volunteer?.name || "Volunteer",
            programName: program.name,
            requestId: mentorshipApprovalRequestId,
          }).catch(console.error);
        }
      }

      delete body.handledBy;
    }

    let allowedFields = editableFields;

    if (actorId === targetUserId && actorRole !== "admin") {
      delete body.role;
      allowedFields = editableFields.filter(f => !["role", "level", "grade", "handledBy", "registeredBy", "participantsUnder"].includes(f));
    }

    if (actorId === targetUserId && body.password && typeof body.password === "string" && body.password.trim() !== "") {
      const hashed = await bcrypt.hash(body.password, 10);
      targetUser.password = hashed;
    }

    // Enforce email and phone uniqueness when updating
    if (body.email && body.email !== targetUser.email) {
      const dupEmail = await User.findOne({ email: body.email.toLowerCase(), _id: { $ne: targetUserId } });
      if (dupEmail) {
        return NextResponse.json({ error: "A user with this email address already exists. Email must be unique." }, { status: 400 });
      }
    }
    if (body.phone && body.phone !== targetUser.phone) {
      const cleanPhone = String(body.phone).replace(/\D/g, "");
      const dupPhone = await User.findOne({ phone: { $in: [body.phone, cleanPhone] }, _id: { $ne: targetUserId } });
      if (dupPhone) {
        return NextResponse.json({ error: "A user with this phone number already exists. Phone number must be unique." }, { status: 400 });
      }
    }

    // Safeguard Level and Grade preservation so they are never wiped out by empty strings or nulls during role transitions
    if (body.level !== undefined && (body.level === "" || body.level === null)) {
      delete body.level;
    }
    if (body.grade !== undefined && (body.grade === "" || body.grade === null)) {
      delete body.grade;
    }

    // Rule: Admin should not be able to edit phone, email and program of a Program Manager
    if (initialRole === "program_manager") {
      delete body.phone;
      delete body.email;
      delete body.program;
      delete body.programId;
      delete body.programs;
    }

    // Apply allowed fields only
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        targetUser[field] = body[field];
      }
    });

    const finalLevel = Number(targetUser.level || 1);
    if (!targetUser.levelHistory || targetUser.levelHistory.length === 0) {
      targetUser.levelHistory = [{ level: initialLevel, joinedAt: targetUser.createdAt || new Date() }];
    }
    if (finalLevel !== initialLevel) {
      targetUser.levelHistory.push({ level: finalLevel, joinedAt: new Date() });
    }

    await targetUser.save();
    if (initialRole !== targetUser.role) {
      sendRoleChangeConfirmationEmail(targetUser.email, targetUser.name, initialRole, targetUser.role).catch(console.error);
    }

    const userObj = targetUser.toObject();
    delete userObj.password;

    if (roleApprovalRequestId || mentorshipApprovalRequestId) {
      const msgs = [];
      if (roleApprovalRequestId) msgs.push("Role change request sent to admin for approval.");
      if (mentorshipApprovalRequestId) msgs.push("Mentor assignment request sent to admin for approval.");
      return NextResponse.json({
        message: `Changes saved. ${msgs.join(" ")}`.trim(),
        approvalRequired: true,
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
