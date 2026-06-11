import type { Metadata } from "next";

import { LoginForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Sign in · air-remote",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const message = typeof sp.message === "string" ? sp.message : undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <LoginForm error={error} message={message} />
    </main>
  );
}
