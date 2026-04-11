// kolyadaDar.js
// Слов'янський календар "Коляди Даръ" - Круголет Числобога

// Глобальні змінні
let KOLYADA_DATA = null;
let cycleStart = null;
let startSlavicYear = 7521;
let currentVersion = "daariy";

// Змінні для синхронізації часу
let exactLocalMs = null;
let syncDeviceMs = null;
let syncError = false;

// ========== ЄДИНЕ МІСЦЕ ДЛЯ НАЛАШТУВАНЬ ЗА ЗАМОВЧУВАННЯМ ==========
const DEFAULT_SETTINGS = {
    year: 2012,
    month: 9,      // вересень (1-12 для зберігання)
    day: 22,
    hour: 19,
    minute: 0,
    version: "daariy",
    startSlavicYear: 7521
};

// ========== ФУНКЦІЯ ОНОВЛЕННЯ ПОЛІВ ВВЕДЕННЯ ==========
function updateSettingsInputs() {
    const startYearEl = document.getElementById('kolyadaStartYear');
    const startMonthEl = document.getElementById('kolyadaStartMonth');
    const startDayEl = document.getElementById('kolyadaStartDay');
    const startHourEl = document.getElementById('kolyadaStartHour');
    const startMinuteEl = document.getElementById('kolyadaStartMinute');
    const versionSelect = document.getElementById('kolyadaVersionSelect');
    
    if (!cycleStart) return;
    
    if (startYearEl) startYearEl.value = cycleStart.getFullYear();
    if (startMonthEl) startMonthEl.value = cycleStart.getMonth() + 1;
    if (startDayEl) startDayEl.value = cycleStart.getDate();
    if (startHourEl) startHourEl.value = cycleStart.getHours();
    if (startMinuteEl) startMinuteEl.value = cycleStart.getMinutes();
    if (versionSelect) versionSelect.value = currentVersion;
}

// ========== ЗАВАНТАЖЕННЯ НАЛАШТУВАНЬ ==========
function loadSettings() {
    const saved = localStorage.getItem('koleda_settings');
    
    if (saved) {
        try {
            const s = JSON.parse(saved);
            cycleStart = new Date(s.year, s.month - 1, s.day, s.hour, s.minute, 0);
            startSlavicYear = s.startSlavicYear || DEFAULT_SETTINGS.startSlavicYear;
            currentVersion = s.version || DEFAULT_SETTINGS.version;
        } catch (e) {
            applyDefaultSettings();
        }
    } else {
        applyDefaultSettings();
    }
    
    updateSettingsInputs();
}

// ========== ЗАСТОСУВАННЯ НАЛАШТУВАНЬ ЗА ЗАМОВЧУВАННЯМ ==========
function applyDefaultSettings() {
    cycleStart = new Date(
        DEFAULT_SETTINGS.year, 
        DEFAULT_SETTINGS.month - 1, 
        DEFAULT_SETTINGS.day, 
        DEFAULT_SETTINGS.hour, 
        DEFAULT_SETTINGS.minute, 
        0
    );
    startSlavicYear = DEFAULT_SETTINGS.startSlavicYear;
    currentVersion = DEFAULT_SETTINGS.version;
}

// ========== ЗБЕРЕЖЕННЯ НАЛАШТУВАНЬ ==========
function saveSettings() {
    const year = parseInt(document.getElementById('kolyadaStartYear').value);
    const month = parseInt(document.getElementById('kolyadaStartMonth').value);
    const day = parseInt(document.getElementById('kolyadaStartDay').value);
    const hour = parseInt(document.getElementById('kolyadaStartHour').value);
    const minute = parseInt(document.getElementById('kolyadaStartMinute').value);
    const version = document.getElementById('kolyadaVersionSelect').value;
    
    cycleStart = new Date(year, month - 1, day, hour, minute, 0);
    currentVersion = version;
    
    localStorage.setItem('koleda_settings', JSON.stringify({
        year, month, day, hour, minute,
        startSlavicYear: startSlavicYear,
        version
    }));
    
    const settingsPanel = document.getElementById('kolyadaSettingsPanel');
    if (settingsPanel) settingsPanel.classList.remove('show');
    updateUI();
}

