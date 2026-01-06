import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Otp from "@/models/Otp";
import jwt from "jsonwebtoken";

// POST /api/auth/forgot-password/verify-otp - Verify OTP for password reset
export async function POST(req: Request) {
  try {
    await connectDB();

    const { userId, otp, channel } = await req.json();

    if (!userId || !otp || !channel) {
      return NextResponse.json(
        { error: "User ID, OTP, and channel are required" },
        { status: 400 }
      );
    }

    // Find user to get email
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find OTP record using target instead of userId
    const otpRecord = await Otp.findOne({ 
      target: user.email, 
      channel: 'email',
      purpose: 'password-reset'
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "OTP not found. Please request a new one." },
        { status: 404 }
      );
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if OTP matches (using 'code' field)
    if (otpRecord.code !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    // Check if OTP was already used
    if (otpRecord.used) {
      return NextResponse.json(
        { error: "OTP has already been used" },
        { status: 400 }
      );
    }

    // Mark OTP as used
    otpRecord.used = true;
    await otpRecord.save();

    // Generate a temporary reset token (valid for 15 minutes)
    const resetToken = jwt.sign(
      { userId, purpose: 'password-reset' },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    return NextResponse.json(
      {
        success: true,
        message: "OTP verified successfully",
        resetToken,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("VERIFY OTP ERROR:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP", details: error.message },
      { status: 500 }
    );
  }
}
