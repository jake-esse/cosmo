-- Remove chat_message from action_type enum
-- This reflects the decision that chat messages will NOT earn equity points

-- First, check if the enum value is actually used anywhere (it shouldn't be)
DO $$
BEGIN
  -- Check if chat_message is used in user_interactions
  IF EXISTS (
    SELECT 1 FROM user_interactions 
    WHERE action_type = 'chat_message'
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Cannot remove chat_message: still in use in user_interactions table';
  END IF;
END $$;

-- Remove the enum value by recreating the type
-- PostgreSQL doesn't allow direct removal of enum values, so we need to:
-- 1. Create a new type without chat_message
-- 2. Update all columns to use the new type
-- 3. Drop the old type
-- 4. Rename the new type to the original name

-- Create new enum type without chat_message
CREATE TYPE action_type_new AS ENUM (
  'signup',
  'referral_completed',
  'daily_active',
  'subscription_start',
  'subscription_renewal',
  'subscription_cancel',
  'app_install',
  'app_usage',
  'achievement_unlock',
  'milestone_reached'
);

-- Update the column to use the new type
ALTER TABLE user_interactions 
  ALTER COLUMN action_type TYPE action_type_new 
  USING action_type::text::action_type_new;

-- Update function parameters that use action_type
-- First drop and recreate the award_equity_points function (with all 6 parameters)
DROP FUNCTION IF EXISTS award_equity_points(uuid, action_type, numeric, text, text, uuid);

-- Drop the old type
DROP TYPE action_type;

-- Rename the new type to the original name
ALTER TYPE action_type_new RENAME TO action_type;

-- Recreate the award_equity_points function with the updated type and all original parameters
CREATE OR REPLACE FUNCTION award_equity_points(
  p_user_id uuid,
  p_action_type action_type,
  p_amount decimal(10,2),
  p_request_id text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_app_id uuid DEFAULT NULL
)
RETURNS TABLE (
  transaction_id uuid,
  points_awarded decimal(10,2),
  new_balance decimal(10,2)
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_interaction_id uuid;
  v_transaction_id uuid;
  v_current_balance decimal(10,2);
  v_new_balance decimal(10,2);
BEGIN
  -- Check for existing request_id to ensure idempotency
  IF p_request_id IS NOT NULL THEN
    SELECT ui.id, et.id, et.balance_after
    INTO v_interaction_id, v_transaction_id, v_new_balance
    FROM user_interactions ui
    JOIN equity_transactions et ON et.interaction_id = ui.id
    WHERE ui.request_id = p_request_id
    LIMIT 1;
    
    IF FOUND THEN
      RETURN QUERY SELECT v_transaction_id, p_amount, v_new_balance;
      RETURN;
    END IF;
  END IF;
  
  -- Log the interaction
  INSERT INTO user_interactions (
    user_id,
    action_type,
    action_metadata,
    request_id
  ) VALUES (
    p_user_id,
    p_action_type,
    jsonb_build_object(
      'points', p_amount,
      'description', p_description,
      'app_id', p_app_id
    ),
    p_request_id
  ) RETURNING id INTO v_interaction_id;
  
  -- Get current balance
  SELECT COALESCE(
    (SELECT balance_after 
     FROM equity_transactions 
     WHERE user_id = p_user_id 
     ORDER BY created_at DESC 
     LIMIT 1),
    0
  ) INTO v_current_balance;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;
  
  -- Create transaction
  INSERT INTO equity_transactions (
    user_id,
    interaction_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description
  ) VALUES (
    p_user_id,
    v_interaction_id,
    'credit'::transaction_type,
    p_amount,
    v_current_balance,
    v_new_balance,
    p_description
  ) RETURNING id INTO v_transaction_id;
  
  -- Log the operation
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    changes
  ) VALUES (
    p_user_id,
    'award_points',
    'equity_transactions',
    v_transaction_id,
    jsonb_build_object(
      'action_type', p_action_type,
      'points', p_amount,
      'new_balance', v_new_balance,
      'app_id', p_app_id
    )
  );
  
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY equity_balances;
  
  RETURN QUERY SELECT v_transaction_id, p_amount, v_new_balance;
END;
$$;

-- Add a comment documenting the decision
COMMENT ON TYPE action_type IS 'User action types that can trigger equity rewards. Note: chat_message was removed as per product decision - chat messages do not earn equity points.';

-- Verify the migration worked
DO $$
BEGIN
  -- Check that chat_message is no longer in the enum
  IF EXISTS (
    SELECT 1 
    FROM pg_enum e 
    JOIN pg_type t ON e.enumtypid = t.oid 
    WHERE t.typname = 'action_type' 
    AND e.enumlabel = 'chat_message'
  ) THEN
    RAISE EXCEPTION 'Migration failed: chat_message still exists in action_type enum';
  END IF;
  
  RAISE NOTICE 'Migration successful: chat_message removed from action_type enum';
END $$;