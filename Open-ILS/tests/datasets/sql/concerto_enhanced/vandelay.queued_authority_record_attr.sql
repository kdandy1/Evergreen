COPY vandelay.queued_authority_record_attr (id, record, field, attr_value) FROM stdin;
195	210	1	95011
196	209	1	88839
197	208	1	87660
198	207	1	82344
199	206	1	758263
200	205	1	74
201	204	1	723410
202	203	1	707774
203	202	1	7
204	201	1	617363
205	200	1	6
206	199	1	598301
207	198	1	598095
208	197	1	596319
209	196	1	594355
210	195	1	58
211	194	1	570657
212	193	1	4923
213	192	1	485196
214	191	1	438295
215	190	1	403035
216	189	1	391093
217	188	1	39
218	187	1	385938
219	186	1	38
220	185	1	37
221	184	1	369165
222	183	1	369126
223	182	1	368594
224	181	1	353535
225	180	1	35
226	179	1	34
227	178	1	312646
228	177	1	3113
229	176	1	311
230	175	1	30130
231	174	1	300927
232	173	1	298465
233	172	1	297944
234	171	1	297605
235	170	1	297598
236	169	1	294333
237	168	1	28681
238	167	1	28679
239	166	1	28597
240	165	1	28575
241	164	1	28549
242	163	1	28275
243	162	1	28001
244	161	1	27970
245	160	1	27898
246	159	1	27791
247	158	1	276431
248	157	1	275777
249	156	1	275378
250	155	1	27041
251	154	1	266702
252	153	1	262266
253	152	1	257189
254	151	1	257143
255	150	1	249460
256	149	1	249388
257	148	1	242
258	147	1	22311
259	146	1	206700
260	145	1	205794
261	144	1	204331
262	143	1	202
263	142	1	201003
264	141	1	201
265	140	1	2
266	139	1	192
267	138	1	19120
268	137	1	1724
269	136	1	172
270	135	1	16922
271	134	1	16627
272	133	1	16319
273	132	1	15858
274	131	1	15392
275	130	1	15383
276	129	1	15188
277	128	1	15103
278	127	1	14534
279	126	1	144865
280	125	1	14030
281	124	1	14
282	123	1	139664
283	122	1	137290
284	121	1	1303
285	120	1	122269
286	119	1	120
287	118	1	119
288	117	1	1147
289	116	1	10681
290	115	1	103913
291	114	1	102
\.

\echo sequence update column: id
SELECT SETVAL('vandelay.queued_authority_record_attr_id_seq', (SELECT MAX(id) FROM vandelay.queued_authority_record_attr));
