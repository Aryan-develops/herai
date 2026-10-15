import { env } from "../config/env.js";

export type PlanPeriod = "month" | "year";

export interface PlanPrice {
  period: PlanPeriod;
  planId: string;
  listInr: number;
  /** What the buyer pays right now: the list price, or the launch price while the offer runs. */
  payInr: number;
  /** Lowest amount a payment may be for this period (the launch price), so a late webhook after the offer ends still counts. */
  floorInr: number;
  periodDays: number;
  discountPercent: number | null;
  discountEndsAt: string | null;
}

const LIST: Record<PlanPeriod, { planId: string; inr: number; days: number }> = {
  month: { planId: "monthly_99_inr", inr: env.partnerPriceInr, days: 30 },
  year: { planId: "yearly_899_inr", inr: env.partnerYearlyPriceInr, days: 365 },
};

function launchOfferActive(now: number): boolean {
  return env.launchDiscountPercent > 0 && now <= new Date(env.launchDiscountEnds).getTime();
}

function discounted(inr: number): number {
  return Math.round((inr * (100 - env.launchDiscountPercent)) / 100);
}

export function priceFor(period: PlanPeriod, now = Date.now()): PlanPrice {
  const p = LIST[period];
  const active = launchOfferActive(now);
  return {
    period,
    planId: p.planId,
    listInr: p.inr,
    payInr: active ? discounted(p.inr) : p.inr,
    floorInr: env.launchDiscountPercent > 0 ? discounted(p.inr) : p.inr,
    periodDays: p.days,
    discountPercent: active ? env.launchDiscountPercent : null,
    discountEndsAt: active ? env.launchDiscountEnds : null,
  };
}

export function allPrices(now = Date.now()): PlanPrice[] {
  return [priceFor("month", now), priceFor("year", now)];
}
