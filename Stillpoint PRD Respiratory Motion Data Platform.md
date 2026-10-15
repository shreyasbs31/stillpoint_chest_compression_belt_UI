# Stillpoint PRD: Respiratory Motion Data Platform

Oct 13, 2026 · @Shreyas · Version 1.0 (UI and software scope)

## 1. Document control and how to use this PRD

This PRD defines every screen, feature, metric, alarm and data contract for the Stillpoint software, written so Cursor can build it one feature ID at a time.

| Field | Value |
| --- | --- |
| Product (working name) | Stillpoint. Alternatives: Tidewell, BreathLine. Final name to be confirmed and checked for existing trademarks. |
| Scope | Software only: clinician dashboard, in-room patient display, data platform, analytics, reports, simulation and demo tooling. |
| Out of scope | Firmware and hardware design. Features that need hardware changes declare it in the catalogue (section 16). |
| Owners | Shreyas B S (product and software), Yashwanth (hardware and firmware) |
| Version | 1.0 draft |
| Readers | Build team, the Cursor agent, faculty reviewers, clinical advisors |
| Intended use | Research and demonstration prototype. Not a medical device. |

### ID conventions

| Prefix | Meaning | Example |
| --- | --- | --- |
| SCR | Screen | SCR-08 Live Cockpit |
| F-AREA | Feature | F-LIVE-03 Metric tiles |
| M | Metric definition | M-01 Respiratory rate |
| ALM | Alarm | ALM-01 Overpressure |
| NFR | Non-functional requirement | NFR-02 Display latency |
| J | User journey | J3 Treatment-day session |

### Priority levels

- **P0**: must exist and work for the clinician demo.
- **P1**: should exist; strongly raises the impression.
- **P2**: delighter or roadmap; build only after P0 and P1 are stable.
- **SIM**: shown through simulation in the MVP, always labelled as simulated (section 21).

### Working with Cursor

1. Export this doc as Markdown and save it as `docs/PRD.md` at the repo root.
2. Create the `.cursor/rules/` files described in section 24 so every Cursor request inherits the stack, tokens and labelling rules.
3. Build one feature ID per prompt. Always name the ID, the section, and the acceptance criteria.
4. After each feature, ask Cursor to tick it in `docs/PROGRESS.md` and to list any contract changes.
5. Metrics, alarm thresholds and message shapes come only from sections 17 to 20. Cursor must never invent them; if something is missing, it adds a TODO and asks.
6. Treat the shared types in section 19 as the single source of truth for both frontend and backend.

```text
Implement F-LIVE-01 (Live waveform panel) from docs/PRD.md, section 11.
Use only design tokens from section 8 and data from useLiveStream() (section 20).
Done when every acceptance criterion under F-LIVE-01 passes and
apps/web/src/features/live/__tests__ passes.
Do not edit files outside apps/web/src/features/live and apps/web/src/components/charts.
```

## 2. Product vision

Stillpoint turns a pneumatic compression belt into a respiratory motion data platform: it registers patients, records every breath at the belt, shows it live with clinical metrics, and turns a course of sessions into evidence of reproducibility.

**One-line pitch:** every breath recorded, measured and comparable, from the first session to the last fraction.

**Positioning statement (use on the About screen and in the talk):** Stillpoint is a research platform for capturing, visualising and analysing respiratory motion at a compression belt, with real-time visual feedback for operators and patients.

### Three pillars

| Pillar | What it means in the product | Where it lives |
| --- | --- | --- |
| Capture | Structured patient, plan, consent and session records; every sample timestamped, checksummed and auditable | Patients, Session setup, Device center |
| See | A calm real-time cockpit with the breathing waveform, belt pressure, phase, quality and alarms; a separate calm display for the patient | Live Cockpit, Patient Display |
| Learn | Session review, fraction-over-fraction reproducibility, guided breathing and breath-hold drills, anonymised research datasets | Review, Trends, Research hub |

The coaching capability is presented as "guided breathing with visual feedback", a module of the platform, rather than as the headline. The headline is data: capture, reproducibility and evidence.

### Signature features (the moments that should impress)

| # | Feature | Why a clinician cares |
| --- | --- | --- |
| 1 | Live Cockpit with phase ribbon, target band and a ghost of the patient's own reference breath | Reads like a clinical instrument; shows breathing state at a glance from two metres away |
| 2 | Fraction reproducibility view with a control chart | Reproducibility between fractions is the core question in motion management |
| 3 | Breath Fingerprint: a polar signature of each patient's average breath, overlaid fraction by fraction | A memorable visual that makes drift and consistency visible instantly |
| 4 | Patient Display in English, Kannada and Hindi with a breathing orb and countdowns | Shows empathy for real patients in Karnataka; reduces anxiety |
| 5 | Breath-hold drill engine with per-hold stability and time-to-target | Maps directly to breath-hold techniques such as DIBH |
| 6 | Simulated beam gate (clearly labelled) showing beam-on and beam-hold with duty cycle | Shows where the platform could go without overclaiming |
| 7 | One-click session report PDF with a data integrity hash | Clinicians trust paper trails and sign-offs |
| 8 | Setup photo overlay to reproduce belt placement between fractions | Mirrors the setup-photo practice already used in radiotherapy |
| 9 | Research hub that exports an anonymised dataset with a data dictionary and manifest | Signals research seriousness and future ML work |
| 10 | Honest data mode: raw samples, signal quality, measured sample rate and dropped samples always visible | Physicists trust tools that show their limits |
| 11 | Presenter mode with scripted scenarios and a one-key fallback to replay | The demo never dies in front of the audience |

## 3. Clinical context and the problem

Breathing moves tumours in the thorax and upper abdomen during radiotherapy, so clinics either widen treatment margins or manage the motion; our belt is a motion management tool, and the software makes its effect measurable and reproducible.

### How clinics manage respiratory motion (background)

| Technique | What it does | Typical use | How Stillpoint relates |
| --- | --- | --- | --- |
| Abdominal compression | Limits diaphragm excursion by pressing on the upper abdomen | Lung and liver stereotactic treatments (SBRT) | Our belt is a pneumatic version; we record pressure and the breathing it allows |
| Breath-hold (for example deep inspiration breath-hold, DIBH) | Patient holds breath at a reproducible level while the beam is on | Left-sided breast (moves the heart away from the field), some thoracic and abdominal sites | Breath-hold drill engine, target band, patient display |
| Respiratory gating | Beam is on only while breathing is inside a window | Thoracic and abdominal sites | Simulated beam gate (roadmap only) |
| Audio-visual feedback | Patient sees or hears cues to breathe regularly | Used with gating and breath-hold | Guided breathing module |

The standard reference review is AAPM Task Group 76 on respiratory motion management. Mention it by name in the talk; clinicians will recognise it.

### Problems we target

1. **Reproducibility is hard to evidence.** Breathing varies within a session and between fractions, and that variation is rarely recorded in a structured way.
2. **Compression is set by feel.** Belt or plate pressure and patient tolerance are often recorded loosely or not at all.
3. **Feedback tools are expensive and closed.** Commercial breathing feedback is usually tied to a vendor system.
4. **The data never becomes a dataset.** Sessions end and the signal is lost, so nobody can learn from it later.

### What the belt actually measures

The sensor reads air pressure inside the bladder. Breathing pushes the abdomen against the bladder and modulates that pressure, so the signal is a surrogate of abdominal motion at the belt. It is not tumour position and not organ displacement. Every screen, report and talking point must respect that distinction (section 23).

### Where it fits in the clinical workflow

1. **Planning or simulation day:** the patient is registered, the belt is fitted, baseline breathing is captured and a reference pattern is stored.
2. **Each treatment fraction:** the session is compared live against the reference; breath-holds and guided breathing run as configured.
3. **Between fractions:** clinicians review sessions and the reproducibility trend.
4. **After the course:** anonymised data feeds research and future coaching models.

## 4. Goals, non-goals and success metrics

The MVP succeeds if practising clinicians leave the demo believing this is a credible, honest data platform worth piloting, and ask for a follow-up.

### Goals

| ID | Goal | Evidence in the demo |
| --- | --- | --- |
| G1 | Present a credible, clinical-grade data capture platform | Patient registry, plans, consent, audit trail, integrity hashes |
| G2 | Show the breathing signal in real time with meaningful metrics | Live Cockpit on the real belt |
| G3 | Make reproducibility across fractions visible | Trends view, control chart, Breath Fingerprint |
| G4 | Show guided breathing and breath-hold as a module | Patient Display and drill engine |
| G5 | Produce an exportable, documented research dataset | Research hub export bundle |
| G6 | Run reliably offline on one laptop with a safe fallback | Presenter mode, replay hot swap |

### Non-goals for the MVP

- Not a medical device. No diagnosis, no treatment decisions, no dose calculations.
- No control of real treatment machines. Beam gating is simulated and labelled.
- No cloud, accounts server or multi-site sync. Everything runs locally.
- No hospital system integration (DICOM, HL7, FHIR). Shown only on the roadmap.
- No claims about tumour or organ motion.
- No patient-facing scores, badges or gamification.

### Success metrics

| Metric | Target |
| --- | --- |
| Full demo runs end to end | 3 clean rehearsals in a row with zero crashes |
| Time from launch to first waveform | 20 s or less (live), 5 s or less (simulation) |
| Clinicians can restate the value | Each attendee can describe it in one sentence when asked at the end |
| Feedback captured | At least 5 concrete feature requests or objections recorded |
| Follow-up | At least one clinician agrees to a follow-up meeting or pilot discussion |
| Data integrity in a 10-minute live session | Dropped samples shown on screen; target below 0.5% once firmware streams every sample |
| Session setup time (post-demo product metric) | Under 3 minutes from opening the patient to first baseline breath |

## 5. Users, personas and roles

Six personas use Stillpoint; four of them map to login roles, and the patient never logs in.

| Persona | Context | Needs | Design consequences |
| --- | --- | --- | --- |
| Radiation therapist (operator) | Runs the session, fits the belt, often standing 1 to 2 m from the screen, sometimes gloved | Speed, clear state, unmissable alarms, few clicks | Large tap targets (44 px minimum), glanceable tiles, keyboard shortcuts, one-click STOP and VENT |
| Medical physicist | Owns calibration, accuracy and QA | Raw data, sample rate, latency, calibration fit, validation | Honest data mode, device center, validation lab, raw console |
| Radiation oncologist | Decides on technique and reviews the course | One-page summaries, reproducibility, tolerability | Reports, trends, session story, sign-off |
| Patient | Lying supine, possibly anxious, sees a monitor or tablet | Calm, simple, kind instructions in their language | Patient Display with no numbers, no alarms, large type, audio cues |
| Researcher (Shreyas and team) | Builds datasets and models | Anonymised exports, cohort views, labelling | Research hub, manifests, simulation studio |
| Presenter | Runs the live demo | Control of scenarios, privacy, a safety net | Presenter mode, script runner, replay fallback |

### Role permissions

| Capability | Operator | Clinician | Researcher | Admin |
| --- | --- | --- | --- | --- |
| View live session | Yes | Yes | Yes | Yes |
| Start and end sessions | Yes | Yes | No | Yes |
| Belt controls (inflate, hold, deflate, setpoint) | Yes | Yes | No | Yes |
| STOP and VENT | Yes, always | Yes, always | Yes, always | Yes, always |
| Create and edit patients and plans | Yes | Yes | No | Yes |
| See identifiable fields (name, hospital ID) | Yes | Yes | No | Yes |
| Edit protocols and alarm thresholds | No | Yes | No | Yes |
| Run calibration | No | Yes | No | Yes |
| Sign off a session as reviewed | No | Yes | No | Yes |
| Export datasets | No | Yes | Anonymised only | Yes |
| Simulation studio | No | Yes | Yes | Yes |
| Audit log | No | Read | No | Read and export |
| Users and settings | No | No | No | Yes |

### Login model

- Local accounts with a 4 to 6 digit PIN and role tiles on the login screen.
- Quick user switch from the top bar; every action records the active user.
- Auto-lock after 10 minutes idle, never during a live session.
- In presenter mode a single "Demo clinician" account is pre-selected.

## 6. User journeys and session lifecycle

The treatment-day session (J3) is the journey the whole product is built around; every other journey either prepares for it or learns from it.

### Journeys

**J1. First-time setup (admin, physicist)**

1. Launch, create the admin account, choose the data folder.
2. Connect the device; the app identifies the port and measures the sample rate.
3. Run the calibration wizard against a reference gauge or water column.
4. Run the noise floor test and the belt integrity test.
5. Review default alarm thresholds and protocol templates.

**J2. Register a patient and plan (operator or clinician)**

1. New patient wizard: pseudonymous ID is generated, identifiable fields are optional.
2. Enter treatment site, technique, number of fractions and clinicians.
3. Enter belt plan: size, landmark, target and maximum pressure (from clinical input).
4. Record consent for data collection, photos and research use.
5. Pick a protocol template.

**J3. Treatment-day session (operator)**

1. Open the patient, press Start session.
2. Complete the time-out checklist (identity, consent, device, calibration, integrity, belt position).
3. Fit the belt; capture a setup photo and compare with the previous fraction.
4. Inflate to the planned pressure; the app shows Settling until the signal stabilises.
5. Capture baseline breathing (default 6 breaths).
6. Run the protocol: monitoring, breath-hold drills, guided breathing or simulated gating.
7. Mark events as they happen (cough, movement, talking, discomfort).
8. Deflate, log comfort, add notes.
9. Read the auto-generated session story and export the report.

**J4. Breath-hold coaching session (operator and patient)**

1. Baseline capture, then a maximal comfortable inhale to set the scale.
2. Operator drags the target band to the planned hold level.
3. Patient Display runs countdown, hold and relax cues for N holds.
4. Each hold is scored for time to target, duration and stability.

