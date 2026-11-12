import Link from "next/link";
import { Suspense } from "react";
import { AuthNav } from "@/components/auth-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader({ brand = "strgl" }: { brand?: string }) {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          {brand}
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/products"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            Produkte
          </Link>
          <Suspense
            fallback={
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                Login
              </Link>
            }
          >
            <AuthNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
