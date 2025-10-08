const Calculator = (function() {

    // helper func for time
    function timeToMinutes(timeStr) {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        return (h * 60) + m;
    }

    function minutesToTime(totalMins) {
        const d = new Date();
        d.setHours(0, totalMins, 0, 0); // use Date obj to handle overflow
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${mins}`;
    }

    // the simple calc logic
    function calcSimple(type, elements, settings) {
        const timeInput = (type === 'now') ? elements.currentTimeInput : elements.wakeupTimeInput;
        if (!timeInput.value) {
            UI.showToast("Please enter a time.", "warning", elements.toastContainer);
            return null;
        }

        const baseMins = timeToMinutes(timeInput.value);
        const fallAsleepOffset = settings.includeFallAsleep ? settings.fallAsleepTime : 0;
        // let user override the cycle length, or use the default.
        const cycleLen = settings.customCycleLength || 96; 
        
        let cycles = [];
        for (let i = 1; i <= 6; i++) {
            const sleepDuration = cycleLen * i;
            let time;
            if (type === 'now') {
                time = baseMins + fallAsleepOffset + sleepDuration;
            } else {
                time = baseMins - sleepDuration - fallAsleepOffset;
            }
            
            cycles.push({ 
                number: i, 
                time: minutesToTime(time), 
                totalSleep: sleepDuration,
                type,
            });
        }
        
        if (type === 'wakeup') {
            cycles = cycles.reverse();
        }

        return { 
            cycles, 
            type, 
            baseTime: timeInput.value,
            mode: 'simple',
            metadata: { cycleLength: cycleLen }
        };
    }

    function calcAdvanced(settings) {
        const timeVal = document.getElementById('wakeupTimeAdvanced').value;
        if (!timeVal) return null;
        
        const survey = {
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value,
            chronotype: document.getElementById('chronotype').value,
            caffeine: document.getElementById('caffeine').value,
            exercise: document.getElementById('exercise').value,
            stress: document.getElementById('stress').value,
        };

        let cycleLength = 96.0; // for precision
        let adjustments = [`base: 96 min`];

        // This whole adjustment logic could probably be a config object
        // TODO: Refactor this later.
        if (survey.age < 20) { cycleLength -= 3; adjustments.push(`age_young: -3 min`); }
        if (survey.age > 55) { cycleLength += 3; adjustments.push(`age_older: +3 min`); }
        if (survey.gender === 'female') { cycleLength -= 2; adjustments.push(`gender_female: -2 min`); }
        if (survey.chronotype === 'owl') { cycleLength += 4; adjustments.push(`chrono_owl: +4 min`); }
        if (survey.chronotype === 'lark') { cycleLength -= 4; adjustments.push(`chrono_lark: -4 min`); }
        
        if (survey.caffeine === 'high') {
             cycleLength += (survey.chronotype === 'owl') ? 2 : 1;
             adjustments.push(`caffeine_high: +${(survey.chronotype === 'owl') ? 2 : 1} min`);
        }
        
        if (survey.exercise === 'evening') { cycleLength += 2; adjustments.push(`exercise_evening: +2 min`); }
        if (survey.exercise === 'morning') { cycleLength -= 1; adjustments.push(`exercise_morning: -1 min`); }
        if (survey.stress === 'high') { cycleLength += 3; adjustments.push(`stress_high: +3 min`); }
        
        cycleLength = Math.round(cycleLength);
        
        const baseMins = timeToMinutes(timeVal);
        const fallAsleep = settings.includeFallAsleep ? settings.fallAsleepTime : 0;
        
        let cycles = [];
        for (let i = 1; i <= 6; i++) {
            const sleep = cycleLength * i;
            const bedTime = baseMins - sleep - fallAsleep;
            
            cycles.push({ 
                number: i, 
                time: minutesToTime(bedTime), 
                totalSleep: sleep, 
                type: 'wakeup',
            });
        }
        
        return {
            cycles: cycles.reverse(),
            type: 'wakeup',
            baseTime: timeVal,
            mode: 'advanced',
            metadata: { 
                personalizedCycleLength: cycleLength, 
                adjustments,
                factors: survey,
            }
        };
    }

    return {
        calcSimple,
        calcAdvanced,
    };
})();
