'use client'

import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from './button';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <Button disabled>Loading...</Button>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <span>Hi, {session.user?.name || session.user?.email}</span>
        <Button variant="outline" onClick={() => signOut()}>SignOut</Button>
      </div>
    );
  }
  return (
    <Button onClick={() => signIn('github')}>GitHub SignIn</Button>
  );
} 