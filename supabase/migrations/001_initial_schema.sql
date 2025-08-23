-- Cosmo Platform Initial Database Schema
-- Blockchain-ready event sourcing with immutable equity ledger
-- Version: 1.0.0
-- Date: 2025-08-22

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE action_type AS ENUM (
  'signup',
  'referral_completed',
  'daily_active',
  'chat_message',
  'subscription_start',
  'subscription_renewal',
  'subscription_cancel',
  'app_install',
  'app_usage',
  'achievement_unlock',
  'milestone_reached'
);

CREATE TYPE transaction_type AS ENUM (
  'credit',
  'debit'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'cancelled',
  'expired',
  'past_due'
);

CREATE TYPE referral_status AS ENUM (
  'pending',
  'completed',
  'expired',
  'cancelled'
);

-- 1. PROFILES TABLE (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  referral_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  referred_by UUID REFERENCES profiles(id),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USER_INTERACTIONS TABLE (event log, append-only)
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type action_type NOT NULL,
  action_metadata JSONB DEFAULT '{}',
  request_id TEXT UNIQUE, -- For idempotency
  ip_address INET,
  user_agent TEXT,
  app_id UUID, -- For future multi-app support
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EQUITY_TRANSACTIONS TABLE (immutable ledger)
CREATE TABLE equity_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interaction_id UUID REFERENCES user_interactions(id),
  amount DECIMAL(18, 8) NOT NULL CHECK (amount >= 0),
  transaction_type transaction_type NOT NULL,
  balance_before DECIMAL(18, 8) NOT NULL DEFAULT 0,
  balance_after DECIMAL(18, 8) NOT NULL DEFAULT 0,
  description TEXT,
  
  -- Blockchain fields (nullable for now)
  block_height BIGINT,
  transaction_hash TEXT,
  signature TEXT,
  merkle_proof JSONB,
  
  -- Multi-app support
  app_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure balance consistency
  CONSTRAINT balance_consistency CHECK (
    (transaction_type = 'credit' AND balance_after = balance_before + amount) OR
    (transaction_type = 'debit' AND balance_after = balance_before - amount)
  )
);

-- 4. CONVERSATIONS TABLE
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  model TEXT DEFAULT 'claude-3-sonnet',
  total_tokens_used INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MESSAGES TABLE
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  model TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REFERRALS TABLE
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status referral_status DEFAULT 'pending',
  referrer_reward_transaction_id UUID REFERENCES equity_transactions(id),
  referred_reward_transaction_id UUID REFERENCES equity_transactions(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure no self-referrals
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id),
  -- Ensure unique referral relationship
  CONSTRAINT unique_referral UNIQUE (referred_id)
);

-- 7. SUBSCRIPTION_TIERS TABLE
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2),
  features JSONB NOT NULL DEFAULT '[]',
  equity_multiplier DECIMAL(3, 2) DEFAULT 1.0,
  max_conversations INTEGER,
  max_messages_per_day INTEGER,
  priority_support BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. USER_SUBSCRIPTIONS TABLE
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
  status subscription_status NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT_LOGS TABLE
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  row_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. APPS TABLE (for future multi-app support)
CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT,
  developer_id UUID REFERENCES profiles(id),
  equity_pool_size DECIMAL(18, 8) DEFAULT 1000000,
  equity_distributed DECIMAL(18, 8) DEFAULT 0,
  install_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. USER_APPS TABLE (track app installations)
CREATE TABLE user_apps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  uninstalled_at TIMESTAMPTZ,
  
  CONSTRAINT unique_user_app UNIQUE (user_id, app_id)
);

-- CREATE INDEXES
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_request_id ON user_interactions(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_user_interactions_created_at ON user_interactions(created_at DESC);

CREATE INDEX idx_equity_transactions_user_id ON equity_transactions(user_id);
CREATE INDEX idx_equity_transactions_created_at ON equity_transactions(created_at DESC);
CREATE INDEX idx_equity_transactions_app_id ON equity_transactions(app_id) WHERE app_id IS NOT NULL;

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_status ON referrals(status);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);

CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- TRIGGER TO PREVENT UPDATES ON EQUITY_TRANSACTIONS
CREATE OR REPLACE FUNCTION prevent_equity_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Updates to equity_transactions are not allowed. This table is immutable.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_equity_immutability
BEFORE UPDATE ON equity_transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_equity_update();

