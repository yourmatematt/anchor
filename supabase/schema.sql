-- Anchor Financial Accountability System
-- Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Whitelist table
-- Stores approved payees that won't trigger alerts
CREATE TABLE whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_name TEXT NOT NULL UNIQUE,
  category TEXT, -- 'rent', 'utilities', 'groceries', 'pet', etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions log
-- Records all transactions from Up Bank for accountability
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL, -- Up Bank transaction ID
  amount DECIMAL NOT NULL, -- Transaction amount (negative for debits)
  payee_name TEXT,
  description TEXT,
  is_whitelisted BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP NOT NULL,
  voice_memo_url TEXT, -- URL to audio file if recorded
  voice_memo_transcript TEXT, -- Transcribed text from voice memo
  intervention_completed BOOLEAN DEFAULT FALSE, -- Whether user completed voice memo
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX idx_whitelist_payee_name ON whitelist(payee_name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for whitelist updated_at
CREATE TRIGGER update_whitelist_updated_at BEFORE UPDATE ON whitelist
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial whitelist data (Patient Zero's approved payees)
INSERT INTO whitelist (payee_name, category, notes) VALUES
  ('Optus', 'utilities', 'Mobile phone service'),
  ('Starlink', 'utilities', 'Internet service'),
  ('Red Energy', 'utilities', 'Electricity provider'),
  ('Mallacoota Real Estate', 'rent', 'Monthly rent payment'),
  ('Petbarn', 'pet', 'Pet supplies'),
  ('Mallacoota Foodworks', 'groceries', 'Local grocery store');

-- Enable Row Level Security (RLS) - for future multi-user support
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (single user MVP)
-- In production, you'll want to add proper user authentication
CREATE POLICY "Allow all operations on whitelist" ON whitelist
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on transactions" ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- View for recent non-whitelisted transactions (useful for queries)
CREATE OR REPLACE VIEW recent_alerts AS
SELECT
  t.id,
  t.transaction_id,
  t.amount,
  t.payee_name,
  t.description,
  t.timestamp,
  t.intervention_completed,
  t.voice_memo_transcript
FROM transactions t
WHERE t.is_whitelisted = FALSE
ORDER BY t.timestamp DESC
LIMIT 50;
