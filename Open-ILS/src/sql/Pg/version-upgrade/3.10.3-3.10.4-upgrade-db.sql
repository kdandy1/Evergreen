--Upgrade Script for 3.10.3 to 3.10.4
\set eg_version '''3.10.4'''
BEGIN;
INSERT INTO config.upgrade_log (version, applied_to) VALUES ('3.10.4', :eg_version);

SELECT evergreen.upgrade_deps_block_check('1382', :eg_version); -- JBoyer / smorrison

-- Remove previous acpl 1 protection
DROP RULE protect_acl_id_1 ON asset.copy_location;

-- Ensure that the owning_lib is set to CONS (equivalent), *should* be a noop.
UPDATE asset.copy_location SET owning_lib = (SELECT id FROM actor.org_unit_ancestor_at_depth(owning_lib,0)) WHERE id = 1;

CREATE OR REPLACE FUNCTION asset.check_delete_copy_location(acpl_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM TRUE FROM asset.copy WHERE location = acpl_id AND NOT deleted LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION
            'Copy location % contains active copies and cannot be deleted', acpl_id;
    END IF;
    
    IF acpl_id = 1 THEN
        RAISE EXCEPTION
            'Copy location 1 cannot be deleted';
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION asset.copy_location_validate_edit()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.id = 1 THEN
        IF OLD.owning_lib != NEW.owning_lib OR NEW.deleted THEN
            RAISE EXCEPTION 'Copy location 1 cannot be moved or deleted';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER acpl_validate_edit BEFORE UPDATE ON asset.copy_location FOR EACH ROW EXECUTE PROCEDURE asset.copy_location_validate_edit();



SELECT evergreen.upgrade_deps_block_check('1388', :eg_version);

UPDATE action_trigger.event_definition
SET delay = '-24:01:00'::INTERVAL
WHERE reactor = 'Circ::AutoRenew'
AND delay = '-23 hours'::INTERVAL
AND max_delay = '-1 minute'::INTERVAL;



SELECT evergreen.upgrade_deps_block_check('1391', :eg_version);

DROP FUNCTION IF EXISTS evergreen.find_next_open_time(INT, TIMESTAMPTZ, BOOL, TIME, INT); --Get rid of the last version of this function with different arguments so it doesn't cause conflicts when calling it
CREATE OR REPLACE FUNCTION evergreen.find_next_open_time ( circ_lib INT, initial TIMESTAMPTZ, hourly BOOL DEFAULT FALSE, initial_time TIME DEFAULT NULL, has_hoo BOOL DEFAULT TRUE )
    RETURNS TIMESTAMPTZ AS $$
DECLARE
    day_number      INT;
    plus_days       INT;
    final_time      TEXT;
    time_adjusted   BOOL;
    hoo_open        TIME WITHOUT TIME ZONE;
    hoo_close       TIME WITHOUT TIME ZONE;
    adjacent        actor.org_unit_closed%ROWTYPE;
    breakout        INT := 0;
BEGIN

    IF initial_time IS NULL THEN
        initial_time := initial::TIME;
    END IF;

    final_time := (initial + '1 second'::INTERVAL)::TEXT;
    LOOP
        breakout := breakout + 1;

        time_adjusted := FALSE;

        IF has_hoo THEN -- Don't check hours if they have no hoo. I think the behavior in that case is that we act like they're always open? Better than making things due in 2 years.
                        -- Don't expect anyone to call this with it set to false; it's just for our own recursive use.
            day_number := EXTRACT(ISODOW FROM final_time::TIMESTAMPTZ) - 1; --Get which day of the week  it is from which it started on.
            plus_days := 0;
            has_hoo := FALSE; -- set has_hoo to false to check if any days are open (for the first recursion where it's always true)
            FOR i IN 1..7 LOOP
                EXECUTE 'SELECT dow_' || day_number || '_open, dow_' || day_number || '_close FROM actor.hours_of_operation WHERE id = $1'
                    INTO hoo_open, hoo_close
                    USING circ_lib;

                -- RAISE NOTICE 'initial time: %; dow: %; close: %',initial_time,day_number,hoo_close;

                IF hoo_close = '00:00:00' THEN -- bah ... I guess we'll check the next day
                    day_number := (day_number + 1) % 7;
                    plus_days := plus_days + 1;
                    time_adjusted := TRUE;
                    CONTINUE;
                ELSE
                    has_hoo := TRUE; --We do have hours open sometimes, yay!
                END IF;

                IF hoo_close IS NULL THEN -- no hours of operation ... assume no closing?
                    hoo_close := '23:59:59';
                END IF;

                EXIT;
            END LOOP;

            IF NOT has_hoo THEN -- If always closed then forget the extra days - just determine based on closures.
                plus_days := 0;
            END IF;

            final_time := DATE(final_time::TIMESTAMPTZ + (plus_days || ' days')::INTERVAL)::TEXT;
            IF hoo_close <> '00:00:00' AND hourly THEN -- Not a day-granular circ
                final_time := final_time||' '|| hoo_close;
            ELSE
                final_time := final_time||' 23:59:59';
            END IF;
        END IF;

        --RAISE NOTICE 'final_time: %',final_time;

        -- Loop through other closings
        LOOP 
            SELECT * INTO adjacent FROM actor.org_unit_closed WHERE org_unit = circ_lib AND final_time::TIMESTAMPTZ between close_start AND close_end;
            EXIT WHEN adjacent.id IS NULL;
            time_adjusted := TRUE;
            -- RAISE NOTICE 'recursing for closings with final_time: %',final_time;
            final_time := evergreen.find_next_open_time(circ_lib, adjacent.close_end::TIMESTAMPTZ, hourly, initial_time, has_hoo)::TEXT;
        END LOOP;

        EXIT WHEN breakout > 100;
        EXIT WHEN NOT time_adjusted;

    END LOOP;

    RETURN final_time;
END;
$$ LANGUAGE PLPGSQL;

COMMIT;

-- Update auditor tables to catch changes to source tables.
--   Can be removed/skipped if there were no schema changes.
SELECT auditor.update_auditors();
