import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export function setAuthCookie(userId: string,email: String) {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET!, {
        expiresIn: "7d",
    });

    const response = NextResponse.json(
        { message: "Authentication successful", email: email },
        { status: 200 }
    );

    response.cookies.set("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
    });

    return response;
}
