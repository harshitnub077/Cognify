-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'parent')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'family', 'school')),
  
  -- Core profile (JSON matching UserProfile interface)
  interests JSONB NOT NULL DEFAULT '[]',
  tolerance JSONB NOT NULL DEFAULT '{"entertainment": 10, "related": 30}',
  goal JSONB DEFAULT NULL,
  channel_trust JSONB NOT NULL DEFAULT '{}',
  confirmed_topics TEXT[] DEFAULT '{}',
  blocked_topics TEXT[] DEFAULT '{}',
  interest_keywords JSONB DEFAULT '{}',
  trust_score INT DEFAULT 50,
  study_hours JSONB DEFAULT '{"weekday": [], "weekend": []}',
  
  -- Extension state
  study_mode_active BOOLEAN DEFAULT false,
  parent_pin TEXT,
  
  -- Timestamps
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family links (parent -> child relationship)
CREATE TABLE family_links (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

-- Content diet log (what the user watched/was blocked)
CREATE TABLE diet_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT,
  channel TEXT,
  verdict TEXT CHECK (verdict IN ('ALLOW', 'BLOCK')),
  topic_match TEXT,
  layer INT,
  confidence FLOAT,
  ni_signal_sent BOOLEAN DEFAULT false,
  watched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users insert own events" ON diet_events
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users read own events" ON diet_events
  FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Parents read child events" ON diet_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_links fl
      JOIN profiles p ON p.id = fl.parent_id
      WHERE p.user_id = auth.uid()
      AND fl.child_id = diet_events.user_id
    )
  );

-- Index for fast diet queries
CREATE INDEX diet_events_user_time ON diet_events(user_id, watched_at DESC);
CREATE INDEX diet_events_channel ON diet_events(channel);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$ BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_last_updated();
