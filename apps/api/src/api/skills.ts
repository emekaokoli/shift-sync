import { skillSchema } from '@shift-sync/shared';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { shiftRepository, skillRepository } from '../infrastructure/repositories';
import { ResponseUtils } from '../infrastructure/response';
import { authMiddleware } from './middleware/auth';

const router: Router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const skills = await skillRepository.findMany();

    return ResponseUtils.success(res, skills, 'Skills fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const skill = await skillRepository.findById(req.params.id as string);

    if (!skill) {
      return ResponseUtils.notFound(res, 'Skill not found');
    }

    return ResponseUtils.success(res, skill, 'Skill fetched successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = skillSchema.parse(req.body);

    const skill = await skillRepository.create(data);

    return ResponseUtils.created(res, skill, 'Skill created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        'Validation failed',
        error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const data = skillSchema.partial().parse(req.body);

    const skill = await skillRepository.update(req.params.id as string, data);

    return ResponseUtils.success(res, skill, 'Skill updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ResponseUtils.validationError(
        res,
        'Validation failed',
        error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
      );
    }
    return ResponseUtils.handleError(res, error);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const shiftCount = await shiftRepository.count({
      requiredSkillId: req.params.id as string,
    });

    if (shiftCount > 0) {
      return ResponseUtils.conflict(res, 'Cannot delete skill that is assigned to shifts');
    }

    await skillRepository.delete(req.params.id as string);

    return ResponseUtils.noContent(res, 'Skill deleted successfully');
  } catch (error) {
    return ResponseUtils.handleError(res, error);
  }
});

export default router;
