import { PrismaClient, Location } from "@prisma/client";
import { prisma } from "../db";

export const locationRepository = {
  findMany(): Promise<Location[]> {
    return prisma.location.findMany({
      orderBy: { name: "asc" },
    });
  },

  findById(id: string): Promise<
    | (Location & {
        shifts: {
          id: string;
          startTime: Date;
          endTime: Date;
          status: string;
          location: { id: string; name: string };
          requiredSkill: { id: string; name: string };
          assignments: { id: string; staff: { id: string; name: string } }[];
        }[];
      })
    | null
  > {
    return prisma.location.findUnique({
      where: { id },
      include: {
        shifts: {
          where: { startTime: { gte: new Date() } },
          include: {
            requiredSkill: true,
            assignments: { include: { staff: true } },
          },
          orderBy: { startTime: "asc" },
          take: 20,
        },
      },
    });
  },

  create(data: {
    name: string;
    address?: string;
    timezone: string;
  }): Promise<Location> {
    return prisma.location.create({ data });
  },

  update(
    id: string,
    data: Partial<Pick<Location, "name" | "address" | "timezone">>,
  ): Promise<Location> {
    return prisma.location.update({ where: { id }, data });
  },

  delete(id: string): Promise<Location> {
    return prisma.location.delete({ where: { id } });
  },

  getPrismaClient(): PrismaClient {
    return prisma;
  },
};
