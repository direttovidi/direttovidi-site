// src/app/providers.tsx or similar
'use client';

import { SessionProvider } from 'next-auth/react';

export function SessionClientProvider({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}
