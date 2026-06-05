import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createManualTransaction: vi.fn(),
  getActiveCashAccountId: vi.fn(() => 22),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  revalidatePath: vi.fn(),
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
vi.mock("@/src/special-budgets/amounts", () => ({
  parsePlannedAmountCents: vi.fn(),
}));
vi.mock("@/src/special-budgets/repository", () => ({
  setSpecialBudgetActiveForMonth: vi.fn(),
  updateSpecialBudgetPlannedAmountForMonth: vi.fn(),
}));
vi.mock("@/src/transactions/repository", () => ({
  createManualTransaction: mocks.createManualTransaction,
  getActiveCashAccountId: mocks.getActiveCashAccountId,
  updateExpenseAssignmentForMonth: vi.fn(),
}));

const { createMonthlyManualTransactionAction } = await import("@/app/monate/actions");

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
    await expect(createMonthlyManualTransactionAction(buildMonthlyFormData({ useCashAccount: true })))
      .rejects.toThrow("redirect:");

    expect(mocks.getActiveCashAccountId).toHaveBeenCalledOnce();
    expect(mocks.createManualTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 22,
      }),
    );
  });

  it("keeps the selected account when Bargeld is inactive", async () => {
    mocks.createManualTransaction.mockClear();
    mocks.getActiveCashAccountId.mockClear();

    await expect(createMonthlyManualTransactionAction(buildMonthlyFormData({}))).rejects.toThrow(
      "redirect:",
    );

    expect(mocks.getActiveCashAccountId).not.toHaveBeenCalled();
    expect(mocks.createManualTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 11,
      }),
    );
  });
});
