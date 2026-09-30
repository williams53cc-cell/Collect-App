import { describe, expect, it } from "vitest";
import { isPublicRoute } from "./middleware";

// Regression coverage for the bug that shipped with the landing page: the
// middleware force-redirected EVERY signed-out visitor to /login, for any
// path other than /login or /auth. That was invisible before the landing
// page existed (the root route only ever redirected to /login anyway), but
// once "/" became a real public page, it meant nobody signed out could ever
// see it. isPublicRoute() is the one place that decision is made now.
describe("isPublicRoute", () => {
  it("treats the root landing page as public", () => {
    expect(isPublicRoute("/")).toBe(true);
  });

  it("treats /login and its sub-paths as public", () => {
    expect(isPublicRoute("/login")).toBe(true);
    expect(isPublicRoute("/login?mode=signup")).toBe(true);
  });

  it("treats /auth and its sub-paths as public", () => {
    expect(isPublicRoute("/auth/callback")).toBe(true);
  });

  it("treats every other route as requiring a session", () => {
    expect(isPublicRoute("/dashboard")).toBe(false);
    expect(isPublicRoute("/customers")).toBe(false);
    expect(isPublicRoute("/follow-ups")).toBe(false);
    expect(isPublicRoute("/settings")).toBe(false);
  });
});
