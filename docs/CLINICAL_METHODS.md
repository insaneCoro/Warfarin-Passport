# Clinical references and calculation limits

This remains a synthetic-data development application, not a validated dosing system. The new reference panel supports clinician review and never fills, saves or approves a regimen automatically.

## Dose-review reference

Source: [UW Medicine Warfarin page](https://sites.uw.edu/anticoag/drugs/warfarin/), retrieved 12 November 2026. The simplified maintenance nomogram and monitoring table were checked together. The reference is limited to prescribed targets 2–3 and 2.5–3.5, with the original current weekly regimen as baseline. The output shows the percentage range, the corresponding weekly range and an explicitly illustrative midpoint; it does not select the midpoint as a decision.

For the screenshot example of target 2–3, INR 4, previous weekly dose 35 mg and assessed routine clinical context, the reference range is a 5–15% reduction (29.75–33.25 mg/week); 31.5 mg is only its midpoint example. Holding a dose for significant over-anticoagulation changes monitoring: the source describes a 1–2 day interval when a dose is held, versus 1–2 weeks after a dose change. The UI intentionally does not reproduce a universal seven-day recheck date.

Dose guidance is visible directly on the passport. When context is unassessed, the recorded weekly dose can produce a clearly conditional percentage range, mg range and midpoint example. The baseline is labelled unverified; these numbers never populate a decision. Fully assessed context labels the verified reference separately. Recorded high-risk flags require clinician-led management even when a conditional band is shown. Positive missed-dose, interaction, illness or recent-change answers produce specific management considerations and suppress routine numeric examples. Bleeding/emergency symptoms, very low INR, below-target mechanical-valve INR, high INR requiring escalation, unsupported targets or unknown baseline suppress routine numeric examples. A seven-day result-age guard is a conservative local UI policy, not a separately validated source rule. A valid current test date and independently entered next test date are required. Warfarin initiation, reversal dosing and bridging are outside this feature. Persisted clinical decisions can differ from the reference after clinician assessment and reason documentation.

The requested [Anticoagulation Forum PDF URL](https://acforum-excellence.org/Resource-Center/resource_files/-2021-02-10-125746.pdf) still did not provide verifiable PDF contents in this environment. Its link is retained, but no dosing rule is attributed to that unverified document. Source interpretation and escalation thresholds need local clinician validation before clinical use.

## Time in therapeutic range

Patient TTR uses a linear interpolation estimate between successive measured INR values (Rosendaal approach), clipped to the six calendar months ending on the displayed clinic date. The exact interpolated time inside the inclusive target bounds is divided by eligible observed interval time. This is time-weighted, not the percentage of tests in range. No value is extrapolated before the first result or after the last result.

Implementation choices are explicit: intervals longer than 56 days are excluded; conflicting same-day results or known changed target snapshots make the result unavailable; identical same-day values are deduplicated; malformed/future results are not treated as measurements. Current stored target is otherwise applied across history, so historical target changes without snapshots require manual review. This prototype does not yet store complete historical target periods or interruption/hospitalization exclusions.

If a true **warfarin start date** is recorded, the first six weeks are excluded. Enrollment date is not assumed to be treatment start. Missing start dates, short/poorly covered histories or stale endpoint data produce a **provisional** estimate. At least 80% six-month coverage, a known initiation date and sufficient endpoint history are required for an established estimate; the coverage and 56-day policies are implementation choices requiring local validation. Provisional values can appear in patient tables and the labelled distribution, but are excluded from the clinic six-month mean. The clinic figure covers the loaded cohort (the current API returns up to 200 patients) and is an unweighted mean of eligible patient TTRs; it is not a pooled patient-day rate. The original four fictional examples contain only 35 observed days, so they intentionally do not create a misleading established six-month clinic percentage.

[NICE NG196, assessing VKA control](https://www.nice.org.uk/guidance/ng196/chapter/recommendations#assessing-anticoagulation-control-with-vitamin-k-antagonists) recommends a validated TTR method, excluding initiation and evaluating an adequate maintenance period. Its AF-specific recommendations should not be treated as a universal therapeutic decision for every thrombosis-clinic indication.

## Approval, team conversation and patient messaging

An authenticated clinician may explicitly approve a saved encounter; approval records the actual staff UID/time. Admin status alone is not a clinician signature. Team messages are append-only, attributed to the approved staff identity, and can link to a patient/thread. Messages do not change a regimen or complete a follow-up. Conversations refresh on demand, not as guaranteed real-time alerts.

Per the latest request, WhatsApp is a **button and setup placeholder only**. No WhatsApp URL, message generation, send, external API call or communication audit is produced yet. Arabic/English reviewed manual messaging remains a later setup task.

## Urgent review alerts

A prominent review queue appears across clinical pages for recorded bleeding/emergency symptoms, latest INR ≥4.5 (or >4 for a 2–3 target), INR <1.5, and below-target INR with a mechanical valve or staff-recorded high thrombotic risk. INR ≥10 is ordered first. These are review/escalation prompts, not diagnoses; all above/below-target badges are red, but not every abnormal value is labelled an emergency. Dated historical results are labelled for prompt confirmation of current status. A newer result can change the queue; simply opening a passport or completing a routine call cannot dismiss it. Staff document the actual actions in the passport/follow-up record. This is not a full critical-result acknowledgment and escalation service.

Connected clinical views refresh every 60 seconds while visible, except when a form is open or staff/messages are being edited. A manual Refresh clinic control and last-refresh time are shown; failures are visible. This is polling while the page is open, not a background notification guarantee.

Saved INR reviews use the regimen **before** the linked decision, alongside the already-saved new dose and approval status. The newly adjusted dose is not reused as the baseline for the same INR. If that prior baseline is unavailable, no numerical weekly example is generated. Structured clinical context saved with the linked encounter informs the passport; recorded bleeding/emergency concerns override routine calculations and enter the urgent queue.
