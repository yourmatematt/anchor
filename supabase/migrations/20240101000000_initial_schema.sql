-- Initial Schema Migration
-- Creates tables for Anchor financial accountability system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create whitelist table
CREATE TABLE IF NOT EXISTS whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payee_name TEXT UNIQUE NOT NULL,
    category TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id TEXT UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payee_name TEXT NOT NULL,
    description TEXT,
    is_whitelisted BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    voice_memo_url TEXT,
    voice_memo_transcript TEXT,
    intervention_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_is_whitelisted ON transactions(is_whitelisted);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_whitelist_payee_name ON whitelist(payee_name);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to whitelist
CREATE TRIGGER update_whitelist_updated_at
    BEFORE UPDATE ON whitelist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default whitelist items
INSERT INTO whitelist (payee_name, category, notes) VALUES
    ('Optus', 'utilities', 'Phone/Internet bill'),
    ('Starlink', 'utilities', 'Internet service'),
    ('Red Energy', 'utilities', 'Electricity bill'),
    ('Mallacoota Real Estate', 'rent', 'Monthly rent'),
    ('Petbarn', 'pet', 'Pet supplies'),
    ('Mallacoota Foodworks', 'groceries', 'Grocery shopping')
ON CONFLICT (payee_name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now, tighten in production)
CREATE POLICY "Allow all access to whitelist"
    ON whitelist FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all access to transactions"
    ON transactions FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE whitelist IS 'Stores whitelisted payees that do not trigger interventions';
COMMENT ON TABLE transactions IS 'Stores all bank transactions and intervention data';
COMMENT ON COLUMN transactions.voice_memo_url IS 'URL to stored voice memo in Supabase Storage';
COMMENT ON COLUMN transactions.voice_memo_transcript IS 'Transcribed text from voice memo';
COMMENT ON COLUMN transactions.intervention_completed IS 'Whether user completed the intervention flow';
