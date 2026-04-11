// ========== ІЗОЛЯЦІЯ ДАНИХ ==========
class AppStorage {
  constructor() {
    this.appName = this.getAppName();
    this.prefix = `${this.appName}_`;
    console.log('AppStorage ініціалізовано з префіксом:', this.prefix);
  }
  
  getAppName() {
    const path = window.location.pathname;
    const appPath = path.split('/').filter(p => p && p !== '').join('_') || 'root';
    return appPath;
  }
  
  getKey(key) {
    return `${this.prefix}${key}`;
  }
  
  getItem(key) {
    return localStorage.getItem(this.getKey(key));
  }
  
  setItem(key, value) {
    localStorage.setItem(this.getKey(key), value);
  }
  
  removeItem(key) {
    localStorage.removeItem(this.getKey(key));
  }
  
  getAllKeys() {
    return Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
  }
  
  clearAll() {
    this.getAllKeys().forEach(key => {
      localStorage.removeItem(key);
    });
  }
  
  // Міграція старих даних без префікса
  migrateOldData() {
    const oldVersion = localStorage.getItem('appVersion');
    const oldDB = localStorage.getItem('symbolDB');
    let migrated = false;
    
    if (oldVersion && !this.getItem('appVersion')) {
      this.setItem('appVersion', oldVersion);
      console.log('Мігровано стару версію:', oldVersion);
      migrated = true;
    }
    
    if (oldDB && !this.getItem('symbolDB')) {
      this.setItem('symbolDB', oldDB);
      console.log('Мігровано стару базу даних');
      migrated = true;
    }
    
    return migrated;
  }
  
  // Завантаження бази даних в глобальну змінну
  loadDB() {
    const storedDB = this.getItem('symbolDB');
    if (storedDB) {
      try {
        return JSON.parse(storedDB);
      } catch (e) {
        console.error('Помилка парсингу бази даних', e);
        return {};
      }
    }
    return {};
  }
  
  // Збереження бази даних з глобальної змінної
  saveDB(db) {
    this.setItem('symbolDB', JSON.stringify(db));
  }
}

// Створюємо глобальний екземпляр для доступу з консолі
window.appStorage = new AppStorage();

// Ініціалізуємо db з правильним префіксом
let db;
try {
  db = appStorage.loadDB();
  console.log('Базу даних завантажено, кількість категорій:', Object.keys(db).length);
} catch (e) {
  db = {};
  console.error('Помилка завантаження бази:', e);
}

let activeCategory = null;
let activeButton = null;
let currentSymbolInput = null;
let currentAnalysisMode = 'letters';
let symbolKeyboardVisible = false;
let currentNavPage = 'home';

// Отримуємо версію динамічно
let APP_VERSION = "1.0.0";

async function getAppVersion() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data && event.data.version) {
          resolve(event.data.version);
        } else {
          resolve("1.0.0");
        }
      };
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }
  return "1.0.0";
}

const numberInterpretations = {
  1: "Абсолют → А (1)",
  3: "Троичность → Г (3)",
  7: "Божеств. мудрость → З (7)",
  9: "Цикл завершения → Ѳ (9), Ч (90→9)",
  40: "Испытание → М (40)",
  60: "Просветление → Ѯ (60)",
  70: "Защита → О (70)",
  100: "Творение → Р (100)",
  200: "Энергия → С (200)",
  300: "Закон → Т (300)",
  400: "Мировые врата → У (400), Ѵ (400)",
  500: "Чистота → Ф (500)",
  600: "Баланс → Х (600)",
  700: "Тайное знание → Ѱ (700)",
  800: "Вечность → Ѡ (800)",
  900: "Совершенство → Ц (900), Ѧ (900)",
  108: "Полнота божественной истины",
  144: "Гармония рода и света",
  222: "Дуальность материи и духа",
  507: "Троичность просветления"
};

