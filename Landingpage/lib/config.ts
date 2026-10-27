/**
 * Application URL Configuration
 * Direct links and API endpoints for Xtreme Mobile Tire.
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.xtrememobiletire.com";
export const LOGIN_URL = `${APP_URL}/login`;

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? "http://localhost:3000/api"
    : "https://api.xtrememobiletire.com/api");
