"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_CHARGE_AMOUNT_PENCE,
  MIN_CHARGE_AMOUNT_PENCE,
} from "@/lib/charge-limits";
import { BRAND, QUICK_AMOUNTS_GBP } from "@/lib/branding";

type PaymentStatus =
  | "processing"
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "requires_capture"
  | "succeeded"
  | "canceled"
  | "failed";

type ChargePhase = "idle" | "sending" | "waiting" | "done" | "cancelled" | "error";

function formatGbp(amountPence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amountPence / 100);
}

function shortPaymentRef(id: string): string {
  return id.length > 12 ? `…${id.slice(-10)}` : id;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const bodyText = await response.text();
  if (!bodyText) {
    return {} as T;
  }

  try {
    return JSON.parse(bodyText) as T;
  } catch {
    throw new Error(bodyText.slice(0, 120));
  }
}

function formatApiErrorMessage(message: string, fallback: string): string {
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (normalized === "internal server error" || normalized.startsWith("<!doctype")) {
    return fallback;
  }

  if (normalized.includes("unexpected token") || normalized.includes("not valid json")) {
    return fallback;
  }

  return message;
}

export function PosApp() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [requestEmailReceipt, setRequestEmailReceipt] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [phase, setPhase] = useState<ChargePhase>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [receiptEmailProvided, setReceiptEmailProvided] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const pollAbortRef = useRef<AbortController | null>(null);
  const userCancelledRef = useRef(false);

  const amountPence = Math.round(parseFloat(amount || "0") * 100);
  const isBusy = phase === "sending" || phase === "waiting";
  const canCharge =
    amountPence >= MIN_CHARGE_AMOUNT_PENCE &&
    amountPence <= MAX_CHARGE_AMOUNT_PENCE &&
    !isBusy &&
    !cancelling;
  const canCancel = (phase === "waiting" || phase === "sending") && !cancelling;
  const hasOptionalDetails = Boolean(customerName || reference || note);
  const fieldsDisabled = isBusy || cancelling;

  const stopPolling = useCallback(() => {
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;
  }, []);

  const resetAfterCancel = useCallback(
    (message: string) => {
      stopPolling();
      userCancelledRef.current = false;
      setPhase("cancelled");
      setStatusMessage(message);
      setLastPaymentId(null);
    },
    [stopPolling],
  );

  const resetForm = useCallback(() => {
    stopPolling();
    userCancelledRef.current = false;
    setAmount("");
    setCustomerName("");
    setReference("");
    setNote("");
    setRequestEmailReceipt(false);
    setDetailsOpen(false);
    setPhase("idle");
    setStatusMessage(null);
    setLastPaymentId(null);
    setReceiptEmailProvided(false);
  }, [stopPolling]);

  const pollPaymentIntent = useCallback(
    async (paymentIntentId: string, signal: AbortSignal) => {
      const maxAttempts = 90;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (signal.aborted || userCancelledRef.current) {
          return;
        }

        const response = await fetch(`/api/payment-intent/${paymentIntentId}`, { signal });
        if (!response.ok) {
          throw new Error("Could not check payment status");
        }

        const data = await parseApiResponse<{
          status: PaymentStatus;
          amountPence: number;
          lastPaymentErrorCode: string | null;
          lastPaymentErrorMessage: string | null;
        }>(response);

        if (data.status === "succeeded" || data.status === "requires_capture") {
          setPhase("done");
          setStatusMessage(
            receiptEmailProvided
              ? `Paid ${formatGbp(data.amountPence)}. Email receipt will be sent.`
              : `Paid ${formatGbp(data.amountPence)}`,
          );
          return;
        }

        if (data.status === "canceled") {
          resetAfterCancel("Transaction cancelled. Correct the amount and try again.");
          return;
        }

        if (data.status === "failed") {
          throw new Error(
            data.lastPaymentErrorMessage ?? "Payment failed. Try again or use another card.",
          );
        }

        if (data.status === "requires_payment_method" && data.lastPaymentErrorCode) {
          throw new Error(
            data.lastPaymentErrorMessage ?? "Card declined. Try again or use another card.",
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      throw new Error("Timed out waiting for the reader. Check the device and try again.");
    },
    [receiptEmailProvided, resetAfterCancel],
  );

  async function handleCancel() {
    if (!canCancel) {
      return;
    }

    setCancelling(true);
    userCancelledRef.current = true;
    stopPolling();

    try {
      const response = await fetch("/api/cancel-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: lastPaymentId ?? undefined,
        }),
      });

      const data = await parseApiResponse<{ error?: string; message?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Could not cancel transaction");
      }

      resetAfterCancel(
        data.message ?? "Transaction cancelled. Correct the amount and try again.",
      );
    } catch (error) {
      userCancelledRef.current = false;
      setPhase("error");
      setStatusMessage(
        error instanceof Error
          ? formatApiErrorMessage(error.message, "Could not cancel transaction. Please try again.")
          : "Could not cancel transaction. Please try again.",
      );
    } finally {
      setCancelling(false);
    }
  }

  async function handleSimulateCard(declined = false) {
    setSimulating(true);
    try {
      const response = await fetch("/api/simulate-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declined }),
      });
      const data = await parseApiResponse<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Simulation failed");
      }
    } catch (error) {
      setPhase("error");
      setStatusMessage(
        error instanceof Error
          ? formatApiErrorMessage(error.message, "Simulation failed. Please try again.")
          : "Simulation failed. Please try again.",
      );
    } finally {
      setSimulating(false);
    }
  }

  async function handleCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCharge) {
      return;
    }

    userCancelledRef.current = false;
    stopPolling();

    setPhase("sending");
    setStatusMessage("Sending to reader…");
    setLastPaymentId(null);
    setReceiptEmailProvided(false);

    try {
      const response = await fetch("/api/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence,
          customerName: customerName || undefined,
          reference: reference || undefined,
          note: note || undefined,
          requestEmailReceipt,
        }),
      });

      if (userCancelledRef.current) {
        return;
      }

      const data = await parseApiResponse<{
        error?: string;
        paymentIntentId?: string;
        message?: string;
        testMode?: boolean;
        receiptEmailProvided?: boolean;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Could not start payment");
      }

      if (!data.paymentIntentId) {
        throw new Error("Missing payment reference");
      }

      setLastPaymentId(data.paymentIntentId);
      setReceiptEmailProvided(Boolean(data.receiptEmailProvided));
      if (data.testMode) {
        setTestMode(true);
      }

      setPhase("waiting");
      setStatusMessage(
        data.testMode
          ? (data.message ?? "Test reader waiting — simulate card tap below.")
          : (data.message ??
              "Guest can pay on the reader — or tap Cancel if the amount is wrong."),
      );

      const abortController = new AbortController();
      pollAbortRef.current = abortController;

      await pollPaymentIntent(data.paymentIntentId, abortController.signal);
    } catch (error) {
      if (userCancelledRef.current) {
        return;
      }
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setPhase("error");
      setStatusMessage(
        error instanceof Error
          ? formatApiErrorMessage(error.message, "Could not start payment. Please try again.")
          : "Could not start payment. Please try again.",
      );
    }
  }

  async function handleLogout() {
    stopPolling();
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  useEffect(() => {
    fetch("/api/config")
      .then((response) => parseApiResponse<{ testMode?: boolean }>(response))
      .then((data: { testMode?: boolean }) => setTestMode(Boolean(data.testMode)))
      .catch(() => setTestMode(false));
  }, []);

  useEffect(() => {
    if (phase === "done") {
      const timer = setTimeout(resetForm, 8000);
      return () => clearTimeout(timer);
    }
  }, [phase, resetForm]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const chargeLabel =
    phase === "sending" || phase === "waiting"
      ? "Processing…"
      : amountPence > MAX_CHARGE_AMOUNT_PENCE
        ? "Max £1,500.00"
        : amountPence >= MIN_CHARGE_AMOUNT_PENCE
          ? `Charge ${formatGbp(amountPence)}`
          : "Enter amount";

  return (
    <main className="pos-page mx-auto w-full max-w-[390px]">
      <header className="flex shrink-0 items-center justify-between gap-2 pb-3 pt-1">
        <div className="min-w-0">
          {BRAND.locationSubtitle ? (
            <p className="truncate text-xs font-medium uppercase tracking-wide text-accent">
              {BRAND.locationSubtitle}
            </p>
          ) : null}
          <h1 className="text-lg font-semibold leading-tight">{BRAND.businessName}</h1>
        </div>
        <button
          className="touch-target shrink-0 rounded-lg border border-border px-3 text-sm text-muted"
          onClick={handleLogout}
          type="button"
        >
          Log out
        </button>
      </header>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleCharge}>
        <div className="pos-scroll space-y-3">
          <section className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">Amount (£)</span>
              <p className="mb-1.5 text-xs text-muted">Type any amount, or pick a shortcut below.</p>
              <input
                autoComplete="off"
                className="pos-input pos-input-amount w-full rounded-xl border border-border px-3 py-2.5 font-semibold tabular-nums outline-none focus:border-accent disabled:opacity-60"
                disabled={fieldsDisabled}
                inputMode="decimal"
                min="0.50"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={amount}
              />
            </label>

            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-muted">Quick amounts</p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS_GBP.map((amountGbp) => (
                  <button
                    className="touch-target flex items-center justify-center rounded-xl border border-border bg-background py-2 text-sm font-semibold active:border-accent active:text-accent disabled:opacity-50"
                    disabled={fieldsDisabled}
                    key={amountGbp}
                    onClick={() => setAmount(amountGbp.toFixed(2))}
                    type="button"
                  >
                    {formatGbp(amountGbp * 100)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface shadow-sm">
            <button
              className="touch-target flex w-full items-center justify-between px-3.5 py-3 text-left disabled:opacity-50"
              disabled={fieldsDisabled}
              onClick={() => setDetailsOpen((open) => !open)}
              type="button"
            >
              <span className="text-sm font-medium">
                Optional details
                <span className="ml-1 font-normal text-muted">(optional)</span>
              </span>
              <span className="text-muted" aria-hidden>
                {detailsOpen ? "−" : "+"}
              </span>
            </button>

            {detailsOpen ? (
              <div className="space-y-3 border-t border-border px-3.5 pb-3.5 pt-1">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Customer name</span>
                  <input
                    autoComplete="name"
                    className="pos-input w-full rounded-xl border border-border px-3 py-2 outline-none focus:border-accent disabled:opacity-60"
                    disabled={fieldsDisabled}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Smith"
                    type="text"
                    value={customerName}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Reference</span>
                  <input
                    autoComplete="off"
                    className="pos-input w-full rounded-xl border border-border px-3 py-2 outline-none focus:border-accent disabled:opacity-60"
                    disabled={fieldsDisabled}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Table 4"
                    type="text"
                    value={reference}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Note</span>
                  <input
                    autoComplete="off"
                    className="pos-input w-full rounded-xl border border-border px-3 py-2 outline-none focus:border-accent disabled:opacity-60"
                    disabled={fieldsDisabled}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Extra shot"
                    type="text"
                    value={note}
                  />
                </label>
              </div>
            ) : hasOptionalDetails ? (
              <p className="border-t border-border px-3.5 py-2 text-xs text-muted">
                {[customerName, reference, note].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                Email receipt
                <span className="ml-1 font-normal text-muted">(collect on reader)</span>
              </span>
              <input
                checked={requestEmailReceipt}
                className="h-4 w-4 accent-accent"
                disabled={fieldsDisabled}
                onChange={(event) => setRequestEmailReceipt(event.target.checked)}
                type="checkbox"
              />
            </label>
            <p className="mt-2 text-xs text-muted">
              If enabled, the reader asks for an email before card payment.
            </p>
          </section>

          {statusMessage ? (
            <div
              className={`rounded-xl px-3.5 py-2.5 text-sm leading-snug ${
                phase === "done"
                  ? "bg-green-50 text-success"
                  : phase === "error"
                    ? "bg-red-50 text-danger"
                    : phase === "cancelled"
                      ? "bg-amber-50 text-amber-900"
                      : "bg-stone-100 text-foreground"
              }`}
              role="status"
            >
              {statusMessage}
              {lastPaymentId && phase === "waiting" ? (
                <p className="mt-1 font-mono text-xs opacity-70">
                  Ref {shortPaymentRef(lastPaymentId)}
                </p>
              ) : null}
              {phase === "waiting" && testMode ? (
                <div className="mt-3 grid gap-2">
                  <button
                    className="touch-target w-full rounded-lg border border-accent bg-surface px-3 py-2.5 text-sm font-medium text-accent disabled:opacity-50"
                    disabled={simulating || cancelling}
                    onClick={() => handleSimulateCard(false)}
                    type="button"
                  >
                    {simulating ? "Simulating…" : "Simulate card tap (test)"}
                  </button>
                  <button
                    className="touch-target w-full rounded-lg border border-border px-3 py-2 text-xs text-muted disabled:opacity-50"
                    disabled={simulating || cancelling}
                    onClick={() => handleSimulateCard(true)}
                    type="button"
                  >
                    Simulate declined card
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="pos-footer space-y-2 pt-2">
          {canCancel ? (
            <button
              className="touch-target w-full rounded-xl border-2 border-danger px-4 py-3 text-base font-semibold text-danger active:bg-red-50 disabled:opacity-50"
              disabled={cancelling}
              onClick={handleCancel}
              type="button"
            >
              {cancelling ? "Cancelling…" : "Cancel transaction"}
            </button>
          ) : null}

          <button
            className="touch-target w-full rounded-xl bg-accent px-4 py-3.5 text-base font-semibold text-white active:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canCharge}
            type="submit"
          >
            {chargeLabel}
          </button>

          {phase === "done" || phase === "error" ? (
            <button
              className="touch-target w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium"
              onClick={resetForm}
              type="button"
            >
              New charge
            </button>
          ) : null}
        </footer>
      </form>
    </main>
  );
}
