import { Violation } from "@shift-sync/shared";

interface Skill {
  id: string;
  name: string;
}

interface UserSkill {
  skill: Skill;
}

export function checkSkillMatch(
  userSkills: UserSkill[],
  requiredSkillId: string,
): Violation | null {
  const hasSkill = userSkills.some((us) => us.skill.id === requiredSkillId);

  if (!hasSkill) {
    const userSkillNames = userSkills.map((us) => us.skill.name);
    return {
      code: "SKILL_MISMATCH",
      message: `Staff member lacks the required skill for this shift`,
      details: {
        requiredSkillId,
        userSkills: userSkillNames,
      },
    };
  }

  return null;
}
