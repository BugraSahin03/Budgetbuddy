import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  closeMonth: vi.fn(),
  clearFixedCostControlOverrideForMonth: vi.fn(),
  createManualTransaction: vi.fn(),
  deleteImportedTransactionForMonth: vi.fn(),
  deleteManualTransaction: vi.fn(),
  getActiveCashAccountId: vi.fn(() => 22),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  revalidatePath: vi.fn(),
  reopenMonth: vi.fn(),
  setFixedCostControlOverrideForMonth: vi.fn(),
  updateExpenseAssignmentForMonth: vi.fn(),
  updateManualTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}), { virtual: true });
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));
vi.mock("@/src/budgets/repository", () => ({
  setMonthlyCategoryBudget: vi.fn(),
}));
vi.mock("@/src/months/repository", () => ({
  clearFixedCostControlOverrideForMonth:
    mocks.clearFixedCostControlOverrideForMonth,
  closeMonth: mocks.closeMonth,
  reopenMonth: mocks.reopenMonth,
  setFixedCostControlOverrideForMonth:
    mocks.setFixedCostControlOverrideForMonth,
}));
vi.mock("@/src/special-budgets/amounts", () => ({
  parsePlannedAmountCents: vi.fn(),
}));
vi.mock("@/src/special-budgets/repository", () => ({
  setSpecialBudgetActiveForMonth: vi.fn(),
  updateSpecialBudgetPlannedAmountForMonth: vi.fn(),
}));
vi.mock("@/src/transactions/repository", () => ({
  createManualTransaction: mocks.createManualTransaction,
  deleteImportedTransactionForMonth: mocks.deleteImportedTransactionForMonth,
  deleteManualTransaction: mocks.deleteManualTransaction,
  getActiveCashAccountId: mocks.getActiveCashAccountId,
  updateExpenseAssignmentForMonth: mocks.updateExpenseAssignmentForMonth,
  updateManualTransaction: mocks.updateManualTransaction,
}));

const {
  closeMonthAction,
  createMonthlyManualTransactionAction,
  deleteMonthlyImportedTransactionAction,
  deleteMonthlyManualTransactionAction,
  reopenMonthAction,
  updateMonthlyFixedCostControlOverrideAction,
  updateMonthlyTransactionAssignmentAction,
} = await import("@/app/monate/actions");

function buildMonthlyFormData(params: { useCashAccount?: boolean }): FormData {
  const formData = new FormData();
  formData.set("monthKey", "2026-06");
  formData.set("effectiveMonthKey", "2026-06");
  formData.set("transactionType", "income");
  formData.set("bookingDate", "2026-06-05");
  formData.set("amount", "12,50");
  formData.set("description", "Test Einnahme");
  formData.set("accountId", "11");

  if (params.useCashAccount) {
    formData.set("useCashAccount", "on");
  }

  return formData;
}

describe("FIN-057 monthly action cash toggle", () => {
  it("uses the cash account when Bargeld is active", async () => {
    mocks.redirect.mockClear();

    await expect(
      createMonthlyManualTransactionAction(
        buildMonthlyFormData({ useCashAccount: true }),
      ),
    ).rejects.toThrow("redirect:");

    expect(mocks.getActiveCashAccountId).toHaveBeenCalledOnce();
    expect(mocks.createManualTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 22,
      }),
    );
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenLastCalledWith(
      "/monate/2026-06?notice=Monatsbuchung%20erstellt.",
    );
    expect(mocks.redirect.mock.calls.join("\n")).not.toContain("NEXT_REDIRECT");
    expect(mocks.redirect.mock.calls.join("\n")).not.toContain("?error=");
  });

  it("keeps the selected account when Bargeld is inactive", async () => {
    mocks.createManualTransaction.mockClear();
    mocks.getActiveCashAccountId.mockClear();
    mocks.redirect.mockClear();

    await expect(
      createMonthlyManualTransactionAction(buildMonthlyFormData({})),
    ).rejects.toThrow("redirect:");

    expect(mocks.getActiveCashAccountId).not.toHaveBeenCalled();
    expect(mocks.createManualTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 11,
      }),
    );
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenLastCalledWith(
      "/monate/2026-06?notice=Monatsbuchung%20erstellt.",
    );
    expect(mocks.redirect.mock.calls.join("\n")).not.toContain("?error=");
  });
});

