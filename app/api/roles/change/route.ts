import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Outreach from "@/models/Outreach";
import jwt from "jsonwebtoken";

// -------------------------------------------
// ROLE DEFINITIONS
// -------------------------------------------
export type Role =
  | "admin"
  | "volunteer"
  | "participant"
  | "guest"
  | "outreach";

const ROLE_RANK: Record<Role, number> = {
  admin: 4,
  volunteer: 3,
  participant: 2,
  guest: 1,
  outreach: 0,
};

// -------------------------------------------
// HELPER: Authorization Logic
// -------------------------------------------
function canChange(targetRole: Role, newRole: Role, actorRole: Role): boolean {
  const actorRank = ROLE_RANK[actorRole];
  const targetRank = ROLE_RANK[targetRole];
  const newRank = ROLE_RANK[newRole];

  // 1. Cannot change someone equal or higher rank
  if (targetRank >= actorRank) return false;

  // 2. Volunteer cannot assign volunteer or admin
  if (actorRole === "volunteer") {
    if (newRole === "volunteer" || newRole === "admin") return false;
  }

  // Admin can do everything else
  return true;
}

// -------------------------------------------
// API ROUTE
// -------------------------------------------
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // -------------------------------------------
    // AUTHENTICATION
    // -------------------------------------------
    const token = req.cookies.get("jwt")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const actorRole = decoded.role as Role;
    const actorId = decoded.userId;

    // -------------------------------------------
    // INPUT
    // -------------------------------------------
    const body = await req.json();
    const userId = body.userId as string | undefined;
    const outreachId = body.outreachId as string | undefined;
    const newRole = body.newRole as Role;

    // Validate newRole
    const allowedRoles: Role[] = [
      "admin",
      "volunteer",
      "participant",
      "guest",
    ];
    if (!allowedRoles.includes(newRole))
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );

    // -------------------------------------------
    // CASE 1: CHANGE EXISTING USER'S ROLE
    // -------------------------------------------
    if (userId) {
      const user = await User.findById(userId);
      if (!user)
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );

      const targetRole = user.role as Role;

      if (!canChange(targetRole, newRole, actorRole)) {
        return NextResponse.json(
          { error: "Not allowed to change this role" },
          { status: 403 }
        );
      }

      // Apply update
      user.role = newRole;
      user.handledBy = actorId;
      if (!user.registeredBy) user.registeredBy = actorId;

      await user.save();

      const u = user.toObject();
      delete u.password;

      return NextResponse.json(
        {
          message: `Role updated successfully → ${newRole}`,
          user: u,
        },
        { status: 200 }
      );
    }

    // -------------------------------------------
    // CASE 2: CONVERT OUTREACH → USER
    // -------------------------------------------
    if (outreachId) {
      const outreach = await Outreach.findById(outreachId);
      if (!outreach)
        return NextResponse.json(
          { error: "Outreach contact not found" },
          { status: 404 }
        );

      // volunteers cannot create volunteers or admins
      if (
        actorRole === "volunteer" &&
        (newRole === "volunteer" || newRole === "admin")
      ) {
        return NextResponse.json(
          { error: "Not allowed" },
          { status: 403 }
        );
      }

      // Does a user already exist with same email/phone?
      const existing = await User.findOne({
        $or: [{ email: outreach.email }, { phone: outreach.phone }],
      });

      // -------------------------------------------
      // MERGE: Outreach matches existing user
      // -------------------------------------------
      if (existing) {
        const targetRole = existing.role as Role;

        if (!canChange(targetRole, newRole, actorRole)) {
          return NextResponse.json(
            { error: "Not allowed to change this user" },
            { status: 403 }
          );
        }

        existing.role = newRole;
        existing.handledBy = actorId;
        if (!existing.registeredBy) existing.registeredBy = actorId;

        await existing.save();
        await Outreach.findByIdAndDelete(outreachId);

        const u = existing.toObject();
        delete u.password;

        return NextResponse.json(
          {
            message: `Merged outreach → user upgraded to ${newRole}`,
            user: u,
          },
          { status: 200 }
        );
      }

      // -------------------------------------------
      // CREATE NEW USER FROM OUTREACH
      // -------------------------------------------
      const newUser = await User.create({
        name: outreach.name,
        email: outreach.email,
        phone: outreach.phone,
        gender: outreach.gender,
        homeTown: outreach.area,
        connectedToTemple: outreach.connectedToTemple,
        role: newRole,
        handledBy: actorId,
        registeredBy: actorId,
        source: "outreach",
        sourceOutreachId: outreach._id,
      });

      await Outreach.findByIdAndDelete(outreach._id);

      const u = newUser.toObject();
      delete u.password;

      return NextResponse.json(
        {
          message: `Outreach converted → ${newRole}`,
          user: u,
        },
        { status: 201 }
      );
    }

    // Neither userId nor outreachId included
    return NextResponse.json(
      { error: "Either userId or outreachId required" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("ROLE CHANGE ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
