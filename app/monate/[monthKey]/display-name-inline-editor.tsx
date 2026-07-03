"use client";

import { useRef, useState } from "react";

type InlineDisplayNameEditorProps = {
  monthKey: string;
  transactionId: number;
  sourceType: string;
  displayName: string;
  displayNameOverride: string | null;
  originalDescription?: string;
};

export function InlineDisplayNameEditor({
  monthKey,
  transactionId,
  sourceType,
  displayName,
  displayNameOverride,
  originalDescription,
}: InlineDisplayNameEditorProps) {
  const initialValue = displayNameOverride ?? displayName;
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = `display-name-${sourceType}-${transactionId}`;
  const isUnchanged = value.trim() === savedValue.trim();

  async function saveDisplayName(): Promise<void> {
    if (isPending || isUnchanged) {
      return;
    }

    const nextValue = value;
    const previousValue = savedValue;
    const effectiveValue = nextValue.trim().length > 0 ? nextValue : displayName;

    setSavedValue(effectiveValue);
    setValue(effectiveValue);
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(`/monate/${monthKey}/display-names`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayNameOverride: nextValue,
          transactionId,
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Anzeigename konnte nicht gespeichert werden.");
      }
    } catch (caughtError) {
      setSavedValue(previousValue);
      setValue(previousValue);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Anzeigename konnte nicht gespeichert werden.",
      );
      inputRef.current?.focus();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      className="month-booking-title flex min-w-0 items-center gap-2"
      title={originalDescription}
      onSubmit={(event) => {
        event.preventDefault();
        void saveDisplayName();
      }}
    >
      <label className="sr-only" htmlFor={inputId}>
        Anzeigename direkt bearbeiten
      </label>
      <input
        ref={inputRef}
        id={inputId}
        name="displayNameOverride"
        value={value}
        maxLength={80}
        aria-label="Anzeigename direkt bearbeiten"
        aria-invalid={error ? true : undefined}
        aria-busy={isPending}
        className="min-w-0 flex-1 rounded-xl border border-dashed border-[color:var(--month-line-strong)] bg-white/92 px-3 py-2 text-base font-black tracking-[-0.035em] text-[color:var(--month-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition focus:border-[color:var(--month-blue)] focus:outline-none focus:ring-2 focus:ring-[color:var(--month-blue-soft)] disabled:cursor-wait disabled:opacity-75 sm:text-lg"
        disabled={isPending}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
        onBlur={() => void saveDisplayName()}
      />
      <button
        type="submit"
        aria-label="Anzeigename speichern"
        title="Anzeigename speichern"
        disabled={isPending || isUnchanged}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--month-ink)] text-sm font-black text-white shadow-[0_8px_16px_rgba(7,27,70,0.14)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-default disabled:opacity-45"
      >
        ✓
      </button>
      {error ? (
        <span className="sr-only" role="status">
          {error}
        </span>
      ) : null}
    </form>
  );
}
