import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

function GuestLinks() {
  return (
    <>
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "ghost" }))}
      >
        Login
      </Link>
      <Link href="/register" className={cn(buttonVariants())}>
        Registrieren
      </Link>
    </>
  );
}

export async function AuthNav() {
  let session = null;
  try {
    session = await getSession();
  } catch (error) {
    console.error("[AuthNav] session lookup failed", error);
    return <GuestLinks />;
  }

  if (!session) {
    return <GuestLinks />;
  }

  return (
    <>
      <Link
        href="/account"
        className={cn(buttonVariants({ variant: "ghost" }))}
      >
        Konto
      </Link>
      {(session.user.role === "admin" ||
        session.user.role === "platform_admin") && (
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Admin
        </Link>
      )}
    </>
  );
}
