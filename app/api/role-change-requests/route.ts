import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import RoleChangeRequest from "@/models/RoleChangeRequest";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const actorId = decoded.userId;
    const actorRole = decoded.role;

    if (!["admin", "program_manager", "volunteer"].includes(actorRole)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let query: any;
    if (actorRole === "admin") {
      query = { programAdmin: actorId };
    } else if (actorRole === "program_manager") {
      const pmUser = await User.findById(actorId).select("programs");
      query = { program: { $in: pmUser?.programs || [] } };
    } else {
      query = { requestedBy: actorId };
    }

    const requests = await RoleChangeRequest.find(query)
      .populate("participant", "-password")
      .populate("requestedBy", "name email phone level")
      .populate("program", "name")
      .populate("programAdmin", "name email")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      requests,
      count: requests.length,
    }, { status: 200 });
  } catch (error: any) {
    console.error("GET_ROLE_CHANGE_REQUESTS_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
