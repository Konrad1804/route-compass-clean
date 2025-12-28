import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import type { Json } from '@/integrations/supabase/types';

type ActionType = 'create' | 'update' | 'delete' | 'reorder';
type EntityType = 'route_item' | 'suggestion' | 'vote' | 'todo' | 'place' | 'user';

export function useAuditLog() {
  const { currentUser } = useUser();

  const writeLog = async (
    actionType: ActionType,
    entityType: EntityType,
    entityId: string,
    beforeData?: Record<string, unknown> | null,
    afterData?: Record<string, unknown> | null
  ) => {
    const logEntry = {
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      actor_id: currentUser?.id || null,
      before_json: (beforeData || null) as Json,
      after_json: (afterData || null) as Json,
    };

    const { error } = await supabase.from('audit_logs').insert(logEntry);

    if (error) {
      console.error('Error writing audit log:', error);
    }
  };

  return { writeLog };
}
