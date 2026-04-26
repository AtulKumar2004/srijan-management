import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import RoleChangeRequest from "@/models/RoleChangeRequest";

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

    if (!["admin", "volunteer"].includes(actorRole)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const query = actorRole === "admin"
      ? { programAdmin: actorId }
      : { requestedBy: actorId };

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
