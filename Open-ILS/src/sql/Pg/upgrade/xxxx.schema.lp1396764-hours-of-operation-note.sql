BEGIN;

SELECT evergreen.upgrade_deps_block_check('XXXX', :eg_version);

ALTER TABLE actor.hours_of_operation
    ADD COLUMN dow_0_note TEXT,
    ADD COLUMN dow_1_note TEXT,
    ADD COLUMN dow_2_note TEXT,
    ADD COLUMN dow_3_note TEXT,
    ADD COLUMN dow_4_note TEXT,
    ADD COLUMN dow_5_note TEXT,
    ADD COLUMN dow_6_note TEXT;
COMMIT;