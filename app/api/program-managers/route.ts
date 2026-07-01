import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Program from "@/models/Program";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value || req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");

    const query: any = { role: "program_manager", isArchived: { $ne: true } };
    if (programId) {
      query.programs = programId;
    }

    const programManagers = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const programs = await Program.find().select("_id name").lean();
    const programMap: Record<string, string> = {};
    programs.forEach((p: any) => {
      programMap[p._id.toString()] = p.name;
    });

    const enriched = programManagers.map((pm: any) => ({
      ...pm,
      programName: pm.programs && pm.programs.length > 0 ? programMap[pm.programs[0]] || "N/A" : "N/A"
    }));

    return NextResponse.json({ programManagers: enriched }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching program managers:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value || req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await connectDB();
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Program Manager deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting program manager:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
