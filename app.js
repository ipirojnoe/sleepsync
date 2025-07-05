/**
 * @file Main application logic for SleepSync calculator.
 * @author Ilya D.
 */

// --- App Configuration ---
const config = {
    fallAsleepTime: 14, // avg time to fall asleep in minutes
    cycleLength: 90,    // one sleep cycle in minutes
    colors: ['#ff6b6b', '#ff9f43', '#7ed957', '#48dbfb', '#576574', '#1dd1a1']
};

// --- DOM Elements ---
const elements = {
    currentTimeInput: document.getElementById('currentTime'),
    wakeupTimeInput: document.getElementById('wakeupTime'),
    calculateNowBtn: document.getElementById('calculateNowBtn'),
    calculateWakeupBtn: document.getElementById('calculateWakeupBtn'),
    resultsContainer: document.getElementById('results'),
    cyclesContainer: document.getElementById('cyclesContainer'),
    recommendationDiv: document.getElementById('recommendation'),
    recText: document.getElementById('recText'),
    shareBtn: document.getElementById('shareBtn'),
    modalTitle: document.getElementById('modalTitle'),
    modalMsg: document.getElementById('modalMsg'),
    alertModal: new bootstrap.Modal(document.getElementById('alertModal'))
};

let lastSharedUrl = '';

/**
 * Shows a Bootstrap modal with a given title and message.
 * @param {string} title - The title for the modal header.
 * @param {string} message - The message for the modal body.
 */
function showAlert(title, message) {
    elements.modalTitle.textContent = title;
    elements.modalMsg.textContent = message;
    elements.alertModal.show();
}

/**
 * Converts a time string (HH:MM) to total minutes from midnight.
 * @param {string} timeStr - The time string to convert.
 * @returns {number|null} Total minutes or null if invalid.
 */
function timeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

/**
 * Converts total minutes from midnight to a time string (HH:MM).
 * @param {number} totalMins - The total minutes.
 * @returns {string} The formatted time string.
 */
