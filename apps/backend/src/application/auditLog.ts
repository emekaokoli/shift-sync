import type { AuditLog, Prisma, PrismaClient } from "@prisma/client";

interface AuditLogParams {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

export async function createAuditLog(
  db: PrismaClient | Prisma.TransactionClient,
  params: AuditLogParams,
): Promise<AuditLog> {
  return db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue as Prisma.JsonValue | undefined,
      newValue: params.newValue as Prisma.JsonValue | undefined,
    },
  });
}

export async function getAuditLogs(
  db: PrismaClient,
  options: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {},
): Promise<AuditLog[]> {
  const where: Record<string, unknown> = {};

  if (options.entityType) where.entityType = options.entityType;
  if (options.entityId) where.entityId = options.entityId;
  if (options.userId) where.userId = options.userId;

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate)
      (where.createdAt as Record<string, Date>).gte = options.startDate;
    if (options.endDate)
      (where.createdAt as Record<string, Date>).lte = options.endDate;
  }

  return db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit || 100,
    skip: options.offset || 0,
  });
}
