import { describe, expect, it } from "vitest";
import {
  isPublicRoute,
  needsOnboardingRedirect,
  shouldLeaveOnboarding,
} from "./middleware";

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

describe("needsOnboardingRedirect", () => {
  it("never redirects once onboarding is complete", () => {
    expect(needsOnboardingRedirect("/dashboard", true)).toBe(false);
    expect(needsOnboardingRedirect("/settings", true)).toBe(false);
    expect(needsOnboardingRedirect("/onboarding", true)).toBe(false);
  });

  it("redirects app pages when onboarding isn't complete", () => {
    expect(needsOnboardingRedirect("/dashboard", false)).toBe(true);
    expect(needsOnboardingRedirect("/customers", false)).toBe(true);
    expect(needsOnboardingRedirect("/follow-ups", false)).toBe(true);
    expect(needsOnboardingRedirect("/settings", false)).toBe(true);
  });

  it("never redirects a public route, even mid-onboarding", () => {
    expect(needsOnboardingRedirect("/", false)).toBe(false);
    expect(needsOnboardingRedirect("/login", false)).toBe(false);
    expect(needsOnboardingRedirect("/auth/callback", false)).toBe(false);
  });

  it("never redirects the onboarding flow itself", () => {
    expect(needsOnboardingRedirect("/onboarding", false)).toBe(false);
    expect(needsOnboardingRedirect("/onboarding?step=3", false)).toBe(false);
  });
});

describe("shouldLeaveOnboarding", () => {
  it("sends a fully onboarded visitor away from /onboarding", () => {
    expect(shouldLeaveOnboarding("/onboarding", true)).toBe(true);
    expect(shouldLeaveOnboarding("/onboarding?step=1", true)).toBe(true);
  });

  it("leaves someone mid-onboarding alone", () => {
    expect(shouldLeaveOnboarding("/onboarding", false)).toBe(false);
  });

  it("only applies to the onboarding flow itself", () => {
    expect(shouldLeaveOnboarding("/dashboard", true)).toBe(false);
  });
});
