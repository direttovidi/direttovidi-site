'use client';

import { useSession } from 'next-auth/react';
import { SignInButton } from '@/components/signin-button';
import UserMenu from './usermenu';

export default function TopRightAuthSlot() {
    const { data: session } = useSession();

    if (session?.user) {
        return <UserMenu user={session.user} />;
    }

    return <SignInButton variant="blue" />;
}