function showToast(message) {
  const toast = document.getElementById('toastMessage');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function findSymbolIgnoreCase(category, symbol) {
  if (!db[category]) return null;
  const symbolLower = symbol.toLowerCase();
  for (const key of Object.keys(db[category])) {
    if (key.toLowerCase() === symbolLower) {
      return { key, data: db[category][key] };
    }
  }
  return null;
}

function saveDB() {
  appStorage.saveDB(db);
}

function reduceToSingleDigit(num) {
  const steps = [];
  let current = num;
  while (current > 9) {
    const digits = String(current).split('').map(Number);
    const sum = digits.reduce((acc, val) => acc + val, 0);
    steps.push({
      expression: digits.join(' + '),
      sum: sum,
      interpretation: numberInterpretations[sum]
    });
    current = sum;
  }
  return { final: current, steps: steps };
}

function analyzeByNumbers(word) {
  const letters = db['letters'] || {};
  let total = 0;
  const parts = [];
  const validLetters = [];
  for (const char of word) {
    const symbolKey = Object.keys(letters).find(key => key.toLowerCase() === char);
    const info = symbolKey ? letters[symbolKey] : null;
    if (info && info.число && parseInt(info.число) > 0) {
      const num = parseInt(info.число);
      total += num;
      parts.push(`${symbolKey}(${num})`);
      validLetters.push(symbolKey);
    }
  }
  if (parts.length === 0) {
    return "Немає даних про числа для літер у цьому слові";
  }
  let result = `Розбір слова: ${word.toUpperCase()}\n\n`;
  result += `Склад: ${validLetters.join('')}\n`;
  result += `Обчислення: ${parts.join(' + ')} = <span class="sum-highlight">${total}</span>\n`;
  if (numberInterpretations[total]) {
    result += `<div class="interpretation">${total}: ${numberInterpretations[total]}</div>\n`;
  }
  if (total > 9) {
    result += "\nЗведення до простого числа:\n";
    const reduction = reduceToSingleDigit(total);
    for (const step of reduction.steps) {
      result += `\n${step.expression} = <span class="sum-highlight">${step.sum}</span>`;
      if (numberInterpretations[step.sum]) {
        result += `\n<div class="interpretation">${step.sum}: ${numberInterpretations[step.sum]}</div>`;
      }
    }
    result += `\n\nПідсумкове число: <span class="sum-highlight">${reduction.final}</span>`;
    if (numberInterpretations[reduction.final]) {
      result += `\n<div class="interpretation">${reduction.final}: ${numberInterpretations[reduction.final]}</div>`;
    }
  }
  return result;
}

function analyzeByLetters(word) {
  const result = [];
  const letters = db['letters'] || {};
  for (const char of word) {
    const symbolKey = Object.keys(letters).find(key => key.toLowerCase() === char);
    const info = symbolKey ? letters[symbolKey] : null;
    if (info) {
      result.push(`${symbolKey}: ${info.свойства?.join(', ') || 'немає даних'}`);
    } else {
      result.push(`${char.toUpperCase()}: не знайдено`);
    }
  }
  return result.join('\n');
}

function analyzeWord() {
  const word = document.getElementById('wordInput').value.trim().toLowerCase();
  if (!word) return;
  let result;
  if (currentAnalysisMode === 'numbers') {
    result = analyzeByNumbers(word);
  } else {
    result = analyzeByLetters(word);
  }
  const analysis = document.getElementById('wordAnalysis');
  analysis.innerHTML = result;
  analysis.classList.add('show');
  if (symbolKeyboardVisible) {
    toggleSymbolKeyboard();
  }
}

function switchAnalysis(mode) {
  currentAnalysisMode = mode;
  document.querySelectorAll('#analysisTabs .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  event.target.classList.add('active');
  analyzeWord();
}

function toggleSymbolKeyboard() {
  const toggleBtn = document.getElementById('symbolsToggle');
  const keyboard = document.getElementById('symbolKeyboard');
  symbolKeyboardVisible = !symbolKeyboardVisible;
  if (symbolKeyboardVisible) {
    toggleBtn.classList.add('active');
    keyboard.style.display = 'block';
    createSymbolKeyboard();
  } else {
    toggleBtn.classList.remove('active');
    keyboard.style.display = 'none';
  }
}

function createSymbolKeyboard() {
  const keyboard = document.getElementById('symbolKeyboard');
  keyboard.innerHTML = '';
  const letters = db['letters'] || {};
  if (Object.keys(letters).length === 0) {
    keyboard.innerHTML = '<p>Немає символів у базі</p>';
    return;
  }
  const symbolData = Object.keys(letters).map(sym => ({
    symbol: sym,
    number: parseInt(letters[sym].номер) || 0
  }));
  symbolData.sort((a, b) => a.number - b.number);
  const groupSize = 12;
  for (let i = 0; i < symbolData.length; i += groupSize) {
    const group = symbolData.slice(i, i + groupSize);
    const rowDiv = document.createElement('div');
    rowDiv.className = 'symbol-keyboard-row';
    group.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'symbol-keyboard-btn';
      btn.textContent = item.symbol;
      btn.title = `Номер: ${item.number}`;
      btn.onclick = () => {
        const wordInput = document.getElementById('wordInput');
        wordInput.value += item.symbol;
      };
      rowDiv.appendChild(btn);
    });
    keyboard.appendChild(rowDiv);
  }
  const delRowDiv = document.createElement('div');
  delRowDiv.className = 'symbol-keyboard-row';
  const backspaceBtn = document.createElement('button');
  backspaceBtn.className = 'btn btn-danger symbol-keyboard-btn';
  backspaceBtn.textContent = '⌫';
  backspaceBtn.onclick = () => {
    const wordInput = document.getElementById('wordInput');
    wordInput.value = wordInput.value.slice(0, -1);
  };
  delRowDiv.appendChild(backspaceBtn);
  const spaceBtn = document.createElement('button');
  spaceBtn.className = 'btn btn-secondary symbol-keyboard-btn special-btn';
  spaceBtn.textContent = 'Пробіл';
  spaceBtn.style.width = '80px';
  spaceBtn.onclick = () => {
    const wordInput = document.getElementById('wordInput');
    wordInput.value += ' ';
  };
  delRowDiv.appendChild(spaceBtn);
  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn-warning symbol-keyboard-btn special-btn';
  clearBtn.textContent = 'Очистити';
  clearBtn.style.width = '80px';
  clearBtn.onclick = () => {
    document.getElementById('wordInput').value = '';
  };
  delRowDiv.appendChild(clearBtn);
  keyboard.appendChild(delRowDiv);
}

