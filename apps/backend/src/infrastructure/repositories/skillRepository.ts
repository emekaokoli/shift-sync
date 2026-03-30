import { Prisma, PrismaClient, Skill } from "@prisma/client";
import { prisma } from "../db";

export const skillRepository = {
  findMany(): Promise<Skill[]> {
    return prisma.skill.findMany({
      orderBy: { name: "asc" },
    });
  },

  findById(id: string): Promise<
    | (Skill & {
        userSkills: {
          id: string;
          user: { id: string; name: string; email: string };
        }[];
      })
    | null
  > {
    return prisma.skill.findUnique({
      where: { id },
      include: {
        userSkills: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  },

  create(data: { name: string; description?: string }): Promise<Skill> {
    return prisma.skill.create({ data });
  },

  update(
    id: string,
    data: Partial<Pick<Skill, "name" | "description">>,
  ): Promise<Skill> {
    return prisma.skill.update({ where: { id }, data });
  },

  delete(id: string): Promise<Skill> {
    return prisma.skill.delete({ where: { id } });
  },

  count(where?: Prisma.SkillWhereInput): Promise<number> {
    return prisma.skill.count({ where });
  },

  getPrismaClient(): PrismaClient {
    return prisma;
  },
};