// Функція для визначення літнього часу (з 22 березня по 22 вересня)
function isSummerTime(date) {
    const month = date.getMonth();
    const day = date.getDate();
    if (month > 2 && month < 8) return true;
    if (month === 2 && day >= 22) return true;
    if (month === 8 && day < 22) return true;
    return false;
}

// Завантаження даних з JSON
async function loadKolyadaData() {
    // Спочатку перевіряємо глобальну змінну (з основного додатку)
    if (window.kolyadaData) {
        KOLYADA_DATA = window.kolyadaData;
        console.log('Дані календаря отримано з window.kolyadaData');
        return true;
    }
    
    // Запасний варіант – напряму з localStorage
    const cached = localStorage.getItem('az-book-ved_kolyadaData');
    if (cached) {
        try {
            KOLYADA_DATA = JSON.parse(cached);
            console.log('Дані календаря отримано з localStorage');
            return true;
        } catch (e) {}
    }
    
    // Останній варіант – fetch (для самостійної роботи)
    try {
        const response = await fetch('./kolyadaDar.json');
        if (!response.ok) throw new Error('Не вдалося завантажити дані');
        KOLYADA_DATA = await response.json();
        console.log('Дані календаря завантажено з мережі');
        return true;
    } catch (error) {
        console.error('Помилка завантаження даних:', error);
        return false;
    }
}

// Функція для визначення чертога за слов'янською датою
function getChertog(monthIdx, day) {
    if (!KOLYADA_DATA) return null;
    
    const monthName = KOLYADA_DATA.months[monthIdx].name;
    
    for (const chertog of KOLYADA_DATA.chertogi) {
        const startMonth = chertog.period_start.month;
        const startDay = chertog.period_start.day;
        const endMonth = chertog.period_end.month;
        const endDay = chertog.period_end.day;
        
        const startMonthIdx = KOLYADA_DATA.months.findIndex(m => m.name === startMonth);
        const endMonthIdx = KOLYADA_DATA.months.findIndex(m => m.name === endMonth);
        
        if (startMonthIdx === endMonthIdx && monthIdx === startMonthIdx) {
            if (day >= startDay && day <= endDay) {
                return chertog;
            }
        }
        else if (startMonthIdx !== endMonthIdx) {
            if (monthIdx === startMonthIdx && day >= startDay) {
                return chertog;
            }
            if (monthIdx === endMonthIdx && day <= endDay) {
                return chertog;
            }
            if (monthIdx > startMonthIdx && monthIdx < endMonthIdx) {
                return chertog;
            }
            if (startMonthIdx > endMonthIdx) {
                if (monthIdx >= startMonthIdx || monthIdx <= endMonthIdx) {
                    return chertog;
                }
            }
        }
    }
    return null;
}

// Функція для визначення Залу за днем у чертозі
function getHall(day) {
    if (!KOLYADA_DATA) return null;
    
    let hallIndex = Math.floor((day - 1) / 9);
    if (hallIndex >= 9) hallIndex = 8;
    
    return KOLYADA_DATA.halls[hallIndex];
}

// Отримання довжини місяця
function getMonthDays(monthIdx, isSacred) {
    if (!KOLYADA_DATA) return 41;
    const month = KOLYADA_DATA.months[monthIdx];
    return isSacred ? month.days_sacred : month.days_simple;
}

// Визначення місяця за зміщенням днів
function getMonthByDayOffset(dayOffset, isSacred) {
    if (!KOLYADA_DATA) return { monthIdx: 0, dayInMonth: dayOffset };
    
    let daysLeft = dayOffset;
    for (let i = 0; i < KOLYADA_DATA.months.length; i++) {
        const monthDays = getMonthDays(i, isSacred);
        if (daysLeft < monthDays) {
            return { monthIdx: i, dayInMonth: daysLeft };
        }
        daysLeft -= monthDays;
    }
    return { monthIdx: 0, dayInMonth: dayOffset };
}

