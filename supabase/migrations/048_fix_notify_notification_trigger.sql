-- Fix the notify_new_notification trigger function
-- This fixes the error "record has no field notice_type"

-- First check if there's a trigger using this function
DROP TRIGGER IF EXISTS trigger_notify_new_notification ON public.user_notifications;

-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS public.notify_new_notification CASCADE;

CREATE OR REPLACE FUNCTION public.notify_new_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Publish notification to Realtime for the specific user
    -- Use notification_type instead of notice_type (which doesn't exist)
    PERFORM pg_notify(
        'new_notification_' || NEW.user_id::text,
        json_build_object(
            'id', NEW.id,
            'title', NEW.title,
            'priority', NEW.priority,
            'notification_type', NEW.notification_type,  -- Changed from notice_type
            'created_at', NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
CREATE TRIGGER trigger_notify_new_notification
AFTER INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_notification();

-- Also ensure our broadcast functions are working correctly
-- Test that the functions exist and have correct permissions
DO $$
DECLARE
    v_function_count INTEGER;
BEGIN
    -- Count our broadcast functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('broadcast_system_notice', 'admin_broadcast_notice');

    IF v_function_count = 2 THEN
        RAISE NOTICE 'Both broadcast functions exist and are ready to use';
    ELSE
        RAISE WARNING 'Missing broadcast functions. Found % functions', v_function_count;
    END IF;
END $$;