COPY permission.grp_penalty_threshold (id, grp, org_unit, penalty, threshold) FROM stdin;
5	16	1	3	5.00
6	19	1	3	2.00
7	19	1	1	0.01
\.

\echo sequence update column: id
SELECT SETVAL('permission.grp_penalty_threshold_id_seq', (SELECT MAX(id) FROM permission.grp_penalty_threshold));
