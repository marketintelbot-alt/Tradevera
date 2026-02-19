import { z } from "zod";
import {
  ASSET_CLASS_VALUES,
  DIRECTION_VALUES,
  PLAN_VALUES,
  PROJECT_STATUS_VALUES,
  RISK_TRIGGER_REASON_VALUES,
  SESSION_VALUES,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES
} from "./types";

const numberFromInput = (opts?: { min?: number; max?: number }) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") {
        return undefined;
      }
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    },
    z.number()
      .refine((value) => (opts?.min === undefined ? true : value >= opts.min), "Value below minimum")
      .refine((value) => (opts?.max === undefined ? true : value <= opts.max), "Value above maximum")
  );

const optionalNumberFromInput = (opts?: { min?: number; max?: number }) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    },
    z.number()
      .refine((value) => (opts?.min === undefined ? true : value >= opts.min), "Value below minimum")
      .refine((value) => (opts?.max === undefined ? true : value <= opts.max), "Value above maximum")
      .nullable()
  );

export const planSchema = z.enum(PLAN_VALUES);

export const emailSchema = z.string().trim().toLowerCase().email();

export const authRequestLinkSchema = z.object({
  email: emailSchema
});

export const authConsumeSchema = z.object({
  token: z.string().trim().min(1).max(512)
});

export const tradeSchema = z.object({
  id: z.string().uuid().optional(),
  opened_at: z.string().datetime(),
  closed_at: z.string().datetime().nullable().optional(),
  symbol: z.string().trim().toUpperCase().min(1).max(20),
  asset_class: z.enum(ASSET_CLASS_VALUES),
  direction: z.enum(DIRECTION_VALUES),
  entry_price: numberFromInput({ min: 0 }),
  exit_price: optionalNumberFromInput({ min: 0 }).optional(),
  size: numberFromInput({ min: 0.000001 }),
  fees: numberFromInput({ min: 0 }).default(0),
  r_multiple: optionalNumberFromInput().optional(),
  setup: z.string().trim().max(120).nullable().optional(),
  timeframe: z.string().trim().max(60).nullable().optional(),
  session: z.enum(SESSION_VALUES).nullable().optional(),
  confidence: numberFromInput({ min: 0, max: 100 }).nullable().optional(),
  plan_adherence: z.boolean().default(true),
  notes: z.string().trim().max(5000).nullable().optional(),
  mistakes: z.string().trim().max(1000).nullable().optional()
});

export const tradeUpdateSchema = z.object({
  id: z.string().uuid().optional(),
  opened_at: z.string().datetime().optional(),
  closed_at: z.string().datetime().nullable().optional(),
  symbol: z.string().trim().toUpperCase().min(1).max(20).optional(),
  asset_class: z.enum(ASSET_CLASS_VALUES).optional(),
  direction: z.enum(DIRECTION_VALUES).optional(),
  entry_price: numberFromInput({ min: 0 }).optional(),
  exit_price: optionalNumberFromInput({ min: 0 }).optional(),
  size: numberFromInput({ min: 0.000001 }).optional(),
  fees: numberFromInput({ min: 0 }).optional(),
  r_multiple: optionalNumberFromInput().optional(),
  setup: z.string().trim().max(120).nullable().optional(),
  timeframe: z.string().trim().max(60).nullable().optional(),
  session: z.enum(SESSION_VALUES).nullable().optional(),
  confidence: numberFromInput({ min: 0, max: 100 }).nullable().optional(),
  plan_adherence: z.boolean().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  mistakes: z.string().trim().max(1000).nullable().optional()
});

export const tradeListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  symbol: z.string().trim().toUpperCase().max(20).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  setup: z.string().trim().max(120).optional()
});

export const checkoutSchema = z.object({
  priceId: z.string().min(1).optional()
});

export const aiCoachSchema = z.object({
  question: z.string().trim().max(600).optional(),
  lookbackDays: numberFromInput({ min: 14, max: 365 }).optional()
});

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6})$/, "Color must be a 6-digit hex value")
    .optional(),
  status: z.enum(PROJECT_STATUS_VALUES).optional()
});

export const projectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6})$/, "Color must be a 6-digit hex value")
    .optional(),
  status: z.enum(PROJECT_STATUS_VALUES).optional()
});

export const taskSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(180),
  details: z.string().trim().max(4000).nullable().optional(),
  status: z.enum(TASK_STATUS_VALUES).optional(),
  priority: z.enum(TASK_PRIORITY_VALUES).optional(),
  due_at: z.string().datetime().nullable().optional(),
  estimate_minutes: numberFromInput({ min: 1, max: 1440 }).nullable().optional()
});

export const taskUpdateSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(180).optional(),
  details: z.string().trim().max(4000).nullable().optional(),
  status: z.enum(TASK_STATUS_VALUES).optional(),
  priority: z.enum(TASK_PRIORITY_VALUES).optional(),
  due_at: z.string().datetime().nullable().optional(),
  estimate_minutes: numberFromInput({ min: 1, max: 1440 }).nullable().optional()
});

export const taskListQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  status: z.enum(TASK_STATUS_VALUES).optional(),
  priority: z.enum(TASK_PRIORITY_VALUES).optional(),
  search: z.string().trim().max(180).optional()
});

export const tradeScreenshotSchema = z.object({
  image_data: z
    .string()
    .trim()
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/, "Invalid image data URL")
    .max(2_000_000),
  caption: z.string().trim().max(160).nullable().optional()
});

export const riskSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  daily_max_loss: optionalNumberFromInput({ min: 0 }).optional(),
  max_consecutive_losses: numberFromInput({ min: 1, max: 20 }).nullable().optional(),
  cooldown_minutes: numberFromInput({ min: 1, max: 600 }).optional()
});

export const riskTriggerReasonSchema = z.enum(RISK_TRIGGER_REASON_VALUES);

export type AuthRequestLinkInput = z.infer<typeof authRequestLinkSchema>;
export type AuthConsumeInput = z.infer<typeof authConsumeSchema>;
export type TradeInput = z.infer<typeof tradeSchema>;
export type TradeUpdateInput = z.infer<typeof tradeUpdateSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type AiCoachInput = z.infer<typeof aiCoachSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TradeScreenshotInput = z.infer<typeof tradeScreenshotSchema>;
export type RiskSettingsInput = z.infer<typeof riskSettingsSchema>;
