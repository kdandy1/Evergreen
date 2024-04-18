BEGIN;

-- SELECT evergreen.upgrade_deps_block_check('XXXX', :eg_version);
INSERT INTO permission.perm_list ( id, code, description ) SELECT DISTINCT
   652,
   'PATRON_BARRED.override',
   oils_i18n_gettext(652,
     'Override the PATRON_BARRED event', 'ppl', 'description'
   )
   FROM permission.perm_list
   WHERE NOT EXISTS (SELECT 1 FROM permission.perm_list WHERE code = 'PATRON_BARRED.override');


COMMIT;