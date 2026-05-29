import { cookies } from "next/headers";
import { PosApp } from "@/components/pos-app";
import { LoginForm } from "@/components/login-form";
import { isAuthenticatedSession } from "@/lib/auth";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("pos_session")?.value;

  if (!isAuthenticatedSession(sessionToken)) {
    return <LoginForm />;
  }

  return <PosApp />;
}
