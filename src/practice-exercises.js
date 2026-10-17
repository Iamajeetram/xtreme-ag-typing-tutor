import { escapeHtml } from './text-utils.js'
import { saveReportRecord } from './report-utils.js'
import { englishLearningData } from './learning-english.js'
import { hindiLearningData } from './learning-hindi.js'

const exerciseTextCache = new Map()
let exerciseDataPromise

function exerciseAssetUrl(path) {
  const baseUrl = import.meta.env?.BASE_URL || '/'
  return new URL(`${baseUrl}exercises/${path}`, document.baseURI).toString()
}

export function loadPracticeExerciseData() {
  if (!exerciseDataPromise) {
    exerciseDataPromise = (async () => {
      const response = await fetch(exerciseAssetUrl('exercise-manifest.json'))
      if (!response.ok) throw new Error(`Could not load exercise manifest (${response.status}).`)
      const manifest = await response.json()
      if (!Array.isArray(manifest.exercises)) throw new Error('Exercise manifest is missing its exercises list.')

      const exercises = manifest.exercises.filter((item) =>
        item && typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.language === 'string' &&
        typeof item.file === 'string' &&
        !item.file.startsWith('/') &&
        !item.file.split('/').includes('..')
      )
      if (!exercises.length) throw new Error('Exercise manifest contains no valid exercises.')

      return exercises.map((item) => ({
        id: item.id,
        title: item.title,
        category: typeof item.category === 'string' ? item.category : 'General',
        language: item.language,
        file: item.file,
        text: '',
      }))
    })().catch((error) => {
      exerciseDataPromise = undefined
      throw error
    })
  }
  return exerciseDataPromise
}

export async function loadPracticeExerciseText(exercise) {
  if (!exercise || typeof exercise.file !== 'string') {
    throw new TypeError('A valid exercise with a file path is required.')
  }
  if (typeof exercise.text === 'string' && exercise.text.trim()) return exercise.text

  const cacheKey = String(exercise.id || exercise.file)
  if (!exerciseTextCache.has(cacheKey)) {
    const request = (async () => {
      const response = await fetch(exerciseAssetUrl(exercise.file))
      if (!response.ok) throw new Error(`Could not load exercise ${cacheKey} (${response.status}).`)
      const text = (await response.text()).trim()
      if (!text) throw new Error(`Exercise ${cacheKey} is empty.`)
      exercise.text = text
      return text
    })().catch((error) => {
      exerciseTextCache.delete(cacheKey)
      throw error
    })
    exerciseTextCache.set(cacheKey, request)
  }
  return exerciseTextCache.get(cacheKey)
}

