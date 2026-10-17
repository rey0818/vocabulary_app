import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, limit } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const firebaseConfigured = !firebaseConfig.apiKey.startsWith('請填入');
const firebaseApp = firebaseConfigured ? initializeApp(firebaseConfig) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const googleProvider = new GoogleAuthProvider();

let currentUser = null;
let units = [];
let completedDates = [];
let currentUnitIndex = -1;
let quizWords = [];
let quizScopeLabel = '';

// 測驗狀態變數
let currentMode = 0;
let quizQueue = [];
let currentQuestion = null;

// 綁定 DOM 元素
const unitSelect = document.getElementById('unit-select');
const wordManagement = document.getElementById('word-management');
const quizSelection = document.getElementById('quiz-selection');
const wordList = document.getElementById('word-list');
const managementSection = document.getElementById('management-section');
const quizSection = document.getElementById('quiz-section');
const streakSection = document.getElementById('streak-section');
const optionsContainer = document.getElementById('options-container');
const typingContainer = document.getElementById('typing-container');
const feedback = document.getElementById('feedback');
const nextBtn = document.getElementById('next-question-btn');
const typingInput = document.getElementById('typing-input');
const submitTypingBtn = document.getElementById('submit-typing-btn');
const authStatus = document.getElementById('auth-status');
const signInBtn = document.getElementById('google-sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const csvFileInput = document.getElementById('csv-file-input');
const importCsvBtn = document.getElementById('import-csv-btn');
const deleteUnitBtn = document.getElementById('delete-unit-btn');
const currentStreakElement = document.getElementById('current-streak');
const bestStreakElement = document.getElementById('best-streak');
const streakMessage = document.getElementById('streak-message');
const calendarMonth = document.getElementById('calendar-month');
const streakCalendar = document.getElementById('streak-calendar');
const starSection = document.getElementById('star-section');
const starUnitSelect = document.getElementById('star-unit-select');
const starWordList = document.getElementById('star-word-list');
const currentUnitLabel = document.getElementById('current-unit-label');
const blockSection = document.getElementById('block-section');
const uploadUnitBtn = document.getElementById('upload-unit-btn');
const refreshBlockBtn = document.getElementById('refresh-block-btn');
const blockUnitList = document.getElementById('block-unit-list');

const DEFAULT_UNIT_NAME = '基本日期與星期';
const DEFAULT_WORDS = [
    ['一月', 'いちがつ', '1月'], ['二月', 'にがつ', '2月'], ['三月', 'さんがつ', '3月'],
    ['四月', 'しがつ', '4月'], ['五月', 'ごがつ', '5月'], ['六月', 'ろくがつ', '6月'],
    ['七月', 'しちがつ', '7月'], ['八月', 'はちがつ', '8月'], ['九月', 'くがつ', '9月'],
    ['十月', 'じゅうがつ', '10月'], ['十一月', 'じゅういちがつ', '11月'],
    ['十二月', 'じゅうにがつ', '12月'],
    ['一日', 'ついたち', '第1天'], ['二日', 'ふつか', '第2天'], ['三日', 'みっか', '第3天'],
    ['四日', 'よっか', '第4天'], ['五日', 'いつか', '第5天'], ['六日', 'むいか', '第6天'],
    ['七日', 'なのか', '第7天'], ['八日', 'ようか', '第8天'], ['九日', 'ここのか', '第9天'],
    ['十日', 'とおか', '第10天'],
    ['十一日', 'じゅういちにち', '第11天'], ['十二日', 'じゅうににち', '第12天'],
    ['十三日', 'じゅうさんにち', '第13天'], ['十四日', 'じゅうよっか', '第14天'],
    ['十五日', 'じゅうごにち', '第15天'], ['十六日', 'じゅうろくにち', '第16天'],
    ['十七日', 'じゅうしちにち', '第17天'], ['十八日', 'じゅうはちにち', '第18天'],
    ['十九日', 'じゅうきゅうにち', '第19天'], ['二十日', 'はつか', '第20天'],
    ['二十一日', 'にじゅういちにち', '第21天'], ['二十二日', 'にじゅうににち', '第22天'],
    ['二十三日', 'にじゅうさんにち', '第23天'], ['二十四日', 'にじゅうよっか', '第24天'],
    ['二十五日', 'にじゅうごにち', '第25天'], ['二十六日', 'にじゅうろくにち', '第26天'],
    ['二十七日', 'にじゅうしちにち', '第27天'], ['二十八日', 'にじゅうはちにち', '第28天'],
    ['二十九日', 'にじゅうきゅうにち', '第29天'], ['三十日', 'さんじゅうにち', '第30天'],
    ['三十一日', 'さんじゅういちにち', '第31天'],
    ['月曜日', 'げつようび', '星期一'], ['火曜日', 'かようび', '星期二'],
    ['水曜日', 'すいようび', '星期三'], ['木曜日', 'もくようび', '星期四'],
    ['金曜日', 'きんようび', '星期五'], ['土曜日', 'どようび', '星期六'],
    ['日曜日', 'にちようび', '星期日']
];

function createDefaultUnit() {
    return {
        id: `default-dates-${Date.now()}`,
        name: DEFAULT_UNIT_NAME,
        words: DEFAULT_WORDS.map(([kanji, kana, zh]) => ({
            jp: `${kanji}（${kana}）`,
            zh,
            note: '',
            starred: false
        }))
    };
}

function migrateDefaultUnit(unit) {
    const isLegacyDefault = unit.name === DEFAULT_UNIT_NAME &&
        unit.words.length === DEFAULT_WORDS.length &&
        unit.words[0].jp === '一月' &&
        unit.words[11].jp === '十二月' &&
        unit.words[12].jp === '1日' &&
        unit.words[42].jp === '31日' &&
        unit.words[43].jp === '月曜日' &&
        unit.words[49].jp === '日曜日';
    if (!isLegacyDefault) return false;

    unit.words = DEFAULT_WORDS.map(([kanji, kana, zh], index) => ({
        jp: `${kanji}（${kana}）`,
        zh,
        note: unit.words[index].note || '',
        starred: unit.words[index].starred === true
    }));
    return true;
}

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDateFromKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function calculateStreaks() {
    const dates = [...new Set(completedDates)]
        .filter(dateKey => /^\d{4}-\d{2}-\d{2}$/.test(dateKey))
        .sort();
    const dateSet = new Set(dates);
    const today = new Date();
    let current = 0;
    let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    while (dateSet.has(getLocalDateKey(cursor))) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
    }

    let best = 0;
    let run = 0;
    let previousDate = null;
    dates.forEach(dateKey => {
        const date = getDateFromKey(dateKey);
        if (previousDate && (date - previousDate) / 86400000 === 1) {
            run++;
        } else {
            run = 1;
        }
        best = Math.max(best, run);
        previousDate = date;
    });

    return { current, best, dateSet };
}