**J5. Review a past session (clinician)**: open from the patient or the recent list, scrub the timeline, read per-breath and per-hold tables, sign off.

**J6. Review reproducibility across fractions (clinician, physicist)**: open Trends, read the control chart and Fingerprint overlay, open any out-of-limits fraction.

**J7. Export a research dataset (researcher)**: filter sessions, choose fields and anonymisation, export a bundle with manifest and data dictionary.

**J8. Run the demo (presenter)**: enable presenter mode, follow the script, fall back to replay with one key if the hardware misbehaves.

### Session lifecycle

The session is a state machine owned by the backend. The UI never infers state on its own; it renders the state it receives.

&#91;embedded content: session lifecycle · setup, settle, protocol, close\]

The belt must settle before baseline capture; a top-up pauses the protocol and returns to it once the pressure settles.

| State | What the UI shows | Metrics computed | Allowed actions |
| --- | --- | --- | --- |
| Draft | Session setup screen | No | Edit protocol, cancel |
| Pre-checks | Time-out checklist | No | Tick items, run tests, override with reason |
| Fitting | Setup photo panel, belt position guide | No | Capture photo, inflate |
| Inflating | Pressure strip rising toward setpoint, pump ribbon active | No (greyed with reason) | Hold, deflate, STOP and VENT |
| Settling | "Settling, metrics resume in N s" | No | Wait, STOP and VENT |
| Baseline | Progress "Baseline 3 of 6 breaths" | Yes | Cancel baseline |
| Monitoring | Full cockpit | Yes | Mark events, start drill or guided, top up |
| Breath-hold drill | Ring timer, hold count, target band | Yes, plus hold metrics | Start or stop hold, skip, end drill |
| Guided | Ghost reference, similarity score | Yes, plus similarity | Change reference, end guided |
| Gating (simulated) | Beam lamp, duty cycle | Yes, plus duty cycle | End gating |
| Top-up | Pump ribbon, breathing metrics paused | Paused | STOP and VENT |
| Deflating | Pressure falling | No | STOP and VENT |
| Post-session | Comfort rating, notes, summary | Final values | Save, generate report |
| Completed | Read-only review | Final | Report, compare, sign off |
| Aborted | Reason captured, data kept | Up to abort | Review |
| Fault | Red banner, fault code, guidance | No | Acknowledge, reconnect, review |

## 7. Information architecture and navigation

The app has 20 screens on 8 primary destinations, plus a presenter overlay; the Live Cockpit is reachable from anywhere while a session runs.

### Routes

| Route | Screen | Purpose | Roles |
| --- | --- | --- | --- |
| `/connect` | SCR-01 Launch and Connect | Choose data source, connect device, handshake | All |
| `/login` | SCR-02 Login | Role tiles and PIN | All |
| `/` | SCR-03 Command Center | Today, device health, recent sessions, data counters | All |
| `/patients` | SCR-04 Patient Registry | Search, filter, open patients | Operator, Clinician, Admin |
| `/patients/new` | SCR-05 New Patient Wizard | Five-step registration | Operator, Clinician, Admin |
| `/patients/:id` | SCR-06 Patient Profile | Overview, plan, sessions, trends, photos, references, notes, consent | Operator, Clinician, Admin |
| `/sessions/new?patient=:id` | SCR-07 Session Setup | Protocol and time-out checklist | Operator, Clinician, Admin |
| `/live/:sessionId` | SCR-08 Live Cockpit | Real-time monitoring and control | All (controls by role) |
| `/display/:sessionId` | SCR-09 Patient Display | Calm in-room screen, opened in its own window | No login, pairing token |
| `/sessions/:id` | SCR-10 Session Review | Playback, tables, distributions, sign-off | All |
| `/patients/:id/trends` | SCR-11 Fraction Trends | Reproducibility across the course | Clinician, Researcher, Admin |
| `/compare?ids=a,b` | SCR-12 Compare | Overlay 2 to 4 sessions | Clinician, Researcher, Admin |
| `/reports/:kind/:id` | SCR-13 Report Preview | Print-ready report and PDF export | Clinician, Admin |
| `/research` | SCR-14 Research Hub | Dataset builder, cohort analytics, labelling | Clinician, Researcher, Admin |
| `/research/validation` | SCR-15 Validation Lab | Agreement with a reference signal | Clinician, Researcher, Admin |
| `/device` | SCR-16 Device and Calibration | Status, raw console, calibration, tests | Clinician, Admin |
| `/simulation` | SCR-17 Simulation Studio | Generator, scenarios, cohort, replay | Clinician, Researcher, Admin |
| `/settings` | SCR-18 Settings | Units, thresholds, protocols, display, users, data | Admin (some read-only for others) |
| `/audit` | SCR-19 Audit Log | Immutable action history | Clinician (read), Admin |
| `/about` | SCR-20 About and Intended Use | Intended use, versions, team, licences | All |
| overlay | SCR-21 Presenter Mode | Script runner, spotlight, fallback | Presenter |

### Navigation model

- **Left rail** (72 px collapsed, 232 px expanded): Home, Patients, Live, Review, Research, Device, Simulation, Settings. Live shows a pulsing dot while a session runs and is disabled otherwise.
- **Top bar** is persistent on every screen (section 9).
- **Command palette** (Ctrl or Cmd + K) reaches every screen, patient and action by typing.
- **Breadcrumbs** on detail pages: Patients / PT-0007 / Fraction 7.
- **Session pill:** if the operator leaves the cockpit during a live session, a floating mini waveform with the state and timer stays bottom-right; one click returns.
- **Deep links:** every session, breath and event has a shareable local URL, for example `/sessions/01J9...?t=372.4`.
- **Second window:** the Patient Display opens in its own browser window so it can be dragged to a second monitor or projector.

## 8. Design system

Stillpoint should look like a calm clinical instrument: quiet surfaces, one hero per screen, real units, and colour reserved for meaning.

### Principles

1. **Calm by default, loud only for alarms.** Nothing blinks, bounces or glows unless it needs attention.
2. **One hero per screen.** The waveform on the cockpit, the control chart on trends, the orb on the patient display.
3. **Honest data.** Show the source, the quality, the sample rate and the raw samples on request.
4. **Readable from two metres.** Key numbers at 40 px or larger on the cockpit.
5. **Clinical vocabulary and units everywhere.** br/min, mmHg, s, %.
6. **Never colour alone.** Every status has an icon and a word as well.
7. **Motion explains, never decorates.**

### Themes

Both themes are first-class. "Room" (dark) is the default for the Live Cockpit and Patient Display because treatment rooms are dim. "Office" (light) is the default for review, trends, reports and settings. Presenter mode can force either; test both on the actual projector because projectors often wash out dark themes.

### Colour tokens

Define these as CSS variables in `styles/tokens.css` and map them into Tailwind. Components use tokens only, never raw hex.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | #F6F8FB | #0A0F1A | App background |
| `--surface` | #FFFFFF | #111827 | Cards and panels |
| `--surface-2` | #EEF2F7 | #172033 | Nested panels, table headers |
| `--border` | #DDE3EC | #243046 | Hairlines and dividers |
| `--text` | #0F172A | #E6EDF7 | Primary text |
| `--text-muted` | #5B6B82 | #93A4BD | Labels, units, axes |
| `--primary` | #0F8B8D | #2DD4BF | Primary actions, focus ring |
| `--signal` | #0E7490 | #5EEAD4 | Breathing waveform |
| `--signal-raw` | #94A3B8 | #64748B | Raw sample dots |
| `--reference` | #7C8AA5 | #A5B4CF | Ghost reference (dashed) |
| `--target-band` | #10B981 at 12% | #34D399 at 14% | Breath-hold or gating window |
| `--in-window` | #059669 | #34D399 | Inside target |
| `--alarm-high` | #DC2626 | #F87171 | High priority alarms only |
| `--alarm-medium` | #D97706 | #FBBF24 | Medium priority alarms |
| `--alarm-low` | #0284C7 | #38BDF8 | Low priority and info |
| `--source-live` | #16A34A | #4ADE80 | LIVE badge |
| `--source-replay` | #2563EB | #60A5FA | REPLAY badge |
| `--source-sim` | #7C3AED | #A78BFA | SIMULATED badge and watermark |
| `--phase-inhale` | #0EA5E9 at 14% | #38BDF8 at 18% | Phase ribbon |
| `--phase-exhale` | #6366F1 at 14% | #818CF8 at 18% | Phase ribbon |
| `--phase-hold` | #10B981 at 18% | #34D399 at 22% | Phase ribbon |
| `--pump-active` | #F59E0B at 20% | #FBBF24 at 22% | Pump activity ribbon |

The simulated colour is violet on purpose, so it can never be confused with an alarm colour.

### Typography

- **UI font:** Inter, self-hosted (offline). Every live number uses `font-variant-numeric: tabular-nums` so digits never jitter.
- **Mono font:** JetBrains Mono for IDs, raw console and data tables.

| Style | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| Hero metric | 48 / 52 | 600 | Metric tile values |
| Display | 32 / 40 | 600 | Screen titles in presenter mode |
| H1 | 24 / 32 | 600 | Screen titles |
| H2 | 18 / 26 | 600 | Panel titles |
| Body | 14 / 20 | 400 | Default text |
| Small | 12 / 16 | 500 | Units, captions, table meta |
| Micro | 11 / 14 | 500 | Axis ticks, badges |
| Patient instruction | 72 to 120 | 500 | Patient Display only |

### Spacing, shape and depth

- 4 px base grid; use 4, 8, 12, 16, 24, 32, 48.
- Radius: 8 px for controls, 12 px for cards and panels, full for pills and badges.
- Borders over shadows. One shadow level only, for popovers and menus.
- Panels have 16 px padding; the cockpit uses 12 px to save space.

### Motion

- 150 ms for small UI changes, 250 ms for panels, ease-out.
- Live charts stream; they never animate between states.
- Alarm flashing follows conventions inspired by IEC 60601-1-8: high priority flashes fast, medium slower, low is steady (section 18).
- Respect `prefers-reduced-motion`: replace flashing with a steady border and replace the orb's easing with direct mapping.

### Iconography

Lucide icons at 1.5 px stroke, 16 or 20 px. Event markers have fixed icons: cough (wind), movement (move), talking (message-circle), repositioned (refresh-cw), discomfort (frown), note (sticky-note), hold start (pause), command (terminal).

### Data visualisation rules

1. Time runs left to right; the right edge of a live chart is now.
2. Every axis states its unit. Uncalibrated data says "counts (uncalibrated)".
3. The cleaned breathing signal is a 2 px smooth line; raw samples are optional 3 px dots.
4. Event markers are thin vertical lines with an icon flag at the top.
5. The phase ribbon is an 8 px band directly above the waveform.
6. Same series, same colour, on every screen.
7. No pie charts, no 3D charts, no dual axes except the pressure and comfort chart in Trends.
8. Every chart has defined empty, loading, paused, disconnected and simulated states.
9. Every chart can export PNG and SVG with the source badge burned in.

### Accessibility

- WCAG 2.2 AA contrast in both themes.
- Full keyboard reach and visible focus rings.
- Alarms announced through an `aria-live="assertive"` region.
- Minimum hit target 44 px on the cockpit, 56 px on touch screens.

## 9. App shell and shared components

Every screen sits inside the same shell: a 56 px top bar that always shows data source, device state and the STOP and VENT control, a left rail, and a 28 px status bar with honest pipeline numbers.

### Top bar (left to right)

1. Logo, product name and a small "Research prototype" tag.
2. **Source badge:** LIVE (green), REPLAY (blue) or SIMULATED (violet). Click to switch source; switching is disabled while recording.
3. **Device chip:** Connected, Connecting, Disconnected or Fault, with firmware version and measured sample rate in the tooltip.
4. **Calibration chip:** "Calibrated 3 days ago" or an amber "Uncalibrated".
5. **Patient chip** (during a session): pseudonymous ID, fraction n of N, treatment site. Name is masked unless privacy is off.
6. **Session timer** with a red recording dot.
7. **Alarm bell** with counts by priority; opens the alarm drawer.
8. **Privacy toggle** (eye icon) that masks identifiable fields everywhere.
9. **User menu:** role, switch user, lock.
10. **STOP and VENT** (red, right-most) whenever a device is connected and the belt may be pressurised.

### Status bar

Measured sample rate, dropped samples (count and %), end-to-end display latency, WebSocket state, disk space, local clock in IST, app version, protocol version. Clicking it opens the Device center.

### Shared components

| Component | Behaviour | Acceptance criteria |
| --- | --- | --- |
| `SourceBadge` | Renders from the `source` field of incoming data, not from a setting | Visible on every screen that shows data; SIMULATED also triggers chart watermarks |
| `EmergencyStopButton` | One click, no confirmation; sends `belt.stopVent`; shows Venting then Belt vented with live pressure | Reachable from every screen; logged in audit; works by keyboard; disabled only when no device is connected |
| `ConfirmHoldButton` | Press and hold 800 ms for non-emergency destructive actions (deflate, end session, delete) | Progress ring fills while held; release cancels |
| `AlarmBanner` | Full-width band under the top bar, coloured by priority, with acknowledge | Highest priority shown first; stacking count shown; never hides STOP and VENT |
| `MetricTile` | Label, value, unit, delta vs baseline, sparkline, status border | Fixed width; tabular numbers; greyed with a reason when the metric is not valid in the current state |
| `WaveformChart` | uPlot wrapper for live and replay streams | 55 fps or better with a 120 s window; gap rendering on signal loss |
| `PhaseRibbon` | 8 px band coloured by inhale, exhale, hold, pump activity | Aligned to the waveform x-axis to the pixel |
| `PressureStrip` | Absolute belt pressure, setpoint and pump ribbons | Shares the cockpit time axis |
| `QualityBadge` | Good, Fair or Poor with reasons in the tooltip | Reasons list the rule that fired |
| `SessionPill` | Floating mini waveform when away from the cockpit | Appears only during a live session; click returns |
| `CommandPalette` | Fuzzy search over screens, patients, sessions and actions | Opens in under 100 ms; respects role permissions |
| `Toast` | Bottom-right, for confirmations and advisories | Never used for alarms |
| `EmptyState` | Icon, one sentence, one action | Defined for every list and chart |
| `DisconnectedOverlay` | Greys the chart and shows "Signal lost 00:04" | Appears within 2 s of the last sample |
| `SimWatermark` | Diagonal SIMULATED text at 6% opacity across charts | Cannot be disabled while data is simulated |

