import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to dashboard as specified in architecture
  redirect('/dashboard');
}