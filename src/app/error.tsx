"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Etwas ist schiefgelaufen
      </h1>
      <p className="text-muted-foreground">
        Bitte erneut laden. Wenn der Fehler bleibt, fehlen oft noch DB-Schema
        oder Auth-Env-Variablen.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">Digest: {error.digest}</p>
      ) : null}
      <div>
        <Button onClick={reset}>Neu laden</Button>
      </div>
    </div>
  );
}
