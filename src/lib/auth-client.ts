"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin on strgl.de / localhost — no NEXT_PUBLIC_APP_URL required.
export const authClient = createAuthClient();
