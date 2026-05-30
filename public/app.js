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
        blocks:         loadData('todayBlocks')   || [],      // today's blocks
        _quickTaskDraft: null,                                // temp: task being added via quick-add
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
    // 5. FOCUS PAGE
    // =========================================================================
    function renderFocusPage() {
        // For Stages 1–3, show the empty state. Stage 4 will populate focus-active-view.
        const hasBlocks = state.blocks.length > 0;
        const emptyState  = document.getElementById('focus-empty-state');
        const activeView  = document.getElementById('focus-active-view');
        if (emptyState) emptyState.style.display = hasBlocks ? 'none' : 'flex';
        if (activeView) activeView.style.display  = hasBlocks ? 'block' : 'none';
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
        } else {
            showPage('onboarding-page');
        }
    }

    initialize();

}); // end DOMContentLoaded