function selectCategory(cat, btn) {
  if (activeCategory === cat) {
    activeCategory = null;
    if (activeButton) activeButton.classList.remove('active');
    activeButton = null;
    document.getElementById('mainSection').innerHTML = '';
    document.getElementById('symbolList').textContent = '';
    return;
  }
  if (activeButton) activeButton.classList.remove('active');
  activeCategory = cat;
  activeButton = btn;
  btn.classList.add('active');
  const section = document.getElementById('mainSection');
  section.innerHTML = '';
  const container = document.createElement('div');
  const symbolListContainer = document.getElementById('symbolList');
  symbolListContainer.innerHTML = '';
  const symbols = db[cat] ? Object.keys(db[cat]).filter(k => k) : [];
  if (symbols.length > 0) {
    const title = document.createElement('div');
    title.innerHTML = '<strong>Символи:</strong>';
    symbolListContainer.appendChild(title);
    if (cat === 'letters') {
      const symbolData = symbols.map(sym => ({
        symbol: sym,
        number: parseInt(db[cat][sym].номер) || 0
      }));
      symbolData.sort((a, b) => a.number - b.number);
      const groupSize = 7;
      for (let i = 0; i < symbolData.length; i += groupSize) {
        const group = symbolData.slice(i, i + groupSize);
        const rowDiv = document.createElement('div');
        rowDiv.className = 'symbols-row';
        group.forEach(item => {
          const symbolDiv = document.createElement('div');
          symbolDiv.className = 'symbol-item';
          const btn = document.createElement('span');
          btn.className = 'symbol-btn';
          btn.textContent = item.symbol;
          btn.title = `Номер: ${item.number}`;
          btn.onclick = () => {
            if (currentSymbolInput) {
              currentSymbolInput.value = item.symbol;
              const event = new Event('input', { bubbles: true });
              currentSymbolInput.dispatchEvent(event);
            }
          };
          symbolDiv.appendChild(btn);
          rowDiv.appendChild(symbolDiv);
        });
        symbolListContainer.appendChild(rowDiv);
      }
    } else {
      symbols.sort();
      const rowDiv = document.createElement('div');
      rowDiv.className = 'symbols-row';
      rowDiv.style.justifyContent = 'center';
      //rowDiv.style.gap = '0.5rem';
      rowDiv.style.flexWrap = 'wrap';
      symbols.forEach(sym => {
        const btn = document.createElement('span');
        btn.className = 'symbol-btn';
        btn.textContent = sym;
        btn.onclick = () => {
          if (currentSymbolInput) {
            currentSymbolInput.value = sym;
            const event = new Event('input', { bubbles: true });
            currentSymbolInput.dispatchEvent(event);
          }
        };
        rowDiv.appendChild(btn);
      });
      symbolListContainer.appendChild(rowDiv);
    }
  } else {
    symbolListContainer.textContent = 'Немає символів у категорії.';
  }
  const form = document.createElement('div');
  form.className = 'section';
  const symbol = document.createElement('input');
  symbol.placeholder = 'Символ';
  symbol.className = 'form-control mb-2';
  currentSymbolInput = symbol;
  const number = document.createElement('input');
  number.placeholder = 'Порядковий номер';
  number.className = 'form-control mb-2';
  const value = document.createElement('input');
  value.placeholder = 'Число';
  value.className = 'form-control mb-2';
  const pron = document.createElement('input');
  pron.placeholder = 'Вимова';
  pron.className = 'form-control mb-2';
  const trans = document.createElement('input');
  trans.placeholder = 'Транскрипція';
  trans.className = 'form-control mb-2';
  const properties = document.createElement('div');
  const propInput = document.createElement('input');
  propInput.placeholder = 'Додати властивість';
  propInput.className = 'form-control d-inline-block w-75';
  const addPropBtn = document.createElement('button');
  addPropBtn.innerText = '+';
  addPropBtn.className = 'btn btn-secondary btn-sm';
  const props = [];
  addPropBtn.onclick = () => {
    const val = propInput.value.trim();
    if (val && !props.includes(val)) {
      props.push(val);
      renderProps();
    }
    propInput.value = '';
  };
  const renderProps = () => {
    properties.innerHTML = '<strong>Властивості:</strong><ul>' + props.map(p => `<li>${p}</li>`).join('') + '</ul>';
  };
  const row = document.createElement('div');
  row.className = 'property-input';
  row.append(propInput, addPropBtn);
  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  const submit = document.createElement('button');
  submit.innerText = 'Зберегти';
  submit.className = 'btn btn-success btn-sm';
  submit.onclick = () => {
    let sym = symbol.value.trim();
    if (['letters', 'sanskrit', 'runes'].includes(cat) && sym.length === 1) {
      sym = sym.toUpperCase();
    }
    if (!sym && cat !== 'numbers') return;
    const existing = findSymbolIgnoreCase(cat, sym);
    if (existing && existing.key !== sym) {
      delete db[cat][existing.key];
    }
    const item = {
      имя: sym,
      категория: cat,
      номер: number.value.trim(),
      число: value.value.trim(),
      свойства: [...props],
      произношение: pron.value.trim(),
      транскрипция: trans.value.trim(),
    };
    db[cat] = db[cat] || {};
    db[cat][sym] = item;
    saveDB();
    showOutput(item);
    selectCategory(cat, btn);
  };
  const delBtn = document.createElement('button');
  delBtn.innerText = 'Видалити';
  delBtn.className = 'btn btn-danger btn-sm';
  delBtn.onclick = () => {
    const sym = symbol.value.trim();
    if (sym) {
      const existing = findSymbolIgnoreCase(cat, sym);
      if (existing) {
        delete db[cat][existing.key];
        saveDB();
        symbol.value = number.value = value.value = pron.value = trans.value = '';
        props.length = 0;
        renderProps();
        showOutput({});
        selectCategory(cat, btn);
      }
    }
  };
  btnRow.append(submit, delBtn);
  symbol.oninput = () => {
    const val = symbol.value.trim();
    if (!val) {
      number.value = value.value = pron.value = trans.value = '';
      props.length = 0;
      renderProps();
      return;
    }
    const existing = findSymbolIgnoreCase(cat, val);
    if (existing) {
      const item = existing.data;
      symbol.value = existing.key;
      number.value = item.номер || '';
      value.value = item.число || '';
      pron.value = item.произношение || '';
      trans.value = item.транскрипция || '';
      props.length = 0;
      item.свойства?.forEach(p => props.push(p));
      renderProps();
    } else {
      number.value = value.value = pron.value = trans.value = '';
      props.length = 0;
      renderProps();
    }
  };
  form.append(symbol, number, value);
  if (cat === 'letters' || cat === 'sanskrit' || cat === 'runes' || cat === 'energies') form.append(pron, trans);
  form.append(row, properties, btnRow);
  container.appendChild(form);
  section.appendChild(container);
}

