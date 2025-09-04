import { z } from 'zod';

export const projectStatusEnum = z.enum(['active', 'paused', 'completed', 'archived']);
export const gitProviderEnum = z.enum(['github', 'gitlab']);

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  status: projectStatusEnum.default('active'),
  gitProvider: gitProviderEnum,
  gitUrl: z.string().url().optional(),
  gitBranch: z.string().default('main'),
  tags: z.array(z.string()).max(10).optional(),
  syncEnabled: z.boolean().default(true),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  status: projectStatusEnum.optional(),
  gitUrl: z.string().url().optional(),
  gitBranch: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
  syncEnabled: z.boolean().optional(),
});

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.array(projectStatusEnum).optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['name', 'lastActivity', 'taskCount', 'completion']).default('lastActivity'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  ownership: z.enum(['all', 'owned', 'member']).default('all'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;