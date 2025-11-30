// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Otp from "@/models/Otp";
import crypto from "crypto";
import { sendSmsOtp } from "@/lib/sendSMSOtp";
import { sendEmailOtp } from "@/lib/sendEmailOtp";

const OTP_TTL_MINUTES = 10; // OTP valid for 10 minutes
const OTP_LENGTH = 6;

function generateOtp() {
    // numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
}

async function sendOtpToTarget(target: string, channel: "phone" | "email", code: string) {
    console.log("AUTH KEY:", process.env.MSG91_AUTH_KEY)
    if (channel === "phone") {
        await sendSmsOtp(target, code);
    } else {
        await sendEmailOtp(target, code);
    }
}

/**
 * Signup endpoint logic (safe):
 * - If email exists AND has password -> reject (ask to login)
 * - If email exists AND no password -> create OTP and ask user to verify to activate
 * - Else if phone exists AND no password -> create OTP and ask user to verify to activate (merge)
 * - Else (no matches) -> create a pending user doc or create account and send OTP to verify
 *
 * Important: NO automatic merge without OTP verification.
 */
export async function POST(req: Request) {
    try {
        await connectDB();

        const body = await req.json();
        const {
            name,
            email,
            password,
            phone,
            profession,
            homeTown,
            connectedToTemple,
            joinedAt,
            gender,
            dateOfBirth,
            address,
            howDidYouHearAboutUs,
            numberOfRounds,
            level,
            grade,
            handledBy,
            registeredBy,
        } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
        }

        // normalize keys
        const normEmail = String(email).trim().toLowerCase();
        const normPhone = phone ? String(phone).trim() : undefined;

        // 1) Does a full account already exist with this email?
        const existingByEmail = await User.findOne({ email: normEmail });

        if (existingByEmail) {
            // If a complete account exists (has password) - deny signup -> ask to login
            if (existingByEmail.password) {
                return NextResponse.json(
                    { error: "Account already exists. Please login instead." },
                    { status: 400 }
                );
            }

            // existingByEmail exists but has NO password: this is a pre-created record
            // We must require OTP verification before activating / merging.
            // Create/store OTP targeted to email (or phone if available)
            const otpCode = generateOtp();
            const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

            // Save OTP (if multiple OTPs per target allowed, that's ok)  
            await Otp.create({
                target: normEmail,
                code: otpCode,
                channel: "email",
                purpose: "signup",
                expiresAt,
            });

            // send OTP (replace with real provider)
            await sendOtpToTarget(normEmail, "email", otpCode);

            // respond with pending activation message (do not include OTP in response in prod)
            return NextResponse.json(
                {
                    message: "A verification code has been sent to your email. Verify to activate account.",
                    next: "verify-otp",
                    target: "email",
                },
                { status: 200 }
            );
        }

        // 2) If no email match, check phone
        if (normPhone) {
            const existingByPhone = await User.findOne({ phone: normPhone });
            if (existingByPhone) {
                if (existingByPhone.password) {
                    // phone belongs to active account -> require login
                    return NextResponse.json(
                        { error: "Phone number already registered. Please login." },
                        { status: 400 }
                    );
                }

                // phone exists but no password -> send OTP to phone for verification (activation)
                const otpCode = generateOtp();
                const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

                await Otp.create({
                    target: normPhone,
                    code: otpCode,
                    channel: "phone",
                    purpose: "signup",
                    expiresAt,
                });

                await sendOtpToTarget(normPhone, "phone", otpCode);

                return NextResponse.json(
                    {
                        message: "A verification code has been sent to your phone. Verify to activate account.",
                        next: "verify-otp",
                        target: "phone",
                    },
                    { status: 200 }
                );
            }
        }

        // 3) No existing records by email or phone -> create new user record as GUEST but do NOT set password active until verification
        // Two approaches possible:
        //  a) Create user with hashed password immediately but require OTP verification before issuing tokens (we'll use this).
        //  b) Create a temporary "pending" record and only create user after OTP verification.
        //
        // We'll hash the password and create the user but keep it "unverified" (isActive=false) until OTP verification.
        const hashed = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email: normEmail,
            password: hashed,
            phone: normPhone,
            role: "guest",
            profession,
            homeTown,
            connectedToTemple,
            joinedAt: joinedAt ? new Date(joinedAt) : undefined,
            gender,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            address,
            howDidYouHearAboutUs,
            numberOfRounds: numberOfRounds ? Number(numberOfRounds) : 0,
            level,
            grade,
            handledBy,
            registeredBy,
            isActive: false, // IMPORTANT: not active until OTP verified
        });

        // Create OTP: prefer phone if present, else email
        const channel: "phone" | "email" = normPhone ? "phone" : "email";
        const target = channel === "phone" ? normPhone! : normEmail;
        const otpCode = generateOtp();
        const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

        await Otp.create({
            target,
            code: otpCode,
            channel,
            purpose: "signup",
            expiresAt,
        });

        await sendOtpToTarget(target, channel, otpCode);

        // Return pending message (frontend should call verify-otp API next)
        return NextResponse.json(
            {
                message: "Signup created. Verify the code sent to your phone/email to activate the account.",
                next: "verify-otp",
                target: channel,
                userId: newUser._id,
            },
            { status: 201 }
        );
    } catch (err: any) {
        console.error("SIGNUP_ERROR:", err);
        return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
    }
}