function showOutput(data) {
  const output = document.getElementById('output');
  output.textContent = JSON.stringify(data, null, 2);
}

function exportCSV() {
  const rows = [["Категорія", "Символ", "Номер", "Число", "Вимова", "Транскрипція", "Властивості"]];
  for (const [cat, items] of Object.entries(db)) {
    for (const [key, data] of Object.entries(items)) {
      rows.push([
        cat, key, data.номер || "", data.число || "",
        data.произношение || "", data.транскрипция || "",
        (data.свойства || []).join('; ')
      ]);
    }
  }
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `symbols_${appStorage.appName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Експорт завершено");
}

function importCSV(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split('\n').map(line => line.replace(/\r$/, ''));
    const [header, ...rest] = lines;
    for (const line of rest) {
      if (!line.trim()) continue;
      const [cat, sym, num, val, pron, trans, props] = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, ''));
      if (!cat || !sym) continue;
      let processedSym = sym;
      if (['letters', 'sanskrit', 'runes'].includes(cat) && sym.length === 1) {
        processedSym = sym.toUpperCase();
      }
      const existing = findSymbolIgnoreCase(cat, processedSym);
      if (existing) {
        delete db[cat][existing.key];
      }
      db[cat] = db[cat] || {};
      db[cat][processedSym] = {
        имя: processedSym,
        категория: cat,
        номер: num,
        число: val,
        произношение: pron,
        транскрипция: trans,
        свойства: props.split(';').map(p => p.trim()).filter(Boolean)
      };
    }
    saveDB();
    alert("CSV імпортовано успішно");
  };
  reader.readAsText(file);
}

function searchSymbol() {
  const searchInput = document.getElementById('searchInput').value.trim();
  const searchInputLower = searchInput.toLowerCase();
  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = '';
  if (!searchInput) return;
  
  const searchResults = [];
  for (const [category, symbols] of Object.entries(db)) {
    for (const [symbol, data] of Object.entries(symbols)) {
      const symbolLower = symbol.toLowerCase();
      let found = false;
      let matchedProperties = [];
      
      if (symbolLower === searchInputLower) {
        searchResults.push({
          symbol: symbol,
          data: data,
          category: category,
          matchedText: symbol,
          matchType: 'symbol'
        });
        found = true;
      }
      
      if (!found && searchInput.length > 1 && data.свойства) {
        data.свойства.forEach(prop => {
          const propLower = prop.toLowerCase();
          if (propLower.includes(searchInputLower)) {
            matchedProperties.push(prop);
          }
        });
        if (matchedProperties.length > 0) {
          searchResults.push({
            symbol: symbol,
            data: data,
            category: category,
            matchedProperties: matchedProperties,
            matchType: 'properties'
          });
        }
      }
    }
  }
  
  if (searchResults.length > 0) {
    searchResults.forEach(item => {
      const resultDiv = document.createElement('div');
      resultDiv.className = 'search-result-item';
      
      const symbolDisplay = item.symbol;
      const categoryDisplay = item.category;
      
      function highlightText(text, searchTerm) {
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
      }
      
      if (item.matchType === 'symbol') {
        const highlightedSymbol = highlightText(symbolDisplay, searchInput);
        const propertiesHtml = item.data.свойства?.join(', ') || 'немає властивостей';
        resultDiv.innerHTML = `<strong>${highlightedSymbol}</strong> <span class="text-muted">(${categoryDisplay})</span>: ${propertiesHtml}`;
      } else {
        const allProperties = item.data.свойства || [];
        const highlightedProps = allProperties.map(prop => {
          if (item.matchedProperties.includes(prop)) {
            return highlightText(prop, searchInput);
          }
          return prop;
        }).join(', ');
        
        resultDiv.innerHTML = `<strong>${symbolDisplay}</strong> <span class="text-muted">(${categoryDisplay})</span>: ${highlightedProps}`;
      }
      
      resultsContainer.appendChild(resultDiv);
    });
    resultsContainer.classList.add('show');
  } else {
    const alert = document.getElementById('noResultsAlert');
    alert.classList.add('show');
    setTimeout(() => {
      alert.classList.remove('show');
    }, 5000);
  }
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchResults').classList.remove('show');
}

function switchPage(pageId) {
  document.querySelectorAll('.page-container').forEach(page => {
    page.classList.remove('active-page');
  });
  const activePage = document.getElementById(`${pageId}Page`);
  if (activePage) {
    activePage.classList.add('active-page');
  }
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-page') === pageId) {
      btn.classList.add('active');
    }
  });
  currentNavPage = pageId;
  if (pageId === 'analyze' && document.getElementById('wordInput').value.trim()) {
    analyzeWord();
  }
  // Завантажуємо календар Круголѣтъ Числобога при переході на сторінку
  if (pageId === 'kolyada') {
    loadKolyadaCalendar();
  }
  
  window.scrollTo(0, 0);
}

function mergeWithBase(baseData) {
  console.log('Початок злиття даних з sings.json');
  let updatesCount = 0;
  
  for (const [category, symbols] of Object.entries(baseData)) {
    if (!db[category]) db[category] = {};
    for (const [sym, baseItem] of Object.entries(symbols)) {
      if (!db[category][sym]) {
        db[category][sym] = { ...baseItem };
        updatesCount++;
        console.log(`Додано новий символ: ${sym}`);
      } else {
        const existing = db[category][sym];
        let updated = false;
        
        if (baseItem.число !== undefined && existing.число !== baseItem.число) {
          console.log(`Оновлено число для ${sym}: "${existing.число}" -> "${baseItem.число}"`);
          existing.число = baseItem.число;
          updated = true;
        }
        
        if (baseItem.свойства && Array.isArray(baseItem.свойства)) {
          if (!existing.свойства) existing.свойства = [];
          baseItem.свойства.forEach(prop => {
            if (!existing.свойства.includes(prop)) {
              existing.свойства.push(prop);
              console.log(`Додано властивість для ${sym}: "${prop}"`);
              updated = true;
            }
          });
        }
        
        if (updated) updatesCount++;
      }
    }
  }
  
  saveDB();
  console.log(`Злиття завершено. Оновлено/додано ${updatesCount} символів`);
}

async function initDatabase() {
  console.log('=== ІНІЦІАЛІЗАЦІЯ ДОДАТКУ ===');
  console.log('Префікс додатку:', appStorage.prefix);
  console.log('Ключі додатку `в` localStorage:', appStorage.getAllKeys());
  
  // Мігруємо старі дані
  const migrated = appStorage.migrateOldData();
  if (migrated) {
    console.log('Старі дані мігровано, перезавантажуємо db');
    db = appStorage.loadDB();
  }
  
  // Отримуємо версію з Service Worker
  const swVersion = await getAppVersion();
  APP_VERSION = swVersion;
  console.log('Отримано версію з Service Worker:', APP_VERSION);
  
  const savedVersion = appStorage.getItem('appVersion');
  console.log('Збережена версія (з префіксом):', savedVersion);
  
  if (savedVersion !== APP_VERSION) {
    console.log('Оновлення версії, завантаження sings.json...');
    try {
      const response = await fetch('sings.json', { cache: 'no-cache' });
      const baseData = await response.json();
      console.log('sings.json завантажено, кількість літер:', Object.keys(baseData.letters || {}).length);
      mergeWithBase(baseData);
      appStorage.setItem('appVersion', APP_VERSION);
      showToast('Базу даних оновлено');
    } catch (err) {
      console.error('Помилка завантаження sings.json', err);
    }
  } else {
    console.log('Версії співпадають, оновлення не потрібне');
  }
  
  // Завантаження даних для календаря (аналогічно sings.json)
  try {
    const kolyadaResponse = await fetch('kolyadaDar.json', { cache: 'no-cache' });
    if (kolyadaResponse.ok) {
      const kolyadaData = await kolyadaResponse.json();
      // Зберігаємо в localStorage окремим ключем
      appStorage.setItem('kolyadaData', JSON.stringify(kolyadaData));
      window.kolyadaData = kolyadaData;
      console.log('kolyadaDar.json завантажено та збережено');
    } else {
      // Якщо fetch не вдався, пробуємо взяти з localStorage
      const cached = appStorage.getItem('kolyadaData');
      if (cached) {
        window.kolyadaData = JSON.parse(cached);
        console.log('kolyadaDar.json завантажено з localStorage');
      }
    }
  } catch (err) {
    console.error('Помилка завантаження kolyadaDar.json', err);
    const cached = appStorage.getItem('kolyadaData');
    if (cached) {
      window.kolyadaData = JSON.parse(cached);
      console.log('kolyadaDar.json завантажено з localStorage (після помилки)');
    }
  }
  
  console.log('=== ПОТОЧНИЙ СТАН ===');
  console.log('Поточна версія:', appStorage.getItem('appVersion'));
  console.log('Розмір бази:', appStorage.getItem('symbolDB')?.length || 0, 'символів');
  console.log('Кількість категорій в db:', Object.keys(db).length);
}

function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.update();
      
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('[App] New version available:', event.data.version);
          showUpdateNotification(event.data.version);
        }
      });
    });
    
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[App] Service Worker controller changed');
      showToast('Оновлення застосовано');
    });
  }
}

function showUpdateNotification(version) {
  const updateDiv = document.createElement('div');
  updateDiv.className = 'update-notification';
  updateDiv.innerHTML = `
    <div class="update-notification-content">
      <span>📦 Доступна нова версія (${version})</span>
      <button onclick="applyUpdate()" class="btn btn-primary btn-sm">Оновити</button>
      <button onclick="closeUpdateNotification()" class="btn btn-secondary btn-sm">Пізніше</button>
    </div>
  `;
  document.body.appendChild(updateDiv);
  setTimeout(() => {
    updateDiv.classList.add('show');
  }, 100);
}

function applyUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    });
  }
}

function closeUpdateNotification() {
  const notification = document.querySelector('.update-notification');
  if (notification) {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }
}

setInterval(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.update();
    });
  }
}, 30 * 60 * 1000);

// Функція завантаження календаря Круголѣтъ Числобога
let kolyadaLoaded = false;

async function loadKolyadaCalendar() {
  const container = document.getElementById('kolyadaPage');
  if (!container) return;
  
  // Якщо вже завантажено, не завантажуємо повторно
  if (kolyadaLoaded) return;
  
  try {
    // Завантажуємо HTML календаря
    const response = await fetch('./kolyadaDar.html');
    const html = await response.text();
    
    // Витягуємо тільки вміст body (без тегів html/head)
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const bodyContent = doc.body.innerHTML;
    
    // Вставляємо в контейнер
    container.innerHTML = bodyContent;
    
    // Динамічно підключаємо CSS (якщо ще не підключено)
    if (!document.querySelector('link[href="./kolyadaDar.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './kolyadaDar.css';
      document.head.appendChild(link);
    }
    
    // Динамічно підключаємо JS (якщо ще не підключено)
    if (!document.querySelector('script[src="./kolyadaDar.js"]')) {
      const script = document.createElement('script');
      script.src = './kolyadaDar.js';
      script.onload = () => {
        console.log('Коляди Даръ завантажено');
        // Чекаємо ініціалізації календаря
        setTimeout(() => {
          if (window.initKolyadaDar) {
            window.initKolyadaDar();
          }
        }, 100);
      };
      document.body.appendChild(script);
    } else {
      // Якщо скрипт вже підключений, просто ініціалізуємо
      setTimeout(() => {
        if (window.initKolyadaDar) {
          window.initKolyadaDar();
        }
      }, 100);
    }
    
    kolyadaLoaded = true;
  } catch (error) {
    console.error('Помилка завантаження календаря:', error);
    container.innerHTML = '<div class="alert alert-danger m-3">Помилка завантаження календаря "Круголѣтъ Числобога"</div>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const importBtn = document.getElementById('importCsvBtn');
  const fileInput = document.getElementById('csvFileInput');
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) importCSV(e.target.files[0]);
      fileInput.value = '';
    });
  }
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pageId = btn.getAttribute('data-page');
      if (pageId) switchPage(pageId);
    });
  });
  
  await initDatabase();
  switchPage('home');
  checkForUpdates();
});