function renderStreak() {
    const { current, best, dateSet } = calculateStreaks();
    currentStreakElement.textContent = `${current} 天`;
    bestStreakElement.textContent = `${best} 天`;
    streakMessage.textContent = current > 0
        ? '今日已完成學習，連勝繼續！'
        : '今天完成一次完整測驗，就能開始連勝！';

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    calendarMonth.textContent = `${year} 年 ${month + 1} 月`;
    streakCalendar.innerHTML = '';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(day => {
        const weekday = document.createElement('span');
        weekday.className = 'calendar-weekday';
        weekday.textContent = day;
        streakCalendar.appendChild(weekday);
    });

    for (let index = 0; index < new Date(year, month, 1).getDay(); index++) {
        const emptyDay = document.createElement('span');
        emptyDay.className = 'calendar-day empty';
        streakCalendar.appendChild(emptyDay);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = getLocalDateKey(today);
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = getLocalDateKey(new Date(year, month, day));
        const dayElement = document.createElement('span');
        dayElement.className = 'calendar-day';
        if (dateSet.has(dateKey)) dayElement.classList.add('completed');
        if (dateKey === todayKey) dayElement.classList.add('today');
        dayElement.textContent = day;
        streakCalendar.appendChild(dayElement);
    }
}

async function recordStudyDay() {
    const todayKey = getLocalDateKey();
    if (!completedDates.includes(todayKey)) {
        completedDates.push(todayKey);
        await saveData();
    }
    renderStreak();
}

