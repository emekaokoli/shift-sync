import { Prisma, PrismaClient, SwapRequest } from "@prisma/client";
import { prisma } from "../db";

export type SwapFilter = {
  status?: string;
  shiftId?: string;
  userId?: string;
};

const swapInclude = {
  shift: { include: { location: true, requiredSkill: true } },
  requester: { select: { id: true, name: true, email: true } },
  target: { select: { id: true, name: true, email: true } },
};

export const swapRepository = {
  findMany(filter?: SwapFilter): Promise<SwapRequest[]> {
    const where: Prisma.SwapRequestWhereInput = {};
    if (filter?.status) where.status = filter.status as SwapRequest["status"];
    if (filter?.shiftId) where.shiftId = filter.shiftId;
    if (filter?.userId) {
      where.OR = [{ requesterId: filter.userId }, { targetId: filter.userId }];
    }
    return prisma.swapRequest.findMany({
      where,
      include: swapInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string): Promise<
    | (SwapRequest & {
        shift: {
          location: { id: string; name: string };
          requiredSkill: { id: string; name: string };
        };
        requester: { id: string; name: string; email: string };
        target: { id: string; name: string; email: string };
      })
    | null
  > {
    return prisma.swapRequest.findUnique({
      where: { id },
      include: swapInclude,
    });
  },

  create(data: {
    shiftId: string;
    requesterId: string;
    targetId?: string | null;
    type: SwapRequest["type"];
  }): Promise<SwapRequest> {
    return prisma.swapRequest.create({
      data: {
        shiftId: data.shiftId,
        requesterId: data.requesterId,
        targetId: data.targetId,
        type: data.type,
        status: "PENDING",
      },
      include: swapInclude,
    });
  },

  update(
    id: string,
    data: Partial<
      Pick<
        SwapRequest,
        "status" | "targetId" | "respondedBy" | "responseReason"
      >
    >,
  ): Promise<SwapRequest> {
    return prisma.swapRequest.update({
      where: { id },
      data,
      include: swapInclude,
    });
  },

  delete(id: string): Promise<SwapRequest> {
    return prisma.swapRequest.delete({ where: { id } });
  },

  getPrismaClient(): PrismaClient {
    return prisma;
  },
};