// ОСНОВНА ФУНКЦІЯ ПЕРЕКЛАДУ ГРИГОРІАНСЬКОЇ ДАТИ В СЛОВ'ЯНСЬКУ

function toSlavic(date) {
    if (!KOLYADA_DATA) return null;
    if (!(date instanceof Date) || isNaN(date.getTime())) return null;
    
    const targetMs = date.getTime();
    const cycleMs = cycleStart.getTime();
    const cycleDaysMs = KOLYADA_DATA.meta.cycle_days * 86400000;
    const cycleYears = KOLYADA_DATA.meta.cycle_length_years;
    
    let adjustedCycleMs = cycleMs;
    let adjustedYear = startSlavicYear;
    
    // Якщо дата раніше початку циклу, знаходимо найближчий попередній цикл
    if (targetMs < cycleMs) {
        const diffMs = cycleMs - targetMs;
        let cyclesBack = Math.floor(diffMs / cycleDaysMs);
        adjustedCycleMs = cycleMs - cyclesBack * cycleDaysMs;
        adjustedYear = startSlavicYear - cyclesBack * cycleYears;
    }
    
    let diffMs = targetMs - adjustedCycleMs;
    
    /*const startHour = cycleStart.getHours();
    if (date.getHours() < startHour) {
        diffMs -= 86400000;
    }*/
    
    // Коригуємо від’ємний diffMs
    let totalDays;
    if (diffMs >= 0) {
        totalDays = Math.floor(diffMs / 86400000);
        diffMs = diffMs % 86400000;
    } else {
        // diffMs від’ємний, додаємо стільки діб, щоб він став додатним
        let daysToAdd = Math.ceil(-diffMs / 86400000);
        totalDays = -daysToAdd;
        diffMs += daysToAdd * 86400000;
    }
    
    // Визначення року (безпечний лічильник)
    let yearOffset = 0;
    let daysLeft = totalDays;
    const maxYears = 2000;
    
    while (yearOffset < maxYears) {
        const isSacred = ((adjustedYear + yearOffset - startSlavicYear) % KOLYADA_DATA.meta.subcycle_length_years === KOLYADA_DATA.meta.subcycle_length_years - 1);
        const yearDays = isSacred ? KOLYADA_DATA.meta.sacred_year_days : KOLYADA_DATA.meta.simple_year_days;
        if (daysLeft < yearDays) break;
        daysLeft -= yearDays;
        yearOffset++;
    }
    
    const slavicYear = adjustedYear + yearOffset;
    
    // Визначення місяця
    const isCurrentSacred = ((slavicYear - startSlavicYear) % KOLYADA_DATA.meta.subcycle_length_years === KOLYADA_DATA.meta.subcycle_length_years - 1);
    const { monthIdx, dayInMonth } = getMonthByDayOffset(daysLeft, isCurrentSacred);
    const slavicDay = dayInMonth + 1;
    const monthData = KOLYADA_DATA.months[monthIdx];
    const monthName = monthData.name;
    const monthDescription = monthData.description;
    
    // Визначення чертога
    const chertog = getChertog(monthIdx, slavicDay);
    let chertogDescription = "";
    if (chertog) {
        chertogDescription = `✦ ЧЕРТОГ ${chertog.name.toUpperCase()} (покровитель ${chertog.god}) ✦\n🌳 Священне дерево: ${chertog.tree}\n📅 Період: ${chertog.period_start.month} ${chertog.period_start.day} - ${chertog.period_end.month} ${chertog.period_end.day}\n${chertog.description}`;
    }
    
    // Визначення Залу
    let hall = null;
    let hallDescription = "";
    if (chertog) {
        hall = getHall(slavicDay);
        if (hall) {
            hallDescription = `✦ ЗАЛ ${hall.index}: ${hall.name} ✦\n${hall.description}`;
        }
    }
    
    // Час (слов'янський) – виправлена частина
    let secInDay = (diffMs % 86400000) / 1000;
    if (secInDay < 0) secInDay += 86400;
    if (secInDay >= 86400) secInDay = 86399.999; // безпечне обмеження
    
    const hourZeroBased = Math.floor(secInDay / KOLYADA_DATA.meta.hour_seconds);
    // Переконуємось, що індекс у межах 0-15
    const safeHourIndex = Math.min(Math.max(hourZeroBased, 0), KOLYADA_DATA.hours_16.length - 1);
    const displayHour = (safeHourIndex === 0) ? KOLYADA_DATA.meta.hours_per_day : safeHourIndex;
    
    const isSummer = isSummerTime(date);
    const hourData = KOLYADA_DATA.hours_16[safeHourIndex];
    // Запобігаємо помилці, якщо hourData все ще undefined
    if (!hourData) {
        console.error('Помилка: відсутні дані для години', safeHourIndex);
        return null;
    }
    const hourName = hourData.name;
    const hourDescription = isSummer ?
        `${hourData.description}, ${hourData.time_start_summer}-${hourData.time_end_summer}, ${hourData.part_of_day}` :
        `${hourData.description}, ${hourData.time_start_winter}-${hourData.time_end_winter}, ${hourData.part_of_day}`;
    
    const rem = secInDay % KOLYADA_DATA.meta.hour_seconds;
    const part = Math.floor(rem / KOLYADA_DATA.meta.part_seconds) + 1;
    const sig = Math.floor((rem % KOLYADA_DATA.meta.part_seconds) / (KOLYADA_DATA.meta.part_seconds / KOLYADA_DATA.meta.sig_per_part)) + 1;
    
    // День тижня (9-денний) зі зміщенням +8, щоб 1 Рамхат був Неделею
    const daysSinceStart = Math.floor((targetMs - adjustedCycleMs) / 86400000);
    let weekdayIdx = (daysSinceStart + 9) % KOLYADA_DATA.weekdays.length;
    if (weekdayIdx < 0) weekdayIdx += KOLYADA_DATA.weekdays.length;
    const weekdayData = KOLYADA_DATA.weekdays[weekdayIdx];
    const weekday = weekdayData.name;
    const weekdayDescription = weekdayData.description;
    
    // Назва року
    const offset16 = (slavicYear - startSlavicYear) % KOLYADA_DATA.meta.subcycle_length_years;
    let yearName = KOLYADA_DATA.year_names_versions[currentVersion].years_16[offset16 < 0 ? offset16 + 16 : offset16];
    
    // Стихія (18-річний цикл, кожна стихія на 2 роки)
    const elementOffset = Math.floor(((slavicYear - startSlavicYear) / 2)) % KOLYADA_DATA.elements.length;
    let safeOffset = elementOffset % KOLYADA_DATA.elements.length;
    if (safeOffset < 0) safeOffset += KOLYADA_DATA.elements.length;
    const element = KOLYADA_DATA.elements[safeOffset];
    
    return {
        year: slavicYear,
        month: monthName,
        monthDescription: monthDescription,
        monthIdx: monthIdx + 1,
        day: slavicDay,
        weekday: weekday,
        weekdayDescription: weekdayDescription,
        hour: displayHour,
        hourName: hourName,
        hourDescription: hourDescription,
        part: part,
        sig: sig,
        yearName: yearName,
        elementName: element.name,
        elementColor: element.color,
        elementMeaning: element.meaning,
        elementHex: element.color_hex,
        isSummer: isSummer,
        chertog: chertog,
        chertogDescription: chertogDescription,
        hall: hall,
        hallDescription: hallDescription
    };
}