function init() {
    updateUnitSelect();
    renderStreak();
    setEditorEnabled(false);

    signInBtn.addEventListener('click', async () => {
        if (!auth) {
            alert('請先在 firebase-config.js 填入 Firebase Web 設定。');
            return;
        }

        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('Google 登入失敗：', error);
            alert(`Google 登入失敗：${error.message}`);
        }
    });

    signOutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('登出失敗：', error);
            alert(`登出失敗：${error.message}`);
        }
    });
    
    // 註冊事件：新增單元
    document.getElementById('add-unit-btn').addEventListener('click', () => {
        const nameInput = document.getElementById('new-unit-name');
        const name = nameInput.value.trim();
        if (name) {
            units.push({ id: Date.now(), name: name, words: [] });
            saveData();
            updateUnitSelect();
            nameInput.value = '';
            unitSelect.value = units.length - 1;
            handleUnitChange();
        }
    });

    importCsvBtn.addEventListener('click', importCsvUnit);
    deleteUnitBtn.addEventListener('click', deleteCurrentUnit);
    uploadUnitBtn.addEventListener('click', uploadCurrentUnit);
    refreshBlockBtn.addEventListener('click', loadSharedUnits);

    // 註冊事件：選擇單元
    unitSelect.addEventListener('change', handleUnitChange);

    // 註冊事件：新增單字
    document.getElementById('add-word-btn').addEventListener('click', () => {
        if (currentUnitIndex === -1) return;
        const jpInput = document.getElementById('new-jp-word');
        const zhInput = document.getElementById('new-zh-word');
        const jp = jpInput.value.trim();
        const zh = zhInput.value.trim();

        if (jp && zh) {
            units[currentUnitIndex].words.push({ jp, zh, note: '', starred: false });
            saveData();
            renderWordList();
            jpInput.value = '';
            zhInput.value = '';
            jpInput.focus();
        }
    });

    // 註冊事件：測驗模式按鈕
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = parseInt(e.target.dataset.mode);
            startQuiz(mode, e.target.dataset.scope || 'current');
        });
    });
    document.querySelectorAll('.star-mode-btn').forEach(btn => {
        btn.addEventListener('click', e => startQuiz(parseInt(e.target.dataset.mode), 'starred'));
    });
    starUnitSelect.addEventListener('change', () => {
        renderStarArea();
    });

    // 註冊事件：測驗互動
    document.getElementById('exit-quiz-btn').addEventListener('click', endQuiz);
    submitTypingBtn.addEventListener('click', checkTypingAnswer);
    nextBtn.addEventListener('click', loadNextQuestion);
    
    // 支援拼寫題按下 Enter 鍵送出
    typingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkTypingAnswer();
    });

    if (auth) {
        onAuthStateChanged(auth, handleAuthStateChanged);
    } else {
        authStatus.textContent = '尚未設定 Firebase';
    }
}

async function loadCloudData(user) {
    try {
        const snapshot = await getDoc(doc(db, 'users', user.uid));
        const cloudData = snapshot.exists() ? snapshot.data() : {};
        const cloudUnits = cloudData.units;
        units = Array.isArray(cloudUnits) ? cloudUnits : [];
        let createdDefaultUnit = false;
        if (!units.some(unit => unit.name === DEFAULT_UNIT_NAME)) {
            units.unshift(createDefaultUnit());
            createdDefaultUnit = true;
        }
        units.forEach(unit => {
            unit.words = Array.isArray(unit.words) ? unit.words : [];
            migrateDefaultUnit(unit);
            unit.words.forEach(word => {
                word.note = typeof word.note === 'string' ? word.note : '';
                word.starred = word.starred === true;
            });
        });
        completedDates = Array.isArray(cloudData.completedDates) ? cloudData.completedDates : [];
        updateUnitSelect();
        renderStreak();
        if (createdDefaultUnit) await saveData();
    } catch (error) {
        console.error('載入雲端單字失敗：', error);
        alert(`無法載入雲端單字：${error.message}`);
    }
}