export function renderPracticeExercises(language = (localStorage.getItem('ag-language') === 'hi' ? 'hi' : 'en')) {
  const activeLang = language === 'hi' ? 'hi' : 'en'
  const langTitle = activeLang === 'hi' ? 'हिंदी टाइपिंग अभ्यास' : 'English Typing Practice'
  
  return `<div class="practice-hub-layout" style="display:flex; height:calc(100vh - 60px); background:#f8fafc; overflow:hidden; font-family:inherit;">
    <aside style="width:340px; background:#ffffff; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; padding:18px; box-shadow:2px 0 8px rgba(0,0,0,0.02);">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
        <button type="button" id="practice-back-home" class="secondary-button" style="padding:6px 14px; font-size:13px; font-weight:600; border-radius:8px;">← Back</button>
        <h2 style="font-size:16px; font-weight:700; color:#1e293b; margin:0;">Practice Hub</h2>
      </div>
      <div style="font-size:12px; font-weight:700; color:#2563eb; background:#eff6ff; padding:6px 10px; border-radius:6px; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">
        Active Language: ${activeLang === 'hi' ? 'Hindi (हिंदी)' : 'English'}
      </div>
      <div id="practice-exercise-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;"></div>
    </aside>

    <main style="flex:1; padding:32px; overflow-y:auto; display:flex; flex-direction:column; align-items:center; background:#f1f5f9;">
      <div id="practice-main-container" style="width:100%; max-width:880px;">
        <div id="practice-config-view" style="background:#ffffff; border-radius:20px; padding:32px; box-shadow:0 10px 25px rgba(0,0,0,0.05); border:1px solid #e2e8f0;">
          <div style="text-align:center; margin-bottom:24px;">
            <h1 style="font-size:24px; font-weight:800; color:#0f172a; margin:0 0 6px 0;">${langTitle}</h1>
            <p style="font-size:14px; color:#64748b; margin:0;">Select an exercise from the left panel, customize your test, and start.</p>
          </div>

          <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:14px; margin-bottom:28px; padding:16px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
            <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:#334155; cursor:pointer;"><input type="checkbox" id="cfg-backspace" checked> Allow Backspace</label>
            <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:#334155; cursor:pointer;"><input type="checkbox" id="cfg-text-highlight" checked> Text highlight</label>
            <label style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:#334155; cursor:pointer;"><input type="checkbox" id="cfg-speedometer" checked> Speedometer</label>
          </div>

          <div style="margin-bottom:32px;">
            <h3 style="font-size:14px; font-weight:700; color:#475569; margin-bottom:12px; text-align:center;">Select Test Duration</h3>
            <div style="display:flex; justify-content:center; gap:12px;">
              <button type="button" class="duration-btn primary-button" data-dur="1" style="padding:12px 24px; font-size:15px; font-weight:700; border-radius:10px;">1 min</button>
              <button type="button" class="duration-btn secondary-button" data-dur="3" style="padding:12px 24px; font-size:15px; font-weight:700; border-radius:10px;">3 min</button>
              <button type="button" class="duration-btn secondary-button" data-dur="5" style="padding:12px 24px; font-size:15px; font-weight:700; border-radius:10px;">5 min</button>
            </div>
          </div>

          <div style="text-align:center;">
            <button type="button" id="start-typing-test-btn" class="primary-button" style="padding:16px 48px; font-size:18px; font-weight:800; border-radius:14px; box-shadow:0 8px 25px rgba(37,99,235,0.35);">
              Start Typing Test →
            </button>
          </div>
        </div>

        <div id="practice-test-view" style="display:none; flex-direction:column; gap:20px; width:100%;">
          <div style="display:flex; align-items:center; justify-content:space-between; background:#ffffff; padding:14px 24px; border-radius:14px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border:1px solid #e2e8f0;">
            <div>
              <strong id="test-exercise-title" style="font-size:16px; color:#1e293b;">Exercise Title</strong>
              <small style="display:block; color:#64748b; font-weight:600; margin-top:2px;" id="test-timer-label">Time remaining: 1:00</small>
            </div>
            <button type="button" id="test-abort-btn" class="secondary-button" style="padding:6px 14px; font-size:13px; border-radius:8px;">Back to Config</button>
          </div>

          <div id="test-passage-box" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:14px; padding:22px; max-height:220px; overflow-y:auto; font-size:18px; line-height:1.8; color:#1e293b; width:100%; box-sizing:border-box; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);"></div>

          <div style="width:100%; box-sizing:border-box;">
            <textarea id="test-typing-textarea" placeholder="Type the passage here..." style="width:100%; height:150px; padding:18px; font-size:16px; border:2px solid #2563eb; border-radius:14px; outline:none; resize:none; box-sizing:border-box; font-family:inherit; background:#ffffff; box-shadow:0 4px 12px rgba(37,99,235,0.08);"></textarea>
            <div style="display:flex; justify-content:flex-end; margin-top:12px;">
              <button type="button" id="test-submit-btn" class="primary-button" style="padding:12px 28px; font-size:15px; font-weight:700; border-radius:10px; box-shadow:0 4px 12px rgba(37,99,235,0.2);">Submit Test</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>`
}

