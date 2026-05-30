/* storage.js */

/**
 * Data structure templates for reference.
 * These are not used directly but define the shape of the data.
 */

/*
const UserProfile = {
    userId: '',               // string, unique identifier
    coreMotivation: '',       // string
    idealDay: {
        wakeTime: '06:00',    // time string
        sleepTime: '23:00',   // time string
        workHours: 6,         // number
        trainingMinutes: 30,  // number
        customTargets: [      // array of objects
            // { name: 'Pages read', unit: 'pages', value: 10 }
        ]
    },
    challenge: {
        currentTier: 1,       // number
        unlockedTiers: [1],   // array of numbers
        startDate: null,      // date
    },
    restDays: [5],            // array of numbers (0=Sun, 6=Sat)
    geminiApiKey: '',         // string
    trackingFeaturesEnabled: {
        weight: false,        // boolean
        screenTime: false     // boolean
    },
    redemptionAct: '',        // string
    boundaryBreakerFrequency: 'weekly', // 'weekly', 'manual', 'automatic'
    personalRecords: {}       // object { targetName: bestValue }
};

const Task = {
    id: '',                   // string, unique identifier
    name: '',                 // string
    projectId: 'general',     // string
    estimatedDuration: 30,    // number in minutes
    priority: 'Normal',       // 'Low', 'Normal', 'High', 'Critical'
    deadline: null,           // date string or null
    isChallenge: false,       // boolean
    challengeCategory: null,  // string or null
    dependencies: [],         // array of task IDs
    status: 'pending',        // 'pending', 'in-progress', 'completed'
    blockId: null,            // string or null
    actualDuration: null,     // number in minutes
    scheduledToday: false,    // boolean
    createdDate: ''           // date string
};

const Habit = {
    id: '',                   // string, unique identifier
    name: '',                 // string
    targetValue: 1,           // number
    targetUnit: 'times',      // string
    habitBlockId: '',         // string (which block type: 'morning', 'evening', etc.)
    completionMethod: 'checkbox', // 'checkbox', 'photo'
    isActive: true,           // boolean
    createdDate: ''           // date string
};

const Block = {
    id: '',                   // string, unique identifier
    date: '',                 // date string 'YYYY-MM-DD'
    startTime: '',            // time string 'HH:MM'
    endTime: '',              // time string 'HH:MM'
    blockType: 'Open',        // 'Open', 'Fixed', 'Habit', 'Meeting', or custom
    label: '',                // optional custom label
    projectId: null,          // string or null (only for Fixed Blocks)
    taskIds: [],              // array of task IDs assigned to this block
    checkpointStatus: 'pending', // 'pending', 'passed', 'failed'
    gracePeriodMinutes: 0,    // number, randomized 10-30 at creation time
    checkpointFiredAt: null   // timestamp or null - when the checkpoint actually fired
};

const Project = {
    id: '',                   // string, unique identifier
    name: '',                 // string
    description: '',          // string
    deadline: null,           // date string or null
    isArchived: false,        // boolean
    createdDate: ''           // date string
};

const DailyLog = {
    date: '',                 // date string, 'YYYY-MM-DD'
    tasksCompleted: 0,        // number
    totalTimeTracked: 0,      // number in minutes
    estimationAccuracy: 0,    // number 0-100
    habitsCompleted: 0,       // number
    habitsTotal: 0,           // number
    dailyScore: 0,            // number
    scoreBreakdown: [],        // array of { item: string, points: number }
    photosUploaded: [],        // array of base64 strings or URLs
    weight: null,             // number or null
    screenTime: null,         // number in hours or null
    dailyReflection: '',      // string
    redemptionActCompleted: false, // boolean
    wakeTime: '',             // time string
    sleepTime: '',            // time string
    isClosed: false,          // boolean - locks the day after Close Day is pressed
    blocksLog: [],             // array of { blockId, status: 'passed'/'failed', failReason }
    challengeDayCount: 0      // number - which day of the current challenge this is
};
*/

// ---------------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------------

/**
 * Generates a unique ID string combining timestamp and random component.
 * @returns {string} A unique identifier.
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Saves a JavaScript value to localStorage under a given key.
 * The value is converted to a JSON string before storage.
 * @param {string} key   The key to store the data under.
 * @param {any}    value The data to store (will be JSON.stringified).
 */
function saveData(key, value) {
    try {
        const jsonValue = JSON.stringify(value);
        localStorage.setItem(key, jsonValue);
    } catch (error) {
        console.error(`Error saving data for key "${key}":`, error);
    }
}

/**
 * Loads and parses a JSON value from localStorage.
 * @param  {string}    key The key of the data to retrieve.
 * @returns {any|null}     The parsed data, or null if not found or on error.
 */
function loadData(key) {
    try {
        const jsonValue = localStorage.getItem(key);
        if (jsonValue === null) return null;
        return JSON.parse(jsonValue);
    } catch (error) {
        console.error(`Error loading data for key "${key}":`, error);
        return null;
    }
}

/**
 * Removes an entry from localStorage.
 * @param {string} key The key to remove.
 */
function deleteData(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error deleting data for key "${key}":`, error);
    }
}
