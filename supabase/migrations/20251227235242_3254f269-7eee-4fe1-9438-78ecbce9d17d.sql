-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create vote_value enum
CREATE TYPE public.vote_value AS ENUM ('up', 'down');

-- Create suggestion_category enum
CREATE TYPE public.suggestion_category AS ENUM ('activity', 'food', 'hotel', 'transport', 'other');

-- Create route_status enum
CREATE TYPE public.route_status AS ENUM ('planned', 'in_progress', 'completed', 'skipped');

-- Create todo_status enum
CREATE TYPE public.todo_status AS ENUM ('open', 'done');

-- Create action_type enum for audit log
CREATE TYPE public.action_type AS ENUM ('create', 'update', 'delete', 'reorder');

-- Create entity_type enum for audit log
CREATE TYPE public.entity_type AS ENUM ('route_item', 'suggestion', 'vote', 'todo', 'place', 'user');

-- Users table (simplified profiles without auth dependency for this demo)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Places table
CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id)
);

-- Route Items table (ordered list of places)
CREATE TABLE public.route_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  status public.route_status NOT NULL DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_index)
);

-- Suggestions table
CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category public.suggestion_category NOT NULL DEFAULT 'other',
  link TEXT,
  cost_estimate TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id)
);

-- Votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(suggestion_id, user_id)
);

-- Todos table
CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  assignee_id UUID REFERENCES public.users(id),
  status public.todo_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id)
);

-- Audit Log table (append-only)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type public.action_type NOT NULL,
  entity_type public.entity_type NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  before_json JSONB,
  after_json JSONB
);

-- Enable RLS on all tables (but allow public access for this demo app)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create public access policies (for demo/collaboration without auth)
CREATE POLICY "Public read access for users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public write access for users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for users" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Public read access for places" ON public.places FOR SELECT USING (true);
CREATE POLICY "Public write access for places" ON public.places FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for places" ON public.places FOR UPDATE USING (true);

CREATE POLICY "Public read access for route_items" ON public.route_items FOR SELECT USING (true);
CREATE POLICY "Public write access for route_items" ON public.route_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for route_items" ON public.route_items FOR UPDATE USING (true);
CREATE POLICY "Public delete access for route_items" ON public.route_items FOR DELETE USING (true);

CREATE POLICY "Public read access for suggestions" ON public.suggestions FOR SELECT USING (true);
CREATE POLICY "Public write access for suggestions" ON public.suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for suggestions" ON public.suggestions FOR UPDATE USING (true);
CREATE POLICY "Public delete access for suggestions" ON public.suggestions FOR DELETE USING (true);

CREATE POLICY "Public read access for votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Public write access for votes" ON public.votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for votes" ON public.votes FOR UPDATE USING (true);
CREATE POLICY "Public delete access for votes" ON public.votes FOR DELETE USING (true);

CREATE POLICY "Public read access for todos" ON public.todos FOR SELECT USING (true);
CREATE POLICY "Public write access for todos" ON public.todos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for todos" ON public.todos FOR UPDATE USING (true);
CREATE POLICY "Public delete access for todos" ON public.todos FOR DELETE USING (true);

CREATE POLICY "Public read access for audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Public write access for audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_route_items_updated_at
  BEFORE UPDATE ON public.route_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data: Users
INSERT INTO public.users (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Henry'),
  ('22222222-2222-2222-2222-222222222222', 'Sander'),
  ('33333333-3333-3333-3333-333333333333', 'Konrad'),


-- Seed data: Places (Vietnam from North to South)
INSERT INTO public.places (id, name, region, latitude, longitude) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hanoi', 'North', 21.0285, 105.8542),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Hue', 'Central', 16.4637, 107.5909),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Da Nang', 'Central', 16.0544, 108.2022),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Hoi An', 'Central', 15.8801, 108.3380),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Nha Trang', 'South-Central', 12.2388, 109.1967),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Da Lat', 'Central Highlands', 11.9404, 108.4583),
  ('00000000-0000-0000-0000-000000000001', 'Ho Chi Minh City', 'South', 10.8231, 106.6297);

-- Seed data: Route Items (ordered North to South)
INSERT INTO public.route_items (place_id, order_index, status) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 'planned'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, 'planned'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 3, 'planned'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 4, 'planned'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5, 'planned'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 6, 'planned'),
  ('00000000-0000-0000-0000-000000000001', 7, 'planned');

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.route_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;