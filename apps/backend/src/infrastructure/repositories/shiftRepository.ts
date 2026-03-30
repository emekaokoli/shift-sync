import { Prisma, PrismaClient, Shift, User } from "@prisma/client";
import { prisma } from "../db";

export type ShiftWithRelations = Shift & {
  location: { id: string; name: string; timezone: string } | null;
  requiredSkill: { id: string; name: string } | null;
  assignments: { id: string; staff: User }[];
};

export type ShiftFilter = {
  locationId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
};

const shiftInclude = {
  location: { select: { id: true, name: true, timezone: true } },
  requiredSkill: { select: { id: true, name: true } },
  assignments: { include: { staff: true } },
};

export const shiftRepository = {
  findMany(filter?: ShiftFilter): Promise<ShiftWithRelations[]> {
    const where: Prisma.ShiftWhereInput = {};
    if (filter?.locationId) where.locationId = filter.locationId;
    if (filter?.status) where.status = filter.status as Shift["status"];
    if (filter?.startDate || filter?.endDate) {
      where.startTime = {};
      if (filter?.startDate)
        (where.startTime as Prisma.DateTimeFilter).gte = filter.startDate;
      if (filter?.endDate)
        (where.startTime as Prisma.DateTimeFilter).lte = filter.endDate;
    }
    return prisma.shift.findMany({
      where,
      include: shiftInclude,
      orderBy: { startTime: "asc" },
    });
  },

  findById(id: string): Promise<ShiftWithRelations | null> {
    return prisma.shift.findUnique({
      where: { id },
      include: {
        ...shiftInclude,
        swapRequests: {
          where: { status: { in: ["PENDING", "ACCEPTED"] } },
          include: { requester: true, target: true },
        },
        dropRequests: {
          where: { status: "PENDING" },
          include: { requester: true },
        },
      },
    });
  },

  create(data: {
    locationId: string;
    requiredSkillId: string;
    startTime: Date;
    endTime: Date;
    headcount: number;
    status: Shift["status"];
  }): Promise<ShiftWithRelations> {
    return prisma.shift.create({
      data,
      include: shiftInclude,
    });
  },

  update(
    id: string,
    data: Partial<{
      startTime: Date;
      endTime: Date;
      locationId: string;
      requiredSkillId: string;
      headcount: number;
      status: Shift["status"];
      publishedAt: Date;
    }>,
  ): Promise<ShiftWithRelations> {
    return prisma.shift.update({
      where: { id },
      data,
      include: shiftInclude,
    });
  },

  delete(id: string): Promise<Shift> {
    return prisma.shift.delete({ where: { id } });
  },

  count(where?: Prisma.ShiftWhereInput): Promise<number> {
    return prisma.shift.count({ where });
  },

  getPrismaClient(): PrismaClient {
    return prisma;
  },
};
