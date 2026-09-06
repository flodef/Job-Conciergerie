'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Logo from '@/app/components/Logo';
import {
  IconCircleCheck,
  IconLoader2,
  IconAlertCircle,
  IconArrowLeft,
} from '@tabler/icons-react';

const PLANS = {
  decouverte: { name: 'Découverte', monthly: 30, annual: 300 },
  pro: { name: 'Pro', monthly: 50, annual: 500 },
  privilege: { name: 'Privilège', monthly: 100, annual: 1000 },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') as keyof typeof PLANS | null;
  const billing = searchParams.get('billing') as 'monthly' | 'annual' | null;
  const status = searchParams.get('status');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  const planData = plan && PLANS[plan] ? PLANS[plan] : null;
  const amount = planData ? (billing === 'annual' ? planData.annual : planData.monthly) : 0;

  useEffect(() => {
    if (status === 'success') return;
    if (!planData || !amount) return;
    if (orderToken) return;

    const createOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planName: planData.name,
            amount,
            currency: 'EUR',
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create order');
        }

        const { token } = await res.json();
        setOrderToken(token);
      } catch (err) {
        console.error('Checkout error:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    createOrder();
  }, [plan, billing, planData, amount, orderToken, status]);

  useEffect(() => {
    if (!orderToken || !widgetRef.current) return;

    let destroyed = false;

    const mountWidget = async () => {
      try {
        const RevolutCheckout = (await import('@revolut/checkout')).default;
        if (destroyed) return;

        const instance = await RevolutCheckout(orderToken, 'sandbox');

        if (destroyed) {
          instance.destroy();
          return;
        }

        instance.payWithPopup({
          onSuccess: () => {
            window.location.href = '/checkout?status=success';
          },
          onError: (err) => {
            console.error('Payment error:', err);
            setError('Le paiement a échoué. Veuillez réessayer.');
          },
          onCancel: () => {
            setError('Paiement annulé.');
          },
        });
      } catch (err) {
        console.error('Widget mount error:', err);
        setError('Impossible de charger le widget de paiement.');
      }
    };

    mountWidget();

    return () => { destroyed = true; };
  }, [orderToken]);

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <IconCircleCheck size={64} className="text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Paiement réussi !</h1>
          <p className="text-slate-400 mb-6">Merci pour votre abonnement. Nous vous contacterons sous 24h pour finaliser la mise en place.</p>
          <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 text-white font-semibold hover:opacity-90 transition-opacity">
            <IconArrowLeft size={20} />
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    );
  }

  if (!planData || !billing) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <IconAlertCircle size={48} className="text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Plan non spécifié</h1>
          <p className="text-slate-400 mb-6">Veuillez choisir un plan depuis la page des tarifs.</p>
          <a href="/#tarifs" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 text-white font-semibold hover:opacity-90 transition-opacity">
            <IconArrowLeft size={20} />
            Voir les tarifs
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="w-full max-w-md">
        <a href="/#tarifs" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6">
          <IconArrowLeft size={16} />
          Retour aux tarifs
        </a>

        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Logo size={32} />
            <span className="gradient-text text-xl font-bold">Job Conciergerie</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Paiement de l&apos;abonnement</h1>
          <p className="text-slate-400 text-sm mb-6">Forfait {planData.name} — {billing === 'annual' ? 'annuel' : 'mensuel'}</p>

          <div className="glass rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Forfait</span>
              <span className="text-sm font-semibold">{planData.name}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Facturation</span>
              <span className="text-sm font-semibold">{billing === 'annual' ? 'Annuelle (2 mois offerts)' : 'Mensuelle'}</span>
            </div>
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Total</span>
                <span className="text-2xl font-black gradient-text">{amount}€</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 size={32} className="animate-spin text-brand-400" />
              <span className="ml-3 text-sm text-slate-400">Préparation du paiement...</span>
            </div>
          )}

          <div ref={widgetRef} />

          {!loading && !orderToken && !error && (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 size={32} className="animate-spin text-brand-400" />
              <span className="ml-3 text-sm text-slate-400">Chargement...</span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Paiement sécurisé par Revolut · Carte, Apple Pay, Google Pay acceptés
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <IconLoader2 size={32} className="animate-spin text-brand-400" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
