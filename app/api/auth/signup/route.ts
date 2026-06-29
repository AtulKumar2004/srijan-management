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

        const archivedUser = await User.findOne({
            isArchived: true,
            $or: [
                { email: normEmail },
                ...(normPhone ? [{ phone: normPhone }] : [])
            ]
        });

        if (archivedUser) {
            const hashed = await bcrypt.hash(password, 10);
            archivedUser.isArchived = false;
            archivedUser.password = hashed;
            archivedUser.name = name || archivedUser.name;
            archivedUser.email = normEmail;
            if (normPhone) archivedUser.phone = normPhone;
            if (profession !== undefined) archivedUser.profession = profession;
            if (homeTown !== undefined) archivedUser.homeTown = homeTown;
            if (connectedToTemple !== undefined) archivedUser.connectedToTemple = connectedToTemple;
            if (joinedAt !== undefined) archivedUser.joinedAt = new Date(joinedAt);
            if (gender !== undefined) archivedUser.gender = gender;
            if (dateOfBirth !== undefined) archivedUser.dateOfBirth = new Date(dateOfBirth);
            if (address !== undefined) archivedUser.address = address;
            if (howDidYouHearAboutUs !== undefined) archivedUser.howDidYouHearAboutUs = howDidYouHearAboutUs;
            if (numberOfRounds !== undefined) archivedUser.numberOfRounds = Number(numberOfRounds);
            if (level !== undefined) archivedUser.level = level;
            if (grade !== undefined) archivedUser.grade = grade;

            if (archivedUser.role === "volunteer") {
                archivedUser.participantsUnder = 0;
                await User.updateMany(
                    { handledBy: { $in: [archivedUser._id, String(archivedUser._id)] } },
                    { $set: { handledBy: "unassigned" } }
                );
            } else if (archivedUser.role === "participant") {
                archivedUser.role = "participant";
            }

            await archivedUser.save();

            const otpCode = generateOtp();
            const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

            await Otp.create({
                target: normEmail,
                code: otpCode,
                channel: "email",
                purpose: "signup",
                expiresAt,
            });

            await sendOtpToTarget(normEmail, "email", otpCode);

            return NextResponse.json(
                {
                    message: "Archived account found. A verification code has been sent to your email to restore and activate account.",
                    next: "verify-otp",
                    target: "email",
                    userId: archivedUser._id,
                },
                { status: 200 }
            );
        }

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
            const otpCode = generateOtp();
            const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

            await Otp.create({
                target: normEmail,
                code: otpCode,
                channel: "email",
                purpose: "signup",
                expiresAt,
            });

            await sendOtpToTarget(normEmail, "email", otpCode);

            return NextResponse.json(
                {
                    message: "A verification code has been sent to your email. Verify to activate account.",
                    next: "verify-otp",
                    target: "email",
                    userId: existingByEmail._id,
                },
                { status: 200 }
            );
        }

        // 2) If no email match, check phone
        if (normPhone) {
            const existingByPhone = await User.findOne({ phone: normPhone });
            if (existingByPhone) {
                if (existingByPhone.password) {
                    return NextResponse.json(
                        { error: "Phone number already registered. Please login." },
                        { status: 400 }
                    );
                }

                // phone exists but no password -> send OTP to email for verification (activation)
                const otpCode = generateOtp();
                const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

                await Otp.create({
                    target: normEmail,
                    code: otpCode,
                    channel: "email",
                    purpose: "signup",
                    expiresAt,
                });

                await sendOtpToTarget(normEmail, "email", otpCode);

                return NextResponse.json(
                    {
                        message: "A verification code has been sent to your email. Verify to activate account.",
                        next: "verify-otp",
                        target: "email",
                        userId: existingByPhone._id,
                    },
                    { status: 200 }
                );
            }
        }

        // 3) No existing records by email or phone -> create new user record as GUEST
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

        // Create OTP strictly via email
        const channel: "email" = "email";
        const target = normEmail;
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

        return NextResponse.json(
            {
                message: "Signup created. Verify the code sent to your email to activate the account.",
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
