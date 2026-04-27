import { z } from 'zod';

export const addressSchema = z.string().refine(
  (val) => /^0x[a-fA-F0-9]{40}$/.test(val),
  'Invalid Ethereum address'
);

export const optionalAddressSchema = z.string().refine(
  (val) => !val || /^0x[a-fA-F0-9]{40}$/.test(val),
  'Invalid Ethereum address'
).optional();

export const urlSchema = z.string().url('Invalid URL').optional().or(z.literal(''));

export const ethAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

export const positiveNumberSchema = z.coerce.number().positive('Must be a positive number');

export const minMaxSchema = (min: number, max: number, fieldName: string) => 
  z.coerce.number().min(min, `${fieldName} must be at least ${min}`).max(max, `${fieldName} must be at most ${max}`);

export const jobSchema = z.object({
  provider: addressSchema.optional(),
  budget: z.coerce.number().min(0.01, 'Minimum budget is $0.01 USDC'),
  deadline: z.string().optional(),
  description: z.string().min(1, 'Description is required').max(1000, 'Description must be less than 1000 characters'),
  paymentToken: z.string(),
  isOpenJob: z.boolean(),
  useMilestones: z.boolean(),
  evaluatorFee: z.boolean(),
  clientReview: z.boolean(),
  maxBudget: z.coerce.number().min(0.01, 'Minimum budget is $0.01 USDC').optional(),
});

export const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(100, 'Service name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  price: z.coerce.number().min(0.01, 'Minimum price is $0.01 USDC'),
  metadataURI: urlSchema,
  paymentAddress: optionalAddressSchema,
});

export const proposalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  criteriaURI: urlSchema.optional(),
  reward: z.coerce.number().min(0.01, 'Minimum reward is 0.01 ETH'),
  decisionDeadline: z.coerce.number().min(1, 'Minimum deadline is 1 day').max(30, 'Maximum deadline is 30 days'),
  evaluatorVisibility: z.enum(['public', 'private']),
});

export const biddingSessionSchema = z.object({
  evaluator: addressSchema,
  maxBudget: z.coerce.number().min(0.005, 'Minimum budget is 0.005 ETH'),
  deadline: z.coerce.number().min(5, 'Minimum deadline is 5 minutes').max(525600, 'Maximum deadline is 1 year'),
  metadata: z.string().optional(),
  serviceId: z.coerce.number().optional(),
});

export const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid version format (e.g., 1.0.0)'),
  description: z.string().optional(),
  endpoint: urlSchema,
  domains: z.string().optional(),
});