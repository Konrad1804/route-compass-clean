import { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

interface AuditLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  actor_id?: string | null;
  created_at: string;
  before_json?: Json;
  after_json?: Json;
  actor?: { name: string };
}

export default function LogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('audit_logs').select('*, actor:users(*)').order('created_at', { ascending: false }).limit(100);
      setLogs(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const actionLabels: Record<string, string> = {
    create: 'hat erstellt',
    update: 'hat aktualisiert',
    delete: 'hat gelöscht',
    reorder: 'hat verschoben',
  };

  const entityLabels: Record<string, string> = {
    route_item: 'Route',
    suggestion: 'Vorschlag',
    vote: 'Vote',
    todo: 'ToDo',
    place: 'Ort',
    user: 'Benutzer',
  };

  const actionColors: Record<string, string> = {
    create: 'bg-jade-light text-jade',
    update: 'bg-gold-light text-gold',
    delete: 'bg-destructive/10 text-destructive',
    reorder: 'bg-ocean-light text-ocean',
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold mb-6">Aktivitätslog</h1>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Laden...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Noch keine Aktivitäten</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id} className="cursor-pointer transition-all hover:shadow-md" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <History className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{log.actor?.name || 'Unbekannt'}</span>
                      <Badge className={actionColors[log.action_type]}>{actionLabels[log.action_type]}</Badge>
                      <span className="text-muted-foreground">{entityLabels[log.entity_type]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('de-DE')}</span>
                      {(log.before_json || log.after_json) && (expanded === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </div>

                  {expanded === log.id && (log.before_json || log.after_json) && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-xs">
                      {log.before_json && (
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">Vorher:</p>
                          <pre className="bg-muted p-2 rounded overflow-auto max-h-40">{JSON.stringify(log.before_json, null, 2)}</pre>
                        </div>
                      )}
                      {log.after_json && (
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">Nachher:</p>
                          <pre className="bg-muted p-2 rounded overflow-auto max-h-40">{JSON.stringify(log.after_json, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
