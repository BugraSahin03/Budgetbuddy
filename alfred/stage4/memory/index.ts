import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

import {
  DEFAULT_MEMORY_ROOT,
  MEMORY_CONFIRMATION_TEXT,
  PersonalContextStore,
} from "./store.mjs";

type MemoryView =
  | "overview"
  | "active"
  | "goals"
  | "purchases"
  | "workflows"
  | "strategies"
  | "household"
  | "preferences"
  | "decisions"
  | "archived"
  | "pending"
  | "history"
  | "full";

type Candidate = {
  category:
    | "goal"
    | "purchase"
    | "workflow"
    | "strategy"
    | "household"
    | "preference"
    | "decision";
  title: string;
  summary: string;
  priority?: "low" | "medium" | "high";
  timeframe?: string;
  amountCents?: number;
  currency?: "EUR";
  effectiveDate?: string;
  details?: string[];
  tags?: string[];
};

type ProposalParams = {
  operation: "create" | "replace" | "archive" | "forget";
  targetItemId?: string;
  candidate?: Candidate;
  reason: string;
};

type ConfirmationParams = {
  proposalId: string;
  confirmationCode: string;
  confirmation: typeof MEMORY_CONFIRMATION_TEXT;
};

type CancellationParams = {
  proposalId: string;
  confirmationCode: string;
};

function jsonResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return jsonResult({
    status: "error",
    error: message,
    instruction: "Do not claim that personal context was stored or changed.",
  });
}

export default definePluginEntry({
  id: "personal-context-memory",
  name: "Alfred Personal Context Memory",
  description: "Controlled, confirmed and versioned long-term personal context",
  register(api) {
    api.registerTool(
      (toolContext) => {
        if (toolContext.agentId && toolContext.agentId !== "main") {
          return null;
        }
        const store = new PersonalContextStore({ root: DEFAULT_MEMORY_ROOT });
        const context = {
          sessionKey: toolContext.sessionKey ?? toolContext.sessionId ?? "local-operator",
          actorId:
            toolContext.requesterSenderId ??
            `${toolContext.messageChannel ?? "local"}:${toolContext.agentId ?? "main"}`,
          senderIsOwner: toolContext.senderIsOwner,
        };

        return [
          {
            name: "personal_context_snapshot",
            label: "Bestaetigter persoenlicher Kontext",
            description:
              "Read confirmed, versioned long-term goals, planned purchases, workflows, " +
              "strategies, household context, preferences and decision history. Use the " +
              "smallest sufficient view. Later confirmed revisions supersede the dated " +
              "baseline in USER.md. This tool never writes.",
            parameters: {
              type: "object",
              additionalProperties: false,
              properties: {
                view: {
                  type: "string",
                  enum: [
                    "overview",
                    "active",
                    "goals",
                    "purchases",
                    "workflows",
                    "strategies",
                    "household",
                    "preferences",
                    "decisions",
                    "archived",
                    "pending",
                    "history",
                    "full",
                  ],
                  description: "Context slice to read; defaults to overview.",
                },
              },
            },
            async execute(_toolCallId: string, params: { view?: MemoryView }) {
              try {
                return jsonResult(store.snapshot(params?.view ?? "overview"));
              } catch (error) {
                return errorResult(error);
              }
            },
          },
          {
            name: "memory_propose",
            label: "Erinnerung vorschlagen",
            description:
              "Create a pending structured memory proposal after discussing it with the " +
              "user. Operations: create a new item; replace an active item with a new " +
              "revision; archive an item but retain it; or forget an item and remove its " +
              "stored content. This does not make a proposal permanent. Show the complete " +
              "returned proposal and ask the user explicitly whether to store it. Never " +
              "call memory_confirm in the same assistant turn.",
            parameters: {
              type: "object",
              additionalProperties: false,
              required: ["operation", "reason"],
              properties: {
                operation: {
                  type: "string",
                  enum: ["create", "replace", "archive", "forget"],
                },
                targetItemId: {
                  type: "string",
                  minLength: 1,
                  maxLength: 80,
                  description: "Required for replace, archive and forget; absent for create.",
                },
                candidate: {
                  type: "object",
                  additionalProperties: false,
                  required: ["category", "title", "summary"],
                  properties: {
                    category: {
                      type: "string",
                      enum: [
                        "goal",
                        "purchase",
                        "workflow",
                        "strategy",
                        "household",
                        "preference",
                        "decision",
                      ],
                    },
                    title: { type: "string", minLength: 1, maxLength: 120 },
                    summary: { type: "string", minLength: 1, maxLength: 2000 },
                    priority: { type: "string", enum: ["low", "medium", "high"] },
                    timeframe: { type: "string", minLength: 1, maxLength: 160 },
                    amountCents: {
                      type: "integer",
                      minimum: 0,
                      maximum: 100000000000,
                    },
                    currency: { type: "string", enum: ["EUR"] },
                    effectiveDate: {
                      type: "string",
                      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
                    },
                    details: {
                      type: "array",
                      maxItems: 12,
                      items: { type: "string", minLength: 1, maxLength: 500 },
                    },
                    tags: {
                      type: "array",
                      maxItems: 10,
                      items: { type: "string", minLength: 1, maxLength: 40 },
                    },
                  },
                },
                reason: { type: "string", minLength: 1, maxLength: 1000 },
              },
            },
            async execute(_toolCallId: string, params: ProposalParams) {
              try {
                return jsonResult(store.propose(params, context));
              } catch (error) {
                return errorResult(error);
              }
            },
          },
          {
            name: "memory_confirm",
            label: "Erinnerung bestaetigen",
            description:
              `Permanently apply one pending memory proposal. Call only in a later turn ` +
              `after the user explicitly confirmed the exact shown proposal. Pass the ` +
              `proposal ID and code returned by memory_propose. The confirmation field ` +
              `must be exactly '${MEMORY_CONFIRMATION_TEXT}'. Never infer consent, and ` +
              `never call this in the same turn as memory_propose.`,
            parameters: {
              type: "object",
              additionalProperties: false,
              required: ["proposalId", "confirmationCode", "confirmation"],
              properties: {
                proposalId: { type: "string", pattern: "^prp_[a-f0-9-]{36}$" },
                confirmationCode: { type: "string", pattern: "^[A-HJ-NP-Z2-9]{8}$" },
                confirmation: { type: "string", enum: [MEMORY_CONFIRMATION_TEXT] },
              },
            },
            async execute(_toolCallId: string, params: ConfirmationParams) {
              try {
                return jsonResult(store.confirm(params, context));
              } catch (error) {
                return errorResult(error);
              }
            },
          },
          {
            name: "memory_cancel",
            label: "Erinnerungsvorschlag verwerfen",
            description:
              "Cancel a pending proposal after the user rejects it or requests changes. " +
              "This never changes confirmed memories.",
            parameters: {
              type: "object",
              additionalProperties: false,
              required: ["proposalId", "confirmationCode"],
              properties: {
                proposalId: { type: "string", pattern: "^prp_[a-f0-9-]{36}$" },
                confirmationCode: { type: "string", pattern: "^[A-HJ-NP-Z2-9]{8}$" },
              },
            },
            async execute(_toolCallId: string, params: CancellationParams) {
              try {
                return jsonResult(store.cancel(params, context));
              } catch (error) {
                return errorResult(error);
              }
            },
          },
        ];
      },
      {
        names: [
          "personal_context_snapshot",
          "memory_propose",
          "memory_confirm",
          "memory_cancel",
        ],
      },
    );
  },
});
