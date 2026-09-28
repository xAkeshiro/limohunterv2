import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/AuthForms';
import { currentUser } from '@/lib/auth';
import { safeNextPath } from '@/lib/next-path';
import { getPlan, planLabel } from '@/lib/plans';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeNextPath(Array.isArray(sp.next) ? sp.next[0] : sp.next) ?? undefined;
  if (await currentUser()) redirect(next ?? '/account');

  // Coming from a plan's Sign up button: say what happens after this step.
  const planId = next?.startsWith('/subscriptions/checkout') ? new URLSearchParams(next.split('?')[1]).get('plan') : null;
  const plan = getPlan(planId);

  return (
    <div className="wrap flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl">Create your account</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          {plan
            ? `Next you'll confirm the ${planLabel(plan)} plan — $${plan.price}/month.`
            : 'Free to create. Takes about thirty seconds.'}
        </p>

        <div className="card mt-7 p-6">
          <RegisterForm next={next} />
        </div>
      </div>
    </div>
  );
}
