# Stillpoint PRD: Real-Time Breathing Monitor (MVP)

Oct 13, 2026 · @Shreyas

Stillpoint is a single-laptop web app that connects to the compression belt's Arduino, shows the patient's breathing live, records every session and exports it as CSV. Nothing else is in the MVP.

## 1. Overview

The MVP does six things well: one login, a patient list, a live breathing screen connected to the belt, automatic session recording, session review, and CSV download.

The belt holds a sealed air bladder against the patient's abdomen during radiation therapy. Two pumps inflate and deflate it, and a pressure sensor read by an Arduino Mega reports the bladder pressure about 10 times per second. Each breath changes that pressure, so the pressure trace is the patient's breathing pattern. Stillpoint shows it live, lets the operator control the belt, records each session against a patient, and exports the data.

| Area | What the MVP includes |
| --- | --- |
| Access | One password-protected login for the app |
| Patients | Add, edit, search and delete patients |
| Live session | Real-time breathing waveform, belt pressure, breathing rate, breath depth, regularity, belt controls, markers, alerts |
| Recording | Each session saved automatically under its patient |
| Review | Full recorded waveform, summary and markers for any past session |
| Export | CSV download for one session, one patient, or all data |

**Not in the MVP (do not build):** multiple user accounts or roles, PDF reports, analytics across patients, calibration tools, a patient-facing screen, cloud sync.

### Success criteria

- The waveform appears within 10 s of pressing Connect.
- A 30-minute session records with no data loss caused by the app.
- The CSV opens correctly in Excel and Python (pandas) with no cleanup.
- The full demo flow runs without errors on the demo laptop.

## 2. Using this PRD in Cursor

Build one step of section 16 per prompt, and point Cursor at the section it is implementing.

1. Export this doc as Markdown and save it as `docs/PRD.md` in the repo.
2. Add the rules file from section 16 at `.cursor/rules/project.mdc`.
3. Follow the build steps in section 16 in order; each step has a "done when" check.
4. Cursor builds only what this PRD describes. If something is missing, it adds a TODO and asks instead of inventing a feature.

## 3. Access: one login

The app has a single password; there are no user accounts, roles or permissions.

- **First launch:** a setup screen asks for a password (at least 8 characters) and confirmation.
- **Every launch after that:** a login screen with one password field.
- **Storage:** only a salted PBKDF2 hash (Web Crypto) is stored on the laptop, never the password itself.
- **Auto-lock:** after 15 minutes without input, except while a session is recording. A lock button sits in the top bar.
- **Change password:** in Settings, with the current password.
- **No recovery in the MVP:** if the password is lost, the app's data cannot be unlocked. The setup screen says this once.

The login keeps the screen private on a shared laptop; all data stays on this machine.

## 4. Screens and navigation

Seven screens in total; the Live Session screen is the centre of the product.

| Route | Screen | Purpose |
| --- | --- | --- |
| `/setup` | First-run setup | Create the app password (shown once) |
| `/login` | Login | Unlock the app |
| `/` | Patients | Search, add and open patients |
| `/patients/:id` | Patient | Patient details, session history, start a session |
| `/live/:patientId` | Live Session | Real-time breathing, belt controls, recording |
| `/sessions/:id` | Session Review | Recorded waveform, summary, CSV download |
| `/settings` | Settings | Password, display options, device log, data export |

**Top bar (every screen after login):** Stillpoint logo, links to Patients and Settings, the device status chip with a Connect or Disconnect button, and a lock button.

**Leaving a live session:** while recording, navigating away opens a confirm dialog ("End the session and save it?"). Closing the browser tab shows the browser's leave warning.

## 5. Visual design

Stillpoint should look like a modern bedside monitor, not a generic web template: a deep navy interface where the breathing waveform is the brightest thing on screen, with crisp type, thin hairlines and colour used only when it means something.

### Principles

