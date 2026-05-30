/* app.js — Focus Dashboard
 * Stages 1, 2 (routing, onboarding, profile) + Stage 3 (plan page)
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. STATE
    // =========================================================================
    let state = {
        userProfile:    loadData('userProfile')  || null,
        habits:         loadData('habits')        || [],
        projects:       loadData('projects')      || [{ id: 'general', name: 'General', isArchived: false }],
        tasks:          loadData('tasks')         || [],
        blocks:         loadData('todayBlocks')   || [],
        // Stage 4
        todayHabitCompletion: loadData('todayHabitCompletion') || {},
        scoreEvents:    loadData('scoreEvents')   || [],
        activeTimer:    null,
        ruleEngineInterval:  null,
        countdownInterval:   null,
        _quickTaskDraft: null,
    };

    // =========================================================================
    // 2. ROUTING
    // =========================================================================
    const navLinks = document.querySelectorAll('.nav-link');
    const pages    = document.querySelectorAll('.page');

    function showPage(pageId) {
        pages.forEach(p => p.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));

        const targetPage = document.getElementById(pageId);
        if (targetPage) targetPage.classList.add('active');

        const targetLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
        if (targetLink) targetLink.classList.add('active');

        // Page-specific render calls
        switch (pageId) {
            case 'profile-page': renderProfilePage(); break;
            case 'plan-page':    renderPlanPage();    break;
            case 'focus-page':   renderFocusPage();   break;
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            showPage(pageId);
        });
    });

    // "Go to plan" shortcut from focus empty state
    const focusGoPlanBtn = document.getElementById('focus-go-to-plan-btn');
    if (focusGoPlanBtn) {
        focusGoPlanBtn.addEventListener('click', () => {
            // Navigate using the nav link so active state updates correctly
            const planNavLink = document.querySelector('.nav-link[data-page="plan-page"]');
            if (planNavLink) planNavLink.click();
            else showPage('plan-page');
        });
    }

    // =========================================================================
    // 3. TOAST NOTIFICATIONS
    // =========================================================================
    function showToast(message, type = '') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast${type ? ' toast-' + type : ''}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.25s ease forwards';
            setTimeout(() => toast.remove(), 260);
        }, 2800);
    }

    // =========================================================================
    // 4. ONBOARDING
    // =========================================================================

    // --- Rest day toggle (onboarding) ---
    const restDaysSelector = document.getElementById('rest-days-selector');
    if (restDaysSelector) {
        restDaysSelector.querySelectorAll('.day-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const selected = restDaysSelector.querySelectorAll('.day-btn.selected');
                if (btn.classList.contains('selected')) {
                    btn.classList.remove('selected');
                    btn.setAttribute('aria-pressed', 'false');
                } else if (selected.length < 2) {
                    btn.classList.add('selected');
                    btn.setAttribute('aria-pressed', 'true');
                } else {
                    showToast('You can pick at most 2 rest days.', 'error');
                }
            });
        });
    }

    // --- Challenge tier selector (onboarding) ---
    const challengeSelector = document.getElementById('challenge-selector');
    if (challengeSelector) {
        challengeSelector.querySelectorAll('.challenge-btn:not(:disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                challengeSelector.querySelectorAll('.challenge-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    // --- Custom targets (onboarding) ---
    const btnAddCustomTarget = document.getElementById('btn-add-custom-target');
    const customTargetsList  = document.getElementById('custom-targets-list');

    if (btnAddCustomTarget) {
        btnAddCustomTarget.addEventListener('click', addCustomTargetRow);
    }

    function addCustomTargetRow(prefill = {}) {
        const row = document.createElement('div');
        row.className = 'custom-target-row';
        row.innerHTML = `
            <input type="text" placeholder="Target name" value="${prefill.name || ''}" class="custom-target-name" />
            <input type="number" placeholder="0" min="0" value="${prefill.value || ''}" class="custom-target-value" style="max-width:70px;" />
            <input type="text" placeholder="unit" value="${prefill.unit || ''}" class="custom-target-unit" style="max-width:70px;" />
            <button type="button" class="btn btn-icon btn-sm btn-danger" title="Remove">✕</button>
        `;
        row.querySelector('.btn-danger').addEventListener('click', () => row.remove());
        customTargetsList.appendChild(row);
    }

    // --- Onboarding submit ---
    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) {
        onboardingForm.addEventListener('submit', handleOnboardingSubmit);
    }

    function handleOnboardingSubmit(e) {
        e.preventDefault();

        const selectedTierBtn = document.querySelector('#challenge-selector .challenge-btn.selected');
        const selectedTier    = selectedTierBtn ? parseInt(selectedTierBtn.dataset.tier) : 1;

        const customTargets = [];
        if (customTargetsList) {
            customTargetsList.querySelectorAll('.custom-target-row').forEach(row => {
                const name  = row.querySelector('.custom-target-name').value.trim();
                const value = parseFloat(row.querySelector('.custom-target-value').value);
                const unit  = row.querySelector('.custom-target-unit').value.trim();
                if (name) customTargets.push({ name, value: isNaN(value) ? 0 : value, unit: unit || 'times' });
            });
        }

        const profile = {
            userId: generateId(),
            idealDay: {
                wakeTime:        document.getElementById('ideal-wake-time').value,
                sleepTime:       document.getElementById('ideal-sleep-time').value,
                workHours:       parseFloat(document.getElementById('ideal-work-hours').value) || 6,
                trainingMinutes: parseInt(document.getElementById('ideal-training-minutes').value) || 30,
                customTargets,
            },
            coreMotivation: document.getElementById('core-motivation').value.trim(),
            restDays: Array.from(document.querySelectorAll('#rest-days-selector .day-btn.selected'))
                           .map(btn => parseInt(btn.dataset.day)),
            challenge: {
                currentTier:    selectedTier,
                unlockedTiers:  [1],
                startDate:      new Date().toISOString(),
            },
            geminiApiKey: (document.getElementById('onboarding-api-key')?.value || '').trim(),
            trackingFeaturesEnabled: { weight: false, screenTime: false },
            redemptionAct: '',
            boundaryBreakerFrequency: 'weekly',
            personalRecords: {},
        };

        state.userProfile = profile;
        saveData('userProfile', profile);
        showPage('focus-page');
        showToast('Welcome! Your profile is set up. 🚀', 'success');
    }

    // =========================================================================
    // 5. FOCUS PAGE — STAGE 4
    // =========================================================================

    // --- Photo sheet wiring ---
    const photoSheetOverlay  = document.getElementById('photo-sheet-overlay');
    const photoConfirmBtn    = document.getElementById('photo-confirm-btn');
    const photoChooseBtn     = document.getElementById('photo-choose-btn');
    const photoCancelBtn     = document.getElementById('photo-cancel-btn');
    const photoUploadInput   = document.getElementById('photo-upload-input');
    const photoPreviewArea   = document.getElementById('photo-preview-area');
    const photoPreviewImg    = document.getElementById('photo-preview-img');
    const photoPlaceholder   = document.getElementById('photo-placeholder');
    const photoSheetHabitName = document.getElementById('photo-sheet-habit-name');
    let _photoHabitId   = null;
    let _photoImageData = null;

    if (photoChooseBtn)  photoChooseBtn.addEventListener('click', () => photoUploadInput && photoUploadInput.click());
    if (photoPreviewArea) photoPreviewArea.addEventListener('click', () => photoUploadInput && photoUploadInput.click());
    if (photoCancelBtn)  photoCancelBtn.addEventListener('click', closePhotoSheet);
    if (photoSheetOverlay) {
        photoSheetOverlay.addEventListener('click', e => { if (e.target === photoSheetOverlay) closePhotoSheet(); });
    }
    if (photoUploadInput) {
        photoUploadInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                _photoImageData = ev.target.result;
                if (photoPreviewImg) { photoPreviewImg.src = _photoImageData; photoPreviewImg.style.display = 'block'; }
                if (photoPlaceholder) photoPlaceholder.style.display = 'none';
                if (photoConfirmBtn)  photoConfirmBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        });
    }
    if (photoConfirmBtn) {
        photoConfirmBtn.addEventListener('click', () => {
            if (_photoHabitId && _photoImageData) {
                completeHabitWithPhoto(_photoHabitId, _photoImageData);
                closePhotoSheet();
            }
        });
    }

    // --- Checkpoint modal wiring ---
    const checkpointModalOverlay = document.getElementById('checkpoint-modal-overlay');
    const checkpointModalConfirm = document.getElementById('checkpoint-modal-confirm');
    const checkpointReasonOpts   = document.getElementById('checkpoint-reason-options');
    let _checkpointResolve = null;
    let _selectedReason    = null;

    if (checkpointReasonOpts) {
        checkpointReasonOpts.querySelectorAll('.reason-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                checkpointReasonOpts.querySelectorAll('.reason-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                _selectedReason = btn.dataset.reason;
                if (checkpointModalConfirm) {
                    checkpointModalConfirm.disabled = false;
                    checkpointModalConfirm.textContent = 'Continue';
                }
            });
        });
    }
    if (checkpointModalConfirm) {
        checkpointModalConfirm.addEventListener('click', () => {
            if (_checkpointResolve) {
                const reason = _selectedReason || 'acknowledged';
                closeCheckpointModal();
                _checkpointResolve(reason);
            }
        });
    }

    // --- Backlog panel toggle ---
    const focusBacklogToggle = document.getElementById('focus-backlog-toggle');
    const focusBacklogPanel  = document.getElementById('focus-backlog-panel');
    if (focusBacklogToggle) {
        focusBacklogToggle.addEventListener('click', () => {
            const isOpen = focusBacklogPanel.style.display !== 'none';
            focusBacklogPanel.style.display = isOpen ? 'none' : 'block';
            const cnt = getPendingBacklogCount();
            focusBacklogToggle.innerHTML = `${isOpen ? '\u25be' : '\u25b4'} Backlog ${cnt > 0 ? '(' + cnt + ')' : ''}`;
            if (!isOpen) renderFocusBacklogPanel();
        });
    }

    // =====================================================================
    // RENDER
    // =====================================================================

    function renderFocusPage() {
        const today = new Date().toISOString().split('T')[0];
        const todayBlocks = state.blocks.filter(b => b.date === today);

        const emptyState = document.getElementById('focus-empty-state');
        const activeView = document.getElementById('focus-active-view');

        if (todayBlocks.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            if (activeView) activeView.style.display  = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (activeView) activeView.style.display  = 'block';

        buildFocusTaskList(todayBlocks);
        updateBlockStatusHeader();
        updateScoreDisplay();
        updateBacklogCount();
    }

    function buildFocusTaskList(todayBlocks) {
        const list = document.getElementById('focus-task-list');
        if (!list) return;
        list.innerHTML = '';
        const sorted = [...todayBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
        sorted.forEach(block => list.appendChild(buildBlockSection(block)));
    }

    function buildBlockSection(block) {
        const section   = document.createElement('div');
        section.className = 'focus-block-section';
        section.dataset.blockId = block.id;

        const typeKey   = block.blockType.toLowerCase();
        const dotColors = { open: 'var(--block-open)', fixed: 'var(--block-fixed)', habit: 'var(--block-habit)', meeting: 'var(--block-meeting)' };
        const dotColor  = dotColors[typeKey] || 'var(--accent)';
        const statusClass = { passed: 'focus-block-passed', failed: 'focus-block-failed', pending: 'focus-block-pending' }[block.checkpointStatus] || 'focus-block-pending';
        const statusLabel = { passed: '\u2713 Passed', failed: '\u2715 Failed', pending: 'Pending' }[block.checkpointStatus] || 'Pending';
        const projectLabel = block.projectId && block.projectId !== 'general' ? ` \u00b7 ${getProjectName(block.projectId)}` : '';

        const header = document.createElement('div');
        header.className = 'focus-block-section-header';
        header.innerHTML = `
            <span class="focus-block-section-dot" style="background-color:${dotColor};"></span>
            <span class="focus-block-section-title">${escHtml(block.label)}${escHtml(projectLabel)}</span>
            <span class="focus-block-section-time">${block.startTime}\u2013${block.endTime}</span>
            <span class="focus-block-section-status ${statusClass}">${statusLabel}</span>
        `;
        section.appendChild(header);

        if (block.blockType === 'Meeting') {
            const row = document.createElement('div');
            row.className = 'focus-meeting-block';
            row.innerHTML = `<span class="focus-meeting-icon">\ud83d\udcc5</span><span class="focus-meeting-label">${escHtml(block.label)}</span><span class="focus-meeting-time">${block.startTime}\u2013${block.endTime}</span>`;
            section.appendChild(row);
            return section;
        }

        if (block.blockType === 'Habit') {
            const active = state.habits.filter(h => h.isActive);
            if (!active.length) {
                const e = document.createElement('p'); e.className = 'empty-state'; e.style.padding = '0.5rem 0';
                e.textContent = 'No habits configured. Go to Profile \u2192 Habits.';
                section.appendChild(e);
            } else {
                active.forEach(h => section.appendChild(buildHabitItem(h, block.id)));
            }
            return section;
        }

        // Open / Fixed
        const pending   = state.tasks.filter(t => t.blockId === block.id && t.status !== 'completed');
        const done      = state.tasks.filter(t => t.blockId === block.id && t.status === 'completed');

        if (!pending.length && !done.length) {
            const e = document.createElement('p'); e.className = 'empty-state'; e.style.padding = '0.5rem 0';
            e.textContent = 'No tasks assigned. Go to Plan to assign tasks.';
            section.appendChild(e);
        } else {
            pending.forEach(t => section.appendChild(buildTaskItem(t)));

            if (done.length) {
                const doneToggle = document.createElement('button');
                doneToggle.className = 'focus-done-toggle';
                const doneList   = document.createElement('div');
                doneList.className = 'focus-done-list';
                done.forEach(t => doneList.appendChild(buildTaskItem(t)));

                doneToggle.innerHTML = `\u25be ${done.length} done`;
                doneToggle.addEventListener('click', () => {
                    doneList.classList.toggle('expanded');
                    doneToggle.innerHTML = doneList.classList.contains('expanded')
                        ? `\u25b4 ${done.length} done` : `\u25be ${done.length} done`;
                });
                section.appendChild(doneToggle);
                section.appendChild(doneList);
            }
        }
        return section;
    }

    function buildHabitItem(habit, blockId) {
        const comp = state.todayHabitCompletion[habit.id] || { completed: false, photoUrl: null };
        const isPhoto     = habit.completionMethod === 'photo';
        const isCompleted = comp.completed;

        const item = document.createElement('div');
        item.className = `focus-habit-item${isCompleted ? ' completed' : ''}`;
        item.dataset.habitId = habit.id;

        const checkBtn = document.createElement('button');
        checkBtn.className = `focus-habit-check${isCompleted ? ' checked' : ''}`;
        checkBtn.innerHTML = isCompleted ? '\u2713' : '';
        checkBtn.title = isCompleted ? 'Completed (tap to undo)' : 'Mark complete';
        checkBtn.addEventListener('click', () => {
            if (!isPhoto) toggleHabitComplete(habit.id, blockId);
            else if (!isCompleted) openPhotoSheet(habit.id);
        });

        const info = document.createElement('div');
        info.className = 'focus-habit-info';
        info.innerHTML = `<div class="focus-habit-name">${escHtml(habit.name)}</div><div class="focus-habit-target">${habit.targetValue} ${escHtml(habit.targetUnit)}</div>`;

        item.appendChild(checkBtn);
        item.appendChild(info);

        if (isPhoto) {
            if (comp.photoUrl) {
                const thumb = document.createElement('img');
                thumb.className = 'focus-habit-photo-thumb';
                thumb.src = comp.photoUrl;
                thumb.alt = 'Proof';
                thumb.addEventListener('click', () => openPhotoSheet(habit.id));
                item.appendChild(thumb);
            } else {
                const photoBtn = document.createElement('button');
                photoBtn.className = 'focus-habit-photo-btn';
                photoBtn.innerHTML = '\ud83d\udcf7';
                photoBtn.title = 'Upload proof';
                photoBtn.addEventListener('click', () => openPhotoSheet(habit.id));
                item.appendChild(photoBtn);
            }
        }
        return item;
    }

    function buildTaskItem(task) {
        const isActive    = state.activeTimer?.taskId === task.id;
        const isCompleted = task.status === 'completed';
        const prioColors  = { Low: 'var(--priority-low)', Normal: 'var(--priority-normal)', High: 'var(--priority-high)', Critical: 'var(--priority-critical)' };
        const barColor    = prioColors[task.priority] || 'var(--priority-normal)';
        const proj        = getProjectName(task.projectId);

        const item = document.createElement('div');
        item.className = `focus-task-item${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`;
        item.dataset.taskId = task.id;

        const bar = document.createElement('div');
        bar.className = 'focus-task-priority-bar';
        bar.style.backgroundColor = barColor;
        item.appendChild(bar);

        const content = document.createElement('div');
        content.className = 'focus-task-content';
        content.innerHTML = `
            <div class="focus-task-name">${escHtml(task.name)}</div>
            <div class="focus-task-meta">
                <span class="badge badge-duration">${task.estimatedDuration}m</span>
                <span class="badge badge-priority-${task.priority.toLowerCase()}">${task.priority}</span>
                ${proj !== 'General' ? `<span class="muted" style="font-size:0.75rem;">${escHtml(proj)}</span>` : ''}
                ${task.isChallenge ? '<span class="badge" style="background:var(--highlight-dim);color:var(--highlight);">&thinsp;\u26a1&thinsp;</span>' : ''}
            </div>
        `;
        item.appendChild(content);

        const controls = document.createElement('div');
        controls.className = 'focus-task-controls';

        if (isCompleted) {
            controls.innerHTML = `<span style="color:var(--accent-dark); font-size:1.1rem;">\u2713</span>`;
        } else if (isActive) {
            const timerEl = document.createElement('div');
            timerEl.className = 'focus-timer-display';
            timerEl.id = `timer-${task.id}`;
            timerEl.textContent = formatElapsed(state.activeTimer.elapsed);

            const pauseBtn = document.createElement('button');
            pauseBtn.className = 'btn btn-sm btn-ghost';
            pauseBtn.textContent = '\u23f8';
            pauseBtn.title = 'Pause';
            pauseBtn.addEventListener('click', e => { e.stopPropagation(); pauseActiveTimer(); });

            const doneBtn = document.createElement('button');
            doneBtn.className = 'btn btn-sm btn-primary';
            doneBtn.textContent = '\u2713 Done';
            doneBtn.addEventListener('click', e => { e.stopPropagation(); markTaskDone(task.id); });

            controls.appendChild(timerEl);
            controls.appendChild(pauseBtn);
            controls.appendChild(doneBtn);
        } else {
            const startBtn = document.createElement('button');
            startBtn.className = 'btn btn-sm btn-ghost';
            startBtn.textContent = '\u25b6';
            startBtn.title = 'Start timer';
            startBtn.addEventListener('click', e => { e.stopPropagation(); startTaskTimer(task.id); });
            controls.appendChild(startBtn);
        }
        item.appendChild(controls);

        if (!isCompleted) {
            item.addEventListener('click', () => { if (state.activeTimer?.taskId !== task.id) startTaskTimer(task.id); });
        }
        return item;
    }

    // =====================================================================
    // TASK TIMERS
    // =====================================================================

    function startTaskTimer(taskId) {
        if (state.activeTimer) pauseActiveTimer();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task || task.status === 'completed') return;
        task.status = 'in-progress';
        saveData('tasks', state.tasks);
        state.activeTimer = { taskId, startedAt: Date.now(), elapsed: 0, intervalId: null };
        state.activeTimer.intervalId = setInterval(() => {
            if (!state.activeTimer) return;
            state.activeTimer.elapsed = Math.floor((Date.now() - state.activeTimer.startedAt) / 1000);
            const el = document.getElementById(`timer-${taskId}`);
            if (el) el.textContent = formatElapsed(state.activeTimer.elapsed);
        }, 1000);
        const today = new Date().toISOString().split('T')[0];
        buildFocusTaskList(state.blocks.filter(b => b.date === today));
        updateBlockStatusHeader();
        showToast(`Timer started: \u201c${task.name}\u201d`, 'success');
    }

    function pauseActiveTimer() {
        if (!state.activeTimer) return;
        clearInterval(state.activeTimer.intervalId);
        const task = state.tasks.find(t => t.id === state.activeTimer.taskId);
        if (task) {
            task.actualDuration = (task.actualDuration || 0) + Math.floor(state.activeTimer.elapsed / 60);
            if (task.status === 'in-progress') task.status = 'pending';
            saveData('tasks', state.tasks);
        }
        state.activeTimer = null;
        const today = new Date().toISOString().split('T')[0];
        buildFocusTaskList(state.blocks.filter(b => b.date === today));
    }

    function markTaskDone(taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;
        if (state.activeTimer?.taskId === taskId) {
            clearInterval(state.activeTimer.intervalId);
            task.actualDuration = (task.actualDuration || 0) + Math.floor(state.activeTimer.elapsed / 60);
            state.activeTimer = null;
        }
        task.status = 'completed';
        saveData('tasks', state.tasks);
        const actual = task.actualDuration || task.estimatedDuration;
        const pts    = actual <= task.estimatedDuration * 0.9 ? 7 : 5;
        addScoreEvent(`Task \u201c${task.name}\u201d completed${pts === 7 ? ' early' : ''}`, pts, 'task');
        showToast(`\u201c${task.name}\u201d done! +${pts} pts`, 'success');
        const today = new Date().toISOString().split('T')[0];
        buildFocusTaskList(state.blocks.filter(b => b.date === today));
        updateScoreDisplay();
    }

    function formatElapsed(totalSec) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }

    // =====================================================================
    // END-OF-DAY COUNTDOWN
    // =====================================================================

    function startEndOfDayCountdown() {
        if (state.countdownInterval) clearInterval(state.countdownInterval);
        function tick() {
            const el = document.getElementById('focus-countdown-value');
            if (!el) return;
            const sleepTime = state.userProfile?.idealDay?.sleepTime;
            if (!sleepTime) { el.textContent = '--:--:--'; return; }
            const [sh, sm] = sleepTime.split(':').map(Number);
            const now = new Date();
            const sleep = new Date();
            sleep.setHours(sh, sm, 0, 0);
            if (sleep <= now) sleep.setDate(sleep.getDate() + 1);
            const sec = Math.max(0, Math.floor((sleep - now) / 1000));
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            el.classList.toggle('ending-soon', sec < 7200);
        }
        tick();
        state.countdownInterval = setInterval(tick, 1000);
    }

    // =====================================================================
    // HABIT COMPLETION
    // =====================================================================

    function toggleHabitComplete(habitId, blockId) {
        const cur  = state.todayHabitCompletion[habitId] || { completed: false, photoUrl: null };
        const next = !cur.completed;
        state.todayHabitCompletion[habitId] = { ...cur, completed: next };
        saveData('todayHabitCompletion', state.todayHabitCompletion);
        if (next) {
            addScoreEvent('Habit completed', 3, 'habit');
            showToast('Habit done! +3 pts', 'success');
        } else {
            const idx = [...state.scoreEvents].reverse().findIndex(e => e.type === 'habit');
            if (idx !== -1) state.scoreEvents.splice(state.scoreEvents.length - 1 - idx, 1);
            saveData('scoreEvents', state.scoreEvents);
            showToast('Habit unmarked.');
        }
        updateScoreDisplay();
        const today = new Date().toISOString().split('T')[0];
        buildFocusTaskList(state.blocks.filter(b => b.date === today));
    }

    function openPhotoSheet(habitId) {
        _photoHabitId   = habitId;
        _photoImageData = null;
        if (photoConfirmBtn)  photoConfirmBtn.disabled = true;
        if (photoPreviewImg)  { photoPreviewImg.src = ''; photoPreviewImg.style.display = 'none'; }
        if (photoPlaceholder) photoPlaceholder.style.display = 'flex';
        if (photoUploadInput) photoUploadInput.value = '';
        const habit = state.habits.find(h => h.id === habitId);
        if (photoSheetHabitName && habit) photoSheetHabitName.textContent = habit.name;
        const existing = state.todayHabitCompletion[habitId];
        if (existing?.photoUrl) {
            _photoImageData = existing.photoUrl;
            if (photoPreviewImg)  { photoPreviewImg.src = existing.photoUrl; photoPreviewImg.style.display = 'block'; }
            if (photoPlaceholder) photoPlaceholder.style.display = 'none';
            if (photoConfirmBtn)  photoConfirmBtn.disabled = false;
        }
        if (photoSheetOverlay) photoSheetOverlay.style.display = 'flex';
    }

    function closePhotoSheet() {
        if (photoSheetOverlay) photoSheetOverlay.style.display = 'none';
        _photoHabitId   = null;
        _photoImageData = null;
        if (photoUploadInput) photoUploadInput.value = '';
    }

    function completeHabitWithPhoto(habitId, photoData) {
        state.todayHabitCompletion[habitId] = { completed: true, photoUrl: photoData };
        saveData('todayHabitCompletion', state.todayHabitCompletion);
        const alreadyScored = state.scoreEvents.some(e => e.type === 'habit-photo' && e.item.includes(habitId));
        if (!alreadyScored) addScoreEvent(`Habit photo confirmed (${habitId})`, 3, 'habit-photo');
        showToast('Photo saved! Habit complete. +3 pts', 'success');
        updateScoreDisplay();
        const today = new Date().toISOString().split('T')[0];
        buildFocusTaskList(state.blocks.filter(b => b.date === today));
    }

    // =====================================================================
    // SCORE SYSTEM
    // =====================================================================

    function addScoreEvent(item, points, type = 'general') {
        state.scoreEvents.push({ item, points, type, timestamp: Date.now() });
        saveData('scoreEvents', state.scoreEvents);
    }

    function calculateCurrentScore() {
        return state.scoreEvents.reduce((s, e) => s + e.points, 0);
    }

    function getMaxScore() {
        const today = new Date().toISOString().split('T')[0];
        const todayBlocks = state.blocks.filter(b => b.date === today);
        const taskCount   = state.tasks.filter(t => todayBlocks.some(b => b.taskIds?.includes(t.id))).length;
        const habitCount  = state.habits.filter(h => h.isActive).length;
        const blockCount  = todayBlocks.filter(b => b.blockType !== 'Meeting').length;
        return Math.max(1, taskCount * 5 + habitCount * 3 + blockCount * 5 + 10);
    }

    function updateScoreDisplay() {
        const score = calculateCurrentScore();
        const max   = getMaxScore();
        const pct   = (score / max) * 100;
        const numEl = document.getElementById('focus-score-number');
        const maxEl = document.getElementById('focus-score-max');
        const zoneEl = document.getElementById('focus-score-zone');
        if (numEl) {
            const prev = parseInt(numEl.textContent) || 0;
            numEl.textContent = score;
            if (score > prev) { numEl.classList.add('score-up');   setTimeout(() => numEl.classList.remove('score-up'),   600); }
            if (score < prev) { numEl.classList.add('score-down'); setTimeout(() => numEl.classList.remove('score-down'), 600); }
        }
        if (maxEl)  maxEl.textContent  = `/ ${max} pts`;
        if (zoneEl) {
            const zone   = pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red';
            const labels = { green: '\ud83d\udfe2 Good', yellow: '\ud83d\udfe1 Acceptable', red: '\ud83d\udd34 Needs work' };
            zoneEl.textContent = labels[zone];
            zoneEl.style.color = pct >= 80 ? 'var(--score-green)' : pct >= 50 ? 'var(--score-yellow)' : 'var(--score-red)';
        }
    }

    // =====================================================================
    // BLOCK STATUS HEADER
    // =====================================================================

    function updateBlockStatusHeader() {
        const nameEl  = document.getElementById('focus-block-name');
        const infoEl  = document.getElementById('focus-checkpoint-info');
        const dotEl   = document.getElementById('focus-block-dot');
        if (!nameEl) return;

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const todayBlocks = state.blocks.filter(b => b.date === today);

        const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
        const nowMin = now.getHours()*60 + now.getMinutes();

        const current = todayBlocks.find(b => toMin(b.startTime) <= nowMin && nowMin <= toMin(b.endTime));
        const next    = [...todayBlocks].filter(b => toMin(b.startTime) > nowMin).sort((a,b) => a.startTime.localeCompare(b.startTime))[0];
        const block   = current || next;

        if (!block) { nameEl.textContent = 'All blocks done'; if (infoEl) infoEl.textContent = 'Great work today.'; return; }

        nameEl.textContent = current ? block.label : `Next: ${block.label}`;

        const cpMin = toMin(block.endTime) + block.gracePeriodMinutes;
        const cpH   = Math.floor(cpMin/60) % 24;
        const cpM   = cpMin % 60;
        const cpStr = `${String(cpH).padStart(2,'0')}:${String(cpM).padStart(2,'0')}`;

        if (current) {
            const diffMin = Math.max(0, Math.floor((cpMin - nowMin)));
            if (infoEl) infoEl.textContent = `checkpoint in ${diffMin}m (${cpStr})`;
        } else {
            if (infoEl) infoEl.textContent = `starts at ${block.startTime}`;
        }

        const dotColors = { open: 'var(--block-open)', fixed: 'var(--block-fixed)', habit: 'var(--block-habit)', meeting: 'var(--block-meeting)' };
        if (dotEl) dotEl.style.backgroundColor = dotColors[block.blockType.toLowerCase()] || 'var(--accent)';
    }

    // =====================================================================
    // FOCUS BACKLOG PANEL
    // =====================================================================

    function renderFocusBacklogPanel() {
        const panel = document.getElementById('focus-backlog-panel');
        if (!panel) return;
        const unassigned = state.tasks.filter(t => !t.blockId && t.status === 'pending');
        panel.innerHTML = '';
        if (!unassigned.length) {
            panel.innerHTML = '<p class="empty-state" style="padding:0.75rem 0;">Backlog is empty.</p>';
            return;
        }
        unassigned.forEach(task => {
            const row = document.createElement('div');
            row.className = 'item-row task-card';
            row.dataset.priority = task.priority;
            row.style.marginBottom = '0.5rem';
            row.innerHTML = `<div class="item-main"><div class="item-name">${escHtml(task.name)}</div><div class="item-meta"><span class="badge badge-duration">${task.estimatedDuration}m</span><span class="badge badge-priority-${task.priority.toLowerCase()}">${task.priority}</span></div></div>`;
            panel.appendChild(row);
        });
    }

    function getPendingBacklogCount() {
        return state.tasks.filter(t => !t.blockId && t.status === 'pending').length;
    }

    function updateBacklogCount() {
        const el  = document.getElementById('focus-backlog-count');
        const cnt = getPendingBacklogCount();
        if (el) el.textContent = cnt > 0 ? `(${cnt})` : '';
    }

    // =====================================================================
    // RULE ENGINE
    // =====================================================================

    function startRuleEngine() {
        if (state.ruleEngineInterval) clearInterval(state.ruleEngineInterval);
        checkCheckpoints();
        state.ruleEngineInterval = setInterval(checkCheckpoints, 30000);
    }

    async function checkCheckpoints() {
        const now   = new Date();
        const today = now.toISOString().split('T')[0];
        const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
        const nowMin = now.getHours()*60 + now.getMinutes();
        const due = state.blocks.filter(b =>
            b.date === today &&
            b.checkpointStatus === 'pending' &&
            (toMin(b.endTime) + b.gracePeriodMinutes) <= nowMin
        );
        for (const block of due) {
            await fireCheckpoint(block);
        }
    }

    async function fireCheckpoint(block) {
        block.checkpointFiredAt = new Date().toISOString();

        if (block.blockType === 'Habit') {
            const active   = state.habits.filter(h => h.isActive);
            const allDone  = active.length === 0 || active.every(h => state.todayHabitCompletion[h.id]?.completed);
            if (allDone) {
                block.checkpointStatus = 'passed';
                addScoreEvent(`Checkpoint passed: ${block.label}`, 5, 'checkpoint');
                showToast(`\u2713 Habit checkpoint passed! +5 pts`, 'success');
            } else {
                const missed = active.filter(h => !state.todayHabitCompletion[h.id]?.completed);
                const reason = await showCheckpointModal({
                    icon: '\u23f0', title: `Checkpoint: ${block.label}`,
                    body: `${missed.length} habit${missed.length > 1 ? 's' : ''} not completed: ${missed.map(h => h.name).join(', ')}`,
                    needsReason: true,
                });
                block.checkpointStatus = 'failed';
                block.failReason = reason;
                addScoreEvent(`Habit checkpoint missed: ${block.label}`, -5, 'checkpoint');
            }
        } else if (block.blockType === 'Meeting') {
            block.checkpointStatus = 'passed';
        } else {
            const assigned  = state.tasks.filter(t => t.blockId === block.id);
            const completed = assigned.filter(t => t.status === 'completed');
            const timed     = assigned.filter(t => (t.actualDuration || 0) > 0 || t.status !== 'pending');
            if (!assigned.length || completed.length > 0 || timed.length > 0) {
                block.checkpointStatus = 'passed';
                addScoreEvent(`Checkpoint passed: ${block.label}`, 5, 'checkpoint');
                showToast(`\u2713 Checkpoint passed! +5 pts`, 'success');
            } else {
                const reason = await showCheckpointModal({
                    icon: '\ud83d\udea8', title: `Checkpoint missed: ${block.label}`,
                    body: 'No tasks were started in this block. What happened?',
                    needsReason: true,
                });
                block.checkpointStatus = 'failed';
                block.failReason = reason;
                addScoreEvent(`Work checkpoint missed: ${block.label}`, -5, 'checkpoint');
                if (reason !== 'Something came up') {
                    setTimeout(() => {
                        const chatLink = document.querySelector('.nav-link[data-page="chat-page"]');
                        if (chatLink) chatLink.click();
                    }, 1200);
                }
            }
        }
        saveData('todayBlocks', state.blocks);
        updateScoreDisplay();
        const today2 = new Date().toISOString().split('T')[0];
        buildFocusTaskList(state.blocks.filter(b => b.date === today2));
        updateBlockStatusHeader();
    }

    function showCheckpointModal({ icon, title, body, needsReason }) {
        return new Promise(resolve => {
            _checkpointResolve = resolve;
            _selectedReason    = null;
            document.getElementById('checkpoint-modal-icon').textContent  = icon;
            document.getElementById('checkpoint-modal-title').textContent = title;
            document.getElementById('checkpoint-modal-body').textContent  = body;
            const picker = document.getElementById('checkpoint-reason-picker');
            if (picker) picker.style.display = needsReason ? 'block' : 'none';
            if (checkpointModalConfirm) {
                checkpointModalConfirm.disabled = needsReason;
                checkpointModalConfirm.textContent = needsReason ? 'Select a reason to continue' : 'Continue';
            }
            if (!needsReason) _selectedReason = 'acknowledged';
            if (checkpointReasonOpts) checkpointReasonOpts.querySelectorAll('.reason-btn').forEach(b => b.classList.remove('selected'));
            if (checkpointModalOverlay) checkpointModalOverlay.style.display = 'flex';
        });
    }

    function closeCheckpointModal() {
        if (checkpointModalOverlay) checkpointModalOverlay.style.display = 'none';
        _checkpointResolve = null;
    }

    // =====================================================================
    // WAKE TIME CHECK (once per day)
    // =====================================================================

    function checkWakeTime() {
        const todayKey = new Date().toISOString().split('T')[0];
        const checked  = loadData('wakeChecked');
        if (checked === todayKey) return; // already checked today
        saveData('wakeChecked', todayKey);
        const profile = state.userProfile;
        if (!profile?.idealDay?.wakeTime) return;
        const [wh, wm]  = profile.idealDay.wakeTime.split(':').map(Number);
        const now       = new Date();
        const idealMin  = wh * 60 + wm;
        const actualMin = now.getHours() * 60 + now.getMinutes();
        const diffMin   = actualMin - idealMin;
        if (Math.abs(diffMin) <= 30) {
            addScoreEvent('Woke up within 30 min of target', 5, 'wake');
            showToast('On-time wake! +5 pts', 'success');
        } else if (diffMin > 30) {
            addScoreEvent('Woke up more than 30 min late', -5, 'wake');
            showToast('Late start. -5 pts', 'error');
        }
        updateScoreDisplay();
    }

    // =========================================================================
    // 6. PLAN PAGE (STAGE 3)
    // =========================================================================
    function renderPlanPage() {
        renderPlanDateDisplay();
        renderTimeline();
        renderBacklogCards();
        renderBlockProjectDropdown();
    }

    // --- Date display ---
    function renderPlanDateDisplay() {
        const el = document.getElementById('plan-date-display');
        if (!el) return;
        const now = new Date();
        el.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // ---- Quick task add ----
    const quickTaskInput      = document.getElementById('quick-task-input');
    const quickAddBtn         = document.getElementById('quick-add-btn');
    const quickAddPrompt      = document.getElementById('quick-add-prompt');
    const quickScheduleTodayBtn = document.getElementById('quick-schedule-today-btn');
    const quickSaveBacklogBtn   = document.getElementById('quick-save-backlog-btn');
    const quickTaskPreview      = document.getElementById('quick-task-preview');

    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', handleQuickAdd);
    }
    if (quickTaskInput) {
        quickTaskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleQuickAdd(); });
    }

    function handleQuickAdd() {
        const name = quickTaskInput.value.trim();
        if (!name) { quickTaskInput.focus(); return; }
        state._quickTaskDraft = name;
        quickTaskPreview.textContent = `"${name}"`;
        quickAddPrompt.style.display = 'flex';
        quickTaskInput.value = '';
    }

    if (quickScheduleTodayBtn) {
        quickScheduleTodayBtn.addEventListener('click', () => {
            if (!state._quickTaskDraft) return;
            const task = createTask(state._quickTaskDraft, { scheduledToday: true });
            state.tasks.push(task);
            saveData('tasks', state.tasks);
            state._quickTaskDraft = null;
            quickAddPrompt.style.display = 'none';
            renderBacklogCards();
            showToast(`"${task.name}" added to today.`, 'success');
        });
    }

    if (quickSaveBacklogBtn) {
        quickSaveBacklogBtn.addEventListener('click', () => {
            if (!state._quickTaskDraft) return;
            const task = createTask(state._quickTaskDraft, { scheduledToday: false });
            state.tasks.push(task);
            saveData('tasks', state.tasks);
            state._quickTaskDraft = null;
            quickAddPrompt.style.display = 'none';
            renderBacklogCards();
            showToast(`"${task.name}" saved to backlog.`);
        });
    }

    function createTask(name, overrides = {}) {
        return {
            id: generateId(),
            name,
            projectId: 'general',
            estimatedDuration: 30,
            priority: 'Normal',
            deadline: null,
            isChallenge: false,
            challengeCategory: null,
            dependencies: [],
            status: 'pending',
            blockId: null,
            actualDuration: null,
            scheduledToday: false,
            createdDate: new Date().toISOString(),
            ...overrides,
        };
    }

    // ---- Block form toggle ----
    const btnShowBlockForm  = document.getElementById('btn-show-block-form');
    const blockFormCard     = document.getElementById('block-form-card');
    const btnCancelBlockForm = document.getElementById('btn-cancel-block-form');
    const blockTypeSelect   = document.getElementById('block-type');
    const blockProjectGroup = document.getElementById('block-project-group');

    if (btnShowBlockForm) {
        btnShowBlockForm.addEventListener('click', () => {
            blockFormCard.style.display = 'block';
            btnShowBlockForm.style.display = 'none';
            document.getElementById('block-start-time').focus();
        });
    }

    if (btnCancelBlockForm) {
        btnCancelBlockForm.addEventListener('click', hideBlockForm);
    }

    function hideBlockForm() {
        if (blockFormCard) blockFormCard.style.display = 'none';
        if (btnShowBlockForm) btnShowBlockForm.style.display = '';
    }

    // Show project dropdown only for Fixed blocks
    if (blockTypeSelect) {
        blockTypeSelect.addEventListener('change', () => {
            if (blockProjectGroup) {
                blockProjectGroup.style.display = blockTypeSelect.value === 'Fixed' ? 'block' : 'none';
            }
        });
    }

    // Populate project dropdown in block form
    function renderBlockProjectDropdown() {
        const blockProject = document.getElementById('block-project');
        if (!blockProject) return;
        blockProject.innerHTML = '';
        state.projects.filter(p => !p.isArchived).forEach(project => {
            const opt = document.createElement('option');
            opt.value       = project.id;
            opt.textContent = project.name;
            blockProject.appendChild(opt);
        });
    }

    // ---- Add block ----
    const btnAddBlock = document.getElementById('btn-add-block');
    if (btnAddBlock) {
        btnAddBlock.addEventListener('click', handleAddBlock);
    }

    function handleAddBlock() {
        const startTime = document.getElementById('block-start-time').value;
        const endTime   = document.getElementById('block-end-time').value;
        const blockType = document.getElementById('block-type').value;
        const label     = document.getElementById('block-label').value.trim();
        const projectId = blockType === 'Fixed' ? document.getElementById('block-project').value : null;

        if (!startTime || !endTime) {
            showToast('Please set a start and end time.', 'error');
            return;
        }
        if (startTime >= endTime) {
            showToast('End time must be after start time.', 'error');
            return;
        }

        const gracePeriodMinutes = Math.floor(Math.random() * 21) + 10; // 10–30 min
        const today = new Date().toISOString().split('T')[0];

        const newBlock = {
            id: generateId(),
            date: today,
            startTime,
            endTime,
            blockType,
            label: label || blockType,
            projectId,
            taskIds: [],
            checkpointStatus: 'pending',
            gracePeriodMinutes,
            checkpointFiredAt: null,
        };

        state.blocks.push(newBlock);
        saveData('todayBlocks', state.blocks);

        // Reset form
        document.getElementById('block-start-time').value = '';
        document.getElementById('block-end-time').value   = '';
        document.getElementById('block-label').value      = '';
        document.getElementById('block-type').value       = 'Open';
        if (blockProjectGroup) blockProjectGroup.style.display = 'none';
        hideBlockForm();

        renderTimeline();
        renderBacklogCards();
        showToast(`Block added — checkpoint in ~${gracePeriodMinutes} min after end.`, 'success');
    }

    // ---- Render timeline ----
    function renderTimeline() {
        const container = document.getElementById('day-timeline');
        if (!container) return;

        const emptyMsg = document.getElementById('timeline-empty');

        // Sort blocks by start time
        const sorted = [...state.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

        if (sorted.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            // Remove existing block elements
            container.querySelectorAll('.timeline-block').forEach(el => el.remove());
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';
        container.querySelectorAll('.timeline-block').forEach(el => el.remove());

        sorted.forEach(block => {
            const el = buildTimelineBlock(block);
            container.appendChild(el);
        });
    }

    function buildTimelineBlock(block) {
        const typeKey = block.blockType.toLowerCase();
        const dotClass = `timeline-dot-${['open','fixed','habit','meeting'].includes(typeKey) ? typeKey : 'open'}`;
        const badgeClass = `badge-block-${['open','fixed','habit','meeting'].includes(typeKey) ? typeKey : 'open'}`;

        // Format checkpoint time
        const [endH, endM] = block.endTime.split(':').map(Number);
        const checkpointTotalMin = endH * 60 + endM + block.gracePeriodMinutes;
        const checkpointH = Math.floor(checkpointTotalMin / 60) % 24;
        const checkpointM = checkpointTotalMin % 60;
        const checkpointStr = `${String(checkpointH).padStart(2,'0')}:${String(checkpointM).padStart(2,'0')}`;

        // Assigned tasks
        const assignedTasks = state.tasks.filter(t => t.blockId === block.id);

        const assignedHTML = assignedTasks.length > 0
            ? `<ul class="timeline-assigned-tasks">${assignedTasks.map(t =>
                `<li><span class="task-dot"></span>${escHtml(t.name)} <span class="badge badge-duration">${t.estimatedDuration}m</span></li>`
              ).join('')}</ul>`
            : '';

        const div = document.createElement('div');
        div.className = 'timeline-block';
        div.dataset.blockId = block.id;
        div.innerHTML = `
            <div class="timeline-dot ${dotClass}"></div>
            <div class="timeline-block-body">
                <div class="timeline-block-header">
                    <span class="timeline-block-times">${block.startTime}–${block.endTime}</span>
                    <span class="timeline-block-label">${escHtml(block.label)}</span>
                    <span class="badge ${badgeClass}">${block.blockType}</span>
                    <button class="btn btn-icon btn-sm" title="Delete block" data-delete-block="${block.id}" style="margin-left:auto; border:none; color:var(--text-muted);">✕</button>
                </div>
                <div class="timeline-block-footer">
                    <span class="timeline-checkpoint">⏱ checkpoint ~${checkpointStr}</span>
                    ${block.projectId && block.projectId !== 'general' ? `<span class="badge badge-block-fixed" style="font-size:0.65rem;">${escHtml(getProjectName(block.projectId))}</span>` : ''}
                </div>
                ${assignedHTML}
            </div>
        `;

        div.querySelector(`[data-delete-block]`).addEventListener('click', () => deleteBlock(block.id));
        return div;
    }

    function deleteBlock(blockId) {
        // Unassign tasks from this block
        state.tasks.forEach(t => { if (t.blockId === blockId) t.blockId = null; });
        saveData('tasks', state.tasks);

        state.blocks = state.blocks.filter(b => b.id !== blockId);
        saveData('todayBlocks', state.blocks);
        renderTimeline();
        renderBacklogCards();
        showToast('Block removed.');
    }

    // ---- Render backlog cards (task allocator) ----
    function renderBacklogCards() {
        const container = document.getElementById('backlog-task-list');
        const emptyMsg  = document.getElementById('backlog-empty');
        if (!container) return;

        const pendingTasks = state.tasks.filter(t => t.status === 'pending');

        if (pendingTasks.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            container.querySelectorAll('.backlog-task-card').forEach(el => el.remove());
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';
        container.querySelectorAll('.backlog-task-card').forEach(el => el.remove());

        pendingTasks.forEach(task => {
            const card = buildBacklogCard(task);
            container.appendChild(card);
        });
    }

    function buildBacklogCard(task) {
        const projectName = getProjectName(task.projectId);
        const priorityClass = `badge-priority-${task.priority.toLowerCase()}`;

        const blockOptions = state.blocks.map(b =>
            `<option value="${b.id}" ${task.blockId === b.id ? 'selected' : ''}>${b.startTime}–${b.endTime} ${b.label}</option>`
        ).join('');

        const isAssigned = !!task.blockId;

        const div = document.createElement('div');
        div.className = 'backlog-task-card task-card';
        div.dataset.priority = task.priority;
        div.dataset.taskId   = task.id;
        div.innerHTML = `
            <div class="backlog-task-info">
                <div class="backlog-task-name">${escHtml(task.name)}</div>
                <div class="backlog-task-meta">
                    <span class="badge badge-duration">${task.estimatedDuration}m</span>
                    <span class="badge ${priorityClass}">${task.priority}</span>
                    <span class="muted" style="font-size:0.75rem;">${escHtml(projectName)}</span>
                    ${isAssigned ? '<span class="badge badge-block-open" style="font-size:0.65rem;">assigned</span>' : ''}
                </div>
            </div>
            <div class="backlog-task-assign">
                ${state.blocks.length > 0 ? `
                    <select class="backlog-assign-select" aria-label="Assign to block">
                        <option value="">— block —</option>
                        ${blockOptions}
                    </select>
                    <button class="btn btn-sm btn-secondary btn-assign-task" title="Assign">→</button>
                ` : '<span class="muted" style="font-size:0.75rem;">Add blocks first</span>'}
            </div>
        `;

        const assignSelect = div.querySelector('.backlog-assign-select');
        const assignBtn    = div.querySelector('.btn-assign-task');
        if (assignBtn) {
            assignBtn.addEventListener('click', () => {
                const blockId = assignSelect ? assignSelect.value : null;
                if (!blockId) { showToast('Select a block first.', 'error'); return; }
                assignTaskToBlock(task.id, blockId);
            });
        }

        return div;
    }

    function assignTaskToBlock(taskId, blockId) {
        const task  = state.tasks.find(t => t.id === taskId);
        const block = state.blocks.find(b => b.id === blockId);
        if (!task || !block) return;

        // For Fixed blocks, check project compatibility
        if (block.blockType === 'Fixed' && block.projectId && task.projectId !== block.projectId && task.projectId !== 'general') {
            showToast(`This Fixed block only accepts tasks from "${getProjectName(block.projectId)}".`, 'error');
            return;
        }

        // Add to block's taskIds if not already there
        if (!block.taskIds.includes(taskId)) block.taskIds.push(taskId);
        task.blockId = blockId;

        saveData('todayBlocks', state.blocks);
        saveData('tasks', state.tasks);
        renderTimeline();
        renderBacklogCards();
        showToast(`"${task.name}" assigned to block.`, 'success');
    }

    // ---- AI Reality Check ----
    const aiRealityCheckBtn = document.getElementById('ai-reality-check-btn');
    const aiResponseArea    = document.getElementById('ai-response-area');
    const aiResponseText    = document.getElementById('ai-response-text');
    const aiBtnIcon         = document.getElementById('ai-btn-icon');
    const aiBtnLabel        = document.getElementById('ai-btn-label');

    if (aiRealityCheckBtn) {
        aiRealityCheckBtn.addEventListener('click', handleAiRealityCheck);
    }

    async function handleAiRealityCheck() {
        const apiKey = state.userProfile?.geminiApiKey;

        if (!apiKey) {
            aiResponseArea.classList.add('visible');
            aiResponseText.innerHTML = `<span style="color:var(--text-muted)">No Gemini API key found. Add it in <strong>Profile → Settings</strong> to enable AI features.</span>`;
            return;
        }

        if (state.blocks.length === 0) {
            showToast('Add at least one block to your day first.', 'error');
            return;
        }

        // Build day summary
        const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const blockSummary = state.blocks
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map(b => {
                const tasks = state.tasks.filter(t => t.blockId === b.id);
                const taskList = tasks.length > 0
                    ? tasks.map(t => `${t.name} (${t.estimatedDuration}m, ${t.priority})`).join(', ')
                    : 'no tasks assigned';
                return `- ${b.startTime}–${b.endTime} [${b.blockType}] "${b.label}": ${taskList}`;
            }).join('\n');

        const pendingUnassigned = state.tasks.filter(t => t.status === 'pending' && !t.blockId);
        const unassignedList = pendingUnassigned.map(t => `${t.name} (${t.estimatedDuration}m)`).join(', ') || 'none';

        const prompt = `You are a focused productivity advisor. Review this day plan and give a brief, honest assessment (3–5 sentences max). Flag any overload, unrealistic expectations, or gaps. Be direct and specific — no filler.\n\nDate: ${today}\n\nBlocks:\n${blockSummary}\n\nUnassigned backlog tasks: ${unassignedList}\n\nCore motivation: "${state.userProfile?.coreMotivation || 'Not set'}"\n\nRespond with a short assessment only.`;

        // Show loading state
        aiRealityCheckBtn.disabled = true;
        aiBtnIcon.innerHTML = '<span class="spinner" style="border-color:rgba(0,0,0,0.2); border-top-color:#111;"></span>';
        aiBtnLabel.textContent = 'Checking…';
        aiResponseArea.classList.remove('visible');

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: 300, temperature: 0.6 }
                    })
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'API error');
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
            aiResponseText.textContent = text;
            aiResponseArea.classList.add('visible');
        } catch (err) {
            aiResponseText.innerHTML = `<span style="color:var(--priority-critical)">Error: ${escHtml(err.message)}</span>`;
            aiResponseArea.classList.add('visible');
        } finally {
            aiRealityCheckBtn.disabled = false;
            aiBtnIcon.textContent = '✦';
            aiBtnLabel.textContent = 'Check my plan';
        }
    }

    // =========================================================================
    // 7. PROFILE PAGE
    // =========================================================================

    // --- Tab switching ---
    const profileTabs        = document.querySelectorAll('.tab-link');
    const profileTabContents = document.querySelectorAll('.tab-content');

    profileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            profileTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            profileTabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const targetContent = document.getElementById(tab.dataset.tab);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    function renderProfilePage() {
        if (!state.userProfile) return;
        populateSettingsForm();
        renderHabitsList();
        renderProjectsList();
        renderTaskProjectDropdown();
        renderTasksList();
    }

    // ---- HABITS ----
    const addHabitForm = document.getElementById('add-habit-form');
    if (addHabitForm) addHabitForm.addEventListener('submit', handleHabitSubmit);

    function handleHabitSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('habit-name').value.trim();
        if (!name) return;
        const newHabit = {
            id: generateId(),
            name,
            targetValue:       document.getElementById('habit-target-value').value,
            targetUnit:        document.getElementById('habit-target-unit').value || 'times',
            completionMethod:  document.getElementById('habit-completion-method').value,
            isActive: true,
            createdDate: new Date().toISOString(),
        };
        state.habits.push(newHabit);
        saveData('habits', state.habits);
        renderHabitsList();
        addHabitForm.reset();
        document.getElementById('habit-target-value').value = '1';
        document.getElementById('habit-target-unit').value  = 'times';
        showToast(`Habit "${newHabit.name}" added.`, 'success');
    }

    function renderHabitsList() {
        const list     = document.getElementById('habits-list');
        const emptyMsg = document.getElementById('habits-empty');
        if (!list) return;

        list.querySelectorAll('.item-row').forEach(el => el.remove());

        if (state.habits.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';

        state.habits.forEach(habit => {
            const li = document.createElement('li');
            li.className = 'item-row';
            li.innerHTML = `
                <div class="item-main">
                    <div class="item-name">${escHtml(habit.name)}</div>
                    <div class="item-meta">
                        <span class="badge badge-duration">${habit.targetValue} ${escHtml(habit.targetUnit)}</span>
                        <span class="badge" style="background:var(--bg-elevated); color:var(--text-muted); border:1px solid var(--border);">${habit.completionMethod === 'photo' ? '📷 photo' : '✓ checkbox'}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-icon btn-sm" data-toggle-habit="${habit.id}" title="${habit.isActive ? 'Pause' : 'Activate'}">${habit.isActive ? '⏸' : '▶'}</button>
                    <button class="btn btn-icon btn-sm btn-danger" data-delete-habit="${habit.id}" title="Delete">✕</button>
                </div>
            `;
            li.querySelector(`[data-toggle-habit]`).addEventListener('click', () => toggleHabit(habit.id));
            li.querySelector(`[data-delete-habit]`).addEventListener('click', () => deleteHabit(habit.id));
            list.appendChild(li);
        });
    }

    function toggleHabit(id) {
        const habit = state.habits.find(h => h.id === id);
        if (!habit) return;
        habit.isActive = !habit.isActive;
        saveData('habits', state.habits);
        renderHabitsList();
    }

    function deleteHabit(id) {
        state.habits = state.habits.filter(h => h.id !== id);
        saveData('habits', state.habits);
        renderHabitsList();
        showToast('Habit removed.');
    }

    // ---- PROJECTS ----
    const addProjectForm = document.getElementById('add-project-form');
    if (addProjectForm) addProjectForm.addEventListener('submit', handleProjectSubmit);

    function handleProjectSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('project-name').value.trim();
        if (!name) return;
        const newProject = {
            id: generateId(),
            name,
            description: document.getElementById('project-description').value.trim(),
            deadline:    document.getElementById('project-deadline').value || null,
            isArchived: false,
            createdDate: new Date().toISOString(),
        };
        state.projects.push(newProject);
        saveData('projects', state.projects);
        renderProjectsList();
        renderTaskProjectDropdown();
        addProjectForm.reset();
        showToast(`Project "${newProject.name}" created.`, 'success');
    }

    function renderProjectsList() {
        const list     = document.getElementById('projects-list');
        const emptyMsg = document.getElementById('projects-empty');
        if (!list) return;

        list.querySelectorAll('.item-row').forEach(el => el.remove());
        const customProjects = state.projects.filter(p => p.id !== 'general');

        if (customProjects.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';

        customProjects.forEach(project => {
            const li = document.createElement('li');
            li.className = 'item-row';
            li.innerHTML = `
                <div class="item-main">
                    <div class="item-name">${escHtml(project.name)}</div>
                    <div class="item-meta">
                        ${project.deadline ? `<span class="badge badge-duration">Due ${formatDate(project.deadline)}</span>` : ''}
                        ${project.isArchived ? '<span class="badge" style="background:var(--bg-elevated); color:var(--text-muted);">archived</span>' : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-icon btn-sm" data-archive-project="${project.id}" title="${project.isArchived ? 'Unarchive' : 'Archive'}">${project.isArchived ? '↩' : '⊡'}</button>
                    <button class="btn btn-icon btn-sm btn-danger" data-delete-project="${project.id}" title="Delete">✕</button>
                </div>
            `;
            li.querySelector(`[data-archive-project]`).addEventListener('click', () => toggleArchiveProject(project.id));
            li.querySelector(`[data-delete-project]`).addEventListener('click', () => deleteProject(project.id));
            list.appendChild(li);
        });
    }

    function toggleArchiveProject(id) {
        const project = state.projects.find(p => p.id === id);
        if (!project) return;
        project.isArchived = !project.isArchived;
        saveData('projects', state.projects);
        renderProjectsList();
    }

    function deleteProject(id) {
        state.projects = state.projects.filter(p => p.id !== id);
        // Move tasks to General
        state.tasks.forEach(t => { if (t.projectId === id) t.projectId = 'general'; });
        saveData('projects', state.projects);
        saveData('tasks', state.tasks);
        renderProjectsList();
        renderTaskProjectDropdown();
        renderTasksList();
        showToast('Project deleted. Tasks moved to General.');
    }

    // ---- TASKS ----
    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) addTaskForm.addEventListener('submit', handleTaskSubmit);

    // Challenge flag toggle
    const taskIsChallenge = document.getElementById('task-is-challenge');
    const challengeCategoryGroup = document.getElementById('challenge-category-group');
    const taskChallengeCategory  = document.getElementById('task-challenge-category');
    const taskChallengeCustom    = document.getElementById('task-challenge-custom');

    if (taskIsChallenge) {
        taskIsChallenge.addEventListener('change', () => {
            if (challengeCategoryGroup) challengeCategoryGroup.style.display = taskIsChallenge.checked ? 'block' : 'none';
        });
    }
    if (taskChallengeCategory) {
        taskChallengeCategory.addEventListener('change', () => {
            if (taskChallengeCustom) taskChallengeCustom.style.display = taskChallengeCategory.value === 'other' ? 'block' : 'none';
        });
    }

    function handleTaskSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('task-name').value.trim();
        if (!name) return;

        const isChallenge = taskIsChallenge?.checked || false;
        let challengeCategory = null;
        if (isChallenge && taskChallengeCategory) {
            challengeCategory = taskChallengeCategory.value === 'other'
                ? (taskChallengeCustom?.value.trim() || 'Other')
                : taskChallengeCategory.value;
        }

        const newTask = {
            id: generateId(),
            name,
            projectId:         document.getElementById('task-project').value,
            estimatedDuration: parseInt(document.getElementById('task-duration').value) || 30,
            priority:          document.getElementById('task-priority').value,
            deadline:          document.getElementById('task-deadline').value || null,
            isChallenge,
            challengeCategory,
            dependencies: [],
            status: 'pending',
            blockId: null,
            actualDuration: null,
            scheduledToday: false,
            createdDate: new Date().toISOString(),
        };

        state.tasks.push(newTask);
        saveData('tasks', state.tasks);
        renderTasksList();
        addTaskForm.reset();
        if (challengeCategoryGroup) challengeCategoryGroup.style.display = 'none';
        showToast(`Task "${newTask.name}" added.`, 'success');
    }

    function renderTaskProjectDropdown() {
        const projectDropdown = document.getElementById('task-project');
        if (!projectDropdown) return;
        projectDropdown.innerHTML = '';
        state.projects.filter(p => !p.isArchived).forEach(project => {
            const option = document.createElement('option');
            option.value       = project.id;
            option.textContent = project.name;
            projectDropdown.appendChild(option);
        });
    }

    function renderTasksList() {
        const container = document.getElementById('task-list-by-project');
        const emptyMsg  = document.getElementById('tasks-empty');
        if (!container) return;

        container.querySelectorAll('.project-task-group').forEach(el => el.remove());

        const pendingTasks = state.tasks.filter(t => t.status !== 'completed');

        if (pendingTasks.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';

        state.projects.forEach(project => {
            const projectTasks = pendingTasks.filter(t => t.projectId === project.id);
            if (projectTasks.length === 0) return;

            const group = document.createElement('div');
            group.className = 'project-task-group';

            const header = document.createElement('h4');
            header.textContent = project.name;
            header.style.marginBottom = '0.5rem';
            group.appendChild(header);

            const ul = document.createElement('ul');
            ul.className = 'item-list';
            ul.style.marginBottom = '1rem';

            projectTasks.forEach(task => {
                const li = document.createElement('li');
                li.className = 'item-row task-card';
                li.dataset.priority = task.priority;
                li.innerHTML = `
                    <div class="item-main">
                        <div class="item-name">${escHtml(task.name)}</div>
                        <div class="item-meta">
                            <span class="badge badge-duration">${task.estimatedDuration}m</span>
                            <span class="badge badge-priority-${task.priority.toLowerCase()}">${task.priority}</span>
                            ${task.isChallenge ? '<span class="badge" style="background:rgba(212,168,67,0.15); color:var(--accent);">⚡ challenge</span>' : ''}
                            ${task.deadline ? `<span class="muted" style="font-size:0.75rem;">Due ${formatDate(task.deadline)}</span>` : ''}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-icon btn-sm btn-danger" data-delete-task="${task.id}" title="Delete">✕</button>
                    </div>
                `;
                li.querySelector(`[data-delete-task]`).addEventListener('click', () => deleteTask(task.id));
                ul.appendChild(li);
            });

            group.appendChild(ul);
            container.appendChild(group);
        });
    }

    function deleteTask(id) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        // Clean up from blocks
        state.blocks.forEach(b => {
            b.taskIds = b.taskIds.filter(tid => tid !== id);
        });
        saveData('tasks', state.tasks);
        saveData('todayBlocks', state.blocks);
        renderTasksList();
        renderBacklogCards();
        renderTimeline();
        showToast('Task deleted.');
    }

    // ---- SETTINGS ----
    function populateSettingsForm() {
        const p = state.userProfile;
        if (!p) return;

        const setVal = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

        setVal('setting-api-key',         p.geminiApiKey);
        setVal('setting-wake-time',        p.idealDay?.wakeTime);
        setVal('setting-sleep-time',       p.idealDay?.sleepTime);
        setVal('setting-work-hours',       p.idealDay?.workHours);
        setVal('setting-training-minutes', p.idealDay?.trainingMinutes);
        setVal('setting-motivation',       p.coreMotivation);
        setVal('setting-redemption-act',   p.redemptionAct);
        setVal('setting-boundary-breaker', p.boundaryBreakerFrequency);

        setCheck('setting-track-weight',     p.trackingFeaturesEnabled?.weight);
        setCheck('setting-track-screentime', p.trackingFeaturesEnabled?.screenTime);

        // Rest days in settings
        const settingRestDays = document.getElementById('setting-rest-days');
        if (settingRestDays) {
            settingRestDays.querySelectorAll('.day-btn').forEach(btn => {
                const day = parseInt(btn.dataset.day);
                if ((p.restDays || []).includes(day)) btn.classList.add('selected');
                else btn.classList.remove('selected');

                btn.addEventListener('click', () => {
                    const sel = settingRestDays.querySelectorAll('.day-btn.selected');
                    if (btn.classList.contains('selected')) btn.classList.remove('selected');
                    else if (sel.length < 2) btn.classList.add('selected');
                    else showToast('You can pick at most 2 rest days.', 'error');
                });
            });
        }
    }

    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!state.userProfile) return;

            state.userProfile.geminiApiKey = document.getElementById('setting-api-key').value.trim();
            state.userProfile.coreMotivation = document.getElementById('setting-motivation').value.trim();
            state.userProfile.redemptionAct = document.getElementById('setting-redemption-act').value.trim();
            state.userProfile.boundaryBreakerFrequency = document.getElementById('setting-boundary-breaker').value;
            state.userProfile.idealDay.wakeTime        = document.getElementById('setting-wake-time').value;
            state.userProfile.idealDay.sleepTime       = document.getElementById('setting-sleep-time').value;
            state.userProfile.idealDay.workHours       = parseFloat(document.getElementById('setting-work-hours').value) || 6;
            state.userProfile.idealDay.trainingMinutes = parseInt(document.getElementById('setting-training-minutes').value) || 30;
            state.userProfile.trackingFeaturesEnabled.weight     = document.getElementById('setting-track-weight').checked;
            state.userProfile.trackingFeaturesEnabled.screenTime = document.getElementById('setting-track-screentime').checked;

            const settingRestDays = document.getElementById('setting-rest-days');
            if (settingRestDays) {
                state.userProfile.restDays = Array.from(settingRestDays.querySelectorAll('.day-btn.selected'))
                    .map(btn => parseInt(btn.dataset.day));
            }

            saveData('userProfile', state.userProfile);
            showToast('Settings saved.', 'success');
        });
    }

    // Reset app
    const btnResetApp = document.getElementById('btn-reset-app');
    if (btnResetApp) {
        btnResetApp.addEventListener('click', () => {
            if (confirm('Reset ALL data? This cannot be undone.')) {
                localStorage.clear();
                window.location.reload();
            }
        });
    }

    // =========================================================================
    // 8. HELPERS
    // =========================================================================
    function getProjectName(projectId) {
        const project = state.projects.find(p => p.id === projectId);
        return project ? project.name : 'General';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function escHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // =========================================================================
    // 9. INITIALIZATION
    // =========================================================================
    function initialize() {
        if (state.userProfile) {
            showPage('focus-page');
            startRuleEngine();
            startEndOfDayCountdown();
            checkWakeTime();
        } else {
            showPage('onboarding-page');
        }
    }

    initialize();

}); // end DOMContentLoaded