describe("FIN-060 monthly booking edit actions", () => {
  it("uses one Kategoriezuordnung field for category assignments", async () => {
    const formData = new FormData();
    formData.set("monthKey", "2026-06");
    formData.set("transactionId", "44");
    formData.set("assignment", "category:7");

    await expect(
      updateMonthlyTransactionAssignmentAction(formData),
    ).rejects.toThrow("redirect:");

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/monate/2026-06?notice=Zuordnung+gespeichert.#monatsbuchungen",
    );
    expect(mocks.updateExpenseAssignmentForMonth).toHaveBeenCalledWith(
      44,
      "2026-06",
      {
        categoryId: 7,
        specialBudgetId: null,
      },
    );
  });

  it("uses one Kategoriezuordnung field for special budget assignments", async () => {
    mocks.updateExpenseAssignmentForMonth.mockClear();
    const formData = new FormData();
    formData.set("monthKey", "2026-06");
    formData.set("transactionId", "45");
    formData.set("assignment", "specialBudget:9");

    await expect(
      updateMonthlyTransactionAssignmentAction(formData),
    ).rejects.toThrow("redirect:");

    expect(mocks.updateExpenseAssignmentForMonth).toHaveBeenCalledWith(
      45,
      "2026-06",
      {
        categoryId: null,
        specialBudgetId: 9,
      },
    );
  });

  it("requires explicit delete confirmation for monthly manual bookings", async () => {
    const formData = new FormData();
    formData.set("monthKey", "2026-06");
    formData.set("transactionId", "46");

    await expect(
      deleteMonthlyManualTransactionAction(formData),
    ).rejects.toThrow("redirect:");

    expect(mocks.deleteManualTransaction).not.toHaveBeenCalled();

    formData.set("confirmDelete", "on");
    await expect(
      deleteMonthlyManualTransactionAction(formData),
    ).rejects.toThrow("redirect:");

    expect(mocks.deleteManualTransaction).toHaveBeenCalledWith(46);
  });

  it("requires explicit delete confirmation for imported monthly bookings", async () => {
    const formData = new FormData();
    formData.set("monthKey", "2026-06");
    formData.set("transactionId", "47");

    await expect(
      deleteMonthlyImportedTransactionAction(formData),
    ).rejects.toThrow("redirect:");

    expect(mocks.deleteImportedTransactionForMonth).not.toHaveBeenCalled();

    formData.set("confirmDelete", "on");
    await expect(
      deleteMonthlyImportedTransactionAction(formData),
    ).rejects.toThrow("redirect:");

    expect(mocks.deleteImportedTransactionForMonth).toHaveBeenCalledWith(
      47,
      "2026-06",
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/monate/2026-06?bookingEdit=1&notice=Import-Buchung+gel%C3%B6scht.#monatsbuchungen",
    );
  });
});

describe("FIN-100 monthly fixed-cost control override actions", () => {
  it("returns to the reopened fixed-cost control dialog after marking an expense", async () => {
    const formData = new FormData();
    formData.set("monthKey", "2026-06");
    formData.set("transactionId", "77");
    formData.set("intent", "include");

    await expect(
      updateMonthlyFixedCostControlOverrideAction(formData),
    ).rejects.toThrow("redirect:");

    expect(mocks.setFixedCostControlOverrideForMonth).toHaveBeenCalledWith(
      77,
      "2026-06",
      "include",
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/monate/2026-06?bookingEdit=1&fixedCostControl=1&notice=Buchung+als+Fixkosten-Kontrolle+markiert.",
    );
  });

  it("returns to the reopened fixed-cost control dialog after removing a manual mark", async () => {
    mocks.redirect.mockClear();
    const formData = new FormData();
    formData.set("monthKey", "2026-06");
    formData.set("transactionId", "78");
    formData.set("intent", "clear");

    await expect(
      updateMonthlyFixedCostControlOverrideAction(formData),
    ).rejects.toThrow("redirect:");

    expect(mocks.clearFixedCostControlOverrideForMonth).toHaveBeenCalledWith(
      78,
      "2026-06",
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/monate/2026-06?bookingEdit=1&fixedCostControl=1&notice=Fixkosten-Markierung+entfernt.",
    );
  });
});

describe("FIN-071 monthly close actions", () => {
  it("closes a month only after explicit confirmation", async () => {
    const formData = new FormData();
    formData.set("monthKey", "2026-06");
    formData.set("confirmClose", "on");

    await expect(closeMonthAction(formData)).rejects.toThrow("redirect:");

    expect(mocks.closeMonth).toHaveBeenCalledWith("2026-06");
    expect(mocks.redirect).toHaveBeenLastCalledWith(
      "/monate/2026-06?notice=Monat%20abgeschlossen.",
    );
  });

  it("reopens a month only after explicit confirmation", async () => {
    const formData = new FormData();
    formData.set("monthKey", "2026-06");
    formData.set("confirmReopen", "on");

    await expect(reopenMonthAction(formData)).rejects.toThrow("redirect:");

    expect(mocks.reopenMonth).toHaveBeenCalledWith("2026-06");
    expect(mocks.redirect).toHaveBeenLastCalledWith(
      "/monate/2026-06?notice=Monat%20wieder%20ge%C3%B6ffnet.",
    );
  });
});