1. **Monitor first.** The waveform glows; everything around it stays quiet.
2. **Calm and precise.** Generous spacing, 1 px hairlines, no heavy shadows, no decorative gradients.
3. **Colour carries meaning.** Teal is breathing, sky blue is belt pressure, amber is a warning, red is an alert or the Deflate button. Nothing else is coloured.
4. **Readable from two metres.** Live numbers are at least 44 px with tabular digits.
5. **One system.** Every screen uses the same tokens and components; Cursor never hard-codes a colour.

### Colour tokens (single dark theme)

Define these as CSS variables in `src/styles/tokens.css` and map them into Tailwind.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | #070D18 | App background |
| `--surface` | #0E1726 | Cards and panels |
| `--surface-raised` | #142034 | Inputs, table headers, hover |
| `--border` | #1F2D44 | Hairlines and dividers |
| `--border-strong` | #2B3D5A | Focused or selected outlines |
| `--text` | #E7EEF8 | Primary text |
| `--text-muted` | #8EA0BA | Labels, units, axes |
| `--text-faint` | #5E7190 | Placeholders, disabled |
| `--primary` | #2DD4BF | Primary buttons, links, focus ring |
| `--primary-hover` | #14B8A6 | Primary hover |
| `--wave` | #5EEAD4 | Breathing waveform |
| `--wave-fill` | #5EEAD4 at 12% | Soft fill under the waveform |
| `--pressure` | #7DD3FC | Belt pressure line |
| `--ok` | #34D399 | Connected, HOLD state |
| `--warn` | #FBBF24 | Warnings, INFLATE state |
| `--danger` | #F87171 | Alert text and icons |
| `--danger-solid` | #DC2626 | Deflate button, critical banner |
| `--idle` | #64748B | IDLE state |

### Typography

- **Inter** (self-hosted, works offline) for all UI text. Every number uses `font-variant-numeric: tabular-nums` so digits never jitter.
- **JetBrains Mono** for patient IDs and the device log.

| Style | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| Live value | 48 / 52 | 600 | Metric tiles on the Live screen |
| Page title | 24 / 32 | 600 | Screen titles |
| Section title | 16 / 24 | 600 | Panel titles |
| Body | 14 / 20 | 400 | Default text |
| Label | 12 / 16 | 500, uppercase, 0.06em tracking | Monitor-style labels such as BREATHING RATE |
| Micro | 11 / 14 | 500 | Chart axes, badges |

### Layout, shape and motion

- 4 px spacing grid (4, 8, 12, 16, 24, 32, 48). List screens max 1440 px wide; the Live screen uses the full width.
- Radius: 12 px panels, 8 px buttons and inputs, full for pills.
- Depth comes from surface colour and borders, not shadows. Only modals get one soft shadow.
- Transitions 150 to 200 ms ease-out. Charts stream and never animate. Respect reduced-motion settings.
- Icons: Lucide, 1.5 px stroke, 16 or 20 px.

### Components

| Component | Look and behaviour |
| --- | --- |
| Top bar | 56 px, `--surface`, bottom hairline; logo left, nav links, device chip and lock button right |
| Buttons | 40 px tall (48 px on the Live screen). Primary: teal fill, dark text. Secondary: outline. Danger: solid red |
| Device chip | Pill with a dot and text: Not connected (grey), Starting (amber, pulsing dot), Connected (green), Disconnected (red) |
| Device state pill | IDLE, INFLATING, HOLDING, DEFLATING in the state colours above |
| Metric tile | Uppercase label, large value, small unit, 60 s sparkline, 2 px top accent in the metric's colour |
| Tables | 48 px rows, sticky header on `--surface-raised`, hover highlight, no zebra stripes |
| Inputs | `--surface-raised` fill, 1 px border, 2 px teal focus ring |
| Alert banner | Full width under the top bar; red or amber; icon, one sentence, action button |
| Toasts | Bottom-right, auto-dismiss after 4 s |
| Modals | 480 px centred card, blurred backdrop |
| Empty states | Line icon, one sentence, one action |

