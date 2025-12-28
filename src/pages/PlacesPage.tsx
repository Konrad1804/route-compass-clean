import { useState, useEffect } from 'react';
import { MapPin, Plus, ThumbsUp, ThumbsDown, ExternalLink, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Suggestion {
  id: string;
  place_id: string;
  title: string;
  description?: string;
  category: string;
  link?: string;
  cost_estimate?: string;
  created_at: string;
  created_by?: string;
  creator?: { name: string };
  votes?: { user_id: string; value: number }[];
  score: number;
}

interface Place {
  id: string;
  name: string;
  region?: string;
}

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'activity', link: '', cost_estimate: '' });
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editPlaceName, setEditPlaceName] = useState('');
  const [editPlaceRegion, setEditPlaceRegion] = useState('');
  const [showNewPlaceForm, setShowNewPlaceForm] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceRegion, setNewPlaceRegion] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<'place' | 'suggestion' | null>(null);
  const { currentUser } = useUser();
  const { writeLog } = useAuditLog();

  useEffect(() => {
    fetchPlaces();
  }, []);

  useEffect(() => {
    if (selectedPlace) fetchSuggestions(selectedPlace.id);
  }, [selectedPlace]);

  const fetchPlaces = async () => {
    const { data } = await supabase.from('places').select('*').order('name');
    setPlaces(data || []);
    if (data?.length) setSelectedPlace(data[0]);
    setLoading(false);
  };

  const handleAddPlace = async () => {
    if (!newPlaceName.trim()) {
      toast.error('Ortsname ist erforderlich');
      return;
    }

    const { data, error } = await supabase.from('places').insert({
      name: newPlaceName.trim(),
      region: newPlaceRegion.trim() || null,
      created_by: currentUser?.id,
    }).select().single();

    if (error) {
      toast.error('Fehler beim Erstellen');
      return;
    }

    await writeLog('create', 'place', data.id, null, data);
    setNewPlaceName('');
    setNewPlaceRegion('');
    setShowNewPlaceForm(false);
    fetchPlaces();
    toast.success('Ort hinzugefügt');
  };

  const handleDeletePlace = async (id: string) => {
    const { error } = await supabase.from('places').delete().eq('id', id);

    if (error) {
      toast.error('Fehler beim Löschen');
      return;
    }

    await writeLog('delete', 'place', id, null, null);
    setDeleteConfirmId(null);
    setDeleteConfirmType(null);
    fetchPlaces();
    setSelectedPlace(null);
    toast.success('Ort gelöscht');
  };

  const handleEditPlace = async (id: string) => {
    const { error } = await supabase.from('places').update({
      name: editPlaceName.trim(),
      region: editPlaceRegion.trim() || null,
    }).eq('id', id);

    if (error) {
      toast.error('Fehler beim Speichern');
      return;
    }

    const before = places.find(p => p.id === id);
    await writeLog('update', 'place', id, before, { name: editPlaceName, region: editPlaceRegion });
    setEditingPlaceId(null);
    fetchPlaces();
    toast.success('Ort aktualisiert');
  };

  const fetchSuggestions = async (placeId: string) => {
    const { data } = await supabase
      .from('suggestions')
      .select('*, creator:users(*), votes(*)')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });

    const withScores = (data || []).map(s => ({
      ...s,
      score: (s.votes || []).reduce((acc: number, v: { value: number }) => acc + v.value, 0)
    }));
    setSuggestions(withScores);
  };

  const handleAddSuggestion = async () => {
    if (!formData.title.trim() || !selectedPlace) {
      toast.error('Titel ist erforderlich');
      return;
    }

    // Basic URL validation
    if (formData.link && !/^https?:\/\/.+/.test(formData.link)) {
      toast.error('Link muss eine gültige URL sein');
      return;
    }

    const { data, error } = await supabase.from('suggestions').insert({
      place_id: selectedPlace.id,
      title: formData.title.trim(),
      description: formData.description || null,
      category: formData.category as any,
      link: formData.link || null,
      cost_estimate: formData.cost_estimate || null,
      created_by: currentUser?.id,
    }).select().single();

    if (error) {
      toast.error('Fehler beim Erstellen');
      return;
    }

    await writeLog('create', 'suggestion', data.id, null, data);
    setFormData({ title: '', description: '', category: 'activity', link: '', cost_estimate: '' });
    setShowForm(false);
    fetchSuggestions(selectedPlace.id);
    toast.success('Vorschlag hinzugefügt');
  };

  const handleDeleteSuggestion = async (id: string) => {
    const { error } = await supabase.from('suggestions').delete().eq('id', id);

    if (error) {
      toast.error('Fehler beim Löschen');
      return;
    }

    await writeLog('delete', 'suggestion', id, null, null);
    setDeleteConfirmId(null);
    setDeleteConfirmType(null);
    if (selectedPlace) fetchSuggestions(selectedPlace.id);
    toast.success('Vorschlag gelöscht');
  };

  const handleVote = async (suggestion: Suggestion, value: number) => {
    if (!currentUser) {
      toast.error('Bitte wähle zuerst einen Benutzer');
      return;
    }

    const existingVote = suggestion.votes?.find(v => v.user_id === currentUser.id);

    if (existingVote) {
      if (existingVote.value === value) {
        // Remove vote
        await supabase.from('votes').delete().eq('suggestion_id', suggestion.id).eq('user_id', currentUser.id);
        await writeLog('delete', 'vote', suggestion.id, { value: existingVote.value }, null);
      } else {
        // Update vote
        await supabase.from('votes').update({ value }).eq('suggestion_id', suggestion.id).eq('user_id', currentUser.id);
        await writeLog('update', 'vote', suggestion.id, { value: existingVote.value }, { value });
      }
    } else {
      // Create vote
      await supabase.from('votes').insert({ suggestion_id: suggestion.id, user_id: currentUser.id, value });
      await writeLog('create', 'vote', suggestion.id, null, { value });
    }

    fetchSuggestions(selectedPlace!.id);
  };

  const categoryColors: Record<string, string> = {
    activity: 'bg-jade-light text-jade',
    food: 'bg-terracotta-light text-terracotta',
    hotel: 'bg-ocean-light text-ocean',
    transport: 'bg-gold-light text-gold',
    other: 'bg-muted text-muted-foreground',
  };

  const sortedByScore = [...suggestions].sort((a, b) => b.score - a.score);
  const sortedByNew = [...suggestions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl font-bold">Orte & Vorschläge</h1>
        </div>

        {/* Places management section */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Orte verwalten</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {places.map((place) => (
              <div key={place.id} className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-md border-2 transition-all",
                editingPlaceId === place.id ? "border-primary bg-primary/10" : "border-transparent bg-background"
              )}>
                {editingPlaceId === place.id ? (
                  <>
                    <div className="flex gap-2">
                      <Input
                        value={editPlaceName}
                        onChange={(e) => setEditPlaceName(e.target.value)}
                        placeholder="Name"
                        className="h-8 w-32"
                        autoFocus
                      />
                      <Input
                        value={editPlaceRegion}
                        onChange={(e) => setEditPlaceRegion(e.target.value)}
                        placeholder="Region"
                        className="h-8 w-32"
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleEditPlace(place.id)}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingPlaceId(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{place.name}</span>
                      {place.region && <span className="text-sm text-muted-foreground ml-1">({place.region})</span>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                      setEditingPlaceId(place.id);
                      setEditPlaceName(place.name);
                      setEditPlaceRegion(place.region || '');
                    }}><Edit2 className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => {
                      setDeleteConfirmId(place.id);
                      setDeleteConfirmType('place');
                    }}><Trash2 className="w-3 h-3" /></Button>
                  </>
                )}
              </div>
            ))}
            {showNewPlaceForm ? (
              <div className="inline-flex items-center gap-2">
                <Input
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                  placeholder="Ortsname *"
                  className="h-8 w-32"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddPlace();
                    if (e.key === 'Escape') {
                      setShowNewPlaceForm(false);
                      setNewPlaceName('');
                      setNewPlaceRegion('');
                    }
                  }}
                />
                <Input
                  value={newPlaceRegion}
                  onChange={(e) => setNewPlaceRegion(e.target.value)}
                  placeholder="Region"
                  className="h-8 w-32"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddPlace();
                    if (e.key === 'Escape') {
                      setShowNewPlaceForm(false);
                      setNewPlaceName('');
                      setNewPlaceRegion('');
                    }
                  }}
                />
                <Button size="sm" onClick={handleAddPlace}><Check className="w-4 h-4 mr-1" />Erstellen</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setShowNewPlaceForm(false);
                  setNewPlaceName('');
                  setNewPlaceRegion('');
                }}>Abbrechen</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowNewPlaceForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Neuer Ort
              </Button>
            )}
          </div>
        </div>

        {/* Place selector for suggestions */}
        <div className="flex flex-wrap gap-2 mb-6">
          {places.map((place) => (
            <Button
              key={place.id}
              variant={selectedPlace?.id === place.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlace(place)}
              className="gap-2"
            >
              <MapPin className="w-4 h-4" />
              {place.name}
            </Button>
          ))}
        </div>

        {selectedPlace && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedPlace.name}</h2>
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="w-4 h-4" />Vorschlag</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Neuer Vorschlag für {selectedPlace.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input placeholder="Titel *" value={formData.title} onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))} />
                    <Textarea placeholder="Beschreibung" value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} />
                    <Select value={formData.category} onValueChange={(v) => setFormData(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activity">Aktivität</SelectItem>
                        <SelectItem value="food">Essen</SelectItem>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="other">Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Link (optional)" value={formData.link} onChange={(e) => setFormData(f => ({ ...f, link: e.target.value }))} />
                    <Input placeholder="Geschätzte Kosten (optional)" value={formData.cost_estimate} onChange={(e) => setFormData(f => ({ ...f, cost_estimate: e.target.value }))} />
                    <Button onClick={handleAddSuggestion} className="w-full">Hinzufügen</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="top">
              <TabsList className="mb-4">
                <TabsTrigger value="top">Top (nach Score)</TabsTrigger>
                <TabsTrigger value="new">Neu</TabsTrigger>
              </TabsList>

              <TabsContent value="top" className="space-y-3">
                {sortedByScore.map((s) => <SuggestionCard key={s.id} suggestion={s} onVote={handleVote} colors={categoryColors} currentUserId={currentUser?.id} onDelete={(id) => {
                  setDeleteConfirmId(id);
                  setDeleteConfirmType('suggestion');
                }} />)}
              </TabsContent>

              <TabsContent value="new" className="space-y-3">
                {sortedByNew.map((s) => <SuggestionCard key={s.id} suggestion={s} onVote={handleVote} colors={categoryColors} currentUserId={currentUser?.id} onDelete={(id) => {
                  setDeleteConfirmId(id);
                  setDeleteConfirmType('suggestion');
                }} />)}
              </TabsContent>
            </Tabs>

            {suggestions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">Noch keine Vorschläge für diesen Ort</div>
            )}
          </>
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) { setDeleteConfirmId(null); setDeleteConfirmType(null); } }}>
          <AlertDialogContent>
            <AlertDialogTitle>Löschen bestätigen</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmType === 'place' && 'Dieser Ort und alle zugehörigen Vorschläge werden gelöscht. Dies kann nicht rückgängig gemacht werden.'}
              {deleteConfirmType === 'suggestion' && 'Dieser Vorschlag wird gelöscht. Dies kann nicht rückgängig gemacht werden.'}
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end mt-4">
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteConfirmId && deleteConfirmType === 'place') {
                    handleDeletePlace(deleteConfirmId);
                  } else if (deleteConfirmId && deleteConfirmType === 'suggestion') {
                    handleDeleteSuggestion(deleteConfirmId);
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

function SuggestionCard({ suggestion, onVote, colors, currentUserId, onDelete }: { suggestion: Suggestion; onVote: (s: Suggestion, v: number) => void; colors: Record<string, string>; currentUserId?: string; onDelete: (id: string) => void }) {
  const userVote = suggestion.votes?.find(v => v.user_id === currentUserId);

  return (
    <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <Button size="icon" variant="ghost" className={cn("h-8 w-8", userVote?.value === 1 && "text-jade bg-jade-light")} onClick={() => onVote(suggestion, 1)}>
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <span className={cn("font-bold text-lg", suggestion.score > 0 ? "text-jade" : suggestion.score < 0 ? "text-destructive" : "text-muted-foreground")}>{suggestion.score}</span>
            <Button size="icon" variant="ghost" className={cn("h-8 w-8", userVote?.value === -1 && "text-destructive bg-destructive/10")} onClick={() => onVote(suggestion, -1)}>
              <ThumbsDown className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{suggestion.title}</h3>
              <Badge className={colors[suggestion.category]}>{suggestion.category}</Badge>
            </div>
            {suggestion.description && <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {suggestion.cost_estimate && <span>~{suggestion.cost_estimate}</span>}
              {suggestion.link && <a href={suggestion.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><ExternalLink className="w-3 h-3" />Link</a>}
              <span>von {suggestion.creator?.name || 'Unbekannt'}</span>
              <span>{new Date(suggestion.created_at).toLocaleDateString('de-DE')}</span>
              <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive hover:text-destructive ml-auto" onClick={() => onDelete(suggestion.id)}><Trash2 className="w-3 h-3" /></Button>
  );
}
