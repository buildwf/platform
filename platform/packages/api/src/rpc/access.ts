import {
  ProjectAccessDeniedError,
  ProjectNotFoundError,
  requireProjectCapability,
} from '../project-access.ts';
import type { ProjectCapability } from '../types.ts';
import type { Caller } from './procedure.ts';

/** An `authz` check: the caller holds `capability` on the project the input names. */
export function canOnProject(capability: ProjectCapability) {
  return async (caller: Caller, input: { projectId: string }): Promise<boolean> => {
    try {
      await requireProjectCapability(caller.db, input.projectId, caller.user.id, capability);
      return true;
    } catch (error) {
      if (error instanceof ProjectNotFoundError || error instanceof ProjectAccessDeniedError) {
        return false;
      }
      throw error;
    }
  };
}