### Charts

- uPlot on canvas, transparent background on a `--surface` panel.
- Grid lines in `--border`; axis labels 11 px `--text-muted`; the right edge of a live chart is "now".
- Breathing: 2 px `--wave` line with `--wave-fill` beneath it; small dots on detected peaks.
- Belt pressure: 1.5 px `--pressure` line over faint bands showing the device state.
- Markers: thin dashed vertical lines with a short label at the top.

### Brand and copy

- Wordmark "Stillpoint" with a small breathing-wave glyph; one subtle teal glow behind the logo on the login screen is the only decorative effect in the app.
- Copy is short and in sentence case, with units on every number. Pressure values carry the unit "rel." (relative) until the sensor is calibrated.
- No em dashes anywhere in UI text.

## 6. Screen specs: setup, login, patients, patient, settings

These screens are deliberately simple: they get the operator to the right patient and into a live session in two clicks.

### Setup and Login

- Centred 400 px card on `--bg`, with the logo, the tagline "Real-time breathing monitor" and a faint teal glow behind the logo.
- Setup: Password, Confirm password, Create button, and one line noting the password cannot be recovered.
- Login: Password field and Unlock button. A wrong password shows "Incorrect password" under the field.

**Done when:**

- [ ] Setup appears only on first launch; Login appears on every later launch and after auto-lock.
- [ ] Pressing Enter submits; focus starts in the password field.

### Patients (home)

- Header: "Patients" with a count, a search field (matches ID or name), and a primary **New patient** button.
- Table columns: Patient ID (mono), Name, Age, Sex, Sessions, Last session (date), and a **Start session** button on each row. Clicking a row opens the patient.
- Empty state: "No patients yet" with a New patient button.

**New or edit patient (modal):**

| Field | Rules |
| --- | --- |
| Patient ID | Required, unique; the hospital number |
| Full name | Required |
| Age | Years, 0 to 120 |
| Sex | Female, Male, Other |
| Notes | Optional free text, for example breathing observations |

**Done when:**

- [ ] A duplicate Patient ID is rejected with a clear message.
- [ ] Search filters as you type.

### Patient

- Header card: name, Patient ID, age, sex, notes, an Edit button and a primary **Start session** button.
- Sessions table, newest first: Date and time, Duration, Avg breathing rate, Avg breath depth, Regularity, Markers, and actions **View** and **Download CSV**.
- **Download all sessions (CSV)** button above the table.
- **Delete patient** at the bottom, behind a dialog where the user types the Patient ID; it deletes the patient's sessions too.

### Settings

| Group | Contents |
| --- | --- |
| Password | Change password (current, new, confirm) |
| Display | Default chart window (30 s or 60 s), alert sound on or off |
| Device | Last connection details (port, zero offset from startup, measured line rate) and a collapsible **Device log** that shows every raw line received, with Pause and Copy |
| Data | Storage used, **Download all sessions (CSV)** |

## 7. Screen spec: Live Session

One screen shows the breathing waveform, the belt pressure, four live numbers and the belt controls, so the operator never has to look anywhere else during a session.

&#91;embedded content: Live Session layout · 1920 x 1080 wireframe\]

The breathing panel dominates the left side with the belt pressure underneath on the same time axis; the right column holds the numbers, the hold timer, the belt controls and markers.

### Layout