function minutesToTime(totalMins) {
    totalMins = (totalMins % 1440 + 1440) % 1440; // ensure positive and within a day
    const hours = Math.floor(totalMins / 60);
    const minutes = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Formats a duration in minutes to a human-readable string (e.g., "1h 30m").
 * @param {number} totalMins - The duration in minutes.
 * @returns {string} The formatted duration string.
 */
function formatDuration(totalMins) {
    const hours = Math.floor(totalMins / 60);
    const minutes = totalMins % 60;
    if (minutes === 0) return `${hours} hours`;
    if (hours === 0) return `${minutes} minutes`;
    return `${hours}h ${minutes}m`;
}

/**
 * Creates a DOM element for a single sleep cycle result card.
 * @param {object} cycle - The cycle data object.
 * @param {string} type - The calculation type ('now' or 'wakeup').
 * @returns {HTMLElement} The created card element.
 */
function createCard(cycle, type) {
    const card = document.createElement('div');
    card.className = 'cycle-card d-flex justify-content-between align-items-center';
    card.style.background = cycle.color;

    const infoDiv = document.createElement('div');
    const cycleTitle = document.createElement('h5');
    cycleTitle.className = 'mb-1';
    cycleTitle.textContent = `Cycle ${cycle.number}`;
    const cycleDuration = document.createElement('small');
    cycleDuration.className = 'opacity-75';
    cycleDuration.textContent = `${formatDuration(cycle.totalSleep)} of sleep`;
    infoDiv.append(cycleTitle, cycleDuration);

    const timeDiv = document.createElement('div');
    timeDiv.className = 'text-end';
    const cycleTime = document.createElement('div');
    cycleTime.className = 'cycle-time';
    cycleTime.textContent = cycle.time;
    const timeLabel = document.createElement('small');
    timeLabel.className = 'opacity-75';
    timeLabel.textContent = type === 'now' ? 'Wake up at' : 'Go to sleep at';
    timeDiv.append(cycleTime, timeLabel);

    card.append(infoDiv, timeDiv);
    return card;
}

/**
 * Displays the calculation results on the page.
 * @param {Array<object>} cycles - An array of cycle data objects.
 * @param {string} type - The calculation type ('now' or 'wakeup').
 */
function displayResults(cycles, type) {
    elements.cyclesContainer.innerHTML = ''; // clear old results
    cycles.forEach(cycle => {
        elements.cyclesContainer.appendChild(createCard(cycle, type));
    });

    const targetMinutes = 7.5 * 60;
    let bestCycle = cycles[0];
    for (const cycle of cycles) {
        if (Math.abs(cycle.totalSleep - targetMinutes) < Math.abs(bestCycle.totalSleep - targetMinutes)) {
            bestCycle = cycle;
        }
    }

    const action = type === 'now' ? 'wake up' : 'go to sleep';
    elements.recText.textContent = `For the best rest, try to ${action} at ${bestCycle.time} (${formatDuration(bestCycle.totalSleep)} of sleep).`;

    elements.recommendationDiv.style.display = 'block';
    elements.resultsContainer.style.display = 'block';
    elements.shareBtn.style.display = 'block';

    const timeValue = (type === 'now' ? elements.currentTimeInput : elements.wakeupTimeInput).value;
    const baseUrl = window.location.origin + window.location.pathname;
    lastSharedUrl = `${baseUrl}?mode=${type}&time=${timeValue}`;

    if (window.innerWidth <= 768) {
        elements.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Runs the main calculation logic.
 * @param {string} type - The calculation type ('now' or 'wakeup').
 * @param {string} [timeOverride] - An optional time value to use instead of the input field.
 */
function runCalc(type, timeOverride) {
    try {
        const timeInput = type === 'now' ? elements.currentTimeInput : elements.wakeupTimeInput;
        const timeValue = timeOverride || timeInput.value;

        if (!timeValue) {
            showAlert('Input Required', 'Please enter a time.');
            return;
        }

        localStorage.setItem(`lastTime_${type}`, timeValue);

        const baseMinutes = timeToMinutes(timeValue);
        if (isNaN(baseMinutes) || baseMinutes === null) {
            showAlert('Invalid Time', 'Please enter a valid time (HH:MM).');
            return;
        }

        let cycles = [];
        for (let i = 1; i <= 6; i++) {
            const totalSleepDuration = config.cycleLength * i;
            let calculatedTimeMinutes;

            if (type === 'now') {
                calculatedTimeMinutes = baseMinutes + config.fallAsleepTime + totalSleepDuration;
            } else {
                calculatedTimeMinutes = baseMinutes - totalSleepDuration - config.fallAsleepTime;
            }

            cycles.push({
                number: i,
                time: minutesToTime(calculatedTimeMinutes),
                totalSleep: totalSleepDuration,
                color: config.colors[i - 1] || '#576574'
            });
        }

        if (type === 'wakeup') cycles.reverse();

        displayResults(cycles, type);
        if (typeof gtag === 'function') {
            gtag('event', 'calculate_sleep', { 'event_category': 'Sleep Calculator', 'type': type });
        }

    } catch (error) {
        console.error("Calculation failed:", error);
        showAlert("Oops!", "Something went wrong. Please try again.");
    }
}

/**
 * Handles the share button click event using the Web Share API.
 */
async function handleShare() {
    const shareData = {
        title: 'SleepSync Calculator',
        text: 'Check out my calculated sleep schedule!',
        url: lastSharedUrl
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
            if (typeof gtag === 'function') gtag('event', 'share', { 'method': 'Web Share API' });
        } else {
            // Fallback for browsers that don't support Web Share API
            navigator.clipboard.writeText(lastSharedUrl);
            showAlert('Link Copied!', 'The result link has been copied to your clipboard.');
        }
    } catch (err) {
        console.error('Share failed:', err);
    }
}

/**
 * Initializes the application, sets up event listeners, and handles URL parameters.
 */
function init() {
    // Set default time and load from localStorage
    const now = new Date();
    elements.currentTimeInput.value = localStorage.getItem('lastTime_now') || now.toTimeString().slice(0, 5);
    elements.wakeupTimeInput.value = localStorage.getItem('lastTime_wakeup') || '07:00';

    // Event Listeners
    elements.calculateNowBtn.addEventListener('click', () => runCalc('now'));
    elements.calculateWakeupBtn.addEventListener('click', () => runCalc('wakeup'));
    elements.shareBtn.addEventListener('click', handleShare);

    // Handle shared URL
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const time = urlParams.get('time');

    if (mode && time) {
        if (mode === 'now') {
            document.getElementById('now-tab').click();
            elements.currentTimeInput.value = time;
        } else if (mode === 'wakeup') {
            document.getElementById('wakeup-tab').click();
            elements.wakeupTimeInput.value = time;
        }
        runCalc(mode, time);
    }
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', init);
