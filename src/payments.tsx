import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/api';

type StripeModule = typeof import('@stripe/stripe-react-native');
// Loaded defensively: a build without Stripe's native code must not crash the whole app (only card payments become unavailable).
let Stripe: StripeModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const m = require('@stripe/stripe-react-native') as StripeModule;
  // an empty/stubbed module (web preview) has no provider: treat Stripe as unavailable instead of crashing
  Stripe = typeof m?.StripeProvider === 'function' && typeof m?.useStripe === 'function' ? m : null;
} catch {
  Stripe = null;
}

type Config = Awaited<ReturnType<typeof api.paymentsConfig>>;
export type PayResult = { ok: true } | { ok: false; canceled?: boolean; message: string };

type PaymentsState = {
  config: Config | null;
  /** Pay a Stripe PaymentIntent: with a saved card (confirmed straight away) or by opening the Stripe payment sheet. */
  payIntent: (clientSecret: string, opts?: { savedPaymentMethodId?: string; email?: string }) => Promise<PayResult>;
  /** Save a new card to the account through the Stripe sheet. */
  addCard: () => Promise<PayResult>;
  /** Add money to the wallet: top-up intent → Stripe sheet → server confirms and credits. */
  topUp: (amount: number) => Promise<PayResult>;
};

const Ctx = createContext<PaymentsState | null>(null);

/** Loads the publishable key from the API (never hard-coded) and mounts Stripe. */
export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  useEffect(() => { api.paymentsConfig().then(setConfig).catch(() => {}); }, []);
  const key = config?.publishableKey ?? '';
  if (!Stripe) {
    const no = async (): Promise<PayResult> => ({ ok: false, message: 'Card payments need the full Forky app build — they are not available in this preview. Use the installed Forky app or pay with your wallet.' });
    return <Ctx.Provider value={{ config, payIntent: no, addCard: no, topUp: no }}>{children}</Ctx.Provider>;
  }
  const { StripeProvider } = Stripe;
  return (
    <StripeProvider publishableKey={key || 'pk_test_placeholder'} urlScheme="forky">
      <Inner config={config}>{children}</Inner>
    </StripeProvider>
  );
}

type SheetInit = { paymentIntentClientSecret: string; primaryButtonLabel?: string; defaultBillingDetails?: { email: string } } | { setupIntentClientSecret: string; primaryButtonLabel?: string };

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

function Inner({ config, children }: { config: Config | null; children: ReactNode }) {
  const { initPaymentSheet, presentPaymentSheet, confirmPayment } = Stripe!.useStripe();

  const sheet = useCallback(async (init: SheetInit): Promise<PayResult> => {
    if (!config?.publishableKey) return { ok: false, message: 'Payments are not available right now. Please try again in a moment.' };
    const i = await initPaymentSheet({ merchantDisplayName: 'Forky', returnURL: 'forky://stripe-redirect', allowsDelayedPaymentMethods: false, ...init } as Parameters<typeof initPaymentSheet>[0]);
    if (i.error) return { ok: false, message: i.error.message };
    const p = await presentPaymentSheet();
    if (p.error) return { ok: false, canceled: p.error.code === 'Canceled', message: p.error.message };
    return { ok: true };
  }, [config, initPaymentSheet, presentPaymentSheet]);

  const payIntent = useCallback<PaymentsState['payIntent']>(async (clientSecret, opts = {}) => {
    try {
      if (opts.savedPaymentMethodId) {
        if (!config?.publishableKey) return { ok: false, message: 'Payments are not available right now.' };
        const r = await confirmPayment(clientSecret, { paymentMethodType: 'Card', paymentMethodData: { paymentMethodId: opts.savedPaymentMethodId } });
        if (r.error) return { ok: false, message: r.error.message };
        return { ok: true };
      }
      return await sheet({ paymentIntentClientSecret: clientSecret, defaultBillingDetails: opts.email ? { email: opts.email } : undefined });
    } catch (e) {
      return { ok: false, message: errText(e, 'The payment could not be completed.') };
    }
  }, [config, confirmPayment, sheet]);

  const addCard = useCallback<PaymentsState['addCard']>(async () => {
    try {
      const si = await api.cardSetupIntent();
      return await sheet({ setupIntentClientSecret: si.clientSecret, primaryButtonLabel: 'Save card' });
    } catch (e) {
      return { ok: false, message: errText(e, 'Could not start saving the card.') };
    }
  }, [sheet]);

  const topUp = useCallback<PaymentsState['topUp']>(async (amount) => {
    try {
      const r = await api.walletTopUpIntent(amount);
      if (!r.clientSecret || !r.intentId) return { ok: false, message: 'Top-up is not available right now.' };
      const res = await sheet({ paymentIntentClientSecret: r.clientSecret, primaryButtonLabel: `Add $${amount.toFixed(2)}` });
      if (!res.ok) return res;
      await api.walletTopUpConfirm(r.intentId); // credits the wallet (the webhook does the same, safely)
      return { ok: true };
    } catch (e) {
      return { ok: false, message: errText(e, 'The top-up could not be completed.') };
    }
  }, [sheet]);

  const value = useMemo<PaymentsState>(() => ({ config, payIntent, addCard, topUp }), [config, payIntent, addCard, topUp]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePayments() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePayments must be used inside <PaymentsProvider>');
  return ctx;
}
