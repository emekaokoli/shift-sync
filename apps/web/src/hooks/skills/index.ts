import { useQuery } from "@tanstack/react-query";
import { skillsApi } from "../../api/skills";

const queryKeys = {
  skills: () => ["skills"] as const,
  skill: (id: string) => ["skill", id] as const,
};

export function useSkills() {
  return useQuery({
    queryKey: queryKeys.skills(),
    queryFn: skillsApi.getAll,
    retry: 1,
    throwOnError: false,
  });
}

export function useSkill(id: string) {
  return useQuery({
    queryKey: queryKeys.skill(id),
    queryFn: () => skillsApi.getById(id),
    enabled: !!id,
    retry: 1,
    throwOnError: false,
  });
}