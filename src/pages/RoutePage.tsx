import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MapPin, Calendar, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RouteItem {
  id: string;
  place_id: string;
  order_index: number;
  status: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  place?: { id: string; name: string; region?: string };
}

function SortableItem({ item, onUpdate }: { item: RouteItem; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [status, setStatus] = useState(item.status);
  const [startDate, setStartDate] = useState(item.start_date || '');
  const { writeLog } = useAuditLog();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = async () => {
    const before = { notes: item.notes, status: item.status, start_date: item.start_date };
    const { error } = await supabase
      .from('route_items')
      .update({ notes, status: status as any, start_date: startDate || null })
      .eq('id', item.id);

    if (error) {
      toast.error('Fehler beim Speichern');
      return;
    }

    await writeLog('update', 'route_item', item.id, before, { notes, status, start_date: startDate });
    setEditing(false);
    onUpdate();
    toast.success('Gespeichert');
  };

  const statusColors: Record<string, string> = {
    planned: 'bg-muted text-muted-foreground',
    in_progress: 'bg-gold-light text-gold',
    completed: 'bg-jade-light text-jade',
    skipped: 'bg-destructive/10 text-destructive',
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("touch-none", isDragging && "opacity-50")}>
      <Card className={cn("mb-3 transition-all", isDragging && "shadow-lg ring-2 ring-primary")}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
              <GripVertical className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {item.order_index}
                </span>
                <h3 className="font-semibold text-lg">{item.place?.name}</h3>
                {item.place?.region && (
                  <span className="text-sm text-muted-foreground">({item.place.region})</span>
                )}
              </div>

              {editing ? (
                <div className="space-y-3 mt-3">
                  <div className="flex gap-2">
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Geplant</SelectItem>
                        <SelectItem value="in_progress">Unterwegs</SelectItem>
                        <SelectItem value="completed">Erledigt</SelectItem>
                        <SelectItem value="skipped">Übersprungen</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
                  </div>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notizen..." rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}><Check className="w-4 h-4 mr-1" />Speichern</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={statusColors[item.status]}>{item.status.replace('_', ' ')}</Badge>
                  {item.start_date && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{new Date(item.start_date).toLocaleDateString('de-DE')}
                    </span>
                  )}
                  {item.notes && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{item.notes}</span>}
                  <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="ml-auto">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RoutePage() {
  const [items, setItems] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { writeLog } = useAuditLog();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('route_items')
      .select('*, place:places(*)')
      .order('order_index');

    if (error) {
      console.error(error);
      return;
    }
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);

    const beforeOrder = items.map(i => ({ id: i.id, order: i.order_index }));

    // Optimistically update UI with new order and updated local order_index
    const updatedLocal = newItems.map((it, idx) => ({ ...it, order_index: idx + 1 }));
    setItems(updatedLocal);

    // Parallelize DB updates to avoid long sequential waits that can cause UI stomping
    const updatePromises = updatedLocal.map((it, idx) =>
      supabase.from('route_items').update({ order_index: idx + 1 }).eq('id', it.id)
    );

    await Promise.all(updatePromises);

    const afterOrder = updatedLocal.map((i) => ({ id: i.id, order: i.order_index }));
    await writeLog('reorder', 'route_item', active.id as string, { order: beforeOrder }, { order: afterOrder });

    // No immediate re-fetch to avoid overwriting the optimistic UI; only re-fetch on next mount or explicit refresh
    toast.success('Route aktualisiert');
  };

  // Auto-route removed: manual ordering via drag & drop remains

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">Route</h1>
            <p className="text-muted-foreground">Drag & Drop zum Sortieren</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Laden...</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableItem key={item.id} item={item} onUpdate={fetchItems} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </AppLayout>
  );
}
