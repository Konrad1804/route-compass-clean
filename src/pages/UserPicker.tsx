import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Edit2, Check, Plus, MapPin, Plane, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function UserPicker() {
  const navigate = useNavigate();
  const { users, currentUser, setCurrentUser, refreshUsers } = useUser();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSelectUser = (user: typeof users[0]) => {
    setCurrentUser(user);
    navigate('/route');
  };

  const handleEditStart = (user: typeof users[0]) => {
    setEditingUserId(user.id);
    setEditName(user.name);
  };

  const handleEditSave = async (userId: string) => {
    if (!editName.trim()) return;

    const { error } = await supabase
      .from('users')
      .update({ name: editName.trim() })
      .eq('id', userId);

    if (error) {
      toast.error('Fehler beim Speichern');
      return;
    }

    await refreshUsers();
    setEditingUserId(null);
    toast.success('Name aktualisiert');
  };

  const handleDeleteUser = async (userId: string) => {
    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) {
      toast.error('Fehler beim Löschen');
      return;
    }

    setDeleteConfirmId(null);
    if (currentUser?.id === userId) {
      setCurrentUser(null);
    }
    await refreshUsers();
    toast.success('Benutzer gelöscht');
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim()) return;

    const { data, error } = await supabase
      .from('users')
      .insert({ name: newUserName.trim() })
      .select()
      .single();

    if (error) {
      toast.error('Fehler beim Erstellen');
      return;
    }

    await refreshUsers();
    setNewUserName('');
    setShowNewUser(false);
    setCurrentUser(data);
    navigate('/route');
    toast.success('Benutzer erstellt');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-jade-light/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gold-light/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ocean-light/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 min-h-screen flex flex-col items-center justify-center">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary shadow-glow mb-6">
            <Plane className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
            Vietnam Trip Planner
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Wähle dein Profil aus, um die gemeinsame Reiseplanung zu starten
          </p>
        </div>

        {/* User Grid */}
        <div className="w-full max-w-3xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {users.map((user, index) => (
              <Card
                key={user.id}
                className={cn(
                  "group cursor-pointer transition-all duration-300 card-hover",
                  "border-2",
                  currentUser?.id === user.id
                    ? "border-primary bg-jade-light/20"
                    : "border-transparent hover:border-primary/30"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-4 flex flex-col items-center">
                  {editingUserId === user.id ? (
                    <div className="w-full space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-center"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave(user.id);
                          if (e.key === 'Escape') setEditingUserId(null);
                        }}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleEditSave(user.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Speichern
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors"
                        onClick={() => handleSelectUser(user)}
                      >
                        <User className="w-8 h-8 text-primary" />
                      </div>
                      <span 
                        className="font-medium text-foreground text-center"
                        onClick={() => handleSelectUser(user)}
                      >
                        {user.name}
                      </span>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStart(user);
                          }}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Bearbeiten
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(user.id);
                          }}
                          className="text-xs text-destructive hover:text-destructive flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Löschen
                        </button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add new user card */}
            {showNewUser ? (
              <Card className="border-2 border-dashed border-primary/50">
                <CardContent className="p-4 flex flex-col items-center">
                  <Input
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Name eingeben"
                    className="text-center mb-2"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateUser();
                      if (e.key === 'Escape') {
                        setShowNewUser(false);
                        setNewUserName('');
                      }
                    }}
                  />
                  <div className="flex gap-2 w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowNewUser(false);
                        setNewUserName('');
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleCreateUser}
                    >
                      Erstellen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card
                className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer transition-all"
                onClick={() => setShowNewUser(true)}
              >
                <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[120px]">
                  <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Neuer Benutzer</span>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
          <AlertDialogContent>
            <AlertDialogTitle>Benutzer löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Benutzer wird permanent gelöscht. Dies kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end mt-4">
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteConfirmId) {
                    handleDeleteUser(deleteConfirmId);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Löschen
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Continue button */}
        {currentUser && (
          <Button
            size="lg"
            className="mt-6 gap-2 animate-scale-in"
            onClick={() => navigate('/route')}
          >
            <MapPin className="w-5 h-5" />
            Weiter als {currentUser.name}
          </Button>
        )}
      </div>
    </div>
  );
}
