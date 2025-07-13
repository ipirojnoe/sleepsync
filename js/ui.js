// js/ui.js
const UI = (function() {

    const cycleColors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];

    function translate(key, lang, replacements = {}) {
        let text = (translations[lang] && translations[lang][key]) || translations['en'][key] || `[${key}]`;
        for (const placeholder in replacements) {
            text = text.replace(`{{${placeholder}}}`, replacements[placeholder]);
        }
        return text;
    }
    
    function setLanguage(lang, elements) {
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const attr = el.dataset.i18nAttr;
            if (attr) {
                el.setAttribute(attr, translate(key, lang));
            } else {
                el.innerHTML = translate(key, lang);
            }
        });
        
        const langText = {'en':'🇺🇸 EN', 'ru':'🇷🇺 RU'}[lang];
        document.querySelectorAll('#lang-btn-text').forEach(btn => {
            btn.innerHTML = langText;
        });
    }

    function formatDuration(totalMins, lang) {
        const hours = Math.floor(totalMins / 60);
        const minutes = totalMins % 60;
        const h_unit = translate('hours_short', lang);
        const m_unit = translate('minutes_short', lang);

        if (minutes === 0) return `${hours} ${translate(hours > 1 ? 'hours' : 'hour', lang)}`;
        if (hours === 0) return `${minutes} ${translate(minutes > 1 ? 'minutes' : 'minute', lang)}`;
        return `${hours}${h_unit} ${minutes}${m_unit}`;
    }

    function createCard(cycle, lang, index) {
        const card = document.createElement('div');
        const isOptimal = cycle.number >= 4 && cycle.number <= 5;
        card.className = `card cycle-card mb-2 fade-in ${isOptimal ? 'optimal' : ''}`;
        
        const cardColor = cycleColors[index % cycleColors.length];
        card.style.borderColor = cardColor;
        card.style.borderLeftWidth = '4px';

        card.innerHTML = `
            <div class="card-body d-flex justify-content-between align-items-center p-3">
                <div>
                    <h5 class="card-title mb-1">${translate('tableCycle', lang)} ${cycle.number}</h5>
                    <p class="card-text text-body-secondary small">${formatDuration(cycle.totalSleep, lang)} ${translate('ofSleep', lang)}</p>
                </div>
                <div class="text-end">
                    <div class="cycle-time h4 mb-0" style="color: ${cardColor};">${cycle.time}</div>
                    <small class="text-body-secondary">${translate(cycle.type === 'now' ? 'wakeUpAt' : 'goToSleepAt', lang)}</small>
                </div>
            </div>
        `;
        return card;
    }
    
    // FIX: Correct recommendation logic
    function updateRecommendation(results, elements, lang) {
        // For "Sleep Now", recommend the 5th cycle (index 4)
        // For "Wake Up At", recommend the 5th cycle from the end, which is at index 1 after reversing
        const recommendedIndex = results.type === 'now' ? 4 : 1;
        const recommendedCycle = results.cycles[recommendedIndex];

        if (elements.recText && recommendedCycle) {
            const action = translate(results.type === 'now' ? 'rec_wakeUp' : 'rec_goToSleep', lang);
            elements.recText.innerHTML = `${translate('bestRestText', lang)} <strong>${action} ${recommendedCycle.time}</strong>.`;
        }
    }

    function displayAdvancedExplanation(results, elements, lang) {
        const { personalizedCycleLength, adjustments } = results.metadata;
        const listItems = adjustments.map(adj => {
             const [key, value] = adj.split(':');
             const translatedKey = translate(`adj_${key}`, lang);
             return `<li>${translatedKey}: ${value}</li>`;
        }).join('');
        
        elements.advancedExplanationContainer.innerHTML = `
            <div class="alert alert-info fade-in">
                <h6 class="alert-heading">${translate('calcDetailsTitle', lang)}</h6>
                <p class="small mb-2">${translate('calcDetailsText', lang, { cycleLength: `<strong>${personalizedCycleLength}</strong>` })}</p>
                <ul class="small mb-0">${listItems}</ul>
            </div>
        `;
    }

    function displayResults(results, elements, lang) {
        clearResults(elements);

        if (results.cycles) {
            results.cycles.forEach((cycle, index) => {
                const card = createCard(cycle, lang, index);
                card.style.animationDelay = `${index * 50}ms`;
                elements.cyclesContainer.appendChild(card);
            });
            
            updateRecommendation(results, elements, lang);
            elements.recommendationContainer.style.display = 'block';
        }
        
        if (results.mode === 'advanced' && results.metadata) {
            displayAdvancedExplanation(results, elements, lang);
        }

        showActionButtons(elements);
        elements.resultsContainer.style.display = 'block';
    }

    function showActionButtons(elements) {
        elements.shareBtn.style.display = 'inline-block';
        elements.exportTxtBtn.style.display = 'inline-block';
        elements.exportIcsBtn.style.display = 'inline-block';
    }
    
    function clearResults(elements) {
        elements.cyclesContainer.innerHTML = '';
        elements.advancedExplanationContainer.innerHTML = '';
        elements.resultsContainer.style.display = 'none';
        elements.recommendationContainer.style.display = 'none';
        elements.textExportArea.style.display = 'none';
        elements.shareBtn.style.display = 'none';
        elements.exportTxtBtn.style.display = 'none';
        elements.exportIcsBtn.style.display = 'none';
    }
    
    function generateShareUrl(results) {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', results.mode);
        url.searchParams.set('type', results.type);
        url.searchParams.set('time', results.baseTime);
        if (results.mode === 'advanced') {
            Object.keys(results.metadata.factors).forEach(key => {
                url.searchParams.set(key, results.metadata.factors[key]);
            });
        }
        return url.toString();
    }

    function generateShareText(results, lang) {
        const recommendedIndex = results.type === 'now' ? 4 : 1;
        const optimalCycle = results.cycles[recommendedIndex];
        const actionKey = results.type === 'now' ? 'rec_wakeUp' : 'rec_goToSleep';
        const action = translate(actionKey, lang);
        return translate('shareText', lang, { time: optimalCycle.time, action: action });
    }
    
    function generateTextExport(results, lang, elements) {
        let content = '';
        
        if (results.mode === 'advanced') {
            content += `${translate('calcDetailsTitle', lang)}\n`;
            content += `${translate('cycleLength', lang)}: ${results.metadata.personalizedCycleLength} ${translate('minutes_short', lang)}\n`;
            results.metadata.adjustments.forEach(adj => {
                const [key, value] = adj.split(':');
                content += `- ${translate(`adj_${key}`, lang)}: ${value}\n`;
            });
            content += '\n';
        } else {
            content += `${translate('cycleLength', lang)}: ${results.metadata.cycleLength} ${translate('minutes_short', lang)}\n\n`;
        }
        
        const recText = elements.recText.textContent;
        content += `${translate('recommendation', lang)}:\n${recText}\n\n`;

        content += `${translate('allCycles', lang)}:\n`;
        results.cycles.forEach(cycle => {
             content += `- ${translate('tableCycle', lang)} ${cycle.number}: ${cycle.time} (${formatDuration(cycle.totalSleep, lang)} ${translate('ofSleep', lang)})\n`;
        });
        
        content += `\n${translate('shareResults', lang)}:\n${generateShareUrl(results)}`;
        
        return content;
    }

    function showToast(message, type = 'info', container, duration = 3000) {
        const toastId = 'toast-' + Math.random().toString(36).substr(2, 9);
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center text-bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        container.appendChild(toast);
        const bsToast = new bootstrap.Toast(document.getElementById(toastId));
        bsToast.show();

        setTimeout(() => {
            document.getElementById(toastId)?.remove();
        }, duration + 500);
    }
    
    return {
        translate,
        setLanguage,
        displayResults,
        clearResults,
        generateShareUrl,
        generateShareText,
        generateTextExport,
        showToast
    };
})();