async function saveData() {
    if (!currentUser) return;
    try {
        await setDoc(doc(db, 'users', currentUser.uid), {
            units,
            completedDates,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('保存雲端單字失敗：', error);
        alert(`單字無法保存到雲端：${error.message}`);
    }
}

async function handleAuthStateChanged(user) {
    currentUser = user;
    if (!user) {
        units = [];
        completedDates = [];
        currentUnitIndex = -1;
        updateUnitSelect();
        renderStreak();
        setEditorEnabled(false);
        starSection.style.display = 'none';
        blockSection.style.display = 'none';
        authStatus.textContent = '尚未登入';
        signInBtn.style.display = 'inline-block';
        signOutBtn.style.display = 'none';
        return;
    }

    authStatus.textContent = `已登入：${user.displayName || user.email}`;
    signInBtn.style.display = 'none';
    signOutBtn.style.display = 'inline-block';
    setEditorEnabled(true);
    starSection.style.display = 'block';
    blockSection.style.display = 'block';
    await loadCloudData(user);
    renderStarArea();
    await loadSharedUnits();
}

function setEditorEnabled(enabled) {
    document.querySelectorAll('#management-section input, #management-section select, #management-section button, #block-section button')
        .forEach(element => {
            element.disabled = !enabled;
        });
    updateDeleteUnitButton();
}

function getPublicUnit(unit) {
    return {
        name: unit.name,
        words: unit.words.map(word => ({ jp: word.jp, zh: word.zh }))
    };
}

async function uploadCurrentUnit() {
    if (!currentUser || currentUnitIndex === -1) {
        alert('請先選擇要分享的單元。');
        return;
    }

    const unit = units[currentUnitIndex];
    if (unit.words.length === 0) {
        alert('空白單元不能上傳。');
        return;
    }
    if (!confirm(`確定要將「${unit.name}」分享給大家嗎？`)) return;

    uploadUnitBtn.disabled = true;
    try {
        await addDoc(collection(db, 'sharedUnits'), {
            ...getPublicUnit(unit),
            ownerId: currentUser.uid,
            ownerName: currentUser.displayName || '匿名學習者',
            createdAt: new Date().toISOString()
        });
        alert(`已將「${unit.name}」上傳到公開 Block。`);
        await loadSharedUnits();
    } catch (error) {
        console.error('上傳公開單元失敗：', error);
        if (error.code === 'permission-denied') {
            alert('上傳失敗：Firestore Rules 尚未允許登入者新增 sharedUnits。請到 Firebase Console 的 Firestore Database > Rules，加入 README 中的 sharedUnits 規則並按下發布。');
        } else {
            alert(`上傳失敗：${error.message}`);
        }
    } finally {
        uploadUnitBtn.disabled = false;
    }
}

async function loadSharedUnits() {
    if (!currentUser || !db) return;
    blockUnitList.textContent = '載入公開單元中...';
    try {
        const snapshot = await getDocs(query(collection(db, 'sharedUnits'), limit(100)));
        const sharedUnits = snapshot.docs
            .map(snapshotDoc => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
            .filter(unit => typeof unit.name === 'string' && Array.isArray(unit.words))
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        renderSharedUnits(sharedUnits);
    } catch (error) {
        console.error('載入公開單元失敗：', error);
        blockUnitList.textContent = `無法載入公開單元：${error.message}`;
    }
}

function renderSharedUnits(sharedUnits) {
    blockUnitList.innerHTML = '';
    if (sharedUnits.length === 0) {
        blockUnitList.textContent = '目前還沒有公開單元。';
        return;
    }

    sharedUnits.forEach(sharedUnit => {
        const item = document.createElement('div');
        item.className = 'block-unit-item';
        const title = document.createElement('strong');
        title.textContent = `${sharedUnit.name}（${sharedUnit.words.length} 字）`;
        const meta = document.createElement('span');
        meta.textContent = `分享者：${sharedUnit.ownerName || '匿名'}`;
        const downloadButton = document.createElement('button');
        downloadButton.type = 'button';
        downloadButton.className = 'download-unit-btn';
        downloadButton.textContent = '下載到我的單元';
        downloadButton.addEventListener('click', () => downloadSharedUnit(sharedUnit));
        item.append(title, meta, downloadButton);

        if (sharedUnit.ownerId === currentUser.uid) {
            const withdrawButton = document.createElement('button');
            withdrawButton.type = 'button';
            withdrawButton.className = 'withdraw-unit-btn';
            withdrawButton.textContent = '撤回上傳';
            withdrawButton.addEventListener('click', () => withdrawSharedUnit(sharedUnit));
            item.appendChild(withdrawButton);
        }

        blockUnitList.appendChild(item);
    });
}

async function withdrawSharedUnit(sharedUnit) {
    if (!currentUser || sharedUnit.ownerId !== currentUser.uid) {
        alert('只有上傳者可以撤回這個公開單元。');
        return;
    }
    if (!confirm(`確定要撤回公開單元「${sharedUnit.name}」嗎？其他人將無法再從 Block 下載這個單元。`)) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'sharedUnits', sharedUnit.id));
        await loadSharedUnits();
    } catch (error) {
        console.error('撤回公開單元失敗：', error);
        if (error.code === 'permission-denied') {
            alert('撤回失敗：目前的公開單元權限尚未允許上傳者刪除自己的分享，請更新 Firebase 設定。');
        } else {
            alert(`撤回失敗：${error.message}`);
        }
    }
}

