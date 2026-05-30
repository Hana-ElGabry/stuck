/* storage.js */

/**
 * Data structure templates for reference.
 * These are not used directly but define the shape of the data.
 */

/*
const UserProfile = {
    userId: '', // string, unique identifier
    coreMotivation: '', // string
    idealDay: {
        wakeTime: '06:00', // time string
        sleepTime: '23:00', // time string
        workHours: 6, // number
        trainingMinutes: 30, // number
        customTargets: [ // array of objects
            // { name: 'Pages read', unit: 'pages', value: 10 }
        ]
    },
    challenge: {
        currentTier: 1, // number
        unlockedTiers: [1], // array of numbers
        startDate: null, // date
    },
    restDays: [5], // array of numbers (0=Sun, 6=Sat)
    geminiApiKey: '', // string
    trackingFeaturesEnabled: {
        weight: false, // boolean
        screenTime: false // boolean
    },
    redemptionAct: '', // string
    boundaryBreakerFrequency: 'weekly', // 'weekly', 'manual', 'automatic'
    personalRecords: {} // object { targetName: bestValue }
};

const Task = {
    id: '', // string, unique identifier
    name: '', // string
    projectId: 'general', // string
    estimatedDuration: 30, // number in minutes
    priority: 'Normal', // 'Low', 'Normal', 'High', 'Critical'
    deadline: null, // date string or null
    isChallenge: false, // boolean
    challengeCategory: null, // string or null
    dependencies: [], // array of task IDs
    status: 'pending', // 'pending', 'in-progress', 'completed'
    blockId: null, // string or null
    actualDuration: null, // number in minutes
    createdDate: '' // date string
};

const Habit = {
    id: '', // string, unique identifier
    name: '', // string
    targetValue: 1, // number
    targetUnit: 'times', // string
    habitBlockId: '', // string
    completionMethod: 'checkbox', // 'checkbox', 'photo'
    isActive: true, // boolean
    createdDate: '' // date string
};

const Block = {
    id: '', // string, unique identifier
    date: '', // date string
    startTime: '', // time string
    endTime: '', // time string
    blockType: 'Open', // 'Open', 'Fixed', 'Habit', 'Meeting', or custom
    projectId: null, // string or null for Fixed Blocks
    taskIds: [], // array of task IDs
    checkpointStatus: 'pending', // 'pending', 'passed', 'failed'
    gracePeriodMinutes: 0, // number, randomized 10-30 at creation time
    checkpointFiredAt: null, // timestamp or null - when the checkpoint actually fired
};

const DailyLog = {
    date: '', // date string, 'YYYY-MM-DD'
    tasksCompleted: 0, // number
    totalTimeTracked: 0, // number in minutes
    estimationAccuracy: 0, // number 0-100
    habitsCompleted: 0, // number
    habitsTotal: 0, // number
    dailyScore: 0, // number
    scoreBreakdown: [], // array of { item: string, points: number }
    photosUploaded: [], // array of base64 strings or URLs
    weight: null, // number or null
    screenTime: null, // number in hours or null
    dailyReflection: '', // string
    redemptionActCompleted: false, // boolean
    wakeTime: '', // time string
    sleepTime: '', // time string
    isClosed: false, // boolean - locks the day after Close Day is pressed

const Project = {
    id: '',
    name: '',
    description: '',
    deadline: null,
    isArchived: false,
    createdDate: ''
};
    blocksLog: [], // array of { blockId, status: 'passed'/'failed', failReason }
    challengeDayCount: 0 // number - which day of the current challenge this is
};
*/

/**
 * Saves a JavaScript value to localStorage under a given key.
 * The value is converted to a JSON string before storage.
 * @param {string} key The key to store the data under.
 * @param {any} value The data to store (will be JSON.stringified).
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
 * @param {string} key The key of the data to retrieve.
 * @returns {any | null} The parsed data, or null if the key is not found or an error occurs.
 */
function loadData(key) {
    try {
        const jsonValue = localStorage.getItem(key);
        if (jsonValue === null) {
            return null;
        }
        return JSON.parse(jsonValue);
    } catch (error) {
        console.error(`Error loading data for key "${key}":`, error);
        return null;
    }
}
