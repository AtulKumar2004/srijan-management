import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Program from "@/models/Program";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // Only volunteers, program managers, and admins can access
    if (!["admin", "program_manager", "volunteer"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const programsParam = searchParams.get("programs");
    const allForAdmin = searchParams.get("allForAdmin");

    if (allForAdmin === "true" || ((decoded.role === "admin" || decoded.role === "program_manager") && !programsParam)) {
      // Find all programs belonging to or created by this admin
      const adminUser = await User.findById(decoded.userId);
      const adminPrograms = await Program.find({ createdBy: decoded.userId }).select("_id");
      
      const progIds: string[] = adminPrograms.map(p => p._id.toString());
      if (adminUser?.programs && Array.isArray(adminUser.programs)) {
        progIds.push(...adminUser.programs);
      }
      const uniqueProgIds = Array.from(new Set(progIds));

      const queryOr: any[] = [
        { _id: decoded.userId },
        { registeredBy: decoded.userId },
        { registeredBy: adminUser?.name }
      ];
      if (uniqueProgIds.length > 0) {
        queryOr.push({ programs: { $in: uniqueProgIds } });
      }

      const volunteers = await User.find({
        role: { $in: ["volunteer", "program_manager", "admin"] },
        isArchived: { $ne: true },
        $or: queryOr
      }).select("_id name email").sort({ name: 1 });

      return NextResponse.json({
        success: true,
        volunteers
      }, { status: 200 });
    }

    if (!programsParam) {
      return NextResponse.json({ error: "Programs parameter is required" }, { status: 400 });
    }

    const programIds = programsParam.split(',');

    // Find volunteers who are in any of these programs
    const volunteers = await User.find({
      role: { $in: ["volunteer", "program_manager", "admin"] },
      isArchived: { $ne: true },
      programs: { $in: programIds }
    }).select("_id name email").sort({ name: 1 });

    return NextResponse.json({
      success: true,
      volunteers
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching volunteers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch volunteers" },
      { status: 500 }
    );
  }
}