async function downloadSharedUnit(sharedUnit) {
    const importedUnit = {
        id: Date.now(),
        name: sharedUnit.name,
        words: sharedUnit.words
            .filter(word => word && typeof word.jp === 'string' && typeof word.zh === 'string')
            .map(word => ({ jp: word.jp, zh: word.zh, note: '', starred: false }))
    };
    if (importedUnit.words.length === 0) {
        alert('這個公開單元沒有可下載的單字。');
        return;
    }

    units.push(importedUnit);
    await saveData();
    updateUnitSelect();
    unitSelect.value = units.length - 1;
    handleUnitChange();
    alert(`已下載「${importedUnit.name}」到你的單元。`);
}

function updateDeleteUnitButton() {
    deleteUnitBtn.disabled = !currentUser || currentUnitIndex === -1;
}

function getStarredWords() {
    return units.flatMap((unit, unitIndex) =>
        unit.words.filter(word => word.starred).map(word => ({ word, unitIndex }))
    );
}

function updateStarUnitSelect() {
    const selectedValue = starUnitSelect.value;
    starUnitSelect.innerHTML = '<option value="all">全部單元</option>';
    units.forEach((unit, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = unit.name;
        starUnitSelect.appendChild(option);
    });
    starUnitSelect.value = [...starUnitSelect.options].some(option => option.value === selectedValue)
        ? selectedValue : 'all';
}

function renderStarArea() {
    updateStarUnitSelect();
    const selectedUnit = starUnitSelect.value;
    const starred = getStarredWords().filter(item =>
        selectedUnit === 'all' || String(item.unitIndex) === selectedUnit
    );
    starWordList.innerHTML = '';
    if (starred.length === 0) {
        starWordList.textContent = '目前沒有符合條件的 Star 單字。';
        return;
    }
    starred.forEach(({ word, unitIndex }) => {
        const item = document.createElement('div');
        item.className = 'star-word-item';
        item.textContent = `⭐ ${word.jp} - ${word.zh}（${units[unitIndex].name}）`;
        starWordList.appendChild(item);
    });
}

async function importCsvUnit() {
    const nameInput = document.getElementById('new-unit-name');
    const unitName = nameInput.value.trim();
    const file = csvFileInput.files[0];

    if (!unitName) {
        alert('請先輸入單元名稱。');
        nameInput.focus();
        return;
    }
    if (!file) {
        alert('請先選擇 CSV 檔案。');
        return;
    }

    try {
        const csvText = await file.text();
        const words = parseCsvWords(csvText);
        if (words.length === 0) {
            throw new Error('CSV 檔案沒有可匯入的單字。');
        }

        units.push({ id: Date.now(), name: unitName, words });
        await saveData();
        updateUnitSelect();
        nameInput.value = '';
        csvFileInput.value = '';
        unitSelect.value = units.length - 1;
        handleUnitChange();
        alert(`已建立單元「${unitName}」，匯入 ${words.length} 個單字。`);
    } catch (error) {
        console.error('匯入 CSV 失敗：', error);
        alert(`匯入失敗：${error.message}`);
    }
}

