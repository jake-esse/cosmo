-- Fix audit_logs column reference in award_equity_points function
-- The function references 'action' column but audit_logs has 'operation' column
-- IMPORTANT: This maintains security - equity points are only awarded after education is completed

-- First drop the existing function
DROP FUNCTION IF EXISTS award_equity_points(uuid, action_type, numeric, text, text, uuid);

-- Recreate with the correct audit_logs column references
CREATE OR REPLACE FUNCTION award_equity_points(
  p_user_id uuid,
  p_action_type action_type,
  p_amount decimal,
  p_request_id text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_app_id uuid DEFAULT NULL
) RETURNS TABLE(transaction_id uuid, points decimal, new_balance decimal)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_interaction_id uuid;
  v_transaction_id uuid;
  v_current_balance decimal(10,2);
  v_new_balance decimal(10,2);
BEGIN
  -- Check for existing request_id to ensure idempotency (prevents duplicate rewards)
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

  -- Log the operation (fixed: using correct column names)
  INSERT INTO audit_logs (
    table_name,
    operation,
    user_id,
    row_id,
    new_data
  ) VALUES (
    'equity_transactions',
    'INSERT',
    p_user_id,
    v_transaction_id,
    jsonb_build_object(
      'action_type', p_action_type,
      'points', p_amount,
      'new_balance', v_new_balance,
      'app_id', p_app_id
    )
  );

  -- Check if equity_balances materialized view exists before trying to refresh it
  IF EXISTS (
    SELECT 1
    FROM pg_matviews
    WHERE schemaname = 'public'
    AND matviewname = 'equity_balances'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY equity_balances;
  END IF;

  RETURN QUERY SELECT v_transaction_id, p_amount, v_new_balance;
END;
$$;

-- IMPORTANT: The award_signup_bonus trigger remains in place
-- This trigger ONLY fires after a profile is created
-- The profile is ONLY marked with education_completed_at after education acknowledgment
-- This ensures the security requirement: equity points are awarded only after education completion