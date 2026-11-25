insert into public.towns (id, slug, name, name_translations, grievance_contact,
  grievance_contact_translations, booking_mode)
values
  ('00000000-0000-0000-0000-000000000001', 'demo-town', 'Demo Town',
    '{"mr":"डेमो शहर","hi":"डेमो शहर"}', 'Demo grievance desk (simulated)',
    '{"mr":"डेमो तक्रार कक्ष (प्रात्यक्षिक)","hi":"डेमो शिकायत केंद्र (प्रदर्शन)"}', 'simulated'),
  ('00000000-0000-0000-0000-000000000002', 'malvan', 'Malvan',
    '{"mr":"मालवण","hi":"मालवण"}', 'Licence pending. Grievance contact to be confirmed.',
    '{"mr":"परवाना प्रलंबित आहे. तक्रारींसाठी संपर्क अद्याप निश्चित झालेला नाही.",
      "hi":"लाइसेंस लंबित है। शिकायतों के लिए संपर्क अभी तय नहीं है।"}', 'simulated');

insert into public.simulation_profiles (town_id, kind, scenarios)
values ('00000000-0000-0000-0000-000000000001', 'synthetic', '{
  "successful_trip": {
    "drivers": [{
      "key": "asha",
      "name": {"en":"Asha (demo)","mr":"आशा (डेमो)","hi":"आशा (डेमो)"},
      "steps": [
        {"action":"accept","delay_seconds":2},
        {"action":"arrive","delay_seconds":3},
        {"action":"start","delay_seconds":3},
        {"action":"complete","delay_seconds":5}
      ]
    }]
  },
  "queue_exhaustion": {
    "drivers": [{
      "key": "asha",
      "name": {"en":"Asha (demo)","mr":"आशा (डेमो)","hi":"आशा (डेमो)"},
      "steps": [{"action":"decline","delay_seconds":2}]
    }]
  }
}');

insert into public.stands (id, town_id, name, name_translations, coordinator_contact,
  coordinator_contact_translations)
values ('00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001', 'River Square Stand',
  '{"mr":"नदी चौक रिक्षा स्टँड","hi":"नदी चौक ऑटो स्टैंड"}', 'River Square Stand desk (simulated)',
  '{"mr":"नदी चौक स्टँड संपर्क कक्ष (प्रात्यक्षिक)","hi":"नदी चौक स्टैंड संपर्क केंद्र (प्रदर्शन)"}');

insert into public.landmarks (id, town_id, slug, name, name_translations, is_illustrative)
values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001',
    'river-square', 'River Square', '{"mr":"नदी चौक","hi":"नदी चौक"}', false),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001',
    'lantern-garden', 'Lantern Garden', '{"mr":"कंदील बाग","hi":"लालटेन बाग"}', false),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000002',
    'market-entrance', 'Market entrance (illustrative)',
    '{"mr":"बाजाराचे प्रवेशद्वार (उदाहरण)","hi":"बाज़ार का प्रवेश द्वार (उदाहरण)"}', true),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000002',
    'jetty-approach', 'Jetty approach (illustrative)',
    '{"mr":"जेटीकडे जाणारा रस्ता (उदाहरण)","hi":"जेटी की ओर जाने वाला रास्ता (उदाहरण)"}', true);

insert into public.stand_pickup_cues (town_id, run_scope_id, stand_id, landmark_id, pickup_cue,
  pickup_cue_translations)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000021',
    'Meet beside the blue clock.',
    '{"mr":"निळ्या घड्याळाजवळ भेटा.","hi":"नीली घड़ी के पास मिलें।"}'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000022',
    'Wait at the yellow gate.',
    '{"mr":"पिवळ्या फाटकाजवळ थांबा.","hi":"पीले फाटक के पास रुकें।"}');

insert into public.routes (id, town_id, pickup_landmark_id, destination_landmark_id)
values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000022'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000021');

insert into public.fare_charts (town_id, chart_version, is_illustrative,
  night_start_minute, night_end_minute)
values ('00000000-0000-0000-0000-000000000001', 1, true, 1320, 360);

insert into public.fare_routes (town_id, chart_version, route_id, day_fare_in_paise, night_fare_in_paise)
values
  ('00000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-000000000031', 6000, 7500),
  ('00000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-000000000032', 6000, 7500);
