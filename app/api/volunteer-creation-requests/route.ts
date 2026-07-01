import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import VolunteerCreationRequest from "@/models/VolunteerCreationRequest";
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

    const requests = await VolunteerCreationRequest.find(query)
      .populate("requestedBy", "name email phone level")
      .populate("program", "name")
      .populate("programAdmin", "name email")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests, count: requests.length }, { status: 200 });
  } catch (error: any) {
    console.error("GET_VOLUNTEER_CREATION_REQUESTS_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
