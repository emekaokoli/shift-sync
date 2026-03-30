import { Prisma, PrismaClient, User, Availability } from "@prisma/client";
import { prisma } from "../db";

export type StaffFilter = {
  role?: string;
  locationId?: string;
  skillId?: string;
};

const staffSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  timezone: true,
  desiredHours: true,
  createdAt: true,
  skills: { include: { skill: true } },
  locationCertifications: { include: { location: true } },
};

export const staffRepository = {
  findMany(filter?: StaffFilter): Promise<Omit<User, "passwordHash">[]> {
    const where: Prisma.UserWhereInput = {};
    if (filter?.role) where.role = filter.role;
    if (filter?.locationId) {
      where.locationCertifications = {
        some: { locationId: filter.locationId },
      };
    }
    if (filter?.skillId) {
      where.skills = { some: { skillId: filter.skillId } };
    }
    return prisma.user.findMany({
      where,
      select: staffSelect,
      orderBy: { name: "asc" },
    });
  },

  findById(id: string): Promise<Omit<User, "passwordHash"> | null> {
    return prisma.user.findUnique({
      where: { id },
      select: {
        ...staffSelect,
        availability: true,
        assignedShifts: {
          include: {
            shift: { include: { location: true } },
          },
        },
      },
    });
  },

  update(
    id: string,
    data: Partial<
      Pick<User, "email" | "name" | "role" | "timezone" | "desiredHours">
    >,
  ): Promise<Omit<User, "passwordHash">> {
    return prisma.user.update({
      where: { id },
      data,
      select: staffSelect,
    });
  },

  addSkill(
    userId: string,
    skillId: string,
  ): Promise<{
    userId: string;
    skillId: string;
    skill: { id: string; name: string };
  }> {
    return prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: { userId, skillId },
      update: {},
      include: { skill: true },
    });
  },

  removeSkill(
    userId: string,
    skillId: string,
  ): Promise<Prisma.UserSkillGetPayload<{ include: { skill: true } }>> {
    return prisma.userSkill.delete({
      where: { userId_skillId: { userId, skillId } },
      include: { skill: true },
    });
  },

  addLocation(
    userId: string,
    locationId: string,
    isManager?: boolean,
  ): Promise<{
    userId: string;
    locationId: string;
    isManager: boolean;
    location: { id: string; name: string };
  }> {
    return prisma.userLocation.upsert({
      where: { userId_locationId: { userId, locationId } },
      create: { userId, locationId, isManager: isManager || false },
      update: { isManager },
      include: { location: true },
    });
  },

  removeLocation(
    userId: string,
    locationId: string,
  ): Promise<Prisma.UserLocationGetPayload<{ include: { location: true } }>> {
    return prisma.userLocation.delete({
      where: { userId_locationId: { userId, locationId } },
      include: { location: true },
    });
  },

  addAvailability(
    userId: string,
    data: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      specificDate?: string | null;
    },
  ): Promise<Availability> {
    return prisma.availability.create({
      data: {
        userId,
        ...data,
        specificDate: data.specificDate ? new Date(data.specificDate) : null,
      },
    });
  },

  deleteAvailability(id: string): Promise<Availability> {
    return prisma.availability.delete({ where: { id } });
  },

  getPrismaClient(): PrismaClient {
    return prisma;
  },
};
