import { redirect } from 'next/navigation';

// ----------------------------------------------------------------------

export default function HomePage() {
  // Simple server-side redirect to sign-in page
  // This avoids client-side hydration issues with manifest files
  redirect('/auth/jwt/sign-in');
}
