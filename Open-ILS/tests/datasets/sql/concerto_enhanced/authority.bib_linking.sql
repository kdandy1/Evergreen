COPY authority.bib_linking (id, bib, authority) FROM stdin;
1	266	106
2	266	107
3	266	126
4	266	125
5	266	131
6	266	139
7	266	148
8	266	165
9	266	181
10	265	106
11	265	126
12	265	131
13	265	139
14	265	148
15	265	165
16	264	99
17	264	114
18	264	103
19	264	109
20	264	111
21	264	113
22	264	121
23	264	123
24	264	129
25	264	134
26	264	179
27	264	184
28	264	186
29	264	189
30	264	190
31	264	195
32	264	191
33	264	194
34	263	120
35	263	126
36	263	118
37	263	136
38	263	135
39	263	138
40	263	140
41	263	142
42	263	139
43	263	147
44	263	154
45	262	107
46	262	118
47	262	136
48	262	135
49	262	138
50	262	140
51	262	174
52	262	175
53	262	177
54	262	185
55	261	100
56	261	101
57	261	102
58	261	108
59	261	110
60	261	112
61	261	116
62	261	105
63	261	115
64	261	119
65	261	124
66	261	121
67	261	159
68	261	130
69	261	132
70	261	151
71	261	153
72	261	155
73	261	157
74	261	164
75	261	152
76	261	160
77	261	167
78	261	170
79	261	169
80	261	171
81	261	176
82	261	178
83	261	180
84	261	183
85	261	187
86	261	188
87	261	193
88	261	192
89	260	117
90	260	137
91	260	172
92	259	107
93	259	126
94	259	128
95	259	137
96	259	172
97	258	126
98	258	172
99	257	126
100	257	137
101	257	141
102	257	161
103	257	172
104	257	173
105	256	104
106	256	107
107	256	119
108	256	170
109	256	175
110	256	182
111	256	185
112	255	107
113	255	159
114	255	137
115	255	172
116	255	174
117	255	166
118	255	177
119	254	107
120	254	122
121	254	158
122	254	172
123	253	144
124	253	143
125	253	146
126	253	161
127	253	163
128	252	126
129	252	133
130	252	162
131	252	144
132	252	143
133	252	146
134	252	163
135	251	107
136	251	144
137	251	145
138	251	143
139	251	146
140	251	156
141	251	161
142	251	163
143	248	126
144	248	144
145	248	143
146	248	146
147	248	163
148	247	107
149	247	126
150	247	144
151	247	143
152	247	146
153	247	163
154	246	126
155	246	144
156	246	143
157	246	146
158	246	163
159	245	126
160	245	162
161	245	144
162	245	143
163	245	146
164	245	163
165	244	107
166	244	126
167	244	175
168	243	126
169	241	172
170	240	172
171	239	172
172	238	172
173	229	124
174	229	169
175	225	126
176	225	139
177	224	75
178	223	126
179	221	107
180	221	126
181	221	141
182	221	174
183	221	175
184	217	107
185	217	126
186	213	148
187	210	139
188	210	141
189	81	17
190	80	70
191	72	70
192	66	70
193	61	17
194	59	70
195	48	17
196	19	17
197	11	14
198	6	6
199	5	14
200	5	15
201	5	17
202	4	2
203	4	10
204	4	11
205	4	12
206	4	13
207	4	69
208	3	1
209	285	85
210	342	107
211	340	107
212	340	166
213	338	170
214	337	107
215	337	166
216	336	117
217	335	170
218	334	107
219	334	166
220	332	170
221	330	170
222	328	170
223	325	107
224	325	166
225	322	107
226	322	166
227	319	170
228	317	117
229	316	170
230	315	107
231	315	166
232	314	107
233	314	166
234	311	170
235	310	170
236	308	170
237	306	117
238	300	107
239	300	166
240	299	107
241	299	166
242	298	170
243	294	107
244	294	166
245	292	170
\.

\echo sequence update column: id
SELECT SETVAL('authority.bib_linking_id_seq', (SELECT MAX(id) FROM authority.bib_linking));
