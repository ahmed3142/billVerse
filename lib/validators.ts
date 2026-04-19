import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordUpdateSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const commonBillSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  electricity: z.number().min(0),
  water: z.number().min(0),
  gas: z.number().min(0),
  garbage: z.number().min(0),
  projectSecurity: z.number().min(0),
  cleaner: z.number().min(0),
  others: z.number().min(0),
});

export const individualBillSchema = z.object({
  flatId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  electricity: z.number().min(0),
  water: z.number().min(0),
  gas: z.number().min(0),
  dishLine: z.number().min(0),
  internetLine: z.number().min(0),
});

export const billRowsSchema = z.array(individualBillSchema);

export const publishSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export const paymentSchema = z.object({
  statementId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.enum(["cash", "bank_transfer", "bkash", "nagad", "card"]),
  notes: z.string().max(500).optional(),
});

export const flatSchema = z.object({
  id: z.string().optional(),
  flatNumber: z.string().min(1).max(10),
  ownerName: z.string().min(2).max(100),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  isActive: z.boolean(),
});
