'use client';

import { useMemo, useState } from 'react';
import { money, monthlyPayment } from '@/lib/format';

export default function FinanceCalculator({ price }: { price: number }) {
  const [down, setDown] = useState(Math.round(price * 0.2));
  const [rate, setRate] = useState(8.5);
  const [months, setMonths] = useState(60);

  const financed = Math.max(price - down, 0);
  const payment = useMemo(() => monthlyPayment(financed, rate, months), [financed, rate, months]);
  const totalPaid = payment * months + down;

  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-white">Estimate your payment</h3>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="label mb-0" htmlFor="fc-down">Down payment</label>
            <span className="text-sm font-semibold text-slate-200">{money(down)}</span>
          </div>
          <input
            id="fc-down" type="range" min={0} max={price} step={500}
            value={down} onChange={(e) => setDown(Number(e.target.value))}
            className="mt-2 w-full accent-brand-300"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label mb-0" htmlFor="fc-rate">Interest rate</label>
            <span className="text-sm font-semibold text-slate-200">{rate.toFixed(2)}%</span>
          </div>
          <input
            id="fc-rate" type="range" min={0} max={20} step={0.25}
            value={rate} onChange={(e) => setRate(Number(e.target.value))}
            className="mt-2 w-full accent-brand-300"
          />
        </div>

        <div>
          <label className="label" htmlFor="fc-term">Term</label>
          <select
            id="fc-term" className="field"
            value={months} onChange={(e) => setMonths(Number(e.target.value))}
          >
            {[24, 36, 48, 60, 72, 84].map((m) => (
              <option key={m} value={m}>{m} months</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-brand-300/30 bg-brand-300/5 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Estimated monthly payment</p>
        <p className="mt-1 text-3xl font-bold text-brand-300">{money(Math.round(payment))}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-line pt-3 text-xs">
          <div>
            <dt className="text-slate-500">Amount financed</dt>
            <dd className="font-semibold text-slate-200">{money(financed)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Total of payments</dt>
            <dd className="font-semibold text-slate-200">{money(Math.round(totalPaid))}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Estimates only, for illustration. Actual terms depend on credit approval, vehicle age
        and lender requirements. Contact us for a firm quote.
      </p>
    </div>
  );
}
