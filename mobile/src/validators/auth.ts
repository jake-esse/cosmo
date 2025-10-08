import { z } from 'zod';

/**
 * Login Form Validation Schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Signup Form Validation Schema
 */
export const signupSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/\d/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    referralCode: z.string().length(8, 'Referral code must be 8 characters').optional().or(z.literal('')),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and privacy policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

/**
 * Forgot Password Form Validation Schema
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
