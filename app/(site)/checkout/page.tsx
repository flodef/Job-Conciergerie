import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { IconLoader2 } from '@tabler/icons-react';
import CheckoutContent from './CheckoutContent';

const VALID_PLANS = new Set(['decouverte', 'pro', 'privilege']);

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;

  // Pas de clé Revolut configurée → on renvoie vers le formulaire de contact
  if (!process.env.REVOLUT_SECRET_KEY) {
    const subject = plan && VALID_PLANS.has(plan) ? `forfait-${plan}` : 'demande-renseignement';
    redirect(`/?subject=${subject}#contact`);
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
          <IconLoader2 size={32} className="animate-spin text-brand-400" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
