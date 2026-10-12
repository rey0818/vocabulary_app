const STORAGE_KEY = 'jp_vocab_units';

// 從 LocalStorage 載入歷史資料，確保重新整理或關閉網頁後資料仍然存在
function loadData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (!savedData) return [];

        const parsedData = JSON.parse(savedData);
        if (!Array.isArray(parsedData)) {
            throw new Error('保存的單元資料格式不正確');
        }

        return parsedData.filter(unit =>
            unit &&
            typeof unit.name === 'string' &&
            Array.isArray(unit.words)
        );
    } catch (error) {
        console.error('載入單元資料失敗：', error);
        alert('無法讀取已保存的單元資料，請檢查瀏覽器儲存空間。');
        return [];
    }
}

let units = loadData();
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

function init() {
    updateUnitSelect();
    
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
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
    } catch (error) {
        console.error('保存單元資料失敗：', error);
        alert('單元無法保存，請確認瀏覽器允許此網站使用儲存空間。');
    }
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
    [...words].reverse().forEach(word => {
        const li = document.createElement('li');
        li.textContent = `${word.jp} - ${word.zh}`;
        wordList.appendChild(li);
    });
    
    // 同步更新單元選單上的字數顯示
    unitSelect.options[unitSelect.selectedIndex].textContent = `${units[currentUnitIndex].name} (${words.length} 字)`;
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