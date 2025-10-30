import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth';

export default async function HomePage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect('/login');
  }

  redirect('/dashboard');
}
