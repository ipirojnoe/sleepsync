// Main entry point for the app logic

document.addEventListener('DOMContentLoaded', () => {
    // App state
    const state = {
        currentLang: 'en',
        activeMode: 'simple',
        activeSimpleTab: 'now',
        resultsCache: {},
        settings: {
            fallAsleepTime: 14,
            includeFallAsleep: true,
            customCycleLength: null,
        },
        currentResults: null
    };

    // All DOM references here
    const elements = {
        themeSwitcher: document.getElementById('theme-switcher'),
        langDropdown: document.getElementById('lang-dropdown'),
        settingsControls: document.getElementById('settings-controls'),
        settingsControlsScience: document.getElementById('settings-controls-science'),

        fallAsleepTimeInput: document.getElementById('fallAsleepTime'),
        includeFallAsleepSwitch: document.getElementById('includeFallAsleep'),
        customCycleLengthInput: document.getElementById('customCycleLength'),
        resetSettingsBtn: document.getElementById('resetSettingsBtn'),
        
        currentTimeInput: document.getElementById('currentTime'),
        wakeupTimeInput: document.getElementById('wakeupTime'),
        calculateNowBtn: document.getElementById('calculateNowBtn'),
        calculateWakeupBtn: document.getElementById('calculateWakeupBtn'),
        surveyForm: document.getElementById('surveyForm'),
        
        resultsContainer: document.getElementById('results'),
        cyclesContainer: document.getElementById('cyclesContainer'),
        advancedExplanationContainer: document.getElementById('advanced-explanation'),
        recommendationContainer: document.getElementById('recommendation'),
        recText: document.getElementById('recText'),

        shareBtn: document.getElementById('shareBtn'),
        exportTxtBtn: document.getElementById('exportTxtBtn'),
        exportIcsBtn: document.getElementById('exportIcsBtn'),
        textExportArea: document.getElementById('text-export-area'),
        textExportContent: document.getElementById('text-export-content'),
        copyExportBtn: document.getElementById('copyExportBtn'),

        calculateFallTimeBtn: document.getElementById('calculateFallTimeBtn'),
        fallTimeResult: document.getElementById('fallTimeResult'),
        
        modeTabs: document.querySelectorAll('#modeTabs .nav-link'),
        simpleModeTabs: document.querySelectorAll('#simpleModeTabs .nav-link'),
        toastContainer: document.querySelector('.toast-container'),
    };

    // Main init function
    function startApp() {
        if(elements.settingsControls && elements.settingsControlsScience){
            const settingsHTML = document.getElementById('settings-menu').innerHTML;
            const scienceMenu = document.querySelector('#settings-controls-science .dropdown-menu');
            if (scienceMenu) scienceMenu.innerHTML = settingsHTML;
        }

        loadSettings();
        loadLanguage();
        loadTheme();
        attachEventListeners();
        loadLastInputTimes();
        registerServiceWorker();
        // console.log("ready");
    }

    function attachEventListeners() {
        document.body.addEventListener('change', (e) => {
            if (e.target.id === 'theme-switcher') toggleTheme();
            if (['fallAsleepTime', 'customCycleLength', 'includeFallAsleep'].includes(e.target.id)) {
                updateSettings();
            }
        });

        document.body.addEventListener('click', (e) => {
            const langLink = e.target.closest('a[data-lang]');
            if (langLink) {
                e.preventDefault();
                switchLanguage(langLink.dataset.lang);
            }
            if (e.target.id === 'resetSettingsBtn') resetSettings();
        });
        
        if (elements.calculateNowBtn) {
            elements.calculateNowBtn.onclick = () => doCalculation('simple', 'now');
        }
        if (elements.calculateWakeupBtn) {
            elements.calculateWakeupBtn.onclick = () => doCalculation('simple', 'wakeup');
        }
        if (elements.surveyForm) {
            elements.surveyForm.onsubmit = (e) => {
                e.preventDefault();
                doCalculation('advanced');
            };
        }

        if (elements.shareBtn) elements.shareBtn.onclick = shareResults;
        if (elements.exportTxtBtn) elements.exportTxtBtn.onclick = exportToText;
        if (elements.copyExportBtn) elements.copyExportBtn.onclick = copyExportedText;
        if (elements.exportIcsBtn) elements.exportIcsBtn.onclick = exportToCalendar;

        elements.modeTabs.forEach(tab => tab.addEventListener('shown.bs.tab', handleModeTabChange));
        elements.simpleModeTabs.forEach(tab => tab.addEventListener('shown.bs.tab', handleSimpleModeTabChange));

        if (elements.calculateFallTimeBtn) {
            elements.calculateFallTimeBtn.onclick = calcAndApplyFallTime;
        }
    }
    
    function doCalculation(mode = state.activeMode, simpleTab = state.activeSimpleTab) {
        console.log(`Calculations for mode=${mode}, tab=${simpleTab}`);
        let cacheKey = mode === 'simple' ? `simple_${simpleTab}` : mode;
        let results;

        try {
            if (mode === 'advanced') {
                if (!elements.surveyForm.checkValidity()) {
                    elements.surveyForm.reportValidity();
                    return;
                }
                results = Calculator.calcAdvanced(state.settings);
                // auto save the calculated cycle length
                if (results?.metadata?.personalizedCycleLength) {
                    document.getElementById('customCycleLength').value = results.metadata.personalizedCycleLength;
                    state.settings.customCycleLength = results.metadata.personalizedCycleLength;
                    saveSettings();
                }
            } else {
                results = Calculator.calcSimple(simpleTab, elements, state.settings);
            }
        } catch(err) {
            console.error("Calculation failed:", err);
            UI.showToast("Oops, calculation failed.", "error", elements.toastContainer);
            return;
        }

        if (!results) return;

        if (mode === 'advanced') {
            if (results.baseTime) rememberLastTime('wakeup', results.baseTime);
        } else if (simpleTab === 'now') {
            rememberLastTime('now', elements.currentTimeInput?.value);
        } else {
            rememberLastTime('wakeup', elements.wakeupTimeInput?.value);
        }

        state.resultsCache[cacheKey] = results;
        state.currentResults = results;
        UI.displayResults(results, elements, state.currentLang);
    }

    function updateSettings() {
        state.settings.fallAsleepTime = parseInt(document.getElementById('fallAsleepTime').value) || 14;
        state.settings.includeFallAsleep = document.getElementById('includeFallAsleep').checked;
        state.settings.customCycleLength = parseInt(document.getElementById('customCycleLength').value) || null;
        saveSettings();
        
        if (elements.resultsContainer && elements.resultsContainer.style.display !== 'none') {
            doCalculation();
        }
    }
    
    function resetSettings() {
        state.settings = { fallAsleepTime: 14, includeFallAsleep: true, customCycleLength: null };
        
        document.getElementById('fallAsleepTime').value = state.settings.fallAsleepTime;
        document.getElementById('includeFallAsleep').checked = state.settings.includeFallAsleep;
        const cycleInput = document.getElementById('customCycleLength');
        cycleInput.value = '';
        cycleInput.placeholder = 'e.g. 96';

        saveSettings();
        UI.showToast(UI.translate('settingsReset', state.currentLang), 'success', elements.toastContainer);
        if (elements.resultsContainer && elements.resultsContainer.style.display !== 'none') doCalculation();
    }

    function calcAndApplyFallTime() {
        const usualTime = parseInt(document.getElementById('usualFallTime').value);
        const relaxLevel = parseInt(document.getElementById('relaxationLevel').value);
        
        let calculatedTime = Math.max(5, Math.min(90, usualTime - relaxLevel));

        elements.fallTimeResult.textContent = `${UI.translate('estimated_time', state.currentLang)}: ${calculatedTime} ${UI.translate('minutes', state.currentLang)}. ${UI.translate('applied_to_settings', state.currentLang)}.`;
        
        const fallAsleepInput = document.getElementById('fallAsleepTime');
        fallAsleepInput.value = calculatedTime;
        
        fallAsleepInput.style.transition = 'background-color 0.5s ease';
        fallAsleepInput.style.backgroundColor = 'var(--bs-success-bg-subtle)';
        setTimeout(() => { fallAsleepInput.style.backgroundColor = ''; }, 1500);

        updateSettings();
    }

    async function shareResults() {
        if (!state.currentResults) {
            UI.showToast(UI.translate('noResultsToShare', state.currentLang), 'warning', elements.toastContainer);
            return;
        }
        const shareData = {
            title: UI.translate('meta_title', state.currentLang),
            text: UI.generateShareText(state.currentResults, state.currentLang),
            url: UI.generateShareUrl(state.currentResults)
        };
        try {
            await navigator.share(shareData);
        } catch (err) {
            // copy to clipboard
            await navigator.clipboard.writeText(shareData.url);
            UI.showToast(UI.translate('linkCopied', state.currentLang), 'success', elements.toastContainer);
        }
    }
    
    function exportToText() {
        if (!state.currentResults) return;
        elements.textExportContent.value = UI.generateTextExport(state.currentResults, state.currentLang, elements);
        elements.textExportArea.style.display = 'block';
        elements.textExportArea.scrollIntoView({ behavior: 'smooth' });
    }
    
    function copyExportedText() {
        elements.textExportContent.select();
        document.execCommand('copy');
        UI.showToast(UI.translate('copied', state.currentLang), 'success', elements.toastContainer);
    }
    
    // TODO: test this function
    function exportToCalendar() {
        if (!state.currentResults) return;

        const optimalCycle = state.currentResults.cycles[4] || state.currentResults.cycles[0];
        if (!optimalCycle) return;
        
        const isWakeUp = state.currentResults.type === 'now';
        const eventTitle = isWakeUp ? "Wake Up" : "Go to Sleep";
        
        const timeParts = optimalCycle.time.split(':');
        const eventDate = new Date();
        if (!isWakeUp && new Date().getHours() > timeParts[0]) {
             eventDate.setDate(eventDate.getDate() + 1);
        }
        eventDate.setHours(timeParts[0], timeParts[1], 0, 0);
        
        const toISOString = (date) => {
            const pad = (num) => (num < 10 ? '0' : '') + num;
            return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
        };
        
        const startTime = toISOString(eventDate);
        const endDate = toISOString(new Date(eventDate.getTime() + 5 * 60 * 1000)); 

        const icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SleepSync//EN\r\nBEGIN:VEVENT\r\nUID:${Date.now()}@sleepsync.pro\r\nDTSTAMP:${toISOString(new Date())}\r\nDTSTART:${startTime}\r\nDTEND:${endDate}\r\nSUMMARY:${eventTitle} (SleepSync)\r\nDESCRIPTION:Recommended time from SleepSync app.\r\nEND:VEVENT\r\nEND:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'sleepsync_event.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function switchLanguage(lang) {
        state.currentLang = lang;
        UI.setLanguage(lang, elements);
        localStorage.setItem('sleepSyncLanguage', lang);
        if(state.currentResults){
             UI.displayResults(state.currentResults, elements, state.currentLang);
        }
    }
    
    function handleModeTabChange(event) {
        state.activeMode = event.target.id.includes('simple') ? 'simple' : 'advanced';
        let cacheKey = state.activeMode === 'simple' ? `simple_${state.activeSimpleTab}` : 'advanced';
        if (state.resultsCache[cacheKey]) {
            UI.displayResults(state.resultsCache[cacheKey], elements, state.currentLang);
        } else {
            UI.clearResults(elements);
        }
    }

    function handleSimpleModeTabChange(event) {
        state.activeSimpleTab = event.target.id.includes('now') ? 'now' : 'wakeup';
        const cacheKey = `simple_${state.activeSimpleTab}`;
        if (state.resultsCache[cacheKey]) {
            UI.displayResults(state.resultsCache[cacheKey], elements, state.currentLang);
        } else {
            UI.clearResults(elements);
        }
    }

    function toggleTheme() {
        const themeSwitch = document.getElementById('theme-switcher');
        if (!themeSwitch) return;
        const isDark = themeSwitch.checked;
        document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('sleepSyncTheme', isDark ? 'dark' : 'light');
    }

    function saveSettings() {
        localStorage.setItem('sleepSyncSettings', JSON.stringify(state.settings));
    }

    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem('sleepSyncSettings'));
            if (saved) {
                state.settings.fallAsleepTime = saved.fallAsleepTime ?? 14;
                state.settings.includeFallAsleep = saved.includeFallAsleep ?? true;
                state.settings.customCycleLength = saved.customCycleLength ?? null;
                
                document.getElementById('fallAsleepTime').value = state.settings.fallAsleepTime;
                document.getElementById('includeFallAsleep').checked = state.settings.includeFallAsleep;
                document.getElementById('customCycleLength').value = state.settings.customCycleLength || '';
            }
        } catch (e) { /* silent fail */ }
    }

    function loadTheme() {
        const theme = localStorage.getItem('sleepSyncTheme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.getElementById('theme-switcher').checked = theme === 'dark';
        toggleTheme();
    }

    function loadLanguage() {
        const lang = localStorage.getItem('sleepSyncLanguage') || navigator.language.split('-')[0];
        state.currentLang = translations[lang] ? lang : 'en';
        UI.setLanguage(state.currentLang, elements);
    }
    
    function loadLastInputTimes() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;

        const storedNow = readStoredTime('lastTime_now');
        const storedWake = readStoredTime('lastTime_wakeup');

        if (elements.currentTimeInput) {
            const recentStoredNow = storedNow && storedNow.savedAt && (Date.now() - storedNow.savedAt) <= (10 * 60 * 1000);
            elements.currentTimeInput.value = (recentStoredNow && storedNow.value) ? storedNow.value : currentTime;
        }

        const wakeValue = storedWake?.value || '07:00';
        if (elements.wakeupTimeInput) {
            elements.wakeupTimeInput.value = wakeValue;
        }
        const wakeupAdvancedInput = document.getElementById('wakeupTimeAdvanced');
        if (wakeupAdvancedInput) {
            wakeupAdvancedInput.value = wakeValue;
        }
    }

    function isValidTimeString(value) {
        return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
    }

    function rememberLastTime(type, value) {
        if (!isValidTimeString(value)) return;
        try {
            localStorage.setItem(`lastTime_${type}`, JSON.stringify({ value, savedAt: Date.now() }));
        } catch (err) {
            console.warn('Failed to save time preference', err);
        }
    }

    function readStoredTime(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            if (isValidTimeString(raw)) {
                return { value: raw, savedAt: null };
            }

            const parsed = JSON.parse(raw);
            if (parsed && isValidTimeString(parsed.value)) {
                return { value: parsed.value, savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : null };
            }
        } catch (err) {
            console.warn('Failed to read stored time', err);
        }
        return null;
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW reg failed: ', err));
            });
        }
    }
    
    startApp();
});
