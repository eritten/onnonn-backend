const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(2)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    totpCode: z.string().optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().regex(/^\d{6}$/),
    newPassword: z.string().min(8)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email(),
    code: z.string().regex(/^\d{6}$/)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema
};