function parseCsvWords(csvText) {
    const rows = [];
    let row = [];
    let field = '';
    let isQuoted = false;

    for (let index = 0; index < csvText.length; index++) {
        const character = csvText[index];
        const nextCharacter = csvText[index + 1];

        if (character === '"' && isQuoted && nextCharacter === '"') {
            field += '"';
            index++;
        } else if (character === '"') {
            isQuoted = !isQuoted;
        } else if (character === ',' && !isQuoted) {
            row.push(field);
            field = '';
        } else if ((character === '\n' || character === '\r') && !isQuoted) {
            if (character === '\r' && nextCharacter === '\n') index++;
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += character;
        }
    }

    if (field || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    const dataRows = rows
        .map(columns => columns.map(column => column.trim()))
        .filter(columns => columns.some(Boolean));
    const startIndex = isHeaderRow(dataRows[0]) ? 1 : 0;

    return dataRows.slice(startIndex).map((columns, rowIndex) => {
        if (columns.length < 2 || !columns[0] || !columns[1]) {
            throw new Error(`第 ${rowIndex + startIndex + 1} 列格式錯誤，請提供日文與中文。`);
        }
        return { jp: columns[0], zh: columns[1] };
    });
}

function isHeaderRow(columns) {
    if (!columns || columns.length < 2) return false;
    const headerText = `${columns[0]} ${columns[1]}`.toLowerCase();
    return headerText.includes('日文') || headerText.includes('中文') ||
        headerText.includes('japanese') || headerText.includes('chinese') ||
        (columns[0].toLowerCase() === 'jp' && columns[1].toLowerCase() === 'zh');
}

function updateUnitSelect() {
    unitSelect.innerHTML = '<option value="">請選擇單元...</option>';
    units.forEach((unit, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = unit.name + ` (${unit.words.length} 字)`;
        unitSelect.appendChild(option);
    });
}

function handleUnitChange() {
    const val = unitSelect.value;
    if (val !== "") {
        currentUnitIndex = parseInt(val);
        wordManagement.style.display = 'block';
        quizSelection.style.display = 'block';
        renderWordList();
        currentUnitLabel.textContent = units[currentUnitIndex].name;
    } else {
        currentUnitIndex = -1;
        wordManagement.style.display = 'none';
        quizSelection.style.display = 'none';
        currentUnitLabel.textContent = '';
    }
    updateDeleteUnitButton();
}

async function deleteCurrentUnit() {
    if (currentUnitIndex === -1 || !currentUser) return;

    const unit = units[currentUnitIndex];
    if (!confirm(`確定要刪除單元「${unit.name}」及其中的 ${unit.words.length} 個單字嗎？`)) {
        return;
    }

    units.splice(currentUnitIndex, 1);
    currentUnitIndex = -1;
    await saveData();
    updateUnitSelect();
    unitSelect.value = '';
    handleUnitChange();
    renderStarArea();
}

function renderWordList() {
    wordList.innerHTML = '';
    if (currentUnitIndex === -1) return;
    const words = units[currentUnitIndex].words;
    
    // 反轉陣列，讓最新加入的單字顯示在最上面
    [...words].reverse().forEach((word, reversedIndex) => {
        const wordIndex = words.length - 1 - reversedIndex;
        const li = document.createElement('li');

        const wordText = document.createElement('span');
        wordText.className = 'word-text';
        wordText.textContent = `${word.starred ? '⭐ ' : ''}${word.jp} - ${word.zh}`;

        const detail = document.createElement('div');
        detail.className = 'word-detail';
        detail.hidden = true;
        const noteInput = document.createElement('textarea');
        noteInput.className = 'word-note';
        noteInput.placeholder = '寫下這個單字的筆記...';
        noteInput.value = word.note || '';
        const saveNoteButton = document.createElement('button');
        saveNoteButton.type = 'button';
        saveNoteButton.className = 'save-note-btn';
        saveNoteButton.textContent = '儲存筆記';
        saveNoteButton.addEventListener('click', async event => {
            event.stopPropagation();
            word.note = noteInput.value.trim();
            await saveData();
            detail.hidden = true;
        });
        detail.append(noteInput, saveNoteButton);

        wordText.addEventListener('click', () => {
            detail.hidden = !detail.hidden;
            if (!detail.hidden) noteInput.focus();
        });

        const starButton = document.createElement('button');
        starButton.type = 'button';
        starButton.className = 'star-word-btn';
        starButton.textContent = word.starred ? '★' : '☆';
        starButton.title = word.starred ? '取消 Star' : '標註 Star';
        starButton.setAttribute('aria-label', starButton.title);
        starButton.addEventListener('click', async event => {
            event.stopPropagation();
            word.starred = !word.starred;
            await saveData();
            renderWordList();
            renderStarArea();
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'delete-word-btn';
        deleteButton.textContent = '刪除';
        deleteButton.setAttribute('aria-label', `刪除單字 ${word.jp}`);
        deleteButton.addEventListener('click', () => {
            deleteWord(wordIndex);
        });

        const wordActions = document.createElement('div');
        wordActions.className = 'word-actions';
        wordActions.append(starButton, deleteButton);
        li.append(wordText, wordActions, detail);
        wordList.appendChild(li);
    });
    
    // 同步更新單元選單上的字數顯示
    unitSelect.options[unitSelect.selectedIndex].textContent = `${units[currentUnitIndex].name} (${words.length} 字)`;
}

function deleteWord(wordIndex) {
    if (currentUnitIndex === -1) return;

    const words = units[currentUnitIndex].words;
    if (!Number.isInteger(wordIndex) || wordIndex < 0 || wordIndex >= words.length) {
        return;
    }

    const word = words[wordIndex];
    if (!confirm(`確定要刪除「${word.jp} - ${word.zh}」嗎？`)) {
        return;
    }

    words.splice(wordIndex, 1);
    saveData();
    renderWordList();
    updateUnitSelect();
    unitSelect.value = currentUnitIndex;
    renderStarArea();
}

// 陣列洗牌演算法 (Fisher-Yates Shuffle)
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function startQuiz(mode, scope = 'current') {
    if (scope === 'current' && currentUnitIndex === -1) return;
    const selected = scope === 'current'
        ? units[currentUnitIndex].words.map(word => ({ word, unitIndex: currentUnitIndex }))
        : scope === 'starred'
            ? getStarredWords().filter(item =>
                starUnitSelect.value === 'all' || String(item.unitIndex) === starUnitSelect.value)
            : units.flatMap((unit, unitIndex) =>
                unit.words.map(word => ({ word, unitIndex }))
            );
    const words = selected.map(item => item.word);
    quizWords = selected;
    quizScopeLabel = scope === 'current' ? units[currentUnitIndex].name :
        scope === 'starred' ? 'Star 單字' : '全部單元';
    
    // 防呆：選擇題需要至少 4 個單字才能組成誘答選項
    if ((mode === 1 || mode === 2) && words.length < 4) {
        alert('該單元單字量不足！選擇題需要至少 4 個單字才能產生選項，請先新增單字。');
        return;
    }
    if (mode === 3 && words.length < 1) {
        alert('該單元目前沒有單字，請先新增！');
        return;
    }

    currentMode = mode;
    // 複製一份單字表並打亂順序，作為題庫佇列
    quizQueue = shuffle([...selected]);
    
    managementSection.style.display = 'none';
    starSection.style.display = 'none';
    blockSection.style.display = 'none';
    quizSection.style.display = 'block';
    streakSection.style.display = 'none';
    
    loadNextQuestion();
}

function endQuiz() {
    managementSection.style.display = 'block';
    quizSection.style.display = 'none';
    starSection.style.display = currentUser ? 'block' : 'none';
    blockSection.style.display = currentUser ? 'block' : 'none';
    streakSection.style.display = 'block';
    updateUnitSelect();
    unitSelect.value = currentUnitIndex;
}

async function loadNextQuestion() {
    if (quizQueue.length === 0) {
        await recordStudyDay();
        alert('本單元測驗完成！');
        endQuiz();
        renderStarArea();
        return;
    }

    const question = quizQueue.pop();
    currentQuestion = question.word;
    document.getElementById('quiz-progress').textContent =
        `${quizScopeLabel}｜剩餘：${quizQueue.length + 1} 題`;
    
    // 重置畫面狀態
    optionsContainer.innerHTML = '';
    typingInput.value = '';
    typingInput.disabled = false;
    submitTypingBtn.disabled = false;
    feedback.textContent = '';
    feedback.className = 'feedback';
    nextBtn.style.display = 'none';
    
    const questionText = document.getElementById('question-text');

    if (currentMode === 1) {
        // 中翻日 (給中文，選項為日文)
        questionText.textContent = currentQuestion.zh;
        optionsContainer.style.display = 'grid';
        typingContainer.style.display = 'none';
        generateOptions('jp');
    } else if (currentMode === 2) {
        // 日翻中 (給日文，選項為中文)
        questionText.textContent = currentQuestion.jp;
        optionsContainer.style.display = 'grid';
        typingContainer.style.display = 'none';
        generateOptions('zh');
    } else if (currentMode === 3) {
        // 拼寫題 (給中文，自行輸入日文)
        questionText.textContent = currentQuestion.zh;
        optionsContainer.style.display = 'none';
        typingContainer.style.display = 'flex';
        typingInput.focus();
    }
}

// 嚴格從「該單元」內抓取誘答選項
function generateOptions(targetLang) {
    const wordsInUnit = quizWords.map(item => item.word);
    const correctAnswer = currentQuestion[targetLang];
    
    // 1. 建立誘答池：排除掉當前正確答案後，取出該單元內所有的該語言字彙
    let distractorPool = wordsInUnit
        .map(w => w[targetLang])
        .filter(text => text !== correctAnswer);
        
    // 2. 打亂誘答池
    distractorPool = shuffle(distractorPool);
    
    // 3. 抓出前 3 個誘答，並與正確答案合併
    let finalOptions = [correctAnswer, ...distractorPool.slice(0, 3)];
    
    // 4. 打亂這 4 個選項的按鈕順序
    finalOptions = shuffle(finalOptions);

    // 生成 DOM 按鈕
    finalOptions.forEach(optText => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = optText;
        btn.onclick = () => checkMultipleChoice(optText, correctAnswer, btn);
        optionsContainer.appendChild(btn);
    });
}

function checkMultipleChoice(selectedAnswer, correctAnswer, selectedBtn) {
    // 鎖定所有選項避免重複點擊
    const buttons = optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);

    if (selectedAnswer === correctAnswer) {
        feedback.textContent = '⭕ 答對了！';
        feedback.className = 'feedback correct';
        selectedBtn.style.backgroundColor = 'var(--success-color)';
        selectedBtn.style.color = 'white';
        selectedBtn.style.borderColor = 'var(--success-color)';
    } else {
        feedback.textContent = `❌ 答錯了！正確答案是：${correctAnswer}`;
        feedback.className = 'feedback incorrect';
        selectedBtn.style.backgroundColor = 'var(--error-color)';
        selectedBtn.style.color = 'white';
        selectedBtn.style.borderColor = 'var(--error-color)';
        
        // 將正確選項標示出來
        buttons.forEach(btn => {
            if(btn.textContent === correctAnswer) {
                btn.style.borderColor = 'var(--success-color)';
                btn.style.color = 'var(--success-color)';
            }
        });
    }
    nextBtn.style.display = 'block';
}

function checkTypingAnswer() {
    if (!currentQuestion) return;
    const userAnswer = typingInput.value.trim();
    const correctAnswer = currentQuestion.jp;
    
    // 這裡做嚴格比對，如果需要處理全半角可以另外擴充正規表達式
    if (userAnswer === correctAnswer) {
        feedback.textContent = '⭕ 拼寫正確！';
        feedback.className = 'feedback correct';
    } else {
        feedback.textContent = `❌ 錯誤！正確拼寫是：${correctAnswer}`;
        feedback.className = 'feedback incorrect';
    }
    
    submitTypingBtn.disabled = true;
    typingInput.disabled = true;
    nextBtn.style.display = 'block';
}

// 啟動應用程式
init();