import { useState, useEffect } from 'react';
import { Plus, Check, Undo2, Calendar, User, Trash2, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  assignee_id?: string;
  status: string;
  created_at: string;
  assignee?: { name: string };
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTodoTitle, setEditTodoTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { currentUser, users } = useUser();
  const { writeLog } = useAuditLog();

  useEffect(() => { fetchTodos(); }, []);

  const fetchTodos = async () => {
    const { data } = await supabase.from('todos').select('*, assignee:users!todos_assignee_id_fkey(*)').order('created_at', { ascending: false });
    setTodos(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;

    const { data, error } = await supabase.from('todos').insert({
      title: newTitle.trim(),
      status: 'open' as any,
      created_by: currentUser?.id,
    }).select().single();

    if (error) {
      toast.error('Fehler beim Erstellen');
      return;
    }

    await writeLog('create', 'todo', data.id, null, data);
    setNewTitle('');
    fetchTodos();
    toast.success('ToDo hinzugefügt');
  };

  const toggleStatus = async (todo: Todo) => {
    const newStatus = todo.status === 'open' ? 'done' : 'open';
    await supabase.from('todos').update({ status: newStatus as any, updated_by: currentUser?.id }).eq('id', todo.id);
    await writeLog('update', 'todo', todo.id, { status: todo.status }, { status: newStatus });
    fetchTodos();
    toast.success(newStatus === 'done' ? 'Erledigt!' : 'Wieder geöffnet');
  };

  const updateAssignee = async (todo: Todo, assigneeId: string | null) => {
    await supabase.from('todos').update({ assignee_id: assigneeId, updated_by: currentUser?.id }).eq('id', todo.id);
    await writeLog('update', 'todo', todo.id, { assignee_id: todo.assignee_id }, { assignee_id: assigneeId });
    fetchTodos();
  };

  const handleEditTitle = async (todo: Todo) => {
    if (!editTodoTitle.trim()) return;

    const { error } = await supabase.from('todos').update({ title: editTodoTitle.trim(), updated_by: currentUser?.id }).eq('id', todo.id);

    if (error) {
      toast.error('Fehler beim Speichern');
      return;
    }

    await writeLog('update', 'todo', todo.id, { title: todo.title }, { title: editTodoTitle });
    setEditingTodoId(null);
    fetchTodos();
    toast.success('Titel aktualisiert');
  };

  const handleDeleteTodo = async (id: string) => {
    const { error } = await supabase.from('todos').delete().eq('id', id);

    if (error) {
      toast.error('Fehler beim Löschen');
      return;
    }

    await writeLog('delete', 'todo', id, null, null);
    setDeleteConfirmId(null);
    fetchTodos();
    toast.success('ToDo gelöscht');
  };

  const filtered = todos.filter(t => {
    if (filter === 'open' && t.status !== 'open') return false;
    if (filter === 'done' && t.status !== 'done') return false;
    if (assigneeFilter !== 'all' && t.assignee_id !== assigneeFilter) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold mb-6">ToDos</h1>

        {/* Quick add */}
        <div className="flex gap-2 mb-6">
          <Input placeholder="Neue Aufgabe..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} className="flex-1" />
          <Button onClick={handleAdd} className="gap-2"><Plus className="w-4 h-4" />Hinzufügen</Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="done">Erledigt</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Zugewiesen an" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Todo list */}
        <div className="space-y-2">
          {filtered.map((todo) => (
            <Card key={todo.id} className={cn("transition-all", todo.status === 'done' && "opacity-60")}>
              <CardContent className="p-4 flex items-center gap-4">
                <Button size="icon" variant={todo.status === 'done' ? "default" : "outline"} className="shrink-0" onClick={() => toggleStatus(todo)}>
                  {todo.status === 'done' ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2" />}
                </Button>
                <div className="flex-1 min-w-0">
                  {editingTodoId === todo.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editTodoTitle}
                        onChange={(e) => setEditTodoTitle(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditTitle(todo);
                          if (e.key === 'Escape') setEditingTodoId(null);
                        }}
                      />
                      <Button size="sm" onClick={() => handleEditTitle(todo)}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTodoId(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <>
                      <p className={cn("font-medium", todo.status === 'done' && "line-through")}>{todo.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {todo.due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(todo.due_date).toLocaleDateString('de-DE')}</span>}
                        <span>{new Date(todo.created_at).toLocaleDateString('de-DE')}</span>
                      </div>
                    </>
                  )}
                </div>
                {editingTodoId !== todo.id && (
                  <>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                      setEditingTodoId(todo.id);
                      setEditTodoTitle(todo.title);
                    }}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(todo.id)}><Trash2 className="w-4 h-4" /></Button>
                  </>
                )}
                {editingTodoId !== todo.id && (
                  <Select value={todo.assignee_id || 'none'} onValueChange={(v) => updateAssignee(todo, v === 'none' ? null : v)}>
                    <SelectTrigger className="w-32"><User className="w-4 h-4 mr-2" /><SelectValue placeholder="Zuweisen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Niemand</SelectItem>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">Keine ToDos gefunden</div>}

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
          <AlertDialogContent>
            <AlertDialogTitle>ToDo löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Dieses ToDo wird gelöscht. Dies kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end mt-4">
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteConfirmId) {
                    handleDeleteTodo(deleteConfirmId);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Löschen
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