| Zone | Contents |
| --- | --- |
| Session header | Patient name and ID, device state pill, session timer, **Start recording** or a red "REC 12:41" indicator, **End session** |
| Breathing panel (left, about 70% wide, 60% tall) | Live breathing waveform for the last 30 s (toggle 30 or 60 s), peak dots, marker lines, current value at the right edge. Axis label "Breathing (rel.)" |
| Belt pressure panel (left, below) | Belt pressure line with faint bands for the device state (INFLATE amber, HOLD green, DEFLATE blue), on the same time axis as the breathing panel |
| Metric tiles (right column) | Breathing rate (br/min), Breath depth (rel.), Regularity (%), Belt pressure (rel.) |
| Hold timer (right column) | Visible in HOLD: "Holding 03:12" with a bar toward the controller's 10:00 auto-deflate |
| Belt controls (right column) | **Inflate** (labelled **Top up** while holding), **Stop pumps**, **Zero sensor**, and a separate full-width red **Deflate** button |
| Markers (right column) | Quick buttons: Cough, Movement, Talking, Note (opens a one-line input); the last five markers listed below |

### Behaviour

- **Before connecting**, the breathing panel shows a Connect card: a required checkbox "The bladder is empty and open to air" and a **Connect** button (section 9 explains why).
- **Live view works without recording.** The operator can inflate, check the signal, then press **Start recording**. Recording captures every line from that moment, including inflate and deflate.
- **End session** stops recording, saves, and opens the Session Review. If the belt is not IDLE, the dialog offers **Deflate and end** as the default choice.
- **Metrics run only while the device is in HOLD**, skipping the first 300 ms after HOLD starts. Outside HOLD the tiles show "Waiting for hold" in muted text.
- **Buttons follow the device state** (table in section 9). Deflate is always enabled and is the emergency action; Stop pumps leaves air in the belt.
- **Markers** are stamped at the moment of the click, appear as lines on both panels, and are saved with the session.
- **No layout shift:** tiles have fixed widths and tabular digits.
- At 1366 x 768 the right column narrows to 320 px and the markers list collapses; the breathing panel keeps at least 60% of the width.

**Done when:**

- [ ] The waveform scrolls smoothly at 60 fps with a 60 s window.
- [ ] A sample reaches the screen within 100 ms of arriving from the Arduino.
- [ ] Every belt button sends the right command and is enabled only in the right states.
- [ ] Unplugging the USB cable mid-session shows the disconnect alert within 2 s and keeps the data recorded so far.

## 8. Screen spec: Session Review

The review screen shows one recorded session end to end and puts **Download CSV** in the most prominent spot.

- **Header:** patient name and ID, date and time, duration; buttons **Download CSV** (primary), **Back to patient**, and **Delete session** (with confirmation).
- **Summary cards:** Duration, Average breathing rate, Average breath depth, Regularity, Breaths counted, Markers.
- **Chart:** a full-session overview strip at the bottom with a draggable window; the detail chart above shows the selected window with the breathing signal, belt pressure, device-state bands and marker lines.
- **Markers list:** time and label; clicking one moves the chart window to it.
- **Session notes:** a text area saved automatically.

**Done when:**

- [ ] A 30-minute session opens in under 1 s.
- [ ] The downloaded CSV contains every recorded line, matching section 12 exactly.

## 9. Device connection and belt controls

The app talks to the Arduino directly from the browser over USB serial, following Yashwanth's "Belt Controller Serial Protocol" (13 Oct 2026): single-character commands out, text lines back.

### Connecting

1. The operator ticks "The bladder is empty and open to air", because the controller zeroes its sensor when it starts.
2. **Connect** opens the browser's port picker the first time (Web Serial, 115200 baud, 8N1). Later connections reuse the remembered port.
3. Opening the port restarts the Arduino. The chip shows **Starting** during about 2 s of silence, then the startup lines arrive, ending with `EVENT: READY`.
4. Belt controls stay disabled until READY. If READY does not arrive within 8 s, show "The device did not start. Unplug it, plug it back in, and try again."
5. If the port is busy, show "Close the Arduino IDE Serial Monitor and Serial Plotter, then try again."

### Lines from the Arduino

Read line by line (buffer partial chunks, split on `\n`, trim `\r`) and sort each line by how it starts. Ignore lines that match nothing, but show them in the device log.