-- TRIGGER TO PREVENT DELETES ON EQUITY_TRANSACTIONS
CREATE OR REPLACE FUNCTION prevent_equity_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Deletes from equity_transactions are not allowed. This table is append-only.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_equity_no_delete
BEFORE DELETE ON equity_transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_equity_delete();

-- TRIGGER FOR UPDATED_AT TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_tiers_updated_at BEFORE UPDATE ON subscription_tiers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON apps
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- HELPER FUNCTION: Award equity points
CREATE OR REPLACE FUNCTION award_equity_points(
  p_user_id UUID,
  p_action_type action_type,
  p_amount DECIMAL(18, 8),
  p_request_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_app_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_interaction_id UUID;
  v_transaction_id UUID;
  v_current_balance DECIMAL(18, 8);
BEGIN
  -- Check for idempotency
  IF p_request_id IS NOT NULL THEN
    SELECT id INTO v_interaction_id
    FROM user_interactions
    WHERE request_id = p_request_id;
    
    IF v_interaction_id IS NOT NULL THEN
      -- Request already processed, return existing transaction
      SELECT id INTO v_transaction_id
      FROM equity_transactions
      WHERE interaction_id = v_interaction_id;
      RETURN v_transaction_id;
    END IF;
  END IF;
  
  -- Get current balance
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type = 'credit' THEN amount
      WHEN transaction_type = 'debit' THEN -amount
    END
  ), 0) INTO v_current_balance
  FROM equity_transactions
  WHERE user_id = p_user_id;
  
  -- Create interaction record
  INSERT INTO user_interactions (user_id, action_type, request_id, app_id)
  VALUES (p_user_id, p_action_type, p_request_id, p_app_id)
  RETURNING id INTO v_interaction_id;
  
  -- Create transaction
  INSERT INTO equity_transactions (
    user_id,
    interaction_id,
    amount,
    transaction_type,
    balance_before,
    balance_after,
    description,
    app_id
  ) VALUES (
    p_user_id,
    v_interaction_id,
    p_amount,
    'credit',
    v_current_balance,
    v_current_balance + p_amount,
    COALESCE(p_description, 'Points awarded for ' || p_action_type::text),
    p_app_id
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- HELPER FUNCTION: Get user balance
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID)
RETURNS TABLE (
  total_balance DECIMAL(18, 8),
  total_earned DECIMAL(18, 8),
  total_spent DECIMAL(18, 8),
  transaction_count BIGINT,
  last_transaction_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN transaction_type = 'credit' THEN amount
        WHEN transaction_type = 'debit' THEN -amount
      END
    ), 0) AS total_balance,
    COALESCE(SUM(
      CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END
    ), 0) AS total_earned,
    COALESCE(SUM(
      CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END
    ), 0) AS total_spent,
    COUNT(*) AS transaction_count,
    MAX(created_at) AS last_transaction_at
  FROM equity_transactions
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- HELPER FUNCTION: Verify transaction integrity
CREATE OR REPLACE FUNCTION verify_transaction_integrity(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_calculated_balance DECIMAL(18, 8) := 0;
  v_transaction RECORD;
  v_is_valid BOOLEAN := true;
BEGIN
  FOR v_transaction IN 
    SELECT * FROM equity_transactions 
    WHERE user_id = p_user_id 
    ORDER BY created_at ASC
  LOOP
    IF v_transaction.balance_before != v_calculated_balance THEN
      v_is_valid := false;
      RAISE NOTICE 'Integrity violation at transaction %: expected balance_before %, got %',
        v_transaction.id, v_calculated_balance, v_transaction.balance_before;
    END IF;
    
    IF v_transaction.transaction_type = 'credit' THEN
      v_calculated_balance := v_calculated_balance + v_transaction.amount;
    ELSE
      v_calculated_balance := v_calculated_balance - v_transaction.amount;
    END IF;
    
    IF v_transaction.balance_after != v_calculated_balance THEN
      v_is_valid := false;
      RAISE NOTICE 'Integrity violation at transaction %: expected balance_after %, got %',
        v_transaction.id, v_calculated_balance, v_transaction.balance_after;
    END IF;
  END LOOP;
  
  RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- MATERIALIZED VIEW: Equity balances
CREATE MATERIALIZED VIEW equity_balances AS
SELECT 
  user_id,
  SUM(CASE 
    WHEN transaction_type = 'credit' THEN amount
    WHEN transaction_type = 'debit' THEN -amount
  END) AS current_balance,
  SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) AS total_earned,
  SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) AS total_spent,
  COUNT(*) AS transaction_count,
  MAX(created_at) AS last_transaction_at,
  MIN(created_at) AS first_transaction_at
