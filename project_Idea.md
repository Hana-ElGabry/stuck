# Focus Dashboard — Comprehensive Product Brief (v2)
*A lightweight PWA for personal growth, habit consistency, and behavioral self-coaching*

---

## Core Philosophy

This application is not a task manager. It is a **behavioral growth engine** built around one simple truth: most people already know what their best life looks like — they just haven't built the daily infrastructure to live it consistently.

The app does not try to micromanage a person into perfection. It takes a user from their **current baseline** (e.g., waking at 2 PM, doing zero exercise, not working) and gradually, systematically moves them toward the **ideal daily life they described to themselves** at onboarding. On most days, the goal is simply consistency. On some days — called **Boundary Breaker days** — the app deliberately pushes the user to surpass their personal records and discover that their limits are further than they think.

The system accepts that humans mess up. It has a built-in **redemption pipeline** that prevents shame spirals by giving the user a clear, structured path to make up for what was missed — not through punishment, but through deliberate extra commitment. The score system reflects this: there is an "acceptable" range, a "good" range, and a "bad" range. Falling in the acceptable range on a hard day is still a win.

The system runs as a **Progressive Web App (PWA)** — a website that can be saved to the home screen and run offline. This is the ideal choice for an old Android 7.1 device (Samsung Galaxy Tab A6 on LineageOS 14.1), because it eliminates app store dependencies, runs in any Chromium-based browser, and keeps resource usage minimal. All data is stored locally via `localStorage` and `IndexedDB`. The only external network call is to the Gemini API when AI features are used, which is rate-limited by design to preserve API credits.

---

## Platform & Technical Constraints

- **Device:** Samsung Galaxy Tab A6, Android 7.1.x, LineageOS 14.1
- **Runtime:** PWA served from a lightweight local server or opened as a file in Chrome. No app install required.
- **Storage:** `localStorage` for settings and daily state; `IndexedDB` for historical data, photos (as base64), and task records.
- **AI:** Gemini API, key stored locally by the user in their profile. All AI calls are mode-specific and minimal by design — the system uses rule-based logic wherever possible to avoid burning tokens.
- **Offline:** All scheduling, rule engine, timers, checkpoints, scoring, and UI work fully offline. AI features degrade gracefully when no API key is present or connectivity is unavailable.
- **No frameworks preferred** — vanilla HTML/CSS/JS or a very lightweight build to ensure smooth performance on old hardware.

---

## Navigation Structure

The app has a **persistent bottom navigation bar** always visible on every screen. It contains five icons:

1. **Focus** (home icon) — the Focus Page, the default view
2. **Plan** (calendar icon) — the Start Day / Planning Page
3. **Chat** (bubble icon) — the AI Chat Page; toggleable as an overlay from the Focus Page too
4. **End Day** (moon icon) — only active after a configurable time or manually triggered
5. **Profile** (person icon) — Profile & Settings hub

The transition between Focus mode and Chat/Unfocused mode is a **single tap on the Chat icon** in the nav bar — a seamless toggle, not a separate navigation journey.

---

## Page 1 — Onboarding Page

**Purpose:** Run once on first launch. Establishes the user's ideal daily life, their personal motivation, the habits they want to build, and their first challenge. This is the foundational context that every other page and every AI conversation references.

---

### Section 1: "My Ideal Day" — Daily Targets

Positioned at the top of the page. This section is framed as a vision, not a rule. The header reads something like: *"Design your best self. What does a great day look like for you?"*

The user sets numerical daily targets across several dimensions. Each target has a name, a unit, and a default value they can adjust:

- **Wake-up time** — time picker, defaults to 6:00 AM
- **Sleep time** — time picker, defaults to 11:00 PM
- **Total work/study hours** — number input (e.g., 6 hours)
- **Total training/movement minutes** — number input (e.g., 30 minutes)
- **Any other custom numeric targets** the user wants to track (e.g., "Pages read: 10", "Water glasses: 8") — they can add as many as they want via an "+ Add target" button

