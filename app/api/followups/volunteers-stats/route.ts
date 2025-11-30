import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import FollowUp from "@/models/FollowUp";
import jwt from "jsonwebtoken";
import { TokenPayload } from "@/types/TokenPayload";

// GET /api/followups/volunteers-stats - Get workload stats for all volunteers
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const token = req.cookies.get("jwt")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // Only admins can view volunteer stats
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Only admins can view volunteer stats" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const programDate = searchParams.get("programDate");

    await connectDB();

    // Get all active volunteers
    const volunteers = await User.find({
      role: { $in: ["volunteer", "admin"] },
      isActive: true
    }).select("_id name email phone");

    // Build query for counting follow-ups
    const followUpQuery: any = { isDeleted: false };
    if (programDate) {
      followUpQuery.programDate = new Date(programDate);
    }

    // Get stats for each volunteer
    const stats = await Promise.all(
      volunteers.map(async (volunteer) => {
        const total = await FollowUp.countDocuments({
          ...followUpQuery,
          assignedTo: volunteer._id
        });

        const pending = await FollowUp.countDocuments({
          ...followUpQuery,
          assignedTo: volunteer._id,
          status: "pending"
        });

        const done = await FollowUp.countDocuments({
          ...followUpQuery,
          assignedTo: volunteer._id,
          status: "done"
        });

        const noResponse = await FollowUp.countDocuments({
          ...followUpQuery,
          assignedTo: volunteer._id,
          status: "no-response"
        });

        const notInterested = await FollowUp.countDocuments({
          ...followUpQuery,
          assignedTo: volunteer._id,
          status: "not-interested"
        });

        return {
          volunteerId: volunteer._id,
          name: volunteer.name,
          email: volunteer.email,
          phone: volunteer.phone,
          workload: {
            total,
            pending,
            done,
            noResponse,
            notInterested
          },
          completionRate: total > 0 ? Math.round((done / total) * 100) : 0
        };
      })
    );

    // Sort by pending workload (most to least)
    stats.sort((a, b) => b.workload.pending - a.workload.pending);

    return NextResponse.json({
      success: true,
      data: stats,
      summary: {
        totalVolunteers: volunteers.length,
        totalFollowUps: stats.reduce((sum, s) => sum + s.workload.total, 0),
        totalPending: stats.reduce((sum, s) => sum + s.workload.pending, 0),
        totalDone: stats.reduce((sum, s) => sum + s.workload.done, 0)
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching volunteer stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch volunteer stats", details: error.message },
      { status: 500 }
    );
  }
}