export function bindPracticeExerciseActions(onRerender = () => {}) {
  document.querySelector('#practice-back-home')?.addEventListener('click', () => {
    document.querySelector('[data-page="home"]')?.click()
  })

  const activeLang = localStorage.getItem('ag-language') === 'hi' ? 'hi' : 'en'
  const exercisesListEl = document.querySelector('#practice-exercise-list')
  
  const sourceBank = activeLang === 'hi' ? hindiLearningData : englishLearningData
  const rawSentences = sourceBank.mixed?.sentences || sourceBank.home?.sentences || ['Practice typing accurately.']
  
  const sampleExercises = rawSentences.slice(0, 15).map((sentence, idx) => ({
    id: idx + 1,
    title: `Exercise ${String(idx + 1).padStart(3, '0')} — ${sentence.slice(0, 45)}...`,
    text: sentence
  }))

  let selectedEx = sampleExercises[0]
  let testDurationMin = 1

  if (exercisesListEl) {
    exercisesListEl.innerHTML = sampleExercises.map((ex) => `
      <div class="practice-ex-card ${selectedEx.id === ex.id ? 'active' : ''}" data-ex-id="${ex.id}" style="padding:12px 14px; background:${selectedEx.id === ex.id ? '#eff6ff' : '#f8fafc'}; border:1px solid ${selectedEx.id === ex.id ? '#2563eb' : '#e2e8f0'}; border-radius:10px; cursor:pointer;">
        <strong style="font-size:13px; color:#1e293b; display:block; margin-bottom:2px;">${escapeHtml(ex.title)}</strong>
        <small style="color:#64748b; font-size:11px; font-weight:600;">${activeLang === 'hi' ? 'हिंदी अभ्यास सत्र' : 'Typing Standard Test'}</small>
      </div>
    `).join('')

    exercisesListEl.querySelectorAll('[data-ex-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = Number(card.dataset.exId)
        selectedEx = sampleExercises.find(x => x.id === id) || sampleExercises[0]
        exercisesListEl.querySelectorAll('.practice-ex-card').forEach(c => {
          const isActive = Number(c.dataset.exId) === selectedEx.id
          c.style.background = isActive ? '#eff6ff' : '#f8fafc'
          c.style.borderColor = isActive ? '#2563eb' : '#e2e8f0'
        })
      })
    })
  }

  document.querySelectorAll('.duration-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.duration-btn').forEach(b => b.className = 'duration-btn secondary-button')
      btn.className = 'duration-btn primary-button'
      testDurationMin = Number(btn.dataset.dur) || 1
    })
  })

  const startBtn = document.querySelector('#start-typing-test-btn')
  const configView = document.querySelector('#practice-config-view')
  const testView = document.querySelector('#practice-test-view')

  if (startBtn && configView && testView) {
    startBtn.addEventListener('click', () => {
      configView.style.display = 'none'
      testView.style.display = 'flex'
      document.querySelector('#test-exercise-title').textContent = selectedEx.title
      document.querySelector('#test-passage-box').innerHTML = escapeHtml(selectedEx.text)
      
      const textarea = document.querySelector('#test-typing-textarea')
      if (textarea) {
        textarea.value = ''
        textarea.focus()
      }
      runTypingTestModalSession(selectedEx.text, testDurationMin)
    })
  }

  document.querySelector('#test-abort-btn')?.addEventListener('click', () => {
    if (configView && testView) {
      testView.style.display = 'none'
      configView.style.display = 'block'
      document.querySelector('#stylized-speedometer-panel')?.remove()
    }
  })
}

