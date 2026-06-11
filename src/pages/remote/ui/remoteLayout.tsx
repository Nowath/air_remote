import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/api/supabase/server";
import RemotePage from "./remotePage";

export const metadata: Metadata = {
  title: "Account · air-remote",
};

export async function RemoteContainer() {
  const supabase = await createClient();

  // Verify the JWT with getClaims() — never trust getSession() in server code.d
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/");
  }

  return (
    <main className="flex items-center justify-center max-h-screen overflow-hidden">
      <RemotePage/>
    </main>
  );
}
