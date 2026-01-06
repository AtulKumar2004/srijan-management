import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendEmailOtp } from "@/lib/sendEmailOtp";

// POST /api/auth/forgot-password/send-otp - Send OTP for password reset (email only)
export async function POST(req: Request) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database using correct schema fields
    await Otp.findOneAndUpdate(
      { target: user.email, channel: 'email', purpose: 'password-reset' },
      { code: otp, expiresAt, used: false, attempts: 0 },
      { upsert: true, new: true }
    );

    // Send OTP via email
    await sendEmailOtp(user.email, otp);

    return NextResponse.json(
      {
        success: true,
        message: "OTP sent to your email",
        userId: user._id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("SEND OTP ERROR:", error);
    return NextResponse.json(
      { error: "Failed to send OTP", details: error.message },
      { status: 500 }
    );
  }
}
