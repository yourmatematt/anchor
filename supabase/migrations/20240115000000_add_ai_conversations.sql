-- AI Conversations Migration
-- Adds tables for AI intervention conversations and analytics

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('immediate', 'follow_up', 'pattern', 'streak_risk', 'encouragement')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user stats table for tracking progress
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Will link to users table when auth is added
    clean_streak_days INTEGER DEFAULT 0,
    total_interventions INTEGER DEFAULT 0,
    successful_interventions INTEGER DEFAULT 0,
    total_spend_unwhitelisted DECIMAL(10, 2) DEFAULT 0,
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create voice memo analysis table
CREATE TABLE IF NOT EXISTS voice_memo_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    concern_level TEXT CHECK (concern_level IN ('low', 'medium', 'high')),
    flags JSONB DEFAULT '[]'::jsonb,
    support_needed BOOLEAN DEFAULT FALSE,
    ai_suggestion TEXT,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spending patterns table
CREATE TABLE IF NOT EXISTS spending_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_type TEXT NOT NULL,
    description TEXT,
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_occurrence_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_transaction_id ON conversations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_conversations_trigger_type ON conversations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_voice_memo_analysis_transaction_id ON voice_memo_analysis(transaction_id);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_pattern_type ON spending_patterns(pattern_type);

-- Add updated_at trigger to user_stats
CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_memo_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_patterns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to conversations"
    ON conversations FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all access to conversation_messages"
    ON conversation_messages FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all access to user_stats"
    ON user_stats FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all access to voice_memo_analysis"
    ON voice_memo_analysis FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all access to spending_patterns"
    ON spending_patterns FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comments
COMMENT ON TABLE conversations IS 'Stores AI intervention conversation sessions';
COMMENT ON TABLE conversation_messages IS 'Individual messages in AI conversations';
COMMENT ON TABLE user_stats IS 'User progress tracking and statistics';
COMMENT ON TABLE voice_memo_analysis IS 'AI analysis of voice memo transcripts';
COMMENT ON TABLE spending_patterns IS 'Detected spending patterns for pattern-based interventions';