function runTypingTestModalSession(passageText, durationMinutes) {
  let timeLeftSec = durationMinutes * 60
  let timerHandle = null
  let testStarted = false
  const textarea = document.querySelector('#test-typing-textarea')
  const timerLabel = document.querySelector('#test-timer-label')

  renderStylizedSpeedometerWidget(0)

  const updateTimerDisplay = () => {
    const m = Math.floor(timeLeftSec / 60)
    const s = timeLeftSec % 60
    if (timerLabel) timerLabel.textContent = `Time remaining: ${m}:${String(s).padStart(2, '0')}`
  }
  updateTimerDisplay()

  const handleInput = () => {
    if (!testStarted && textarea.value.length > 0) {
      testStarted = true
      timerHandle = setInterval(() => {
        timeLeftSec--
        updateTimerDisplay()
        if (timeLeftSec <= 0) {
          clearInterval(timerHandle)
          finishTestAndShowReport(textarea.value, passageText, durationMinutes * 60 - timeLeftSec)
        }
      }, 1000)
    }

    const typed = textarea.value
    const elapsedMin = Math.max((durationMinutes * 60 - timeLeftSec) / 60, 1/60)
    let correctChars = 0
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === passageText[i]) correctChars++
    }
    const netWpm = Math.max(0, Math.round(((correctChars / 5) / elapsedMin)))
    updateSpeedometerNeedle(netWpm)

    if (typed.length >= passageText.length) {
      if (timerHandle) clearInterval(timerHandle)
      finishTestAndShowReport(typed, passageText, durationMinutes * 60 - timeLeftSec)
    }
  }

  textarea?.addEventListener('input', handleInput)

  document.querySelector('#test-submit-btn')?.addEventListener('click', () => {
    if (timerHandle) clearInterval(timerHandle)
    finishTestAndShowReport(textarea.value, passageText, durationMinutes * 60 - timeLeftSec)
  })
}

function renderStylizedSpeedometerWidget(currentWpm) {
  let widget = document.querySelector('#stylized-speedometer-panel')
  if (!widget) {
    widget = document.createElement('div')
    widget.id = 'stylized-speedometer-panel'
    widget.style.cssText = 'position:fixed; bottom:24px; right:24px; background:#ffffff; border:1px solid #cbd5e1; border-radius:18px; padding:18px; box-shadow:0 12px 30px rgba(0,0,0,0.12); width:260px; text-align:center; z-index:99;'
    document.body.appendChild(widget)
  }
  
  const rotationDeg = Math.min(Math.max((currentWpm / 100) * 180 - 90, -90), 90)

  widget.innerHTML = `
    <div style="font-size:12px; font-weight:700; color:#475569; margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">Live Speedometer</div>
    <div style="position:relative; width:200px; height:100px; margin:0 auto; overflow:hidden;">
      <div style="position:absolute; top:0; left:0; width:200px; height:200px; border-radius:50%; border:14px solid #e2e8f0; border-bottom-color:transparent; border-right-color:transparent; transform:rotate(-45deg); box-sizing:border-box;"></div>
      <div id="speedometer-needle" style="position:absolute; bottom:0; left:98px; width:4px; height:85px; background:#dc2626; transform-origin:bottom center; transform:rotate(${rotationDeg}deg); transition:transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-radius:2px;"></div>
      <div style="position:absolute; bottom:-6px; left:89px; width:18px; height:18px; background:#1e293b; border-radius:50%;"></div>
    </div>
    <div style="font-size:28px; font-weight:800; color:#1e293b; margin-top:6px;" id="speedometer-wpm-val">${currentWpm}</div>
    <div style="font-size:11px; font-weight:700; color:#2563eb; letter-spacing:1px;">NET WPM</div>
    <div style="display:flex; justify-content:space-between; padding:0 6px; font-size:10px; color:#64748b; font-weight:700; margin-top:8px;">
      <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span><span>60+</span>
    </div>`
}

function updateSpeedometerNeedle(wpm) {
  const needle = document.querySelector('#speedometer-needle')
  const valEl = document.querySelector('#speedometer-wpm-val')
  if (valEl) valEl.textContent = wpm
  if (needle) {
    const rot = Math.min(Math.max((wpm / 100) * 180 - 90, -90), 90)
    needle.style.transform = `rotate(${rot}deg)`
  }
}

