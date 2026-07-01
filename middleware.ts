import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// protected sections
const protectedRoutes = ["/dashboard", "/profile", "/admin", "/guests", "/outreach", "/notifications", "/programs"];

// pages that logged-in users shouldn't access
const authPages = ["/login", "/signup"];

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; role: string; isArchived?: boolean };
  } catch (error) {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  console.log("🔍 Middleware running for:", pathname);
  console.log("🔑 Token exists:", !!token);

  // 🚫 Prevent logged-in users from accessing login/signup
  if (authPages.some((page) => pathname.startsWith(page))) {
    if (token) {
      const decoded = await verifyToken(token);
      
      if (decoded) {
        // Redirect based on role or archive status
        if (decoded.isArchived || decoded.role === 'guest') {
          return NextResponse.redirect(new URL("/profile", req.url));
        } else if (['admin', 'program_manager', 'volunteer', 'participant'].includes(decoded.role)) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        } else {
          return NextResponse.redirect(new URL("/", req.url));
        }
      } else {
        // Invalid token, clear it and allow access to login/signup
        const response = NextResponse.next();
        response.cookies.delete("token");
        return response;
      }
    }
    // No token, allow access to login/signup
    return NextResponse.next();
  }

  // Check if current path requires auth
  const requiresAuth = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Protected page but user not logged in → redirect
  if (requiresAuth && !token) {
    console.log("❌ No token found, redirecting to login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If token exists and accessing protected route, validate
  if (requiresAuth && token) {
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.userId) {
      // Invalid token, redirect to login and clear cookie
      console.log("❌ Invalid token, redirecting to login");
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("token");
      return response;
    }

    // Restrict archived users and guests to only their profile
    if ((decoded.isArchived || decoded.role === "guest") && !pathname.startsWith("/profile")) {
      return NextResponse.redirect(new URL("/profile", req.url));
    }

    // Restrict dashboard to only admins, program managers, volunteers, and participants
    if (pathname.startsWith("/dashboard")) {
      if (!["admin", "program_manager", "volunteer", "participant"].includes(decoded.role)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Restrict guests page to only admins
    if (pathname.startsWith("/guests") && decoded.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Restrict outreach pages to only admins, program managers, and volunteers
    if (pathname.startsWith("/outreach") && !["admin", "program_manager", "volunteer"].includes(decoded.role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Restrict notifications to only admins, program managers, and volunteers
    if (pathname.startsWith("/notifications") && !["admin", "program_manager", "volunteer"].includes(decoded.role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Restrict admin pages to only admins
    if (pathname.startsWith("/admin") && decoded.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/guests",
    "/guests/:path*",
    "/outreach",
    "/outreach/:path*",
    "/notifications",
    "/notifications/:path*",
    "/programs",
    "/programs/:path*",
    "/login",
    "/signup",
  ],
};