FROM equity_transactions
GROUP BY user_id;

CREATE UNIQUE INDEX idx_equity_balances_user_id ON equity_balances(user_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_equity_balances()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY equity_balances;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ROW LEVEL SECURITY POLICIES

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_apps ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- USER_INTERACTIONS POLICIES
CREATE POLICY "Users can view own interactions" ON user_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert interactions" ON user_interactions
  FOR INSERT WITH CHECK (true); -- Will be restricted via functions

-- EQUITY_TRANSACTIONS POLICIES (Read-only for users)
CREATE POLICY "Users can view own transactions" ON equity_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT, UPDATE, DELETE policies for users - admin only via service role

-- CONVERSATIONS POLICIES
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- MESSAGES POLICIES
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- REFERRALS POLICIES
CREATE POLICY "Users can view referrals they made" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view referrals to them" ON referrals
  FOR SELECT USING (auth.uid() = referred_id);

-- SUBSCRIPTION_TIERS POLICIES
CREATE POLICY "Anyone can view active subscription tiers" ON subscription_tiers
  FOR SELECT USING (active = true);

-- USER_SUBSCRIPTIONS POLICIES
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- APPS POLICIES
CREATE POLICY "Anyone can view active apps" ON apps
  FOR SELECT USING (active = true);

-- USER_APPS POLICIES
CREATE POLICY "Users can view own app installations" ON user_apps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can install apps" ON user_apps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own app installations" ON user_apps
  FOR UPDATE USING (auth.uid() = user_id);

-- AUDIT_LOGS POLICIES (Admin only - no user policies)

-- Insert default subscription tiers
INSERT INTO subscription_tiers (name, display_name, price_monthly, price_yearly, features, equity_multiplier, max_conversations, max_messages_per_day) VALUES
('free', 'Free', 0, 0, '["5 conversations per month", "Basic AI assistance", "Community support"]', 1.0, 5, 50),
('pro', 'Pro', 19.99, 199.99, '["Unlimited conversations", "Priority AI responses", "Advanced features", "Email support"]', 1.5, NULL, NULL),
('business', 'Business', 49.99, 499.99, '["Everything in Pro", "Team collaboration", "API access", "Priority support", "Custom integrations"]', 2.0, NULL, NULL);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id UUID;
BEGIN
  -- Create profile for new user
  INSERT INTO profiles (id, username, display_name, avatar_url, referred_by)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NULL -- Will be updated if referral code is valid
  );
  
  -- Check for referral code
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_referral_code IS NOT NULL THEN
    -- Find referrer
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE referral_code = v_referral_code
    AND id != NEW.id;
    
    IF v_referrer_id IS NOT NULL THEN
      -- Update referred_by
      UPDATE profiles SET referred_by = v_referrer_id WHERE id = NEW.id;
      
      -- Create referral record
      INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
      VALUES (v_referrer_id, NEW.id, v_referral_code, 'pending');
    END IF;
  END IF;
  
  -- Award signup bonus
  PERFORM award_equity_points(
    NEW.id,
    'signup'::action_type,
    100,
    'signup_' || NEW.id::text,
    'Welcome bonus for joining Cosmo'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Function to complete referral
CREATE OR REPLACE FUNCTION complete_referral(p_referred_id UUID)
RETURNS void AS $$
DECLARE
  v_referral RECORD;
  v_referrer_tx_id UUID;
  v_referred_tx_id UUID;
BEGIN
  -- Get referral record
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = p_referred_id
  AND status = 'pending';
  
  IF v_referral IS NULL THEN
    RETURN;
  END IF;
  
  -- Award points to referrer
  v_referrer_tx_id := award_equity_points(
    v_referral.referrer_id,
    'referral_completed'::action_type,
    50,
    'referral_referrer_' || v_referral.id::text,
    'Referral bonus for inviting a friend'
  );
  
  -- Award points to referred user
  v_referred_tx_id := award_equity_points(
    v_referral.referred_id,
    'referral_completed'::action_type,
    25,
    'referral_referred_' || v_referral.id::text,
    'Bonus for using referral code'
  );
  
  -- Update referral record
  UPDATE referrals
  SET 
    status = 'completed',
    referrer_reward_transaction_id = v_referrer_tx_id,
    referred_reward_transaction_id = v_referred_tx_id,
    completed_at = NOW()
  WHERE id = v_referral.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;