These numbers become the **daily baseline** — the targets that the rule engine measures actual performance against. They are also the values that Boundary Breaker days attempt to push beyond.

---

### Section 2: Core Motivation Field

Positioned in the center of the page. A large text area with the prompt: *"Why does any of this matter to you?"*

The user writes an honest personal statement — their real reason for trying. This text is stored and injected into the AI's system prompt as a permanent context string. Every AI conversation the user ever has already starts from this "why." This field is editable at any time from the Profile page, because motivations evolve.

---

### Section 3: Rest Days Selector

A multi-select row of the 7 days of the week. The user selects which days are their rest days (e.g., Friday). Rest days are excluded from challenge streak counting. The default is Friday as a single rest day, but the user can choose up to 2 rest days.

---

### Section 4: Challenge Progression Launcher

A horizontal row of challenge duration tiers: **1, 2, 4, 7, 14, 21, 30, 60, 90 days**. All tiers beyond the first are visually locked with a padlock. The user selects their current unlocked tier to begin. Completing a challenge unlocks the next tier. This enforces earning progression rather than setting unrealistic expectations from day one.

---

## Page 2 — Start Day Page

**Purpose:** The first thing the user sees each morning (after the Focus Page's overnight state clears). This is where the architecture of the day is constructed: new tasks can be added, the day's blocks are built, tasks from the backlog are assigned to blocks, and an optional AI sanity check is run before the day begins.

---

### Section 1: Quick Task Add

Positioned at the very top as a compact input row. The user can quickly type a new task name here and tap "Add." The task gets added directly to the backlog and is immediately available to assign to today's blocks. This is not the full task creation form (that lives in the Profile area) — it is a fast capture so the user doesn't lose ideas while planning their morning. After adding, the system asks: *"Schedule for today or save to backlog?"*

---

### Section 2: Block Builder

The main section of the page. The user constructs the time structure of their day by adding blocks. Each block has:

- **Start time** and **End time** (time pickers)
- **Block type** (selector with four options):
  - **Open Block** — unassigned free work time; any backlog task can be placed here
  - **Fixed Block** — assigned to one specific project only; only tasks from that project can be placed here
  - **Habit Block** — for daily habits (these are defined in the Profile, not added daily)
  - **Meeting Block** — non-work time commitment; no tasks assigned; acts as a visual placeholder in the schedule
- **Custom block types** — the user can create and name other block types and mark them as either Open or Fixed behavior

The rule: Fixed Blocks are tied to a specific project at creation time (e.g., "MOOCS Fixed Block — 9:00 to 12:00, location: Office"). Open Blocks can host tasks from any project or the general backlog. This lets the user reflect real-life constraints — office hours can only be used for work tasks, but free time at home can go toward graduation, studying for finals, or anything else.

All blocks are displayed as a **visual day timeline** — a vertical or horizontal strip showing the full day from wake time to sleep time, with blocks laid out in their correct positions. Gaps between blocks are visible, which signals unscheduled free time.

Each block automatically registers a **Checkpoint** at its end time. Checkpoint timing has a **dynamic grace period** of between 10 and 30 minutes (randomized, not shown to the user) to prevent the user from always relying on the maximum grace window.

---

### Section 3: Task Allocator

Below the timeline. Backlog tasks are shown as cards. The user assigns each task to a block by tapping or dragging. Tasks show their estimated duration and priority level. Fixed Blocks only accept tasks from their assigned project — the interface visually filters the backlog when a Fixed Block is selected.

---

### Section 4: AI Reality Check

A prominent button at the bottom of the page labeled "Check my plan." When tapped, the full day's block structure and task load is sent to the AI for a sanity review. The AI responds with a brief assessment: either confirmation that the plan looks realistic, or a specific warning (e.g., *"You've placed 8 hours of tasks into 5 hours of blocks. Consider moving 2 tasks to tomorrow."*). The user can accept the warning or proceed anyway — this is advisory, not a gate.

---

## Profile Page

**Purpose:** The permanent settings and management hub. Accessible from the nav bar at any time. Contains three main areas: Habits, Projects & Tasks, and Settings.

---

### Tab 1: Habits

The user creates and manages their recurring daily habits here. Each habit has:

- A name (e.g., "Morning workout")
- A target duration or count (e.g., 30 minutes, or 10 pages)
- Which Habit Block it belongs to (morning, evening, etc.)
- **Completion method:** checkbox (for habits that don't need proof) or photo upload (for habits where the user wants visual documentation)
- Whether the habit is currently active or paused

Habits do not get added daily. Once created, they appear automatically in every Habit Block they belong to, every day. The user simply checks them off or uploads their proof.

---

### Tab 2: Projects & Tasks

**Projects sub-section:** The user creates and manages projects here. Each project has a name, optional description, and an optional deadline. Projects can be archived when complete. There is always a default "General" project for unassigned tasks.

**Tasks sub-section:** The full task creation form. Each task has:
- **Name**
- **Project assignment** (which project it belongs to, or General)
- **Estimated duration** (in minutes)
- **Priority level** (Low, Normal, High, Critical)
- **Deadline** (optional date picker)
- **Challenge flag** — a toggle that marks this task as a personal challenge. When enabled, a secondary tag selector expands showing the challenge category: "Mentally exhausting," "Lack of know-how," "Self-doubt," "Requires sustained energy," or a free-text field. These tags are stored as metadata and passed to the AI if this task is involved in a checkpoint failure.
- **Task dependencies** — an optional field where the user can mark that this task depends on another task being completed first. The scheduling engine and backlog display respect this ordering (dependent tasks show as locked until their prerequisite is done).

Tasks can also be added from the Focus Page via a backlog panel (tap a "Backlog" button to expand it), and from the Quick Add on the Start Day Page.

---

### Tab 3: Settings

- **API Key field** — the user enters their Gemini API key here. Without it, AI features are disabled and the chat page shows a placeholder message.
- **Edit "My Ideal Day" targets** — same fields as Onboarding Section 1, editable at any time
- **Edit Core Motivation** — same text area as Onboarding Section 2, editable
- **Edit rest days**
- **Toggle optional tracking features** (weight logging, screen time logging) on or off
- **Redemption Act configuration** — the user defines what their personal redemption act is when they miss points (see End Day Page section for context). Examples: 30 push-ups, donate a small amount, go for a 15-minute walk, journal for 10 minutes. The redemption act should be something that takes 10–30 minutes maximum.
- **Boundary Breaker settings** — the user can configure how often Boundary Breaker days are suggested (e.g., once per week, manually triggered, or automatic based on recent consistency)

---

## Page 3 — Focus Page

**Purpose:** The primary execution environment. The default view the tablet shows most of the time. Calm, minimal, non-distracting. Everything unnecessary is removed.

---

### Component 1: End of Day Countdown

Top right corner. A live ticking clock showing hours, minutes, and seconds remaining until the configured sleep time (e.g., "07:42:15 remaining"). Makes the day feel finite and real without creating anxiety.

---

### Component 2: Current Block & Checkpoint Status

Top left corner. Shows the active block name and time until its checkpoint fires (e.g., "Fixed Block — MOOCS · Checkpoint in 38 min"). Updates automatically as blocks progress.

---

### Component 3: Daily Task List (Main Body — Left/Center)

The primary content area. Displays all of today's tasks organized by their block order. The structure:

- **Habit Block tasks** appear at the top (they are scheduled first in the morning). Each habit shows its completion method: a checkbox or a camera icon. Tapping the camera icon opens a bottom sheet with a photo upload/capture option — the uploader is not always visible on screen, it appears on tap only. When a habit is completed, it slides down into a collapsed "Completed" section with a toggle to expand.
- **Work Block tasks** appear below, in order. Each task shows its name, estimated duration, priority, and project. Tapping a task starts its timer. A running task shows a live elapsed timer, a Pause button, and a Mark Done button. Only one task can be actively timed at once.
- **Meeting Blocks** appear as non-interactive placeholder rows in the correct time position.

When tasks are completed, they slide into the collapsed "Done" section. The active list only shows incomplete tasks, keeping the screen clean.

There is a **"Backlog" button** (small, non-intrusive, positioned at the bottom of the task list) that expands a panel showing all unscheduled backlog tasks. From here the user can add a new task, schedule a backlog task for today, or just review what's pending.

---

### Component 4: Score Counter

A small, always-visible number in the top center or top area. Shows the user's current day score. It ticks up when tasks are completed, habits are checked, and checkpoints are passed. It ticks down when checkpoints are failed, when the start time was later than the target wake time, or when the user needs to extend past their sleep time. This gives the user a constant ambient sense of how the day is going without requiring them to open a separate page.

---

### Component 5: Chat Toggle

A small, accessible button in the bottom nav bar (the Chat icon). Tapping it transitions to the AI Chat page. This is the only navigation to that page — it is not a large or tempting button, just always reachable.

---

## Page 4 — AI Chat Page (Unfocused Mode)

**Purpose:** The recovery and replanning zone. Used when checkpoints fail and the rule engine routes the user here, or when the user voluntarily needs help. Designed for low cognitive friction — the user should be able to get support with minimal typing.

---

### The AI Modes

The AI operates in three distinct modes, not as a free-form chatbot. This keeps responses focused and conserves API tokens.

**Mode 1 — Support Mode (User-initiated or checkpoint failure):**
Used when the user is demotivated, stuck, stressed, or emotionally struggling. The AI already has the user's Core Motivation, the failed task name, the challenge tags on that task, and the current day's score in its system prompt. Its opening message is specific, not generic. It references what actually happened. It connects the situation back to the user's stated "why." It does not moralize or lecture. It helps the user find the next micro-step.

**Mode 2 — Replan Mode (User-initiated, "something came up"):**
Used when an unexpected external event disrupts the day and the user needs to reorganize. This mode is **mostly rule-based, not AI-driven**, to conserve tokens. The system automatically reprioritizes remaining tasks based on their priority level and dependency order, pushes lower-priority tasks to tomorrow, and presents the user with a revised schedule. The user can accept it, or edit it manually. AI is only called if the user explicitly asks for a recommendation or explanation — otherwise the algorithm handles it.

**Mode 3 — Bot-Initiated Check-In (System-triggered):**
The rule engine triggers this when a checkpoint fires and tasks were not started, or habits were not completed. The AI sends the opening message proactively: *"I see you haven't started [Task Name] yet. What's going on?"* The user must respond. The AI evaluates the response and logs the reason. If the reason is a legitimate external event, the impact on the day score is reduced. If it is a pattern (the same reason appears repeatedly), the AI notes that in future summaries.

---

### Page Layout

**Top:** A "Back to Focus" button — clearly visible, positioned to make returning to work feel easy.

**Center:** Chat history window filling most of the screen. The AI's message style is direct, warm, and brief — not essay-length responses.

**Bottom:** Quick Action Chips (horizontal scrollable row) pinned above the keyboard input. Chips: "I'm stuck," "I'm demotivated," "Something came up," "I need to replan my day," "I just need a minute." These send pre-defined context messages to the AI with one tap — designed for the exact state where typing feels impossible.

**Below chips:** Standard text input field for free-form messages.

---

## Page 5 — End Day Page

**Purpose:** The daily closing ritual. Triggered automatically when the sleep time is reached, or manually from the nav bar. Closes the day, calculates the score, handles redemption, and saves all data.

---

### Section 1: Day Summary Header

A brief AI-generated summary (2–4 sentences) that references specific things from the day: tasks completed, habits maintained, any patterns it noticed. Tone: honest, warm, forward-looking. Example: *"You completed your workout and hit your reading goal today — solid consistency. You underestimated the grad project task by about 40 minutes; worth padding that estimate next time. Tomorrow is a new window."*

---

### Section 2: Evidence Collage

All photos uploaded during the day's Habit Blocks are assembled into a visual grid. If no photos were uploaded, this section shows completed checkboxes as visual tiles instead. The psychological purpose is concrete and immediate: *look at what you actually did.* This is not a metric — it is a visual record of real behavior.

---

### Section 3: Day Metrics Row

Four numbers displayed cleanly: **Tasks Completed**, **Total Time Tracked**, **Estimation Accuracy** (% of tasks completed within their estimated window), and **Habits Completed** (e.g., 4/5). Below each number is a small trend arrow comparing today to the 7-day average.

---

### Section 4: Score Breakdown

The day's final score displayed prominently with a breakdown of what added and subtracted points. Examples:

- ✅ Woke up at 6:10 AM (within target) → +5
- ✅ Completed 3/3 work tasks → +15
- ✅ Passed all checkpoints → +10
- ❌ Habit "Reading" not completed → -5
- ❌ Missed checkpoint grace window twice → -8

The score falls into one of three color-coded zones: **Green (Good)**, **Yellow (Acceptable)**, **Red (Needs attention)**. Falling in Yellow on a hard day is still presented as a reasonable outcome, not a failure.

---

### Section 5: Redemption Pipeline

This section only appears if the user's score falls below the Acceptable threshold, or if specific habits or tasks were missed that have a "make-up" rule.

**Part A — Rescheduled Items:** The system shows which missed habits or tasks will be rescheduled over the next 1–3 days, and at what intensity (e.g., "Your missed 10-page reading will be added as +5 extra pages to tomorrow and the day after"). This is automatic and shown for the user's awareness.

**Part B — Today's Redemption Act:** The user's pre-configured redemption act (from Profile settings) is shown as a required step before "Close Day" becomes available. Examples: "30 push-ups," "10-minute walk," "journal for 15 minutes." The user completes it and marks it done. The button to mark it done is honest — it is trust-based. There is no verification. The point is the commitment and the ritual of it.

---

### Section 6: Optional Daily Logs

Toggleable from Profile settings. If enabled, small input fields appear for:

- **Weight** (number input with unit toggle kg/lbs)
- **Screen time today** (number input in hours) — if the logged screen time is trending upward over multiple days without an explanation the user has set, the AI will mention it in the next day's chat context

---

### Section 7: Daily Reflection

A short optional text area: *"One sentence about today."* This is saved to the historical record and can be reviewed in analytics.

---

### Section 8: Close Day Button

A deliberate, final button at the bottom of the page. Cannot be tapped until the Redemption Act (if required) is marked done. Pressing it: saves all data for the day, locks the day as complete, increments or maintains the challenge streak, and returns the app to its resting state. The app shows a minimal idle/rest screen until the next configured wake time.

---

## Page 6 — Analytics & Profile Stats

**Purpose:** Long-term pattern recognition and growth tracking. Accessible from the Profile tab. Not for daily use — for periodic reflection.

---

### Section 1: Challenge Progress Map

A calendar grid showing the current active challenge. Days with sufficient score (Green or Yellow zone) are marked as successful days. Rest days are shown in a neutral color. The current streak and total challenge progress are displayed prominently (e.g., "Day 9 of 14 — 9 valid days, 0 rest days used").

---

### Section 2: Score History Graph

A line graph showing daily score over the past 7, 14, or 30 days (user selects the window). The Green/Yellow/Red zone thresholds are drawn as horizontal reference lines so the user can see their consistency at a glance.

---

### Section 3: Boundary Breaker Records

A personal records board showing the user's all-time best performance on each of their "Ideal Day" targets: most hours worked in a day, longest workout, most pages read, earliest wake-up. When a Boundary Breaker day is triggered, the system compares the user's current day against these records and the AI encourages specific record-breaking attempts.

---

### Section 4: Estimation Accuracy Tracker

A chart comparing estimated vs actual task durations over time. Filtered by project or difficulty. A single insight line below it states the pattern plainly (e.g., "You underestimate challenging tasks by an average of 28%. Try adding 30% buffer when scheduling them."). This insight is rule-generated, not AI-generated, to save tokens.

---

### Section 5: Habit Consistency Grid

A heatmap-style grid for each habit showing which days it was completed over the past 30 days. Lets the user identify which habits are truly consistent and which are frequently skipped.

---

### Section 6: AI Pattern Summary

A "Generate Insight" button that, when tapped, sends the past 30 days of aggregated data (score trends, common failure tags, frequently missed habits, screen time trends) to the AI and asks for a 3–5 sentence behavioral insight. This is a manual, on-demand call — not automatic. It is the one place where the AI is asked to synthesize a lot of data into a meaningful observation, so it is worth the token cost.

---

## The Rule Engine (Background Logic)

The rule engine runs silently in the background and is the behavioral backbone of the system. It fires at the end time of every block registered during the Start Day session, with a dynamic random grace period of 10–30 minutes (the exact duration is never revealed to the user).

**On Habit Block checkpoint:**
- If all habits in the block are checked or have uploaded photos → **Pass**. Toast message: brief and warm. Streak maintained.
- If any habits are incomplete → **Fail**. The system opens a prompt asking why. Options: "Ran out of time," "Forgot," "Something came up," "Health issue." The response is logged. If "Something came up," the habit is flagged for redistribution into upcoming days. If the same habit fails repeatedly, the AI flags this pattern in the next AI Performance Summary.

**On Work Block checkpoint:**
- If at least one task was timed and completed → **Pass**. If tasks finished early, the system offers to shift the next block earlier.
- If a task overran significantly → **Fail - Overrun**. The system asks why and offers options: extend the current block, push the task to the next available slot, or mark it as "in progress" and continue tomorrow.
- If no timers were started at all → **Fail - Missing**. The rule engine immediately triggers the AI Chat Page in Bot-Initiated Mode (Mode 3) with the task context pre-loaded.

**On any failure:**
The day score updates immediately. The user sees the score number change in real time.

**Boundary Breaker Days:**
When the rule engine detects that the user has had 3+ consecutive Green-zone days, it may suggest a Boundary Breaker day. On a Boundary Breaker day, the Start Day page shows a special banner with the user's personal records and encourages the user to beat at least one of them. The AI Reality Check on this day factors in the Boundary Breaker goal. If the user beats a record, the Analytics page updates the personal best and the End Day summary highlights it prominently.

---

## Score System

The score system is designed to be **motivating without being punishing**. It operates on the principle that a 70% day is still a good day — the goal is not perfection but consistent improvement over time.

**Points are earned by:**
- Waking within 30 minutes of the target wake time: +5
- Each task completed on time: +5
- Each task completed early: +7
- Each habit completed: +3 per habit
- Passing a checkpoint cleanly: +5
- Completing the day's Redemption Act (if required): +5
- Closing the day before sleep time: +5

**Points are lost by:**
- Waking more than 30 minutes after target time: -5
- Missing a checkpoint grace window: -5 per miss
- Leaving tasks incomplete with no rescheduling: -5 per task
- Failing to complete a habit with no rescheduling: -3 per habit
- Needing to extend past the sleep time to finish tasks: -10

**Score zones:**
- **Green (Good):** 80%+ of maximum possible day score
- **Yellow (Acceptable):** 50–79%
- **Red (Needs attention):** below 50%

The score is plotted on the Analytics graph so the user can see their overall trajectory over time. The goal of this graph is not to show a perfect line — it is to show a line that is **trending upward** over weeks and months.

---

## Aesthetic & Design Direction

The app must feel like **a quiet room with a purpose**. The visual language is calm, focused, and serious — designed for extended sessions without eye strain on a tablet screen.

Recommended direction: dark background (deep charcoal or near-black, not pure black), warm off-white for primary text, a single warm accent color (amber, rust, or muted gold) used only for active states, timers, and score indicators. Typography should be a utilitarian monospace or tabular font for numbers and timers (to make the countdown feel mechanical and precise), paired with a clean humanist sans-serif for all other text. No gradients, no decorative illustrations, no celebration animations that feel performative. The reward in this app is internal — the UI should reflect that. Micro-interactions (a task sliding into "Done," a habit card fading out) should be smooth but understated.

The overall feeling: *this device is an instrument, not an app store.*