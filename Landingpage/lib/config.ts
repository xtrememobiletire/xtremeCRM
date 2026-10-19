/**
 * Application URL Configuration
 * Controls links pointing to the CRM web application.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://app.xtrememobiletire.com"
    : "http://localhost:5173");

export const LOGIN_URL = `${APP_URL}/login`;