// Синхронізація часу – використовуємо тільки час пристрою
async function syncTime() {
    // Просто позначаємо, що синхронізація не потрібна
    syncError = false;
    exactLocalMs = null;
    const syncStatus = document.getElementById('kolyadaSyncStatus');
    if (syncStatus) {
        syncStatus.innerHTML = '✓ Час пристрою';
        syncStatus.style.color = '#6b8c5c';
    }
}

function getCurrentLocalMs() {
    if (!syncError && exactLocalMs !== null && syncDeviceMs !== null) {
        return exactLocalMs + (Date.now() - syncDeviceMs);
    }
    return Date.now();
}

// Оновлення UI
function updateUI() {
    if (!KOLYADA_DATA) return;
    
    const localMs = getCurrentLocalMs();
    const now = new Date(localMs);
    
    const modernTimeEl = document.getElementById('kolyadaModernTime');
    const modernDateEl = document.getElementById('kolyadaModernDate');
    if (modernTimeEl) {
        modernTimeEl.innerText = now.toLocaleTimeString('uk-UA', { hour12: false });
    }
    if (modernDateEl) {
        modernDateEl.innerHTML = now.toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    
    const s = toSlavic(now);
    if (!s) return;
    
    const elements = {
        sYear: s.year,
        sMonth: s.month,
        monthNum: s.monthIdx,
        sDay: s.day,
        sWeekday: s.weekday,
        weekdayDesc: s.weekdayDescription,
        monthDesc: s.monthDescription,
        chertogDesc: s.chertogDescription,
        hallDesc: s.hallDescription,
        sHour: s.hour,
        sPart: s.part.toString().padStart(3, ' '),
        sSig: s.sig.toString().padStart(3, ' '),
        sHourName: s.hourName,
        hourDesc: s.hourDescription,
        yearName: `✧ ${s.yearName} ✧`,
        elementInfo: `СТИХІЯ:<span style="color: ${s.elementHex}; text-shadow: 1px 1px 0 rgba(0,0,0,0.7);">${s.elementName} (${s.elementColor}) — ${s.elementMeaning}</span>`
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(`kolyada${id.charAt(0).toUpperCase() + id.slice(1)}`);
        if (el) el.innerHTML = value;
        const elementInfoEl = document.getElementById('kolyadaElementInfo');
        if (elementInfoEl) {
            elementInfoEl.style.textShadow = '1px 1px 0 rgba(0,0,0,0.2)';
        }
    }
    
    const slavicCard = document.getElementById('kolyadaSlavicCard');
    if (slavicCard && s.elementHex) {
        slavicCard.style.borderLeft = `4px solid ${s.elementHex}`;
    }
    
    const startHour = cycleStart.getHours();
    const startMinute = cycleStart.getMinutes();
    const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
    const dayStartLabel = document.getElementById('kolyadaDayStartLabel');
    if (dayStartLabel) {
        dayStartLabel.innerHTML = `✦ ПОЧАТОК ДОБИ О ${startTimeStr} ✦`;
    }
}

// Показати результат конвертера
function showConverterResult() {
    if (!KOLYADA_DATA) return;
    
    const year = parseInt(document.getElementById('kolyadaConvYear').value);
    const month = parseInt(document.getElementById('kolyadaConvMonth').value) - 1;
    const day = parseInt(document.getElementById('kolyadaConvDay').value);
    const hour = parseInt(document.getElementById('kolyadaConvHour').value);
    const minute = parseInt(document.getElementById('kolyadaConvMinute').value);
    
    const inputDate = new Date(year, month, day, hour, minute, 0);
    if (isNaN(inputDate.getTime())) {
        const resultText = document.getElementById('kolyadaConvResultText');
        if (resultText) resultText.innerHTML = '❌ Невірна дата!';
        const converterResult = document.getElementById('kolyadaConverterResult');
        if (converterResult) converterResult.classList.add('show');
        return;
    }
    
    const s = toSlavic(inputDate);
    if (!s) return;
    
    let chertogHtml = "";
    if (s.chertog) {
        chertogHtml = `
            <div style="border-top:1px solid #c4a35a; margin:0.4rem 0;"></div>
            <div><strong>ЧЕРТОГ:</strong> ${s.chertog.name} (покровитель ${s.chertog.god})</div>
            <div><strong>🌳 Священне дерево:</strong> ${s.chertog.tree}</div>
            <div><strong>📅 Період:</strong> ${s.chertog.period_start.month} ${s.chertog.period_start.day} - ${s.chertog.period_end.month} ${s.chertog.period_end.day}</div>
            <div><em>${s.chertog.description}</em></div>
        `;
    }
    
    let hallHtml = "";
    if (s.hall) {
        hallHtml = `
            <div style="border-top:1px solid #c4a35a; margin:0.4rem 0;"></div>
            <div><strong>ЗАЛ:</strong> ${s.hall.index}. ${s.hall.name}</div>
            <div><em>${s.hall.description}</em></div>
        `;
    }
    
    const resultHtml = `
        <div style="font-size:0.9rem; margin-bottom:0.4rem;">📅 ${inputDate.toLocaleDateString('uk-UA')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}</div>
        <div style="border-top:1px solid #c4a35a; margin:0.4rem 0;"></div>
        <div><strong>ЛѢТО:</strong> ${s.year} (${s.yearName})</div>
        <div><strong>МѢСЯЦЬ:</strong> ${s.month} — ${s.monthDescription}</div>
        <div><strong>ДЕНЬ:</strong> ${s.day}</div>
        <div><strong>ДЕНЬ НЕДІЛІ:</strong> ${s.weekday} — ${s.weekdayDescription}</div>
        <div><strong>ГОДИНА:</strong> ${s.hour} (${s.hourName}) — ${s.hourDescription}</div>
        <div><strong>ЧАСТИНА:</strong> ${s.part} / 144 · <strong>СИГ:</strong> ${s.sig} / 144</div>
        ${chertogHtml}
        ${hallHtml}
        <div style="border-top:1px solid #c4a35a; margin:0.4rem 0;"></div>
        <div><strong>СТИХІЯ:</strong> <span style="color: ${s.elementHex}; text-shadow: 1px 1px 0 rgba(0,0,0,0.7);">${s.elementName} (${s.elementColor}) — ${s.elementMeaning}</span></div>
        <div style="width:100%; height:16px; background:${s.elementHex}; border-radius:8px; margin-top:0.4rem;"></div>
    `;
    
    const resultText = document.getElementById('kolyadaConvResultText');
    const converterResult = document.getElementById('kolyadaConverterResult');
    if (resultText) resultText.innerHTML = resultHtml;
    if (converterResult) converterResult.classList.add('show');
}

// Встановити поточний час у конвертер
function setCurrentToConverter() {
    const now = new Date(getCurrentLocalMs());
    const yearEl = document.getElementById('kolyadaConvYear');
    const monthEl = document.getElementById('kolyadaConvMonth');
    const dayEl = document.getElementById('kolyadaConvDay');
    const hourEl = document.getElementById('kolyadaConvHour');
    const minuteEl = document.getElementById('kolyadaConvMinute');
    
    if (yearEl) yearEl.value = now.getFullYear();
    if (monthEl) monthEl.value = now.getMonth() + 1;
    if (dayEl) dayEl.value = now.getDate();
    if (hourEl) hourEl.value = now.getHours();
    if (minuteEl) minuteEl.value = now.getMinutes();
    showConverterResult();
}

// Ініціалізація (експортуємо в глобальний об'єкт)
window.initKolyadaDar = async function() {
    const dataLoaded = await loadKolyadaData();
    if (!dataLoaded) {
        console.error('Помилка: не вдалося завантажити дані календаря');
        return;
    }
    
    loadSettings();
    
    await syncTime();
    
    updateUI();
    if (window.kolyadaInterval) clearInterval(window.kolyadaInterval);
    window.kolyadaInterval = setInterval(updateUI, 100);
    
    const convertBtn = document.getElementById('kolyadaConvertBtn');
    const setCurrentBtn = document.getElementById('kolyadaSetCurrentBtn');
    const saveSettingsBtn = document.getElementById('kolyadaSaveSettings');
    const closeSettingsBtn = document.getElementById('kolyadaCloseSettings');
    const settingsIcon = document.getElementById('kolyadaSettingsIcon');
    const settingsPanel = document.getElementById('kolyadaSettingsPanel');
    
    if (convertBtn) convertBtn.onclick = showConverterResult;
    if (setCurrentBtn) setCurrentBtn.onclick = setCurrentToConverter;
    if (saveSettingsBtn) saveSettingsBtn.onclick = saveSettings;
    if (closeSettingsBtn && settingsPanel) {
        closeSettingsBtn.onclick = () => settingsPanel.classList.remove('show');
    }
    if (settingsIcon && settingsPanel) {
        settingsIcon.onclick = () => settingsPanel.classList.toggle('show');
    }
};