| Line | Example | Pattern | Use |
| --- | --- | --- | --- |
| Data | `pressure_mmHg:12.47,state:2` | `^pressure_mmHg:(-?[\d.]+),state:(\d)$` | One sample, about 10 per second |
| Event | `EVENT: HOLD (inflate time done, solenoids closed)` | `^EVENT: (.*)$` | State changes, refusals, safety actions |
| Status | `STATUS: state=HOLD time_in_state_ms=4210 ...` | `^STATUS: (.*)$` | Reply to `?`, split on spaces and `=` |
| Sensor fault | `sensor_fault:1` | `^sensor_fault:1$` | Sensor silent; repeats every second |

The value is named pressure\_mmHg but is **relative until the sensor is calibrated**; the UI labels it "rel.", never mmHg.

### Device states and buttons

| State | Code | Inflate (`1`) | Deflate (`2`) | Stop pumps (`0`) | Zero sensor (`t`) |
| --- | --- | --- | --- | --- | --- |
| IDLE | 0 | On | On | On | On (bladder empty) |
| INFLATE | 1 | Off | On | On | Off |
| HOLD | 2 | On, shown as Top up | On | On | Off |
| DEFLATE | 3 | On | On | On | Off |

- **Inflate** runs pump 1 for 3.5 s (or until the controller's 50 limit), then seals the bladder and enters HOLD. In HOLD it tops up.
- **Deflate** runs pump 2 until the reading falls to 5 (15 s timeout), then IDLE. Always enabled; this is the emergency action.
- **Stop pumps** switches everything off and closes the valves; air stays in.
- **Zero sensor** re-measures the zero point; IDLE with an empty bladder only.
- Every command interrupts whatever is running, so the app never needs to send Stop before Deflate.
- The device state comes from the `state` field on every data line; event lines are shown as alerts or toasts (section 11).

### Safety handling in the app

- **USB unplugged:** the controller keeps its last state (no heartbeat yet). Show a critical alert that the belt may still be inflated.
- **Controller restarted mid-session** (READY arrives again): it has re-zeroed, so if the belt was inflated, readings are offset and Deflate may stop early. Show a critical alert, block Inflate, and guide the operator: release the belt by hand, confirm it is empty, press Zero sensor.
- **Values that may change** (inflate time, the 50 and 5 limits, the 10-minute hold limit, units after calibration) live in one file, `src/device/device.config.ts`, never inside components.

## 10. Breathing signal and metrics

Four live numbers come from one small processing module (`src/processing/breathing.ts`), which runs on HOLD samples only and is unit-tested against a recorded log from the belt.

### Processing steps

1. **Timestamp** each data line on arrival (the firmware sends no timestamps or sequence numbers). Treat an interval over 150 ms as a gap.
2. **Select** samples where the device is in HOLD, skipping the first 300 ms after HOLD starts (closing the valve causes a small pressure blip).
3. **Smooth** with a 5-sample moving average (0.5 s) for display and detection. The raw value is always kept and exported.
4. **Remove the baseline** by subtracting a rolling 10 s median, so slow pressure drift or a small leak does not move the trace. The result is the breathing signal, centred near zero.
5. **Detect breaths:** alternating peaks and troughs at least 1.5 s apart, with a prominence of at least 20% of the median of recent breath depths (and above a small noise floor set in config). One breath runs trough to peak to trough.

### Metrics

| Metric | Definition | Unit | Where |
| --- | --- | --- | --- |
| Breathing rate | 60 divided by the mean duration of the last 6 breaths | br/min | Live tile, review, CSV summary |
| Breath depth | Median peak-minus-trough of the last 6 breaths | rel. | Live tile, review |
| Regularity | 100 x (1 minus the coefficient of variation of the last 6 breath durations), limited to 0 to 100 | % | Live tile, review |
| Belt pressure | Smoothed absolute pressure | rel. | Live tile, pressure panel |
| Breaths counted | Number of complete breaths in the session | count | Review |
| Hold time | Time since the device entered HOLD | mm:ss | Hold timer |

- Tiles show "Waiting for hold" outside HOLD and "Detecting..." until 3 breaths are found.
- Session averages in the review use all HOLD time in the session.
- When calibration arrives, one slope and offset in `device.config.ts` converts "rel." to mmHg; nothing else changes.

## 11. Alerts

Alerts cover only what the operator must act on: device problems, the controller's own safety actions, and breathing that stops showing up.

| Alert | Trigger | Level | Message |
| --- | --- | --- | --- |
| Device disconnected | Port closed or read error | Critical | "Device disconnected. The belt may still be inflated. Reconnect and press Deflate, or release the belt by hand." |
| No data | Connected but no lines for 2 s | Critical | "No data from the device." |
| Sensor fault | `sensor_fault:1` or `EVENT: DEFLATE (SAFETY: sensor fault)` | Critical | "Pressure sensor not responding. The controller is deflating the belt." |
| Over-pressure vent | `EVENT: DEFLATE (SAFETY: over-pressure vent)` | Critical | "Over-pressure detected. The controller vented the belt." |
| Controller restarted | `EVENT: READY` while a session is open | Critical | "The controller restarted and re-zeroed. Release the belt by hand, confirm it is empty, then press Zero sensor." |
| Hold time limit | `EVENT: DEFLATE (SAFETY: max hold time)` | Warning | "The belt deflated automatically after 10 minutes of hold." |
| No breaths detected | 15 s in HOLD without a detected breath | Warning | "No breaths detected for 15 s. Check the patient and the belt." |
| Inflate refused | `EVENT: REFUSED inflate` | Warning | "Inflate refused: the sensor is not responding." |
| Inflate stopped at limit | `EVENT: HOLD (max pressure reached ...)` | Info | Toast: "Inflation stopped at the pressure limit." |
| Zero refused | `EVENT: REFUSED tare` | Info | Toast: "Zero sensor works only in IDLE with an empty bladder." |

- **Critical:** red banner under the top bar plus a short tone every 10 s until acknowledged (tone can be muted in Settings).
- **Warning:** amber banner, single tone.
- **Info:** toast only.
- Match event lines by prefix and keyword (SAFETY, REFUSED, max pressure, READY), not exact text, because the wording may change.
- Every alert is saved as a marker in the recording and appears in the CSV `marker` column.

## 12. Data storage and CSV export

All data stays on the laptop in the browser's IndexedDB, and every recorded line can be exported as a CSV that opens cleanly in Excel or pandas.

### Storage

- IndexedDB through Dexie, with tables for patients, sessions, samples and markers.
- While recording, samples are written in batches every 1 s, so a crash loses at most the last second.
- Raw values are stored exactly as received; smoothing and baseline removal never overwrite them.

### CSV format

- **Session file name:** `<PatientID>_<YYYYMMDD>_<HHMMSS>.csv`, for example `MRN10234_20261013_143102.csv`.
- **Patient file name** (all sessions): `<PatientID>_all_sessions.csv`. **All data:** `stillpoint_all_sessions_<YYYYMMDD>.csv`.
- UTF-8 with a byte-order mark (so Excel reads it correctly), comma separated, one header row, decimal point, one row per data line received.

| Column | Example | Meaning |
| --- | --- | --- |
| `session_id` | 01JAB3K9 | Unique session ID |
| `patient_id` | MRN10234 | Hospital patient ID |
| `timestamp` | 2026-10-13T14:31:02.105+05:30 | Local time the line arrived |
| `elapsed_s` | 12.300 | Seconds since recording started |
| `pressure_raw` | 24.35 | Value exactly as sent by the Arduino (relative units) |
| `breathing` | 1.82 | Processed breathing signal; blank outside HOLD |
| `device_state` | HOLD | IDLE, INFLATE, HOLD or DEFLATE |
| `breath_point` | peak | peak, trough, or blank |
| `marker` | Cough | Marker or alert text at this moment, or blank |

```csv
session_id,patient_id,timestamp,elapsed_s,pressure_raw,breathing,device_state,breath_point,marker
01JAB3K9,MRN10234,2026-10-13T14:31:02.105+05:30,12.300,24.35,1.82,HOLD,peak,
01JAB3K9,MRN10234,2026-10-13T14:31:02.205+05:30,12.400,24.31,1.78,HOLD,,
01JAB3K9,MRN10234,2026-10-13T14:31:02.306+05:30,12.501,24.22,1.69,HOLD,,Cough
```

Patient names never go into the CSV, only the Patient ID.

## 13. Data model

Five record types cover the whole MVP.

```typescript
// src/data/types.ts
export type DeviceState = 'IDLE' | 'INFLATE' | 'HOLD' | 'DEFLATE'; // codes 0 to 3

export interface Patient {
  id: string;             // internal ULID
  patientId: string;      // hospital ID, unique
  name: string;
  age?: number;
  sex?: 'Female' | 'Male' | 'Other';
  notes?: string;
  createdAt: string;      // ISO 8601
  updatedAt: string;
}

export interface Session {
  id: string;
  patientRef: string;     // Patient.id
  startedAt: string;
  endedAt?: string;
  durationS?: number;
  summary?: {
    breaths: number;
    rateAvg: number;      // br/min
    depthAvg: number;     // rel.
    regularityAvg: number;// %
    holdS: number;
  };
  notes?: string;
  device?: { zeroOffset?: number; lineRateHz?: number };
}

export interface Sample {
  sessionId: string;
  seq: number;            // assigned by the app
  t: number;              // epoch ms at arrival
  elapsedS: number;
  pressureRaw: number;
  breathing?: number;     // only in HOLD
  state: DeviceState;
  breathPoint?: 'peak' | 'trough';
}

export interface Marker {
  id: string;
  sessionId: string;
  t: number;
  elapsedS: number;
  kind: 'cough' | 'movement' | 'talking' | 'note' | 'alert' | 'device_event';
  text: string;
}

export interface AppSecurity {
  salt: string;           // base64
  hash: string;           // base64, PBKDF2-SHA256
  iterations: number;
}
```

## 14. Architecture and tech stack

The MVP is one browser app with no server: Chrome or Edge reads the Arduino directly through the Web Serial API, processes and draws the signal, and saves everything locally.

**Data flow:**

1. Arduino Mega sends text lines over USB.
2. `device/serial.ts` reads the port, splits lines, and hands them to `device/protocol.ts`, which parses data, event, status and fault lines.
3. `device/useDevice.ts` (a Zustand store) holds the connection, device state, latest samples in a ring buffer, and events.
4. `processing/breathing.ts` turns HOLD samples into the breathing signal, breath points and metrics.
5. The Live screen draws from the store; `data/recorder.ts` writes samples and markers to IndexedDB once a second while recording.
6. `data/csv.ts` builds CSV files from IndexedDB on demand.

| Layer | Choice |
| --- | --- |
| Framework | React with TypeScript (strict), built with Vite |
| Styling | Tailwind CSS mapped to the tokens in section 5; shadcn/ui primitives restyled to match |
| Charts | uPlot |
| State | Zustand |
| Storage | Dexie (IndexedDB) |
| Routing | React Router |
| Forms | react-hook-form with zod |
| Icons | Lucide |
| Tests | Vitest for the parser, processing and CSV |

Run it on `localhost` (`npm run dev`, or a production build served locally); Web Serial needs Chrome or Edge on desktop and a secure context, which localhost provides. No internet connection is needed.

## 15. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Responsiveness | Live chart at 60 fps; each sample on screen within 100 ms of arrival |
| Recording | At most 1 s of data lost if the app crashes; sessions up to 60 minutes |
| Offline | Works with no internet; fonts and icons bundled |
| Browsers | Current Chrome and Edge on Windows and macOS |
| Screens | 1366 x 768 minimum, designed for 1920 x 1080 |
| Accessibility | Text contrast at WCAG AA; full keyboard use; visible focus rings |
| Privacy | Data stays on the laptop; patient names never exported |
| Code quality | TypeScript strict, ESLint and Prettier clean; tests pass for parser, processing and CSV |

## 16. Build plan for Cursor

Seven steps, each small enough for one or two Cursor prompts, with the belt plugged in from step 3 onward.

### Repository layout

```text
stillpoint/
  src/
    app/            router, layout, top bar
    pages/          Setup, Login, Patients, Patient, Live, SessionReview, Settings
    components/     ui/ (restyled shadcn), charts/, live/
    device/         serial.ts, protocol.ts, commands.ts, useDevice.ts, device.config.ts
    processing/     breathing.ts
    data/           db.ts, recorder.ts, csv.ts, types.ts
    auth/           auth.ts
    styles/         tokens.css
  docs/PRD.md
  .cursor/rules/project.mdc
```

### Rules file

```markdown
---
description: Stillpoint MVP rules
alwaysApply: true
---
- Read docs/PRD.md before each task and build only what it describes.
- Stack: React, TypeScript strict, Vite, Tailwind, uPlot, Zustand, Dexie.
- Colours and type come only from src/styles/tokens.css (PRD section 5). Dark theme only.
- Serial access only through src/device. Components never touch the port.
- Device limits and timings live in src/device/device.config.ts.
- Pressure is labelled "rel." until calibration. Never label it mmHg.
- Raw samples are stored and exported unchanged.
- No em dashes in any UI text.
```

### Steps

1. **Foundation:** Vite app, tokens, top bar, setup and login screens. *Done when* the app locks and unlocks with the password.
2. **Patients:** Dexie database, Patients and Patient screens, add, edit, delete, search. *Done when* patients persist across reloads.
3. **Device link:** Connect flow, line parser, device store, device chip, device log in Settings, belt buttons with state rules. *Done when* the real belt inflates, holds and deflates from the app and every line shows in the log.
4. **Live screen:** breathing and pressure panels, state bands, hold timer, markers, alerts. *Done when* the waveform scrolls smoothly from the real belt and unplugging USB raises the alert.
5. **Breathing metrics:** processing module with unit tests on a recorded log, metric tiles. *Done when* rate and depth match a hand count on the recorded log.
6. **Recording, review and CSV:** start and stop recording, session review, all three CSV downloads. *Done when* a 30-minute session reviews and exports correctly.
7. **Polish:** empty and error states, keyboard focus, 1366 x 768 check, final visual pass against section 5. *Done when* the full flow runs cleanly three times in a row.

### Prompt template

```text
Implement step 4 (Live screen) from docs/PRD.md sections 7, 9 and 11.
Use tokens from section 5 and data only from useDevice().
Done when every "Done when" item in section 7 passes.
Do not add features that the PRD does not describe.
```

## 17. Open questions

**For Yashwanth (hardware and firmware):**

- [ ] Can the Arduino's reset on port open be avoided, so reconnecting cannot re-zero an inflated belt?
- [ ] Once calibrated, what real pressures do the controller's 50 (inflate stop), 5 (deflate target) and 300 (safety vent) correspond to? A 300 vent may sit at the sensor's full range and never trigger.
- [ ] When will the heartbeat and auto-deflate on USB disconnect be added?
- [ ] Is there a physical way to release the belt if the laptop disconnects while it is inflated?

**For the team:**

- [ ] Final product name and logo.
- [ ] Any patient fields the doctors want beyond ID, name, age, sex and notes.
