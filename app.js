document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const defaultPage = 'focus-page';

    // --- STATE MANAGEMENT ---
    let state = {
        userProfile: loadData('userProfile') || null,
        habits: loadData('habits') || [],
        projects: loadData('projects') || [{ id: 'general', name: 'General' }],
        tasks: loadData('tasks') || [],
    };

    // --- ROUTING ---
    function showPage(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));

        const targetPage = document.getElementById(pageId);
        if (targetPage) targetPage.classList.add('active');

        const targetLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
        if (targetLink) targetLink.classList.add('active');

        // Render content for the shown page
        if (pageId === 'profile-page') {
            renderProfilePage();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const pageId = link.getAttribute('data-page');
            showPage(pageId);
        });
    });

    // --- ONBOARDING ---
    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) {
        onboardingForm.addEventListener('submit', handleOnboardingSubmit);
    }

    function handleOnboardingSubmit(event) {
        event.preventDefault();
        const profile = {
            userId: generateId(),
            idealDay: {
                wakeTime: document.getElementById('ideal-wake-time').value,
                sleepTime: document.getElementById('ideal-sleep-time').value,
                workHours: document.getElementById('ideal-work-hours').value,
                trainingMinutes: document.getElementById('ideal-training-minutes').value,
            },
            coreMotivation: document.getElementById('core-motivation').value,
            restDays: Array.from(document.querySelectorAll('#rest-days-selector .day-btn.selected')).map(btn => parseInt(btn.dataset.day)),
            challenge: {
                currentTier: 1,
            },
            geminiApiKey: ''
        };
        state.userProfile = profile;
        saveData('userProfile', profile);
        showPage(defaultPage);
    }
    
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', () => btn.classList.toggle('selected'));
    });

    // --- PROFILE PAGE ---
    const profileTabs = document.querySelectorAll('.tab-link');
    const profileTabContents = document.querySelectorAll('.tab-content');

    profileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            profileTabs.forEach(t => t.classList.remove('active'));
            profileTabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    function renderProfilePage() {
        if (!state.userProfile) return;
        // Settings
        document.getElementById('setting-api-key').value = state.userProfile.geminiApiKey || '';
        // Habits
        renderHabitsList();
        // Projects & Tasks
        renderProjectsList();
        renderTaskProjectDropdown();
        renderTasksList();
    }

    // Habits
    const addHabitForm = document.getElementById('add-habit-form');
    addHabitForm.addEventListener('submit', handleHabitSubmit);

    function handleHabitSubmit(e) {
        e.preventDefault();
        const newHabit = {
            id: generateId(),
            name: document.getElementById('habit-name').value,
            targetValue: document.getElementById('habit-target-value').value,
            targetUnit: document.getElementById('habit-target-unit').value,
            completionMethod: document.getElementById('habit-completion-method').value,
            isActive: true,
            createdDate: new Date().toISOString()
        };
        state.habits.push(newHabit);
        saveData('habits', state.habits);
        renderHabitsList();
        addHabitForm.reset();
    }

    function renderHabitsList() {
        const habitsList = document.getElementById('habits-list');
        habitsList.innerHTML = '';
        state.habits.forEach(habit => {
            const li = document.createElement('li');
            li.textContent = `${habit.name} - ${habit.targetValue} ${habit.targetUnit}`;
            habitsList.appendChild(li);
        });
    }

    // Projects
    const addProjectForm = document.getElementById('add-project-form');
    addProjectForm.addEventListener('submit', handleProjectSubmit);

    function handleProjectSubmit(e) {
        e.preventDefault();
        const newProject = {
            id: generateId(),
            name: document.getElementById('project-name').value,
            isArchived: false,
            createdDate: new Date().toISOString()
        };
        state.projects.push(newProject);
        saveData('projects', state.projects);
        renderProjectsList();
        renderTaskProjectDropdown();
        addProjectForm.reset();
    }

    function renderProjectsList() {
        const projectsList = document.getElementById('projects-list');
        projectsList.innerHTML = '';
        state.projects.forEach(project => {
            if (project.id === 'general') return;
            const li = document.createElement('li');
            li.textContent = project.name;
            projectsList.appendChild(li);
        });
    }

    // Tasks
    const addTaskForm = document.getElementById('add-task-form');
    addTaskForm.addEventListener('submit', handleTaskSubmit);

    function handleTaskSubmit(e) {
        e.preventDefault();
        const newTask = {
            id: generateId(),
            name: document.getElementById('task-name').value,
            projectId: document.getElementById('task-project').value,
            estimatedDuration: document.getElementById('task-duration').value,
            priority: document.getElementById('task-priority').value,
            status: 'pending',
            createdDate: new Date().toISOString()
        };
        state.tasks.push(newTask);
        saveData('tasks', state.tasks);
        renderTasksList();
        addTaskForm.reset();
    }

    function renderTaskProjectDropdown() {
        const projectDropdown = document.getElementById('task-project');
        projectDropdown.innerHTML = '';
        state.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectDropdown.appendChild(option);
        });
    }

    function renderTasksList() {
        const taskListContainer = document.getElementById('task-list-by-project');
        taskListContainer.innerHTML = '';
        state.projects.forEach(project => {
            const projectTasks = state.tasks.filter(task => task.projectId === project.id);
            if (projectTasks.length > 0) {
                const projectHeader = document.createElement('h3');
                projectHeader.textContent = project.name;
                taskListContainer.appendChild(projectHeader);
                const ul = document.createElement('ul');
                projectTasks.forEach(task => {
                    const li = document.createElement('li');
                    li.textContent = `${task.name} (${task.estimatedDuration} mins) - ${task.priority}`;
                    ul.appendChild(li);
                });
                taskListContainer.appendChild(ul);
            }
        });
    }
    
    // Settings
    const settingsForm = document.getElementById('settings-form');
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.userProfile.geminiApiKey = document.getElementById('setting-api-key').value;
        saveData('userProfile', state.userProfile);
        alert('Settings saved!');
    });


    // --- INITIALIZATION ---
    function initialize() {
        if (state.userProfile) {
            showPage(defaultPage);
        } else {
            showPage('onboarding-page');
        }
    }

    initialize();
});