### Keyboard shortcuts

| Keys | Action | Context |
| --- | --- | --- |
| Ctrl or Cmd + K | Command palette | Global |
| ? | Shortcut help | Global |
| Space | Add a generic event marker at now | Live |
| 1 to 6 | Cough, movement, talking, repositioned, discomfort, note | Live |
| B | Capture baseline | Live |
| R | Capture reference from the last good breaths | Live |
| H | Start or stop a breath-hold | Live, drill |
| P | Open Patient Display | Live |
| F | Focus mode (waveform full screen) | Live |
| \[ and \] | Shorter or longer time window | Live, review |
| L | Toggle raw sample dots | Live, review |
| N | Add a note | Live, review |
| Shift + S | STOP and VENT | Global, when a device is connected |
| Left and Right arrows, K | Step one breath back or forward; K plays or pauses | Review |
| Ctrl + Shift + P | Presenter mode | Global |
| Alt + 1 to 9 | Trigger a scripted scenario beat | Presenter mode |

## 10. Screen specs A: launch, home and patients

These screens establish the "data platform" framing before anyone sees a waveform: structured records, consent and visible data volume.

### SCR-01 Launch and Connect

**Purpose:** get from app launch to a streaming signal, from any of three sources, in under 20 s.

**Layout:**

- Splash (1.5 s): logo with a single breathing line that draws once.
- Three large source cards side by side:
  - **Live hardware:** lists serial ports, auto-highlights the Arduino Mega by USB vendor and product ID, baud fixed at 115200, "Connect" button.
  - **Recorded replay:** list of recorded sessions with date, patient code and duration.
  - **Simulation:** scenario picker with a preview sparkline for each preset.
- Handshake checklist that ticks live: Port opened, Data arriving, Format recognised (legacy text or protocol v2), Sample rate measured, Calibration loaded.

**States and errors:** port busy, no data within 3 s, unrecognised format, permission denied. Each error explains what happened, what it means, and offers "Try again" and "Use simulation instead".

**Acceptance criteria:**

- [ ] Last used source and port are remembered and auto-connect on launch (can be disabled).
- [ ] Measured sample rate is displayed within 5 s of data arriving.
- [ ] The legacy text line format from the current firmware is parsed without changes to the device.
- [ ] Choosing Simulation streams within 5 s and shows the SIMULATED badge.

### SCR-02 Login

Role tiles (Operator, Clinician, Researcher, Admin), then a PIN pad. Shows the intended-use line under the logo. In presenter mode a "Demo clinician" tile is pre-selected.

### SCR-03 Command Center (home)

**Purpose:** the morning view for a department, and the first proof that this is a platform.

**Layout (12-column grid):**

- **Header:** greeting, date, time (IST), device chip.
- **Today (8 columns):** scheduled sessions with patient code, fraction n of N, protocol, status (Scheduled, In progress, Done, Missed) and a Start button.
- **Device health (4 columns):** connection, measured rate, last calibration, last integrity test result, uptime, dropped samples today.
- **Quick actions:** New session, New patient, Run integrity test, Open simulation.
- **Course progress strip:** one card per active patient with a ring "Fraction 7 of 20", a reproducibility trend arrow and the last session's quality badge.
- **Recent sessions table:** mini sparkline per row, duration, quality, reviewed status.
- **Platform counters:** patients, sessions, hours recorded, breaths recorded. Counters animate up once on load. "48,210 breaths recorded" sells the data story better than any slide.
- **Needs attention:** calibration due, sessions awaiting sign-off, patients whose reproducibility is drifting, low disk space.

**Acceptance criteria:**

- [ ] Loads in under 1 s with 50 patients and 1,000 sessions.
- [ ] Every card has an empty state for a fresh install.
- [ ] Counters exclude simulated data unless "Include simulated" is on, and say so.

### SCR-04 Patient Registry

**Table columns:** patient code (PT-0007), masked name, age band, sex, treatment site, technique, fractions done of planned, last session date, reproducibility badge, status (Active, Completed, Paused, Archived), tags, SIM tag for simulated patients.

**Interactions:** search by code or name, filters (site, technique, status, tags, simulated), column sort, saved views, row hover shows the patient's Breath Fingerprint thumbnail, bulk anonymised export for researchers.

**Acceptance criteria:**

- [ ] Names are masked by default in presenter mode and for the Researcher role.
- [ ] Filtering 500 patients feels instant (under 100 ms).

### SCR-05 New Patient Wizard

Five-step stepper with a progress rail, draft autosave and zod validation.

1. **Identity:** auto-generated code, optional name and hospital ID (stored in the identity vault, hidden by default), year of birth (converted to an age band), sex, preferred language for the Patient Display (English, Kannada, Hindi, other).
2. **Clinical:** treatment site, laterality, technique (abdominal compression, breath-hold, free-breathing monitoring), planned fractions, start date, treating clinician, physicist.
3. **Belt plan:** belt size, landmark (free text, for example "lower edge 2 cm below xiphoid"), target pressure and maximum pressure. Both pressure fields show the helper text "Set with clinical input" and cannot exceed the system maximum.
4. **Notes:** conditions that affect breathing, mobility, communication needs (free text, optional).
5. **Consent:** data collection, setup photos, anonymised research use; date, witness, optional scanned form. A session cannot start without data collection consent.

### SCR-06 Patient Profile

**Header:** code, age band, site, technique, course ring (fraction n of N), next session, Start session button, privacy-aware name.

**Tabs:**

| Tab | Contents |
| --- | --- |
| Overview | Breath Fingerprint, key stats (median rate, amplitude, mean hold duration), course calendar heatmap coloured by reproducibility, comfort trend, latest notes |
| Plan | Technique, belt plan, protocol; versioned with a change history (who, when, what) |
| Sessions | List with sparkline, protocol, quality, reviewed status, source tag |
| Trends | Embedded SCR-11 |
| Setup photos | Gallery by fraction; overlay any two with an opacity slider |
| References | Captured reference patterns, the active one highlighted, preview of each cycle |
| Notes | Timeline of notes and annotations from all sessions |
| Consent and data | Consent status and history, export this patient's data, anonymise or delete request (logged) |

## 11. Screen specs B: Session Setup and the Live Cockpit

The Live Cockpit is the hero of the product and of the demo: one large waveform, the belt context beneath it, and a right column of metrics, mode controls and alarms.

### SCR-07 Session Setup (time-out)

**Purpose:** a short, aviation-style pre-flight that makes every session start the same way and leaves an auditable record.

