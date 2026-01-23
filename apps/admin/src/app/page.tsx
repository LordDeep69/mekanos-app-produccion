/**
 * MEKANOS S.A.S - Portal Admin
 * Página Principal - Redirección a Dashboard
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirigir automáticamente al Dashboard
  redirect('/dashboard');
}
