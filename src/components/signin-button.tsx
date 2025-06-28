'use client';

import { useSession, signIn } from 'next-auth/react';
import { Button, buttonVariants } from '@/components/ui/button';
import type { VariantProps } from "class-variance-authority";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

export function SignInButton({ variant = "blue" }: { variant?: ButtonVariant }) {
    const { status } = useSession();

    if (status !== 'unauthenticated') return null;

    return (
        <Button variant={variant} onClick={() => signIn()}>
            Sign In / Sign Up
        </Button>
    );
}
