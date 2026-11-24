# Thamba problem definition

**Stage** UNDERSTAND · **Contest deadline** 18 December 2026 · **Build** DEMO-ONLY

Malvan field interviews are pending. **ASSUMPTION** marks a hypothesis about users or their current practices. The IDs point to questions in [Validate in interviews](#validate-in-interviews). Desk-research findings come from the [research brief](research-brief.md). Numeric targets below are proposed thresholds to test.

## Problem statement

**ASSUMPTION (R1, R2)** A tourist in Malvan may struggle to confirm where to meet an auto, what the trip will cost and whether a driver is available. **ASSUMPTION (D1, C1, H2)** Drivers and stand coordinators may lack a shared record of whose turn it is, while homestay hosts may have to make multiple calls to arrange a pickup. Thamba will test stand-owned rotation and fixed, disclosed fares with simulated bookings in a fictional Demo Town, while showing Malvan as **Licence pending**.

## Personas

| Persona | Goals | Frustrations | Phone, literacy and language constraints |
| --- | --- | --- | --- |
| Rider (tourist) | **ASSUMPTION (R1, R2)** Find an available auto, recognise the pickup point and know the fare before booking. | **ASSUMPTION (R1, R2)** Similar landmark names, differing quotes and uncertainty about availability can make pickup difficult. | **ASSUMPTION (R3)** A smartphone may have intermittent data. A rider may read Hindi or English more easily than Marathi and recognise familiar landmark cues faster than written directions. |
| Driver | **ASSUMPTION (D1, D2)** Get a fair share of offers and earn enough on each trip to cover time and costs. | **ASSUMPTION (D1, D2)** Missed turns, disputed skips and trips with costly empty returns may make a new dispatch flow hard to trust. | **ASSUMPTION (D3)** On-shift access may range from a smartphone to a basic phone with calls. Data may be intermittent, and spoken Marathi may be easier to follow than written Marathi, Hindi or English. |
| Stand coordinator (union head) | **ASSUMPTION (C1, C2)** Keep the queue moving, settle disputes and have the stand control day-to-day rules and escalation. | **ASSUMPTION (C1, C2)** Exceptions may be hard to reconstruct, and introducing a common fare chart may expose disagreements about who has authority to approve it. | **ASSUMPTION (C3)** Coordination may happen on a personal or shared phone with patchy data. Spoken Marathi and paper records may be more familiar than English interfaces or text-heavy Marathi screens. |
| Homestay host | **ASSUMPTION (H1, H2)** Give guests a clear pickup point and fare, and help arrange onward transport when needed. | **ASSUMPTION (H1, H2)** Quotes may change, repeated calls may take time, and guests may wait at the wrong entrance. | **ASSUMPTION (H3)** A host may use calls and WhatsApp on a smartphone with variable data. The host may speak Marathi with drivers and use Hindi or English with guests, with different levels of reading comfort in each language. |

## Jobs to be done and today's workarounds

| Persona | Job to be done | Today's workaround to validate |
| --- | --- | --- |
| Rider (tourist) | **ASSUMPTION (R1, R2)** When I arrive or need to leave, help me get an auto at a pickup point I can recognise and know what I'll pay before I commit. | **ASSUMPTION (R1, R2)** Walk to a stand, ask the host for a referral or call a known driver, then ask for a quote and directions. |
| Driver | **ASSUMPTION (D1, D2)** When I am available at a stand, give me my turn and enough information to handle an offer and understand the fare after accepting. | **ASSUMPTION (D1, D2)** Wait in the physical line or take direct calls, then ask the destination and quote a fare in person or by phone. |
| Stand coordinator (union head) | **ASSUMPTION (C1, C2)** When walk-ups, breaks and returns interrupt the line, help me settle whose turn comes next and explain the decision. | **ASSUMPTION (C1, C2)** Use the physical line, a paper list or verbal agreement, then resolve disputes with whoever was present. |
| Homestay host | **ASSUMPTION (H1, H2)** When a guest needs an auto, give them pickup and price guidance and help them find a fallback when the first option is unavailable. | **ASSUMPTION (H1, H2)** Call or message trusted drivers, try a backup, then relay the quote and directions to the guest. |

## Contest scope

### Must-have by 18 December 2026

- A web demo with one fictional Demo Town, one simulated Stand and fictional Driver profiles and Landmarks. Malvan is visible as **Licence pending**, with booking and dispatch blocked in the interface and at the server boundary. Contest booking inputs, offers and trips use synthetic data only.
- An end-to-end demonstration from Landmark selection and upfront fixed fare disclosure to Booking, Ride offer, acceptance, pickup and Trip completion. An exhausted queue or expired dispatch window ends the Booking with `no_driver_found`.
- Stand-owned rotation in the demo. The Coordinator manages availability and reviews the offer history and Queue positions against published first-in, first-out rules. Eligible drivers receive offers in queue order, one at a time. An accepting driver leaves the available queue and rejoins at the tail when available again. Skips, timeouts, breaks, cancellations and walk-up jobs have explicit demo rules and auditable outcomes. Stand governance here means control over day-to-day queue operations and dispute review. The live interpretation of rotation, stand membership and driver eligibility remains **UNVERIFIED**.
- Licence-ready design features in Marathi, Hindi and English for the core rider, driver and coordinator flows. The Rider sees the demo fare before confirming. The Driver sees pickup and the offer deadline before acceptance, then sees the destination and route fare after acceptance. Show a clearly labelled demo grievance contact and a simulated complaint path. Confirm the applicable local tariff and fare model before any licensed launch. [Research brief, regulation and fares](research-brief.md#3-regulation-and-the-zero-commission-pilot)

### Should-have

- A shareable Demo Town link and a pickup view with a short landmark cue for host-assisted walkthroughs.
- A review screen that replays peak-day and queue exception scenarios, with a plain-language explanation of each change in Queue position.
- Read-aloud pickup cues for testing alongside the written translations.

### Explicitly out of scope

- Live rides in any unlicensed town, including taking or relaying real ride requests, real driver onboarding, and arranging pickups through calls or messages. The contest build supports simulated rides only.
- Payments, GPS tracking, surge pricing, commissions and native apps.

## Competitive position

Yetav is the closest local precedent. The 2025 Malvan launch reporting describes an available-driver phone-number list. Thamba's proposed product assigns the next eligible Ride offer by an auditable rotation, discloses a fixed fare up front, gives the Stand ownership of queue operations and dispute review, and demonstrates three languages, destination hiding until acceptance and a grievance contact. The contrast concerns the reported launch flow. Yetav's current operations and Thamba's eventual licensed service remain open questions. [Research brief, local travel and Yetav](research-brief.md#1-ride-hailing-coverage-and-how-tourists-get-around)

| Product | What the brief supports | Malvan / Sindhudurg evidence | Thamba position |
| --- | --- | --- | --- |
| Yetav | Reported launched in Malvan and Devgad in April 2025. The launch flow surfaced available drivers' numbers for calls. | Current usage, completions, fares, dispatch behaviour and licensing status are **UNVERIFIED**. | Auditable fair rotation in place of the launch-era list-and-call flow, with upfront fixed demo fares, stand ownership of dispatch and licence-ready design features. |
| Uber | Its India directory has no matching entry for Malvan, Malwan, Kudal or Sindhudurg. Uber publishes a Ratnagiri page. | Local auto and cab pickup **UNVERIFIED**. | Demonstrate a queue and named pickup Landmarks for a single Stand. |
| Ola | Public documentation describes Ola Outstation. | Local auto and cab pickup **UNVERIFIED**. | Focus the demo on local stand pickups and fares for named Routes. |
| Rapido | The national listing advertises bike, auto and cab rides. | Local auto and cab pickup **UNVERIFIED**. | Focus the demo on autos dispatched from a Stand. |
| Namma Yatri | Its rider listing names cities including Mysuru and Tumkur. The brief documents smaller-city launches. | Local auto and cab pickup **UNVERIFIED**. | Test stand-governed rotation and Marathi, Hindi and English flows for this proposed pilot. |
| Bharat Taxi | A Maharashtra rollout and launches in Navi Mumbai and Pune are documented. | A Sindhudurg launch was absent from the sources checked. Local auto and cab pickup **UNVERIFIED**. | Define what the local Stand controls and what the licence authority needs to confirm. |
| inDrive | Its public city directory has no Sindhudurg entry. Availability guidance points to the in-app location list. | Local auto and cab pickup **UNVERIFIED**. | Demonstrate an upfront fixed demo Fare chart for named Routes. |

The brief's local pickup checks are desk research. **UNVERIFIED** indicates that coverage is unknown. [Research brief, platform checks](research-brief.md#1-ride-hailing-coverage-and-how-tourists-get-around)

## Success metrics

### Contest period through 18 December 2026

| Metric | Target | Measurement |
| --- | --- | --- |
| Completed interviews | At least 16, including 6 drivers, 2 stand coordinators, 4 homestay hosts and 4 tourists. | Count distinct participants with consent and an anonymised note containing a recent example or an explicit absence of one. |
| Drivers who reviewed the rotation rules | At least 6 distinct drivers. | Use a fictional queue walkthrough. Count a review when a driver explains who gets the next offer in a normal turn and comments on at least one exception. Participants may also count toward the interview target. |
| Simulated peak-day median time to accept | At most 60 seconds in each seeded run. | Run three reproducible synthetic days, each with 120 valid Bookings, 12 synthetic Drivers on defined availability schedules and 40 Bookings submitted in the busiest hour. Measure elapsed time from Booking submission to first acceptance among accepted Bookings. Report the sample count. |
| Simulated peak-day `no_driver_found` rate | At most 10% in each seeded run. | Follow all 120 Bookings per run through the dispatch outcome. Divide the number reaching `no_driver_found` by the number submitted. Report acceptances, cancellations and other outcomes alongside it. |
| Simulated rotation fairness | Zero out-of-order offers in all three peak-day runs and a maximum difference of 1 first offer between drivers in a balanced replay. | Reconstruct eligibility and queue order from the offer log, including documented skips. In a separate replay with 12 Drivers and 120 sequential Bookings, have every first offer accepted and the Driver rejoin the queue before the next Booking. Count first offers per Driver from one continuous queue. |
| Demo Town end-to-end completions | At least 20 distinct Bookings reach Trip completion, with at least 5 runs in each of Marathi, Hindi and English. | Count an end-to-end run once when the demo log shows the fare disclosure, Booking, acceptance, pickup and completion in sequence. Use only synthetic trips. |

### Post-licence pilot

Measure over the first 30 operating days in the authorised area, after licence issuance and confirmation of the fare, rotation and site permissions. Report counts and denominators at the pilot Stand, with arrival peaks and quieter hours shown separately.

| Metric | Target | Measurement |
| --- | --- | --- |
| Pilot volume and fulfilment | At least 100 valid submitted Bookings and at least 85% completed. | Divide completed Trips by valid Bookings submitted. Report no-driver outcomes, cancellations and missed pickups separately. |
| Pickup wait | Median at most 10 minutes and 90th percentile at most 20 minutes. | Record elapsed time from Booking submission to confirmed pickup among Bookings with a pickup. |
| Missed pickup | At most 5% of accepted Bookings. | Count accepted Bookings recorded as failed handoffs because the Driver and Rider did not meet at the Landmark. |
| Fare disputes | At most 3 reports per 100 completed Trips. | Count completed Trips with a documented fare or extra-charge complaint once each. |
| Driver participation | At least 2 completed Trips per available Driver shift on average. | Divide completed Trips by recorded shifts with an available Driver. Include zero-trip shifts. |
| Rotation integrity | Zero unexplained out-of-order offers. | Review the dispatch record against the approved eligibility and rotation rules. |

## Risk register

Likelihood and impact are planning estimates. Interview IDs identify risks that depend on assumptions about users.

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Regulation. A real request is routed before licensing, or the authority requires changes to fares or stand rotation. | Medium | High | Block Malvan and all live dispatch paths server-side. Use synthetic data and simulated contacts. Obtain the licence and written confirmation of tariff, rotation, eligibility and pickup permissions before launching the pilot. [Research brief, regulation](research-brief.md#3-regulation-and-the-zero-commission-pilot) |
| Driver adoption. **ASSUMPTION (D1, D2, D3)** Drivers may distrust skips, find offers hard to use on shift or find the economics unattractive. | Medium | High | Review the rules and test hidden-destination offers with drivers. Replay disputes and compare fare scenarios against the applicable tariff before proposing live operations. |
| Cold start. **ASSUMPTION (R2, H2)** Uneven availability around arrivals and reliance on existing walk-up, call and referral channels may make it hard to staff and publicise the pilot. | High | High | Simulate thin supply and arrival bursts. For the licensed pilot, start with one stand and staffed windows agreed with the stand, and measure available shifts and completed trips. |
| Fake bookings. Duplicate or fabricated requests could occupy offers and distort the queue. | Medium | Medium | Use simulated duplicates to test idempotency and request limits. Expire unanswered offers, and log cancellations and recoveries so the Coordinator can review disruptions. |
| Privacy. Identifiable phone numbers or pickup details could appear in public screens, notes or logs. | Medium | High | Use fictional profiles, bookings and contacts in the demo. Keep field notes anonymous. For the pilot, limit contact data to the required purpose and restrict access and retention. [Research brief, phone-number privacy](research-brief.md#5-rider-and-driver-phone-numbers-under-dpdp) |
| Marathi literacy. **ASSUMPTION (R3, D3, C3, H3)** Marathi text alone may be difficult for some participants to use confidently. | Medium | High | Test short Marathi labels, recognisable landmark cues and optional read-aloud instructions across the four roles. Check comprehension with a task and teach-back. |

## Ubiquitous-language glossary

Use these terms for distinct domain concepts in the interface and code.

| Term | Definition | Do not use as synonyms |
| --- | --- | --- |
| Town | The service area that groups Stands, Landmarks and Routes and controls whether Booking is enabled. | City, market, zone |
| Stand | The pickup operation within a Town that manages a roster and an offer rotation. | Hub, fleet, depot |
| Landmark | A named, road-accessible point in a Town used as a pickup or drop-off. | Pin, POI, address |
| Route | An ordered pickup Landmark and drop-off Landmark pair within a Town used to look up a fare. | Itinerary, path, Trip |
| Fare chart | The effective, versioned table of fixed fare amounts for supported Routes in a Town. | Rate card, price list, tariff order |
| Driver | The actor who receives Ride offers from a Stand and carries out accepted Trips. | Captain, partner, chauffeur |
| Rider | The actor who submits a Booking for a pickup and drop-off. | Passenger, customer, guest |
| Coordinator | The Stand operator role that manages availability and reviews rotation and dispatch disputes. | Admin, dispatcher, union head |
| Booking | A Rider's submitted request for transport that records the selected Route, disclosed fare and dispatch outcome. | Order, reservation, Trip |
| Ride offer | A time-limited invitation for one eligible Driver to accept a specific Booking. | Assignment, job, notification |
| Queue position | A Driver's current ordinal place in a Stand's available-driver rotation. | Rank, driver score, priority tier |
| Trip | The record created when a Driver accepts a Booking, covering pickup through completion or an earlier end. | Ride offer, Booking, Route |

## Validate in interviews

Record concrete examples, contradictions and unanswered questions in the [interview guide](interviews/README.md) format. Treat a fictional walkthrough as feedback on a design, and record reported past behaviour separately.

| Assumption | Why it matters | Question to ask | Who to ask |
| --- | --- | --- | --- |
| **ASSUMPTION R1** Tourists may be uncertain about the fare or meeting point and ask for a quote and directions in person or through a host or driver. | Informs upfront fare disclosure and Landmark naming. | Think of your last local ride attempt. What prices and pickup directions did you get, from whom, and what happened at pickup? | Tourists, homestay hosts |
| **ASSUMPTION R2** Availability may be unpredictable around arrivals, prompting walk-ups, calls or referrals. | Informs whether another channel is needed and which arrival windows to model. | Walk me through your last attempt to find an auto. Where and when did it happen, what did you try in order, and how long did each step take? | Tourists, drivers, homestay hosts |
| **ASSUMPTION R3** Data access and reading comfort may vary, and familiar landmark cues may help more than written directions. | Informs language, low-data behaviour and pickup cues. | What phone, connection and language did you use last time? Can you show where you would wait from each of these fictional pickup instructions? | Tourists |
| **ASSUMPTION D1** Drivers may want predictable turns and use a physical line or direct calls, with disputes over missed turns. | Informs eligibility, exceptions and the offer log. | How was your last turn decided? What happened the last time a driver was skipped, took a walk-up or returned from a long trip? | Drivers, stand coordinators |
| **ASSUMPTION D2** Drivers may check the destination before quoting or committing because waiting, luggage and empty returns affect earnings. | Tests a disclosed fixed fare and the limited information allowed before acceptance. | How did you quote and decide on your last few trips? Using dummy offers, what questions come up when you see only the pickup and deadline before accepting? | Drivers |
| **ASSUMPTION D3** Driver handset access, data and reading comfort may vary, and spoken Marathi may be easier for some drivers on shift. | Tests whether an offer can be understood and answered in time and what training is needed. | What phone and connection do you have on shift? Which written or spoken version of this dummy offer would you use, and what does it ask you to do? | Drivers |
| **ASSUMPTION C1** Coordinators may manage exceptions and disputes through physical queues, paper notes or verbal agreements. | Informs the minimum rotation record and when exceptions are needed. | Tell me about the last disputed turn. Who decided it, what evidence settled it, and what would you record in this fictional queue? | Stand coordinators, drivers |
| **ASSUMPTION C2** The Stand may want day-to-day control, with different accounts of who sets fares, manages availability and handles complaints. | Informs stand governance, staffing and authority questions for a licensed pilot. | Who decides queue rules and staffing today, who supplies the fare chart, and who handled the last pickup or fare complaint? | Stand coordinators, drivers |
| **ASSUMPTION C3** Coordination may rely on personal or shared phones and paper, with uneven data access and comfort reading on-screen instructions. | Informs language choices, role access and handover during shifts. | Which device, connection and records did you use on your last shift, and how would you use this fictional queue screen and hand it over? | Stand coordinators |
| **ASSUMPTION H1** Hosts may relay quotes and directions, and guests may sometimes receive a changed quote or wait at the wrong entrance. | Informs the host's guidance and the content of a shareable pickup view. | Think of the last time a guest asked about an auto. What pickup point and fare did you give them, and what did the guest report back? | Homestay hosts, tourists |
| **ASSUMPTION H2** Hosts may call or message known drivers and try backups when availability is unclear. | Tests how visitors discover a service and whether a host-facing demo link would help. | Walk me through the last pickup you helped with, from the first contact to pickup or fallback. Who did you contact, in what order, and how long did it take? | Homestay hosts |
| **ASSUMPTION H3** Hosts may have variable data and switch between calls, WhatsApp and spoken or written Marathi, Hindi and English. | Informs how to share a pickup cue and which translations to test. | What device, channel and language did you use with the driver and guest last time? How would you pass on this fictional pickup card? | Homestay hosts |
