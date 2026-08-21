import { Suspense } from "react";
import { AuthForm } from "./AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in or create an account",
  description: "Join EZTips and build a personalized feed of useful gaming clips.",
  robots: { index: false, follow: false },
};

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <AuthForm />
    </Suspense>
  );
}
