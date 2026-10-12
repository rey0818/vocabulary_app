import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const firebaseConfigured = !firebaseConfig.apiKey.startsWith('請填入');
const firebaseApp = firebaseConfigured ? initializeApp(firebaseConfig) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const googleProvider = new GoogleAuthProvider();

let currentUser = null;
let units = [];
let currentUnitIndex = -1;

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
const optionsContainer = document.getElementById('options-container');
const typingContainer = document.getElementById('typing-container');
const feedback = document.getElementById('feedback');
const nextBtn = document.getElementById('next-question-btn');
const typingInput = document.getElementById('typing-input');
const submitTypingBtn = document.getElementById('submit-typing-btn');
const authStatus = document.getElementById('auth-status');
const signInBtn = document.getElementById('google-sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');

function init() {
    updateUnitSelect();
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
            units[currentUnitIndex].words.push({ jp, zh });
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
            startQuiz(mode);
        });
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
        const cloudUnits = snapshot.exists() ? snapshot.data().units : [];
        units = Array.isArray(cloudUnits) ? cloudUnits : [];
        updateUnitSelect();
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
        currentUnitIndex = -1;
        updateUnitSelect();
        setEditorEnabled(false);
        authStatus.textContent = '尚未登入';
        signInBtn.style.display = 'inline-block';
        signOutBtn.style.display = 'none';
        return;
    }

    authStatus.textContent = `已登入：${user.displayName || user.email}`;
    signInBtn.style.display = 'none';
    signOutBtn.style.display = 'inline-block';
    setEditorEnabled(true);
    await loadCloudData(user);
}

function setEditorEnabled(enabled) {
    document.querySelectorAll('#management-section input, #management-section select, #management-section button')
        .forEach(element => {
            element.disabled = !enabled;
        });
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
    } else {
        currentUnitIndex = -1;
        wordManagement.style.display = 'none';
        quizSelection.style.display = 'none';
    }
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
        wordText.textContent = `${word.jp} - ${word.zh}`;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'delete-word-btn';
        deleteButton.textContent = '刪除';
        deleteButton.setAttribute('aria-label', `刪除單字 ${word.jp}`);
        deleteButton.addEventListener('click', () => {
            deleteWord(wordIndex);
        });

        li.appendChild(wordText);
        li.appendChild(deleteButton);
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

function startQuiz(mode) {
    if (currentUnitIndex === -1) return;
    const words = units[currentUnitIndex].words;
    
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
    quizQueue = shuffle([...words]);
    
    managementSection.style.display = 'none';
    quizSection.style.display = 'block';
    
    loadNextQuestion();
}

function endQuiz() {
    managementSection.style.display = 'block';
    quizSection.style.display = 'none';
    updateUnitSelect();
    unitSelect.value = currentUnitIndex;
}

function loadNextQuestion() {
    if (quizQueue.length === 0) {
        alert('本單元測驗完成！');
        endQuiz();
        return;
    }

    currentQuestion = quizQueue.pop();
    document.getElementById('quiz-progress').textContent = `剩餘：${quizQueue.length + 1} 題`;
    
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
    const wordsInUnit = units[currentUnitIndex].words;
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