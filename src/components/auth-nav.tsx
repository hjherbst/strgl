import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

export async function AuthNav() {
  const session = await getSession();

  if (!session) {
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