function finishTestAndShowReport(typedText, passageText, elapsedSec) {
  document.querySelector('#stylized-speedometer-panel')?.remove()

  let correctCount = 0, errorCount = 0
  for (let i = 0; i < typedText.length; i++) {
    if (typedText[i] === passageText[i]) correctCount++
    else errorCount++
  }

  const mins = Math.max(elapsedSec / 60, 1/60)
  const totalWords = typedText.trim() ? typedText.trim().split(/\s+/).length : 0
  const grossWpm = Math.round((typedText.length / 5) / mins)
  const netWpm = Math.max(0, Math.round(((correctCount / 5) / mins)))
  const accuracy = typedText.length > 0 ? Math.round((correctCount / typedText.length) * 100) : 100

  saveReportRecord({
    date: new Date().toISOString(),
    netWpm,
    grossWpm,
    accuracy,
    errors: errorCount,
    words: totalWords,
    chars: typedText.length,
    durationSec: elapsedSec
  })

  let modal = document.querySelector('#practice-report-modal')
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'practice-report-modal'
    modal.className = 'learn-completion-modal'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    document.body.appendChild(modal)
  }

  modal.innerHTML = `
    <div id="printable-report-card" class="learn-completion-card" style="position:relative; max-width:640px; text-align:left; padding:36px; overflow:hidden; background:#ffffff; border-radius:20px; box-shadow:0 20px 40px rgba(0,0,0,0.15);">
      <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) rotate(-30deg); font-size:32px; font-weight:900; color:rgba(37,99,235,0.04); white-space:nowrap; pointer-events:none; z-index:0; text-transform:uppercase; letter-spacing:2px;">
        AG Typing Tutor by Xtreme AG Apps
      </div>

      <div style="position:relative; z-index:1;">
        <div style="text-align:center; border-bottom:2px solid #e2e8f0; padding-bottom:16px; margin-bottom:22px;">
          <h2 style="font-size:24px; font-weight:800; color:#1e293b; margin:0 0 4px 0;">Typing Test Performance Report</h2>
          <p style="font-size:12.5px; color:#64748b; margin:0; font-weight:600;">AG Typing Tutor · Xtreme AG Apps</p>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; margin-bottom:22px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
            <small style="color:#64748b; font-size:11px; font-weight:700; display:block; margin-bottom:4px;">NET WPM</small>
            <strong style="font-size:30px; color:#2563eb; font-weight:800;">${netWpm}</strong>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
            <small style="color:#64748b; font-size:11px; font-weight:700; display:block; margin-bottom:4px;">ACCURACY</small>
            <strong style="font-size:30px; color:#16a34a; font-weight:800;">${accuracy}%</strong>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center;">
            <small style="color:#64748b; font-size:11px; font-weight:700; display:block; margin-bottom:4px;">ERRORS</small>
            <strong style="font-size:30px; color:#dc2626; font-weight:800;">${errorCount}</strong>
          </div>
        </div>

        <div style="background:#f8fafc; border-radius:12px; padding:16px; border:1px solid #e2e8f0; margin-bottom:26px; font-size:13.5px; color:#334155;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>Gross Speed:</span><strong>${grossWpm} WPM</strong></div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>Total Words Typed:</span><strong>${totalWords} words</strong></div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>Total Characters:</span><strong>${typedText.length} chars</strong></div>
          <div style="display:flex; justify-content:space-between;"><span>Time Taken:</span><strong>${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s</strong></div>
        </div>

        <div style="display:flex; gap:14px;">
          <button type="button" id="report-print-btn" class="secondary-button" style="flex:1; padding:12px; font-weight:700; border-radius:10px;">🖨️ Print Report</button>
          <button type="button" id="report-close-btn" class="primary-button" style="flex:1; padding:12px; font-weight:700; border-radius:10px;">Close & Return</button>
        </div>
      </div>
    </div>`

  modal.hidden = false
  document.body.classList.add('learn-modal-open')

  modal.querySelector('#report-print-btn')?.addEventListener('click', () => {
    window.print()
  })

  modal.querySelector('#report-close-btn')?.addEventListener('click', () => {
    modal.hidden = true
    document.body.classList.remove('learn-modal-open')
    document.querySelector('[data-page="home"]')?.click()
  }, { once: true })
}

// EXPORTS REQUIRED BY MAIN.JS
export const practiceExercises = {
  render: renderPracticeExercises,
  bindActions: bindPracticeExerciseActions
}

export const practiceCategories = practiceExercises