**Layout:** patient summary card on the left (code, fraction n of N, technique, belt plan, last session's quality and setup photo); time-out checklist on the right; protocol timeline preview at the bottom.

| # | Check | How it is satisfied | Required |
| --- | --- | --- | --- |
| 1 | Patient identity confirmed | Operator ticks after verbal confirmation; shows code and year of birth | Yes |
| 2 | Consent on file | Automatic from consent record | Yes |
| 3 | Device connected and streaming | Automatic; shows measured rate | Yes (live) |
| 4 | Calibration valid | Automatic; amber if older than the configured number of days | Yes, override with reason |
| 5 | Belt integrity test passed today | Automatic, or "Run now" | Override with reason |
| 6 | Belt size and position as planned | Operator ticks; last setup photo shown for comparison | Yes |
| 7 | Protocol selected | Dropdown: Monitoring only, Breath-hold drill, Guided breathing, Gating (simulated), Custom | Yes |
| 8 | Patient Display ready | Button opens the second window and shows a test pattern | No |

**Protocol preview:** a horizontal timeline of the planned session, for example Baseline 60 s, then 5 holds of 20 s with 30 s rest, then Monitoring 5 min. Editable before start.

**Acceptance criteria:**

- [ ] Start is disabled until all required checks pass or are overridden with a typed reason.
- [ ] Every tick and override is written to the audit log with user and time.
- [ ] Fraction number is filled automatically from the course.

### SCR-08 Live Cockpit

&#91;embedded content: Live Cockpit layout · 1920 x 1080 wireframe\]

The waveform hero takes most of the screen; the pressure strip under it explains every disturbance, and the right column carries the numbers, controls and alarms.

**Zones at 1920 x 1080:**

| Zone | Size | Contents |
| --- | --- | --- |
| A. Top bar | 56 px | Global shell (section 9) |
| B. Session strip | 48 px | Patient code, fraction n of N, protocol, state pill (for example MONITORING), elapsed time, recording dot, Open Patient Display, End session (hold to confirm) |
| C. Waveform hero | About 68% width, 55% height | Breathing signal, phase ribbon, target band, ghost reference, events, peak and trough dots, live value readout, phase dial |
| D. Pressure strip | About 68% width, 15% height | Absolute belt pressure, setpoint line, pump and valve ribbons, top-up markers |
| E. Event bar | 56 px | Quick marker buttons and a note field |
| F. Right column | About 32% width | Metric tiles, mode panel, belt control, alarms, simulated beam gate |
| G. Session minimap | 40 px | Whole session compressed, with state segments and events; click for a quick-look popover |
| H. Status bar | 28 px | Global shell |

**C. Waveform hero, in detail**

- Scrolling display with now at the right edge; window 15, 30 (default), 60 or 120 s.
- Cleaned breathing signal as the hero line; optional raw sample dots (L key) so physicists can see exactly what the sensor delivered.
- Phase ribbon above: inhale, exhale, hold and pump activity.
- Peak and trough dots on detected breaths; the last breath shows its amplitude label.
- Target band (shaded, with draggable top and bottom handles) whenever a breath-hold or gating step is active.
- Ghost reference (dashed) aligned by breathing phase, scaled to the current baseline.
- Event markers as vertical lines with icon flags.
- Right-edge readout: current value and a small arrow for direction.
- Phase dial in the corner: a ring showing position in the current cycle.
- Corner controls: window length, raw dots, autoscale lock, freeze view, screenshot.
- Freeze view pauses the display only and shows "VIEW PAUSED, recording continues".
- Look-ahead prediction line (P2, labelled Research) dotted beyond now.

**D. Pressure strip:** absolute pressure line, dashed setpoint, amber ribbons where a pump runs, valve state markers, top-up events. It explains every disturbance in the waveform above it.

**E. Event bar:** buttons for Cough, Movement, Talking, Repositioned, Discomfort, Note, each with its shortcut digit; a free-text note field; recent markers chip list with undo for 10 s.

**F. Right column, top to bottom**

1. **Metric tiles (2 x 3):** Respiratory rate (br/min), Breathing amplitude (mmHg or counts), I:E ratio, Regularity score (0 to 100), Belt pressure (mmHg with setpoint), Signal quality (Good, Fair, Poor). Each tile shows the value, unit, delta versus baseline, a 60 s sparkline and a status border with an icon on threshold breach.
2. **Mode panel**, changing with the protocol step:
   - Monitoring: baseline versus now comparison and a Stillness score.
   - Breath-hold drill: large ring timer, hold count (3 of 5), live stability, last hold summary, Start and Stop hold.
   - Guided: active reference preview, similarity ring, the cue currently on the Patient Display.
   - Gating (simulated): beam lamp, duty cycle, beam-on time.
3. **Belt control:** target pressure stepper bounded by the plan maximum, Inflate, Hold, Deflate (hold to confirm), status line, comfort quick-log (0 to 10).
4. **Patient Display mirror:** a small live thumbnail of exactly what the patient sees.
5. **Alarms:** active alarms first, then the last 5 cleared.

**Key behaviours**

- Metrics are only computed in valid states; during Inflating, Settling, Top-up and Deflating the tiles grey out and state why ("Settling, metrics resume in 8 s").
- **Baseline capture (B):** records N good breaths (default 6) of free breathing and stores baseline rate, amplitude and end-exhale level. Target band defaults derive from it.
- **Reference capture (R):** averages the last N good breaths into a 100-point cycle template and offers to make it the patient's active reference.
- **Auto hold detection:** if the signal stays flat (slope below threshold for more than 2 s) outside a drill, the app proposes "Hold detected, start timing?"
- **Signal loss:** the chart shows a gap, the disconnected overlay appears within 2 s, ALM-02 fires.
- **No layout shift:** tiles have fixed widths and tabular numbers.
- **Focus mode (F):** waveform fills the screen with the six metrics as a translucent overlay; ideal for the projector.

**Responsive rules**

- At 1366 x 768 the right column becomes tabs (Metrics, Mode, Belt, Alarms) and the waveform keeps at least 60% of the viewport.
- Below 1280 px width the cockpit shows a "Best viewed on a larger screen" note but still works.

**Acceptance criteria:**

- [ ] Waveform renders at 55 fps or better with a 120 s window on the demo laptop.
- [ ] A sample appears on screen within 100 ms of arriving at the backend.
- [ ] Every metric tile shows its unit and its validity state.
- [ ] STOP and VENT, End session and the state pill are visible at all times.
- [ ] Markers added by keyboard land at the correct timestamp (within one sample).
- [ ] The SIMULATED watermark appears on the waveform and pressure strip whenever data is simulated.

## 12. Screen specs C: Patient Display, guided breathing and breath-hold drills

The patient sees a calm, wordless-feeling screen in their own language that mirrors their breathing and tells them only what to do next; all clinical numbers stay on the operator's side.

### SCR-09 Patient Display

**Delivery:** opens in its own window (`/display/:sessionId`) that can be dragged to a second monitor, projector or ceiling screen. P2: a tablet on the local network pairs by scanning a QR code shown in the cockpit.

**Data feed:** subscribes to a separate server stream (`/ws/display`) that carries only patient-safe fields: normalised breathing level, target band, current cue, countdown and language. Alarm text never reaches this stream.

**Visual modes (operator chooses per session or per patient):**

| Mode | What the patient sees | Best for |
| --- | --- | --- |
| Breathing Orb | A soft circle that grows on inhale and shrinks on exhale; a faint outer ring marks the hold target and glows when reached | Calm free breathing, anxious patients |
| Wave Path | A gentle wave scrolling right to left with a glowing ball that follows the breath; a translucent band shows the target | Guided breathing with a reference |
| Level Glass | A vertical glass that fills with inhale; a marked zone shows the target level | Breath-hold drills; clearest for older patients |

**Instruction cards (large, centred, one at a time):** Breathe normally. Breathe in slowly. Hold. Hold, 12. Relax and breathe out. Well done. Please stay still, your therapist is with you.

**Design rules:**

- Deep navy to teal gradient background, no pure black, no pure white.
- Instruction text 72 to 120 px; countdown numerals up to 200 px.
- No metrics, no scores, no red, no alarm wording. Positive feedback only.
- Progress shown as dots (hold 3 of 5), never as a percentage.
- Optional audio: a soft chime at hold start and end; recorded voice prompts per language; volume controlled from the cockpit.
- Languages: English, Kannada, Hindi at launch through react-i18next; strings reviewed by native speakers.
- **Fail-safe:** if the feed drops for more than 1.5 s, the display fades to "Please breathe normally" instead of freezing a misleading orb.

**Acceptance criteria:**

- [ ] Display latency from backend to orb is under 150 ms.
- [ ] Changing language in the cockpit updates the display within 1 s.
- [ ] The cockpit mirror thumbnail always matches the display.
- [ ] With reduced motion enabled, the orb maps size directly with no easing.

### F-HOLD Breath-hold drill engine

**Protocol parameters:** number of holds, target hold duration, rest between holds, countdown before each hold, target level (relative: percent of the way from end-exhale to the patient's maximum comfortable inhale; or absolute in mmHg), tolerance (plus or minus), minimum stable time before the hold counts, auto-advance on or off.

**Setting the target (UX):**

1. Baseline capture establishes end-exhale level and normal amplitude.
2. Operator presses "Capture max inhale" and asks for one deep comfortable breath in.
3. The app proposes a band (default 80% of the max, plus or minus 10% of the range).
4. Operator adjusts by dragging the band handles on the waveform or typing values.

**Hold cycle:** Countdown (3 s) then Breathe in then Reaching target then In target (timer runs) then Release cue then Rest. Each transition is pushed to the Patient Display.

**Per-hold metrics:** time to target, duration in band, percent of hold in band, mean level, level SD (stability), drift slope, exit reason (Completed, Released early, Drifted out, Aborted).

**Drill UI in the cockpit:** ring timer with the target duration as a full circle; hold list table with a mini trace per hold; summary card with mean duration, success count and hold-to-hold reproducibility (CV of mean hold level).

### F-GUIDE Guided breathing

**Reference sources:** the patient's own baseline (recommended default), the best previous fraction, or a template (rate in br/min and I:E ratio).

**How it works:** the reference cycle drives a pacer on the Patient Display (orb or wave path), while the live signal is overlaid. The operator sees a similarity score (M-17) and the live and ghost traces in the cockpit.

**Adaptive pacing (P2):** if the patient consistently lags the pacer, the pacer slows by up to 10% in small steps, and each change is logged as an event.

### F-LIVE-11 Simulated beam gate

A labelled demonstration of what gating logic would do: when the signal is inside the window, a large "BEAM ON" lamp lights in the cockpit; otherwise "BEAM HOLD". Shows duty cycle and accumulated beam-on time. The panel carries a permanent "SIMULATED, not connected to any treatment machine" label. Never shown on the Patient Display.

## 13. Screen specs D: review, fraction trends and comparison

Review turns one session into evidence; Trends turns a course of sessions into a reproducibility story, which is the view most likely to win over clinicians.

### SCR-10 Session Review

**Header:** patient code, fraction, date and time, duration, protocol, operator, source badge, integrity badge ("Checksum verified"), overall quality, reviewed status.

**Main area:**

- **Overview chart** of the whole session, downsampled with LTTB for speed, with state segments, events and alarms. Brushing a range drives the detail chart below.
- **Detail chart** with the same layers as the cockpit (phase ribbon, band, ghost, markers, raw dots toggle).
- **Playback:** play and pause at 1x, 2x, 4x and 8x; a scrubber; an optional synced replay of the Patient Display so a clinician can see exactly what the patient saw.

**Tabs below the charts:**

| Tab | Contents |
| --- | --- |
| Summary | Key metric cards and the Session story |
| Breaths | Per-breath table: index, start, period, Ti, Te, I:E, amplitude, peak level, trough level, quality, flags. Sortable; click a row to jump |
| Holds | Per-hold table plus all hold traces overlaid and aligned at the hold cue |
| Distributions | Amplitude and period histograms, Poincare plot (period n vs n+1), phase portrait (signal vs its rate of change), power spectrum with the dominant frequency |
| Events and notes | Timeline list; post-hoc annotations with author and time, all audited |
| Device | Pressure strip, pump activity, calibration used, firmware and protocol versions, dropped-sample timeline |
| Raw data | Virtualised sample table with CSV download |

**Session story (rule-based text, not an AI model):** a short generated paragraph, for example: "Breathing settled 38 s after inflation. Regularity averaged 86. Five of five breath-holds reached the target; mean hold 18.2 s. A cough at 06:12 interrupted hold 3. Signal quality was Good for 97% of the session." Each sentence links to the moment it describes.

**Actions:** Generate report, Export, Compare with, Set as reference, Mark reviewed (clinician sign-off with name and time, then the session becomes read-only except annotations).

### SCR-11 Fraction Trends

**Purpose:** show whether the patient breathes, holds and tolerates the belt the same way across the course.

**Layout:** a shared x-axis of fraction number with dates; charts stacked vertically, each 160 to 200 px tall:

1. **Breath-hold level per fraction:** mean with SD whiskers, a reference line and control limits (mean plus or minus 2 SD from the first k fractions or from the reference). Points outside the limits are red with an icon. This is a Shewhart-style control chart; physicists use these for QA and will recognise it immediately.
2. **Breath-hold duration per fraction:** median and range.
3. **Free-breathing rate and amplitude per fraction:** median with interquartile whiskers.
4. **Regularity score per fraction.**
5. **Belt pressure used and comfort rating per fraction** (the one allowed dual-axis chart).
6. **Similarity to reference per fraction.**

**Side panel:**

- Reproducibility summary: inter-fraction CV of hold level, percent of fractions within tolerance, trend direction.
- **Breath Fingerprint overlay:** each fraction's average cycle drawn as a closed polar curve, early fractions light, recent fractions dark. Consistent patients produce tightly stacked rings; drift is obvious at a glance.
- **Automated observations** (rule-based, labelled as such): for example "Hold level is 12% above reference over the last 4 fractions." Never phrased as advice.
- Course calendar heatmap (P2).

**Acceptance criteria:**

- [ ] Clicking any point opens that session's review at the relevant moment.
- [ ] Control limits and their basis are stated under the chart.
- [ ] Simulated fractions are tagged and excluded from statistics unless included explicitly.

### SCR-12 Compare

- Pick 2 to 4 sessions from the same or different patients.
- **Overlay mode:** align by session start, by first hold cue, or by the phase-averaged cycle.
- **Side-by-side mode:** synced scrubbing across panels.
- **Difference table:** each metric with values and deltas.
- Typical uses: belt inflated vs not inflated ("breathing amplitude at the belt" with and without compression), fraction 1 vs fraction 10, patient A vs patient B.
- The Compare view never claims organ motion; its subtitle reads "Signals measured at the belt".

## 14. Screen specs E: reports, research hub and validation lab

These screens answer the two questions clinicians and physicists always ask: "Can I get this on paper?" and "How do you know the signal is real?"

### SCR-13 Reports

Reports are HTML routes styled with print CSS, previewed in the app and exported to PDF by the backend through headless Chromium, so the PDF looks exactly like the preview.

| Report | Pages | Contents |
| --- | --- | --- |
| Session report | 1 to 2 A4 | Header (product, research disclaimer, patient code, fraction, date, operator, device ID, firmware, calibration date); summary metric table; overview waveform; breath-hold table and overlay; events and alarms; comfort ratings; notes; reviewer sign-off lines; footer with session ID, SHA-256 hash of the raw data, QR code holding the session ID, page numbers |
| Course summary | 2 to 4 A4 | All trend charts, reproducibility summary, fraction table, Fingerprint overlay |
| Calibration certificate | 1 A4 | Reference points, fit, R squared, residuals, hysteresis, operator, date, validity period |
| Belt integrity test | 1 A4 | Test pressure, hold time, decay rate, pass or fail, trace |

**Rules:**

- Any page containing replayed or simulated data carries a diagonal watermark and a header line naming the source.
- Identifiable fields appear only if the exporting user may see them and privacy mode is off.
- Batch export: all sessions for one patient as one PDF.

### SCR-14 Research Hub

**Dataset builder (wizard):**

1. **Filter:** date range, site, technique, protocol, source (live only by default), minimum quality, reviewed only.
2. **Fields:** samples, breaths, holds, events, alarms, session metadata, plan metadata, comfort.
3. **Anonymisation:** drop identifiers (always), shift dates by a random per-patient offset, age bands only, generalise rare sites, warn when a filter returns fewer than 5 patients.
4. **Format:** CSV, Parquet or JSON.
5. **Bundle:** data files, `data_dictionary.md`, `manifest.json` (schema version, filters, counts, file hashes, app version, created by, purpose note).

**Dataset versions:** every export is listed with its hash, filters, author and purpose so a model can always be traced back to the exact data.

**Cohort analytics:** counts (patients, sessions, hours, breaths); distributions of rate and amplitude across the cohort; hold success rate by protocol; comfort against belt pressure scatter; reproducibility by technique.

**Labelling workspace (P2):** a keyboard-driven view for tagging breaths and segments (normal, cough, talking, artefact, irregular) to build supervised training data.

**Model lab (P2, labelled Research):** shows a look-ahead prediction model replayed on recorded or simulated data, with error against prediction horizon. It demonstrates the research direction without making clinical claims.

### SCR-15 Validation Lab

**Purpose:** show agreement between the belt signal and an independent reference.

- **Import a reference signal:** CSV with timestamps from a spirometer, a stretch sensor, or a marker tracked in phone video of the abdomen.
- **Align** by cross-correlation and report the lag.
- **Agreement:** both traces overlaid, correlation coefficient, breath-by-breath rate agreement, Bland-Altman plot of normalised amplitudes.
- **Calibration view:** reference pressure against readings with the fit line, residuals, and the hysteresis loop (rising vs falling).
- **Noise floor and drift runs:** a table of test runs with mean, SD and peak-to-peak.
- **Latency:** histogram of device-to-screen latency.

Even one rough validation run makes the presentation far stronger; this screen gives it a professional home.

## 15. Screen specs F: device, simulation, presenter mode, settings and audit

These are the "engine room" screens: unglamorous, but they are where physicists decide whether to trust the product, and where the demo is made unbreakable.

### SCR-16 Device and Calibration Center

**Status panel:** port, firmware version, protocol (legacy text or v2), uptime, measured rate (rolling 10 s and since connect), dropped and late samples, last fault code, heartbeat state.

**Raw console:** monospace scrolling view of incoming lines with pause, filter, copy and save. Built for Yashwanth's debugging.

**Calibration wizard:**

1. Connect the reference (manual gauge in mmHg or a water column).
2. Zero: belt open to atmosphere, tare.
3. Points: apply 0, 10, 20, 30, 40, 50 mmHg rising, then falling. Each point records a 5 s mean and SD with a stability check before capture.
4. Fit: linear fit with slope, offset, R squared, residuals and hysteresis.
5. Save: stored with date, operator and validity period; optionally written to the device.
6. Certificate: one-click PDF.

**Tests:**

| Test | What it does | Output | Needs |
| --- | --- | --- | --- |
| Noise floor | 60 s with the belt sealed and still | Mean, SD, peak-to-peak | Current hardware |
| Warm-up drift | 10 min log from cold start | Drift curve and settled time | Current hardware |
| Belt integrity | Inflate to test pressure, hold, measure decay | Leak rate, pass or fail | Firmware commands (simulated until then) |
| Pump check | Run each pump briefly | Pressure response, noise at switching | Firmware commands |

**Diagnostics bundle (P2):** zips logs, config and the last 10 minutes of raw lines for debugging.

### SCR-17 Simulation Studio

**Generator controls:** rate (6 to 30 br/min), amplitude, I:E ratio, waveform shape exponent, period variability (%), amplitude variability (%), baseline drift, noise level, sample rate (10 Hz default; 25 and 50 Hz for testing), quantisation, leak decay, pump transient injection. A live preview chart updates as sliders move.

**Scenario presets:**

| Preset | Behaviour |
| --- | --- |
| Calm and regular | 12 br/min, low variability |
| Anxious and shallow | 20 br/min, small amplitude, high variability |
| Irregular | Variable periods, occasional sighs |
| Coughing | Normal breathing with cough bursts |
| Talking | High-frequency irregular segments |
| Drifting baseline | Slow downward creep after inflation |
| Excellent breath-holder | Fast to target, flat, long holds |
| Struggling breath-holder | Slow to target, drifting holds, early release |
| Sensor dropout | 3 s gaps |
| Slow leak | Absolute pressure decays, triggers ALM-08 |
| Overpressure | Pressure climbs to trigger ALM-01 (for demonstrating alarms) |

**Event injection buttons:** cough, sigh, movement, talking, dropout, saturation, leak, pump top-up.

**Virtual cohort generator:** creates N patients with M fractions each, seeded, with individual traits and learning curves (for example hold duration improving over the first 5 fractions, one patient drifting from fraction 9). All records are tagged simulated and use codes like PT-S014.

**Replay manager:** list recordings, play at 1x to 8x, loop, and expose any recording as a data source.

**Determinism:** the seed is always shown; the same seed and scenario produce identical data.

### SCR-21 Presenter Mode (overlay)

- Toggled with Ctrl + Shift + P. Turns on privacy masking, increases type size by 15%, hides developer chips, shows a collapsible presenter panel.
- **Script runner:** loads a JSON demo script of beats (open patient PT-S003, start session, inject cough at 00:45, start drill). The presenter advances with the Right arrow or a clicker; Alt + 1 to 9 fires specific beats.
- **Spotlight tour (P2):** dims the screen except one component and shows a caption; used to explain the cockpit zone by zone.
- **Fallback hot swap:** one key switches the live source to a chosen recording. The badge changes to REPLAY and a toast announces it. Never silent.
- **Rehearsal timer** with per-beat targets.

### SCR-18 Settings

| Group | Settings |
| --- | --- |
| General | Units (mmHg default, cmH2O, kPa), time format, language, theme |
| Thresholds | Alarm thresholds per protocol, quality thresholds, settling window, baseline breath count, calibration validity days |
| Protocols | Create, edit, duplicate and version protocol templates |
| Patient Display | Default mode, languages, instruction strings, audio files, volume |
| Users | Accounts, roles, PIN reset |
| Data | Storage folder, backup and restore, retention, auto-backup at session end |
| Device | Preferred port, parser (legacy or v2), heartbeat interval, system maximum pressure (read-only, set by firmware or admin) |

### SCR-19 Audit Log

Immutable, append-only list of who did what and when: logins, patient and plan edits, session start and end, belt commands, STOP and VENT, alarm acknowledgements, threshold changes, calibrations, exports, deletions. Filters by user, action and entity; before and after diff for edits; CSV export.

### SCR-20 About and Intended Use

Intended use statement, "Research prototype, not a medical device", team and affiliation, app, protocol and firmware versions, open-source licences, data handling summary.

## 16. Feature catalogue

The catalogue holds 79 features: 35 are P0 for the demo, 32 are P1 and 12 are P2; 65 run on the current hardware stream, 3 need firmware v2, 3 need extra sensors and 8 are simulated in the MVP. Change priority or hardware status with the dropdowns as plans move.

### Platform, patients, sessions and live cockpit

| ID | Feature | Screens | Priority | Hardware |
| --- | --- | --- | --- | --- |
| F-SHELL-01 | App shell: top bar, rail, status bar | All | P0 | Ready |
| F-SHELL-02 | Source badge, source switcher, SIMULATED watermark | All | P0 | Ready |
| F-SHELL-03 | STOP and VENT control | All | P0 | Firmware v2 |
| F-SHELL-04 | Command palette | All | P1 | Ready |
| F-SHELL-05 | Privacy mask | All | P0 | Ready |
| F-SHELL-06 | Keyboard shortcuts and help overlay | All | P1 | Ready |
| F-SHELL-07 | Session pill | All | P1 | Ready |
| F-AUTH-01 | Local login, roles, auto-lock | SCR-02 | P1 | Ready |
| F-CONN-01 | Connect, handshake, legacy text parser | SCR-01 | P0 | Ready |
| F-CONN-02 | Auto-reconnect with gap marking | SCR-01, SCR-08 | P0 | Ready |
| F-HOME-01 | Command Center with platform counters | SCR-03 | P0 | Ready |
| F-PAT-01 | Patient registry | SCR-04 | P0 | Ready |
| F-PAT-02 | New patient wizard with consent | SCR-05 | P0 | Ready |
| F-PAT-03 | Patient profile and tabs | SCR-06 | P0 | Ready |
| F-PAT-04 | Setup photo capture (laptop webcam) and overlay | SCR-06, SCR-07 | P2 | Ready |
| F-SES-01 | Session setup and time-out checklist | SCR-07 | P0 | Ready |
| F-SES-02 | Protocol templates and editor | SCR-07, SCR-18 | P1 | Ready |
| F-SES-03 | Session state machine | SCR-08 | P0 | Ready |
| F-LIVE-01 | Waveform hero | SCR-08 | P0 | Ready |
| F-LIVE-02 | Phase ribbon, peak and trough markers | SCR-08 | P0 | Ready |
| F-LIVE-03 | Metric tiles | SCR-08 | P0 | Ready |
| F-LIVE-04 | Pressure strip with pump ribbons | SCR-08 | P0 | Ready |
| F-LIVE-05 | Event markers and notes | SCR-08 | P0 | Ready |
| F-LIVE-06 | Baseline capture | SCR-08 | P0 | Ready |
| F-LIVE-07 | Reference capture and ghost overlay | SCR-08 | P1 | Ready |
| F-LIVE-08 | Signal quality index | SCR-08 | P0 | Ready |
| F-LIVE-09 | Belt controls and setpoint | SCR-08 | P1 | Firmware v2 |
| F-LIVE-10 | Comfort logging | SCR-08 | P1 | Ready |
| F-LIVE-11 | Simulated beam gate | SCR-08 | P1 | Simulated |
| F-LIVE-12 | Look-ahead prediction line | SCR-08 | P2 | Simulated |
| F-LIVE-13 | Focus mode | SCR-08 | P1 | Ready |

### Guidance, patient display, review, reports and research

| ID | Feature | Screens | Priority | Hardware |
| --- | --- | --- | --- | --- |
| F-LIVE-14 | Patient Display mirror thumbnail | SCR-08 | P1 | Ready |
| F-HOLD-01 | Breath-hold drill engine | SCR-08 | P0 | Ready |
| F-HOLD-02 | Target band editor | SCR-08 | P0 | Ready |
| F-HOLD-03 | Automatic hold detection | SCR-08 | P1 | Ready |
| F-GUIDE-01 | Guided breathing pacer | SCR-08, SCR-09 | P1 | Ready |
| F-GUIDE-02 | Similarity score | SCR-08 | P1 | Ready |
| F-GUIDE-03 | Adaptive pacing | SCR-09 | P2 | Ready |
| F-DISP-01 | Patient Display modes (Orb first) | SCR-09 | P0 | Ready |
| F-DISP-02 | English, Kannada and Hindi instructions | SCR-09 | P1 | Ready |
| F-DISP-03 | Audio cues and voice prompts | SCR-09 | P1 | Ready |
| F-DISP-04 | Tablet pairing by QR code | SCR-09 | P2 | Ready |
| F-REV-01 | Session review, overview and detail charts | SCR-10 | P0 | Ready |
| F-REV-02 | Playback with Patient Display replay | SCR-10 | P1 | Ready |
| F-REV-03 | Per-breath and per-hold tables | SCR-10 | P0 | Ready |
| F-REV-04 | Distributions: histograms, Poincare, phase portrait, spectrum | SCR-10 | P1 | Ready |
| F-REV-05 | Session story | SCR-10 | P1 | Ready |
| F-REV-06 | Clinician sign-off | SCR-10 | P1 | Ready |
| F-TRD-01 | Fraction trends and control chart (simulated cohort in MVP) | SCR-11 | P0 | Simulated |
| F-TRD-02 | Breath Fingerprint | SCR-06, SCR-11 | P1 | Ready |
| F-TRD-03 | Course calendar heatmap | SCR-06, SCR-11 | P2 | Ready |
| F-TRD-04 | Automated observations | SCR-11 | P1 | Ready |
| F-CMP-01 | Session compare | SCR-12 | P1 | Ready |
| F-RPT-01 | Session report PDF | SCR-13 | P0 | Ready |
| F-RPT-02 | Course summary report | SCR-13 | P1 | Ready |
| F-RPT-03 | Calibration certificate | SCR-13 | P1 | Ready |
| F-RES-01 | Dataset builder and bundle export | SCR-14 | P1 | Ready |
| F-RES-02 | Cohort analytics | SCR-14 | P1 | Ready |
| F-RES-03 | Labelling workspace | SCR-14 | P2 | Ready |
| F-RES-04 | Model lab | SCR-14 | P2 | Simulated |
| F-VAL-01 | Validation lab | SCR-15 | P2 | Extra sensor |

### Device, simulation, demo, governance and extensions

| ID | Feature | Screens | Priority | Hardware |
| --- | --- | --- | --- | --- |
| F-DEV-01 | Device status and raw console | SCR-16 | P0 | Ready |
| F-DEV-02 | Calibration wizard | SCR-16 | P0 | Ready |
| F-DEV-03 | Belt integrity test | SCR-16 | P1 | Firmware v2 |
| F-DEV-04 | Noise floor and warm-up drift tests | SCR-16 | P1 | Ready |
| F-SIM-01 | Synthetic breathing generator | SCR-17 | P0 | Simulated |
| F-SIM-02 | Scenario presets and event injection | SCR-17 | P0 | Simulated |
| F-SIM-03 | Virtual cohort generator | SCR-17 | P0 | Simulated |
| F-SIM-04 | Recording and replay | SCR-17 | P0 | Ready |
| F-DEMO-01 | Presenter mode and script runner | SCR-21 | P1 | Ready |
| F-DEMO-02 | Spotlight tour | SCR-21 | P2 | Ready |
| F-DEMO-03 | Live-to-replay hot swap | SCR-21 | P0 | Ready |
| F-ALM-01 | Alarm engine, banner and drawer | All | P0 | Ready |
| F-SET-01 | Settings | SCR-18 | P0 | Ready |
| F-AUD-01 | Audit log | SCR-19 | P1 | Ready |
| F-DATA-01 | Backup and restore | SCR-18 | P1 | Ready |
| F-EXT-01 | Heart rate and SpO2 tile | SCR-08 | P2 | Extra sensor |
| F-EXT-02 | Posture and motion from an IMU | SCR-08 | P2 | Extra sensor |
| F-EXT-03 | Belt digital twin: 3D torso, illustrative | SCR-08 | P2 | Simulated |

Until firmware v2 accepts commands, STOP and VENT can only act in simulation; on live hardware the physical emergency stop stays the primary control, and the button says so in its tooltip.

## 17. Metrics and signal processing contract

All metrics are computed once, in the backend, by a single pipeline shared by live, replay and simulation; the UI displays metrics and never computes clinical values itself.

### Pipeline

1. **Ingest:** parse each line (legacy text parser now, protocol v2 later) into a sample with sequence number, device timestamp, raw counts and pump state.
2. **Validate:** detect gaps and repeats using sequence numbers or timestamps; count drops; flag saturation and flat lines.
3. **Calibrate:** convert counts to mmHg with the active calibration (slope and offset). Without calibration, keep counts and mark every value "uncalibrated".
4. **Low-pass:** 2nd-order Butterworth around 1.0 Hz to remove pump and electrical noise. Live uses a causal filter; review uses zero-phase filtering.
5. **Baseline removal:** subtract a rolling median (default 20 s window) to isolate the breathing component from inflation level and slow drift.
6. **Breath detection:** find peaks and troughs with minimum spacing 1.5 s (40 br/min) and maximum period 15 s; prominence at least the larger of 3 x noise SD and 15% of the median amplitude.
7. **Per-breath features:** period, Ti, Te, amplitude, peak level, trough level, quality.
8. **Rolling metrics:** computed over the last 6 complete breaths (or 30 s) and published at 1 Hz.
9. **Quality and state gating:** metrics are suppressed during Inflating, Settling, Top-up and Deflating, and breaths overlapping pump activity or events are excluded.

Live values are labelled "live estimate". Review values (zero-phase, full context) are labelled "final" and may differ slightly; the report always uses final values.

### Metric definitions

| ID | Metric | Definition | Unit | Shown in |
| --- | --- | --- | --- | --- |
| M-01 | Respiratory rate | 60 divided by the mean breath period over the last 6 breaths | br/min | Cockpit, review, trends |
| M-02 | Breathing amplitude | Median of peak minus preceding trough over the last 6 breaths | mmHg (counts if uncalibrated) | Cockpit, review, trends |
| M-03 | Inspiratory time (Ti) | Trough to peak | s | Review |
| M-04 | Expiratory time (Te) | Peak to next trough | s | Review |
| M-05 | I:E ratio | Ti divided by Te, displayed as 1:x | ratio | Cockpit, review |
| M-06 | Period variability | Coefficient of variation of periods in the window | % | Review, quality |
| M-07 | Amplitude variability | Coefficient of variation of amplitudes in the window | % | Review, quality |
| M-08 | Regularity score | See formula below | 0 to 100 | Cockpit, trends |
| M-09 | End-exhale stability | SD of trough levels in the window | mmHg | Cockpit (monitoring), trends |
| M-10 | Baseline drift | Linear slope of trough levels over the last 60 s | mmHg/min | Cockpit, review |
| M-11 | Belt pressure | Calibrated absolute pressure, smoothed | mmHg | Cockpit, trends |
| M-12 | Hold duration | Time from band entry to band exit | s | Drill panel, review, trends |
| M-13 | Hold stability | SD of the signal while in the band | mmHg | Drill panel, review |
| M-14 | Hold drift | Linear slope within the hold | mmHg/s | Review |
| M-15 | Time to target | Hold cue to band entry | s | Drill panel, review |
| M-16 | In-window duty cycle | Percent of gating time spent in the window | % | Beam gate panel |
| M-17 | Similarity to reference | See formula below | 0 to 100 | Guided panel, trends |
| M-18 | Signal quality index | Good, Fair or Poor from the rules below | category | Cockpit, review |
| M-19 | Stillness score | Mean of M-08 and an end-exhale stability score | 0 to 100 | Cockpit (monitoring) |
| M-20 | Inter-fraction reproducibility | CV of fraction-mean hold level (or end-exhale level) across fractions; percent of fractions within tolerance of reference | % | Trends, course report |
| M-21 | Leak rate | Slope of absolute pressure during a sealed, breath-free hold | mmHg/min | Integrity test |
| M-22 | Comfort | Patient-reported score | 0 to 10 | Cockpit, trends |
| M-23 | Breathing phase | Position in the current cycle; 0% = end-exhale trough, about 40% = peak, 100% = next trough | % | Phase dial, ghost alignment |

Phase conventions differ between vendors (many 4D CT systems call end-inhale 0%), so the phase dial tooltip states our convention explicitly.

### Formulas

Respiratory rate over the last N = 6 breaths with periods T:

```latex
\mathrm{RR} = \frac{60}{\frac{1}{N}\sum_{k=1}^{N} T_k}
```

Regularity score from the coefficients of variation of period and amplitude (default scale factors 0.25 and 0.30 are starting points to tune on real data):

```latex
R = 100 \cdot \operatorname{clamp}\left(1 - 0.5\,\frac{CV_T}{0.25} - 0.5\,\frac{CV_A}{0.30},\; 0,\; 1\right)
```

Similarity of the last live cycle x to the reference cycle r, both resampled to 100 phase points, where rho is their Pearson correlation and A is amplitude:

```latex
S = 100 \cdot \max(0, \rho_{x,r}) \cdot \min\left(\frac{A_x}{A_r}, \frac{A_r}{A_x}\right)
```

### Signal quality rules (M-18)

| Level | Rule (all thresholds configurable) |
| --- | --- |
| Good | Amplitude at least 8 x noise SD, dropped samples under 1% in 30 s, no saturation, no flat line, no artefact flags |
| Fair | Amplitude 4 to 8 x noise SD, or drops 1 to 5%, or one artefact flag in 30 s |
| Poor | Amplitude under 4 x noise SD, or drops over 5%, or saturation, or flat line over 3 s |

The tooltip always lists the rule that set the level, for example "Fair: 2.3% samples dropped in the last 30 s".

### Sample rate and units

- The pipeline never assumes a sample rate; it uses device timestamps when present and host arrival times otherwise, and shows the measured rate.
- The pipeline must work from 5 Hz to 50 Hz so firmware improvements need no UI changes.
- Thresholds are stored in mmHg; absolute thresholds are disabled while uncalibrated, and only relative ones (percent of baseline) apply.

## 18. Alarms and alerts

Alarms use three priorities plus advisories, with visual and audio behaviour inspired by IEC 60601-1-8 conventions; the software is never the only safety layer, and the Patient Display never shows alarm text.

### Priority behaviour

| Priority | Colour | Visual | Sound | Acknowledge |
| --- | --- | --- | --- | --- |
| High | Red | Banner and affected tile flash at about 2 Hz; icon and text | Repeating burst of pulses | Silences audio for 2 min; banner stays until the condition clears |
| Medium | Amber | Banner flashes at about 0.5 Hz | Repeating 3-pulse tone | Silences until the condition clears |
| Low | Cyan | Steady banner | Single tone once | Clears automatically |
| Advisory | Neutral | Toast or Needs attention card | None | Dismiss |

### Alarm catalogue (defaults; every threshold is configurable per protocol)

| ID | Name | Default trigger | Priority | UI response |
| --- | --- | --- | --- | --- |
| ALM-01 | Overpressure | Belt pressure above the plan maximum | High | Banner, red pressure tile, auto STOP and VENT command when firmware supports it, logged |
| ALM-02 | Signal lost | No samples for 2 s during a session | High | Chart gap, disconnected overlay, banner |
| ALM-03 | Device disconnected | Serial port closed | High | Reconnect attempts every 2 s; presenter mode offers replay fallback |
| ALM-04 | Device fault | Fault code reported by firmware | High | Banner with code and guidance |
| ALM-05 | No breathing cycles detected | No breath detected for 15 s outside a hold | Medium | "Check patient and belt" banner |
| ALM-06 | Breath-hold lost | Signal leaves the band before the minimum hold time | Medium | Drill panel marks the hold; Patient Display shows "Relax and breathe normally" |
| ALM-07 | Pressure low or leak | Belt pressure below setpoint minus tolerance for 10 s | Medium | Banner, pressure tile amber |
| ALM-08 | Patient discomfort | Comfort score 7 or above, or patient button (future) | Medium | Banner, suggests deflate |
| ALM-09 | Irregular breathing | Regularity under 50 for 30 s | Low | Tile border, low banner |
| ALM-10 | Poor signal quality | Quality Poor for 10 s | Low | Quality tile, reason shown |
| ALM-11 | Sample loss | Over 2% samples dropped in 30 s | Low | Status bar highlight, low banner |
| ALM-12 | Sample rate anomaly | Measured rate deviates over 10% from expected | Low | Device chip amber |
| ALM-13 | Calibration expired | At session start | Advisory | Checklist item amber |
| ALM-14 | Low disk space | Under 1 GB free | Advisory | Needs attention card |

### Rules against alarm fatigue

- Every alarm has a delay and a hysteresis band so it does not chatter on the threshold.
- Breath-dependent alarms are suppressed during Inflating, Settling, Top-up and Deflating.
- "Silence low priority for this session" is available to clinicians and is audited.
- All alarms, acknowledgements and silences are stored with the session and listed in its report.

## 19. Data model

These types are the single source of truth: Pydantic models in the backend mirror them, and Cursor must update both sides together whenever one changes.

```typescript
// packages/shared/src/types.ts
export type ID = string;            // ULID
export type ISODate = string;       // ISO 8601 with offset
export type DataSource = 'live' | 'replay' | 'simulated';
export type PressureUnit = 'mmHg' | 'cmH2O' | 'kPa' | 'counts';

export interface Patient {
  id: ID;
  code: string;                     // "PT-0007", simulated: "PT-S014"
  identity?: { fullName?: string; hospitalId?: string }; // vault, masked by default
  birthYear?: number;
  ageBand: string;                  // "60-69"
  sex: 'F' | 'M' | 'X' | 'U';
  language: 'en' | 'kn' | 'hi' | string;
  tags: string[];
  status: 'active' | 'completed' | 'paused' | 'archived';
  isSimulated: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface BeltPlan {
  size: 'S' | 'M' | 'L' | 'XL';
  landmark: string;
  targetPressureMmHg?: number;      // set with clinical input
  maxPressureMmHg?: number;         // cannot exceed system maximum
  notes?: string;
}

export interface TreatmentPlan {
  id: ID;
  patientId: ID;
  site: 'lung' | 'liver' | 'pancreas' | 'breast_left' | 'breast_right' | 'other';
  laterality?: 'left' | 'right' | 'bilateral';
  technique: 'abdominal_compression' | 'breath_hold' | 'free_breathing' | 'gating_sim';
  fractionsPlanned: number;
  startDate: ISODate;
  clinician?: string;
  physicist?: string;
  belt: BeltPlan;
  protocolTemplateId: ID;
  version: number;
}

export interface Consent {
  id: ID;
  patientId: ID;
  dataCollection: boolean;
  photos: boolean;
  researchUse: boolean;
  date: ISODate;
  witness?: string;
  documentPath?: string;
}

export interface TargetBand {
  mode: 'relative' | 'absolute';    // relative = % of end-exhale to max-inhale range
  level: number;
  tolerance: number;
}

export type ProtocolStep =
  | { kind: 'baseline'; breaths: number; maxDurationS: number }
  | { kind: 'monitor'; durationS: number }
  | { kind: 'hold_drill'; holds: number; holdS: number; restS: number; countdownS: number; minStableS: number; target: TargetBand }
  | { kind: 'guided'; durationS: number; reference: 'baseline' | 'previous_best' | 'template'; rateBpm?: number; ieRatio?: number }
  | { kind: 'gating_sim'; durationS: number; window: TargetBand };

export interface ProtocolTemplate { id: ID; name: string; version: number; steps: ProtocolStep[] }

export type SessionState =
  | 'draft' | 'prechecks' | 'fitting' | 'inflating' | 'settling' | 'baseline'
  | 'monitoring' | 'hold_drill' | 'guided' | 'gating_sim' | 'topup'
  | 'deflating' | 'post' | 'completed' | 'aborted' | 'fault';

export interface DeviceInfo {
  deviceId: string;
  firmware: string;
  protocol: 'legacy_text' | 'v2';
  port?: string;
  measuredRateHz?: number;
}

export interface Session {
  id: ID;
  patientId: ID;
  planId: ID;
  fraction: number;
  source: DataSource;
  protocolTemplateId: ID;
  operatorId: ID;
  startedAt: ISODate;
  endedAt?: ISODate;
  state: SessionState;
  calibrationId?: ID;
  device: DeviceInfo;
  summary?: SessionSummary;
  reviewedBy?: ID;
  reviewedAt?: ISODate;
  rawSha256?: string;
  notes?: string;
}

export interface SessionSummary {
  durationS: number;
  breaths: number;
  rrMedian: number;
  amplitudeMedian: number;
  regularityMean: number;
  holdsAttempted: number;
  holdsCompleted: number;
  holdDurationMean?: number;
  qualityGoodPct: number;
  droppedPct: number;
  story: string;                    // rule-based session story
}

export interface Sample {
  sessionId: ID;
  seq: number;
  tDeviceUs?: number;
  tHostMs: number;
  raw: number;
  pressure?: number;                // calibrated, absolute
  breathing?: number;               // filtered, baseline removed
  pumpIn: boolean;
  pumpOut: boolean;
  flags: number;                    // bitfield: saturation, gap, artefact, etc.
}

export interface Breath {
  sessionId: ID;
  index: number;
  tStart: number; tPeak: number; tEnd: number;   // seconds from session start
  periodS: number; tiS: number; teS: number;
  amplitude: number; peakLevel: number; troughLevel: number;
  quality: 'good' | 'fair' | 'poor';
  flags: string[];
}

export interface Hold {
  sessionId: ID;
  index: number;
  cueAt: number;
  enteredAt?: number;
  exitedAt?: number;
  durationS: number;
  timeToTargetS?: number;
  meanLevel: number;
  sdLevel: number;
  driftPerS: number;
  inWindowPct: number;
  exitReason: 'completed' | 'released' | 'drifted' | 'aborted';
}

export type EventType =
  | 'cough' | 'movement' | 'talking' | 'repositioned' | 'discomfort' | 'note'
  | 'baseline_captured' | 'reference_captured' | 'hold_start' | 'hold_end'
  | 'topup' | 'state_change' | 'command' | 'source_switch' | 'custom';

export interface SessionEvent {
  id: ID;
  sessionId: ID;
  t: number;
  type: EventType;
  source: 'operator' | 'device' | 'system' | 'simulation';
  text?: string;
  data?: Record<string, unknown>;
  authorId?: ID;
}

export interface Alarm {
  id: ID;
  sessionId?: ID;
  code: string;                     // "ALM-01"
  priority: 'high' | 'medium' | 'low' | 'advisory';
  raisedAt: ISODate;
  clearedAt?: ISODate;
  acknowledgedAt?: ISODate;
  acknowledgedBy?: ID;
  message: string;
  value?: number;
}

export interface ReferencePattern {
  id: ID;
  patientId: ID;
  fromSessionId: ID;
  method: 'baseline_avg' | 'best_fraction' | 'template';
  cycle: number[];                  // 100 phase points, normalised 0..1
  periodS: number;
  amplitude: number;
  active: boolean;
}

export interface Calibration {
  id: ID;
  deviceId: string;
  performedAt: ISODate;
  operatorId: ID;
  points: { refMmHg: number; rawMean: number; rawSd: number; direction: 'up' | 'down' }[];
  slope: number;
  offset: number;
  r2: number;
  maxResidualMmHg: number;
  hysteresisMmHg: number;
  validUntil: ISODate;
}

export interface ComfortRating { sessionId: ID; t: number; score: number; context: 'after_inflate' | 'mid' | 'end' | 'adhoc' }
export interface SetupPhoto { id: ID; sessionId: ID; path: string; takenAt: ISODate; note?: string }
export interface User { id: ID; name: string; role: 'operator' | 'clinician' | 'researcher' | 'admin'; pinHash: string }
export interface AuditEntry { id: ID; at: ISODate; userId: ID; action: string; entity: string; entityId: ID; before?: unknown; after?: unknown }

export interface DatasetExport {
  id: ID;
  createdAt: ISODate;
  createdBy: ID;
  purpose: string;
  filters: Record<string, unknown>;
  fields: string[];
  format: 'csv' | 'parquet' | 'json';
  anonymisation: { dateShift: boolean; ageBandsOnly: boolean; generaliseSites: boolean };
  counts: { patients: number; sessions: number; breaths: number };
  manifestSha256: string;
}

export interface SimulationScenario {
  id: ID;
  name: string;
  seed: number;
  params: Record<string, number>;   // see section 21
  events: { atS: number; type: string; durationS?: number }[];
}
```

### Storage notes

- SQLite through SQLModel, one file in the data folder; WAL mode on.
- Samples are stored per session in a plain table for the MVP (30 min at 10 Hz is 18,000 rows). Move to chunked binary blobs only if profiling demands it.
- Each live session is also appended to a CSV journal on disk as it records, so a crash loses at most 1 s.
- On session end, the backend computes a SHA-256 hash of the raw samples and stores it with the session; review shows "Checksum verified" when it still matches.

## 20. Technical architecture, stack and real-time contract

A local Python service owns the device, the signal pipeline, the simulator and storage; a React app renders everything; both run on one laptop with no internet connection.

&#91;embedded content: system architecture · three sources, one pipeline, two browser windows\]

Live, replay and simulated data share one pipeline, so the fallback used in the demo runs exactly the same code as the real belt.

### Key architecture rules

1. **Three sources, one pipeline.** Live, replay and simulation all produce the same sample objects and pass through the same pipeline, so the demo fallback exercises real code.
2. **Parsers are plug-ins.** `LegacyTextParser` reads the current firmware's human-readable lines; `ProtocolV2Parser` will read the future framed protocol. The UI never knows which is active except through `device.protocol`.
3. **The backend records, the UI displays.** If the browser crashes, recording continues.
4. **The UI never touches the serial port.**
5. **Two streams:** `/ws/live` carries everything for the cockpit; `/ws/display` carries only patient-safe fields for the Patient Display.

### Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React with TypeScript (strict), Vite | Fast builds; Cursor writes it fluently |
| UI kit | Tailwind CSS, shadcn/ui (Radix primitives), Lucide icons | Accessible primitives, easy token mapping |
| Routing | React Router | Simple, well known |
| State | Zustand for live stream and UI state; TanStack Query for REST data | Live data must not re-render the whole tree |
| Live charts | uPlot | Very fast canvas rendering for streaming data |
| Analytics charts | Apache ECharts | Box plots, heatmaps, polar plots, control charts |
| Animation | Framer Motion for UI; Canvas or SVG with requestAnimationFrame for the orb | Smooth, controllable |
| 3D (P2) | react-three-fiber | Belt digital twin |
| Forms | react-hook-form with zod | Validation shared with types |
| i18n | react-i18next | English, Kannada, Hindi |
| Audio | Howler.js | Reliable cue playback |
| Frontend tests | Vitest, Testing Library, Playwright | Unit and end-to-end |
| Backend | Python 3.11 or later, FastAPI, Uvicorn, pyserial, NumPy, SciPy, Pydantic, SQLModel on SQLite | Shreyas's strongest language; SciPy for signal processing |
| PDF | Playwright (headless Chromium) printing the report routes | PDF matches the preview exactly |
| Backend tests | pytest with golden-file fixtures | Metrics stay stable as code changes |
| Quality | ESLint, Prettier, Ruff, mypy | Consistent code from Cursor |
| Packaging | One command starts both services; desktop packaging (Tauri or PyInstaller) later | Demo-day simplicity |

### WebSocket contract

Endpoint `ws://localhost:8000/ws/live`. Every message is an envelope `{ type, v, ts, data }` where `v` is the contract version.

| Type | Direction | Rate | Data |
| --- | --- | --- | --- |
| `hello` | Server to client | On connect | Contract version, source, device info, calibration, active session |
| `samples` | Server to client | Batched every 100 ms | First sequence number and an array of samples |
| `breath` | Server to client | Per detected breath | Breath |
| `metrics` | Server to client | 1 Hz | RR, amplitude, I:E, regularity, quality with reason, stillness, belt pressure, `isFinal: false` |
| `state` | Server to client | On change | New state, since, reason |
| `hold` | Server to client | 5 Hz during holds | Index, elapsed, in band, level |
| `gate` | Server to client | On change | Beam on or hold, duty cycle |
| `alarm` | Server to client | On change | Alarm |
| `event` | Server to client | On create | SessionEvent |
| `device` | Server to client | 1 Hz | Connected, measured rate, dropped, latency, firmware state |
| `cmd` | Client to server | On action | Command id, name, arguments |
| `ack` | Server to client | Per command | Command id, ok, error |

**Commands:** `session.start`, `session.end`, `marker.add`, `baseline.capture`, `reference.capture`, `hold.start`, `hold.stop`, `band.set`, `belt.setTarget`, `belt.inflate`, `belt.hold`, `belt.deflate`, `belt.stopVent`, `display.setMode`, `display.setLanguage`, `display.cue`, `comfort.log`, `sim.setScenario`, `sim.inject`, `source.switch`.

```json
{ "type": "samples", "v": 1, "ts": 1760342400123,
  "data": { "source": "simulated", "seqFrom": 4120,
    "items": [ { "seq": 4120, "tDeviceUs": 412003120, "raw": 83412,
                 "pressure": 24.6, "breathing": 1.82, "pumpIn": false,
                 "pumpOut": false, "flags": 0 } ] } }

{ "type": "metrics", "v": 1, "ts": 1760342401000,
  "data": { "rr": 13.8, "amplitude": 3.4, "ie": 0.61, "regularity": 86,
    "quality": { "level": "good", "reason": "" }, "stillness": 81,
    "beltPressure": 24.7, "units": "mmHg", "isFinal": false } }

{ "type": "cmd", "v": 1, "ts": 1760342402000,
  "data": { "id": "c-118", "name": "marker.add", "args": { "type": "cough" } } }
```

**Display stream** (`/ws/display`) sends only: normalised level (0 to 1), band (0 to 1), cue key, countdown, hold index and total, language, mode, and a heartbeat. No units, no metrics, no alarms.

### REST endpoints

| Area | Endpoints |
| --- | --- |
| Patients | `GET/POST /patients`, `GET/PATCH /patients/{id}`, `GET /patients/{id}/trends` |
| Plans and consent | `GET/POST /patients/{id}/plans`, `GET/POST /patients/{id}/consents` |
| Sessions | `GET/POST /sessions`, `GET /sessions/{id}`, `GET /sessions/{id}/samples?from&to&maxPoints`, `/breaths`, `/holds`, `/events`, `/alarms`, `POST /sessions/{id}/signoff` |
| References | `GET/POST /patients/{id}/references`, `POST /references/{id}/activate` |
| Reports | `GET /reports/{kind}/{id}.pdf` |
| Research | `POST /exports`, `GET /exports`, `GET /cohort/summary` |
| Device | `GET /device`, `GET /device/ports`, `POST /device/connect`, `GET/POST /calibrations`, `POST /device/tests/{kind}` |
| Simulation | `GET/POST /sim/scenarios`, `POST /sim/cohort` |
| Admin | `GET/PATCH /settings`, `GET /audit`, `GET/POST /users` |

### Latency budget

Serial to host under 20 ms, pipeline under 10 ms, WebSocket under 10 ms, render under 16 ms. The causal low-pass filter adds group delay of a few hundred milliseconds; the cockpit shows the true end-to-end latency in the status bar rather than hiding it.

## 21. Simulation and data source labelling policy

Simulation is how the MVP shows its full vision, and labelling is what keeps that honest: every simulated or replayed number is visibly marked, everywhere it appears, with no exceptions.

### Labelling rules (non-negotiable)

1. Every sample, session and patient carries a `source` or `isSimulated` field. The UI derives badges from the data, never from a setting.
2. **SIMULATED:** violet badge in the top bar, diagonal watermark on every chart, "SIM" tag on simulated patients, synthetic codes such as PT-S014.
3. **REPLAY:** blue badge reading "REPLAY of session \[code\] recorded \[date\]".
4. Reports with non-live data carry a watermark and a header line on every page.
5. Exports include a source column; the Research hub defaults to live data only.
6. Simulated data is excluded from cohort statistics and home counters unless "Include simulated" is switched on, which shows a banner.
7. Every source switch is logged as an event and announced with a toast.
8. Features that exist only in simulation (beam gate, model lab, digital twin) carry a permanent label inside their panel.

### What is real and what is simulated in the MVP

| Capability | Real in the MVP | Simulated in the MVP |
| --- | --- | --- |
| Breathing waveform and metrics | Yes, from the belt | Also available for development and fallback |
| Pump activity on the pressure strip | Yes, from state in current log lines | Yes |
| Belt commands (inflate, hold, deflate, vent) | After firmware v2 | Yes |
| Belt integrity test | After firmware v2 | Yes |
| Breath-hold drills and guided breathing | Yes | Yes |
| Fraction trends across a course | Only after many real sessions | Yes, virtual cohort |
| Beam gate | No | Yes, labelled |
| Heart rate, SpO2, posture | No (needs sensors) | Optional, labelled |
| Look-ahead prediction | No | Yes, labelled Research |

### Synthetic breathing model

The generator uses a Lujan-style breathing curve (a well-known model with a sharper inhale and a longer end-exhale dwell), with breath-to-breath variability, drift and noise. For breath k with period T\_k and amplitude A\_k:

```latex
p(t) = p_0 + d(t) + A_k \cos^{2n}\!\left(\frac{\pi t}{T_k} - \varphi\right) + \varepsilon(t)
```

- p\_0 is the inflation level; d(t) is linear drift plus a slow random walk; epsilon is Gaussian noise; n (2 or 3) sets the shape.
- T\_k and A\_k are drawn per breath around the scenario mean with the configured variability.
- Output is quantised to counts and sampled at the configured rate with small timing jitter, so the simulator shows the same honest limits as the real sensor.

**Events:**

| Event | Model |
| --- | --- |
| Cough | 0.2 to 0.4 s spike of 2 to 4 x amplitude, then one irregular breath |
| Sigh | One breath at 1.5 to 2 x amplitude |
| Talking | 2 to 6 s of small irregular oscillation |
| Movement | Step change in baseline with a short transient |
| Breath-hold | Rise to the target level, plateau with slow drift and small tremor, release with a larger exhale |
| Leak | Exponential decay of the inflation level |
| Pump top-up | Ramp to a new inflation level with pump noise; breathing paused |
| Dropout | No samples for the set duration |

### Virtual cohort

Default: 8 patients with 15 to 25 fractions each on weekday dates. Each patient gets traits (rate, amplitude, regularity, hold ability, comfort tolerance) and a story: one improves quickly, one stays variable, one drifts upward from fraction 9 (so the control chart has something to flag), one reports rising discomfort. Seeded and reproducible.

### Scenario file format

```json
{
  "name": "Struggling breath-holder",
  "seed": 4217,
  "params": { "rateBpm": 16, "amplitude": 3.2, "shapeN": 3, "periodCv": 0.12,
              "amplitudeCv": 0.15, "driftPerMin": -0.3, "noiseSd": 0.08,
              "sampleRateHz": 10, "inflation": 24.0 },
  "events": [ { "atS": 45, "type": "cough" },
              { "atS": 90, "type": "hold", "durationS": 14 },
              { "atS": 150, "type": "dropout", "durationS": 3 } ]
}
```

## 22. Non-functional requirements

The product must be fast, offline, crash-tolerant and private on a single student laptop; these targets are what the definition of done checks against.

| ID | Area | Requirement |
| --- | --- | --- |
| NFR-01 | Rendering | Live waveform at 55 fps or better with a 120 s window on the demo laptop |
| NFR-02 | Latency | Backend sample to pixel within 100 ms (excluding filter group delay); measured and shown |
| NFR-03 | Start-up | Launch to first waveform within 20 s live and 5 s in simulation |
| NFR-04 | Durability | Recording continues if the UI crashes; after a backend crash the CSV journal recovers all but the last 1 s |
| NFR-05 | Offline | No network calls at runtime; fonts, icons, audio and translations bundled |
| NFR-06 | Memory | 90-minute session with memory growth under 200 MB (ring buffers, downsampled history) |
| NFR-07 | Reconnect | Automatic retry every 2 s; session continues with the gap marked |
| NFR-08 | Screens | Works at 1366 x 768, designed for 1920 x 1080, scales cleanly to 4K; focus mode legible on a 1280 x 720 projector |
| NFR-09 | Accessibility | WCAG 2.2 AA in both themes; keyboard operable; alarms announced to screen readers |
| NFR-10 | Privacy | Pseudonymous codes everywhere by default; identifiable fields stored separately and encrypted at rest (P1); masked in presenter mode; consent recorded before collection, in line with India's Digital Personal Data Protection Act, 2023 |
| NFR-11 | Audit | Every create, update, delete, command, export and sign-off is logged |
| NFR-12 | Browsers | Current Chrome and Edge; Firefox best effort |
| NFR-13 | Time | Device timestamps are authoritative; UI shows IST; exports use ISO 8601 with offset |
| NFR-14 | Reliability | Three consecutive 30-minute simulated sessions without error before the demo |
| NFR-15 | Testing | Pipeline unit coverage of 80% or more; golden-file tests for metrics on recorded fixtures; Playwright test for journey J3 |
| NFR-16 | Code quality | TypeScript strict mode, ESLint, Prettier, Ruff, mypy; no file over about 300 lines without reason |
| NFR-17 | Determinism | Simulator output identical for the same seed and scenario |
| NFR-18 | Copy | No em dashes anywhere in UI copy, reports or generated text (project style rule) |

## 23. Copy, tone and terminology

Words are part of credibility: the operator UI speaks like a calm clinical instrument, the Patient Display speaks like a kind therapist, and neither ever overclaims.

### Voice rules

- Short, precise, sentence case. No exclamation marks in the operator UI.
- Numbers always with units and a space: 14 br/min, 22.4 mmHg, 18.2 s.
- 24-hour time, IST on screen.
- Errors follow one pattern: what happened, what it means, what to do. Example: "No data for 3 s. The device may be unplugged. Check the USB cable or switch to replay."
- No em dashes anywhere (project style rule); use commas, colons or full stops.

### Number formatting

| Quantity | Format |
| --- | --- |
| Respiratory rate | Whole number, br/min |
| Pressure and amplitude | One decimal, mmHg (raw counts as whole numbers) |
| Durations | One decimal, s; mm:ss for anything over 60 s |
| Percentages and scores | Whole numbers |
| I:E ratio | 1:1.6 style |

### Use and avoid

| Say | Do not say | Why |
| --- | --- | --- |
| Breathing amplitude at the belt | Tumour motion, organ displacement | We measure a surrogate, not anatomy |
| Research prototype | Medical device, approved, certified | It is not |
| Guided breathing, visual feedback | Training patients, gamified | Respectful and accurate |
| Breath-hold | Apnoea | Apnoea implies involuntary cessation |
| Belt pressure | Compression force | We measure pressure, not force |
| Reproducibility across fractions | Accuracy | Different claims |
| Automated observation | Diagnosis, recommendation | No clinical advice |
| Simulated | Demo data, sample data | One consistent, unmissable word |
| Signal quality: Fair, with the reason | Bad data | Specific and actionable |

### Patient Display strings (to be reviewed by native speakers before use)

| Key | English | Hindi | Kannada |
| --- | --- | --- | --- |
| `breathe_normally` | Breathe normally | सामान्य रूप से सांस लें | ಸಾಮಾನ್ಯವಾಗಿ ಉಸಿರಾಡಿ |
| `breathe_in_hold` | Breathe in and hold | सांस अंदर लें और रोकें | ಉಸಿರು ಒಳಗೆಳೆದು ಹಿಡಿದುಕೊಳ್ಳಿ |
| `hold` | Hold | रोके रखें | ಹಿಡಿದುಕೊಳ್ಳಿ |
| `relax_breathe_out` | Relax and breathe out | आराम से सांस छोड़ें | ನಿಧಾನವಾಗಿ ಉಸಿರು ಬಿಡಿ |
| `well_done` | Well done | बहुत अच्छा | ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ |
| `stay_still` | Please stay still, your therapist is with you | कृपया स्थिर रहें, आपके थेरेपिस्ट आपके साथ हैं | ದಯವಿಟ್ಟು ಅಲುಗಾಡದೆ ಇರಿ, ನಿಮ್ಮ ಚಿಕಿತ್ಸಕರು ನಿಮ್ಮ ಜೊತೆ ಇದ್ದಾರೆ |

### Empty-state copy examples

- Patients: "No patients yet. Register the first patient to start collecting sessions."
- Trends: "Trends appear after the second fraction."
- Alarms: "No active alarms."
- Research: "No live sessions match these filters. Include simulated data to explore the tools."

## 24. Build plan for Cursor

Build in seven phases, simulation first: the simulator gives Cursor a working data stream on day one, so the whole UI can be built and tested before the belt is plugged in.

### Repository layout

```text
stillpoint/
  apps/
    web/                      # React + Vite + TypeScript
      src/
        app/                  # routes, layout, providers
        components/
          ui/                 # shadcn/ui primitives
          charts/             # WaveformChart, PressureStrip, ControlChart, Fingerprint...
          shell/              # TopBar, LeftRail, StatusBar, AlarmBanner, SourceBadge
        features/
          connect/ home/ patients/ sessions/ live/ display/
          review/ trends/ compare/ reports/ research/
          device/ simulation/ presenter/ settings/ audit/
        lib/
          ws/                 # useLiveStream, useDisplayStream, command client
          api/                # TanStack Query hooks
          format/             # units, numbers, time
        stores/               # Zustand stores
        styles/tokens.css
        i18n/en.json kn.json hi.json
  services/
    api/                      # FastAPI
      app/
        main.py
        ws/                   # live and display broadcasters
        sources/              # serial_source.py, replay_source.py, sim_source.py
        parsers/              # legacy_text.py, protocol_v2.py
        pipeline/             # calibrate, filters, detect, metrics, quality, state
        sim/                  # generator, scenarios, cohort
        models/               # SQLModel tables
        routers/              # patients, sessions, reports, research, device, sim, admin
        reports/              # Playwright PDF rendering
      tests/fixtures/         # recorded raw logs for golden tests
  packages/
    shared/                   # types.ts (section 19), message schemas (section 20)
  docs/
    PRD.md  PROGRESS.md  DECISIONS.md
  .cursor/rules/
```

### Cursor rules files

| File | Contents |
| --- | --- |
| `00-project.mdc` | Product summary, stack, folder layout, "read docs/PRD.md before any feature" |
| `10-design-system.mdc` | Tokens only, no raw hex; tabular numbers; component names from section 9; theme rules |
| `20-data-contracts.mdc` | Types live in packages/shared; never change a message without updating both sides and the PRD |
| `30-signal-and-metrics.mdc` | Metrics only in the backend pipeline; formulas from section 17; never assume a sample rate |
| `40-labelling-and-copy.mdc` | Source badges and watermarks are mandatory; terminology table; no em dashes in copy |
| `50-testing.mdc` | Tests with every feature; golden fixtures for metrics; Playwright for journeys |

```markdown
---
description: Stillpoint project rules
alwaysApply: true
---
- Read docs/PRD.md and the relevant section before implementing any feature ID.
- Frontend: React + TypeScript (strict) + Vite + Tailwind + shadcn/ui. Backend: FastAPI + SQLModel.
- Live data reaches components only through useLiveStream(); never open sockets in components.
- Clinical metrics are computed only in services/api/app/pipeline. The UI formats, never computes.
- Every chart and screen that shows data renders SourceBadge; simulated data also renders SimWatermark.
- Use design tokens from styles/tokens.css. Never hard-code colours.
- Copy follows PRD section 23. Never use em dashes in UI text.
- After finishing a feature, update docs/PROGRESS.md and list any contract changes.
```

### Phases

1. **Phase 0, Foundations.** Monorepo, tokens, theme switch, app shell (F-SHELL-01, 02), shared types, FastAPI skeleton, WebSocket contract, simulator (F-SIM-01), waveform (F-LIVE-01). **Exit:** a simulated waveform streams at 55 fps with the SIMULATED badge and watermark.
2. **Phase 1, Live core.** Legacy text parser and connect flow (F-CONN-01, 02), pipeline and metrics, phase ribbon, metric tiles, pressure strip, event markers, quality index, alarm engine, recording and replay (F-SIM-04). **Exit:** the real belt on a table shows a live waveform and a 10-minute recording replays identically.
3. **Phase 2, Platform.** Login, patients, wizard, profile, consent, session setup checklist, state machine, basic review, CSV export, audit log. **Exit:** journey J3 runs end to end without breath-hold.
4. **Phase 3, Clinical modules.** Baseline and reference capture, breath-hold engine and band editor, Patient Display (Orb first, then Level Glass), guided pacer, similarity score, beam gate (simulated), comfort logging. **Exit:** journey J4 works in simulation and on the belt.
5. **Phase 4, Analytics.** Virtual cohort, Trends with control chart, Breath Fingerprint, automated observations, distributions, session story, Compare. **Exit:** Trends tells a clear story for 8 simulated patients.
6. **Phase 5, Reports, research and device.** Session and course PDFs, calibration wizard and certificate, device center, dataset builder with manifest, cohort analytics. **Exit:** a signed session PDF and a dataset bundle are produced.
7. **Phase 6, Demo polish.** Presenter mode, script runner, hot swap, i18n and audio, performance pass, accessibility pass, three full rehearsals. **Exit:** three clean rehearsals in a row.

### Prompt sequence for Cursor

1. "Scaffold the monorepo in section 24 with pnpm workspaces, Vite React TS app, FastAPI service and packages/shared. Add lint, format and test tooling. No features yet."
2. "Create styles/tokens.css from section 8 for both themes, map tokens into Tailwind, install shadcn/ui, build TopBar, LeftRail and StatusBar (F-SHELL-01) with placeholder data."
3. "Add packages/shared/types.ts exactly as section 19 and Pydantic mirrors in services/api/app/models."
4. "Implement the simulator (F-SIM-01) using the model in section 21 and stream it on /ws/live using the contract in section 20."
5. "Implement useLiveStream() with a Zustand ring buffer and WaveformChart on uPlot (F-LIVE-01). Meet NFR-01."
6. "Implement the pipeline in section 17 with pytest golden tests, then metric tiles (F-LIVE-03) and phase ribbon (F-LIVE-02)."
7. "Implement LegacyTextParser for lines shaped like State | Raw | Delta | kPa | PSI | cmH2O, plus the connect screen (SCR-01)."
8. Continue phase by phase, one feature ID per prompt, always citing the section and acceptance criteria.

### Definition of done (every feature)

- [ ] All acceptance criteria for the feature ID pass.
- [ ] Tests added and passing; no lint or type errors.
- [ ] Empty, loading, error, disconnected and simulated states implemented.
- [ ] Works in both themes and at 1366 x 768.
- [ ] Copy follows section 23.
- [ ] PROGRESS.md updated; contract changes reflected in packages/shared and this PRD.

## 25. Demo script for the clinician presentation

A 7-minute run of show: problem first, live belt second, reproducibility third, research last; every beat has a fallback.

| Time | Beat | Screen | Say and do | Fallback |
| --- | --- | --- | --- | --- |
| 0:00 | The problem | About or a title view | Breathing moves tumours; compression and breath-hold help, but reproducibility is rarely measured | None needed |
| 0:45 | It is a platform | Command Center | Point at today's list, device health and the breaths-recorded counter | Simulated cohort already loaded |
| 1:15 | Structured records | Patient profile | Open PT-S003; show plan, consent, course ring | Same |
| 1:45 | Every session starts the same way | Session Setup | Run the time-out checklist in 20 s | Same |
| 2:15 | The live signal | Live Cockpit | Belt on the table or worn (only if safety-cleared); press F for focus mode; show rate, amplitude, quality; press 1 to mark a cough | Alt key beat switches to replay |
| 3:15 | The patient's view | Patient Display on a second screen | Turn the screen to the audience; switch language to Kannada; run two breath-holds | Simulated holder scenario |
| 4:15 | Gating, as a vision | Beam gate panel | Show BEAM ON and HOLD with duty cycle; say clearly it is simulated | Same |
| 4:45 | Paper trail | Session Review, then report | End session, read the session story, export the PDF | Pre-generated PDF |
| 5:30 | Reproducibility | Fraction Trends | Control chart flags fraction 9; Fingerprint rings show the drift | Same |
| 6:15 | Research | Research hub | Export an anonymised bundle with manifest | Same |
| 6:45 | Ask | Roadmap view | Validation study, sensors, pilot; ask what they would want to see | None needed |

### Rehearsal checklist

- [ ] Presenter mode on, privacy mask on, Office theme tested on the projector.
- [ ] Recording for hot swap chosen and tested.
- [ ] Second screen or tablet for the Patient Display tested at the venue.
- [ ] Audio level checked; Kannada and Hindi strings reviewed by native speakers.
- [ ] Laptop on mains power, notifications off, sleep disabled.
- [ ] Three clean rehearsals in a row.

### Questions to prepare for

| Likely question | Short answer to prepare |
| --- | --- |
| How accurate is the signal? | Show the calibration certificate and any validation run; be clear about what is not yet validated |
| Why pressure and not displacement? | Pressure is a cheap, robust surrogate; validation against a displacement reference is the next step |
| What is the delay? | Point to the latency shown in the status bar; explain filter delay honestly |
| Is it safe? | Describe the hardware safety measures in place and planned; the software is not the safety layer |
| How does it fit our workflow? | Session setup mirrors the time-out; reports and sign-off fit chart review |
| What about data privacy? | Local only, pseudonymous codes, consent recorded, anonymised exports |
| Does it talk to our treatment machines? | Not today; gating is a simulated vision that would need formal validation |
| What would it cost? | Prepare a rough bill of materials for the belt plus a laptop |

## 26. Risks, open questions and glossary

The biggest risks are a live failure in the room and a perceived overclaim; both are handled by design (hot swap and labelling), and the open questions below decide the hero features.

### Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Hardware fails during the demo | High | Replay hot swap, rehearsals, pre-generated report |
| Clinicians read simulated features as claims | High | Labelling policy (section 21) and saying it out loud |
| Signal too noisy at 10 Hz | Medium | Quality index, honest raw view, filtering, calibration |
| Safety questions about the belt | High | Present hardware safety plan; do not put the belt on a person until it is in place |
| Scope creep against the deadline | High | P0 first; P2 only after a clean rehearsal |
| Dark theme washed out on the projector | Medium | Test both themes at the venue |
| Translation errors on the Patient Display | Low | Native speaker review |
| Privacy slip during the demo | Medium | Presenter mode masks names; only simulated patients on screen |

### Open questions

- [ ] Presentation date, length and venue.
- [ ] Audience mix: oncologists, physicists, therapists.
- [ ] Hero use case: abdominal compression, breath-hold (DIBH style) or general monitoring.
- [ ] Will anyone wear the belt during the demo, or will it run on a table?
- [ ] Target and maximum belt pressures, set with clinical input.
- [ ] Final product name, logo, and college or lab affiliation for the header.
- [ ] Will the dashboard control the pumps in the demo (needs firmware v2)?
- [ ] Demo laptop model, OS and the projector resolution.
- [ ] Is an ethics or consent process in place for volunteers?
- [ ] A recorded raw log from the current firmware for building the parser and golden tests.

### Glossary

| Term | Meaning |
| --- | --- |
| Fraction | One treatment session in a course of radiotherapy |
| SBRT | Stereotactic body radiotherapy: few, high-dose, highly precise fractions |
| DIBH | Deep inspiration breath-hold, used notably for left-sided breast treatment |
| Gating | Turning the beam on only while breathing is inside a window |
| Duty cycle | Share of time the beam would be on during gating |
| End-exhale level | The resting point of the breathing cycle; often the most reproducible position |
| I:E ratio | Inspiratory time divided by expiratory time |
| CV | Coefficient of variation: SD divided by mean |
| Control chart | Chart of a measure over time with statistical limits to flag unusual points |
| Poincare plot | Each breath period plotted against the next; shows regularity at a glance |
| Phase portrait | Signal plotted against its rate of change; each breath forms a loop |
| LTTB | Largest-Triangle-Three-Buckets downsampling for drawing long signals quickly |
| RTT | Radiation therapist (radiation therapy technologist) |
| 4D CT | CT imaging resolved over the breathing cycle |
