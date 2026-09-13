const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid reference");

const optionalObjectId = z
  .union([objectId, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date" });
      return z.NEVER;
    }
    return date;
  });

const trimmed = (max, label) => z.string().trim().max(max, `${label} must be at most ${max} characters`);

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid email address");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/\d/, "Password must include a number");

module.exports = { z, objectId, optionalObjectId, optionalDate, trimmed, optionalEmail, password };
