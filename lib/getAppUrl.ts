/**
 * Returns the canonical application URL for use in emails and links.
 *
 * Priority order:
 * 1. NEXT_PUBLIC_APP_URL  – explicitly set (preferred for production)
 * 2. NEXTAUTH_URL         – standard Next.js convention
 * 3. VERCEL_URL           – auto-set by Vercel (scheme must be added)
 * 4. localhost:3000       – local development fallback
 *
 * Set NEXT_PUBLIC_APP_URL in your production environment variables
 * (e.g. Vercel dashboard) to the exact canonical domain, e.g.:
 *   https://srijanyouthfestival.vercel.app
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
    return process.env.NEXTAUTH_URL.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    // VERCEL_URL does not include the scheme
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "https://www.srijanvraj.com";
}

