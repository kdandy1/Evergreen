--Upgrade Script for 3.13.2 to 3.13.3
\set eg_version '''3.13.3'''
BEGIN;
INSERT INTO config.upgrade_log (version, applied_to) VALUES ('3.13.3', :eg_version);
COMMIT;

-- Update auditor tables to catch changes to source tables.
--   Can be removed/skipped if there were no schema changes.
SELECT auditor.update_auditors();
