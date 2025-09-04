import { z } from 'zod';

export const taskStatusEnum = z.enum([
  'pending',
  'in-progress',
  'review',
  'done',
  'blocked',
  'cancelled',
  'deferred'
]);

export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  status: taskStatusEnum.default('pending'),
  priority: taskPriorityEnum.default('medium'),
  dependencies: z.array(z.string()).optional(),
  details: z.string().optional(),
  testStrategy: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).max(10).optional(),
  complexity: z.number().min(1).max(10).optional(),
  parentTaskId: z.string().optional(), // For subtasks
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dependencies: z.array(z.string()).optional(),
  details: z.string().optional(),
  testStrategy: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).max(10).optional(),
  complexity: z.number().min(1).max(10).optional(),
});

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  status: z.array(taskStatusEnum).optional(),
  priority: z.array(taskPriorityEnum).optional(),
  assignedTo: z.string().optional(),
  hasSubtasks: z.coerce.boolean().optional(),
  parentTaskId: z.string().optional(),
  sortBy: z.enum(['id', 'title', 'priority', 'status', 'dueDate', 'createdAt']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const bulkUpdateTasksSchema = z.object({
  taskIds: z.array(z.string()).min(1),
  updates: updateTaskSchema,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
export type BulkUpdateTasksInput = z.infer<typeof bulkUpdateTasksSchema>;