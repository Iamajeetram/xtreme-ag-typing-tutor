import './style.css'
import './print.css'
import { calculateDetailedMetrics, formatDuration, getPerformanceBand, analyzeWords } from './report-utils.js'
import { lessons, renderLessons, bindLessonActions } from './learning-content.js'
import { renderGames, bindGameActions } from './typing-games.js'
import { loadPracticeExerciseData, loadPracticeExerciseText } from './practice-exercises.js'

let practiceExerciseData = []

const sections = [
  {
    id: 'learn',
    icon: '📘',
    title: 'Learn',
    description: 'Learn touch typing from beginner to advanced.',
    label: 'START LEARNING',
  },
  {
    id: 'practice',
    icon: '⌨️',
    title: 'Practice Typing',
    description: 'Practise words, sentences and paragraphs.',
    label: 'START PRACTICE',
  },
  {
    id: 'games',
    icon: '🎮',
    title: 'Typing Games',
    description: 'Improve your typing skills through games.',
    label: 'PLAY GAMES',
  },
  {
    id: 'speed',
    icon: '⚡',
    title: 'Speed Test',
    description: 'Measure your typing speed and accuracy.',
    label: 'TEST SPEED',
  },
  {
    id: 'word-efficiency',
    icon: '📝',
    title: 'MS Word Efficiency',
    description: 'Practise exam-style document formatting tasks.',
    label: 'OPEN WORD TEST',
  },
  {
    id: 'excel-efficiency',
    icon: '📊',
    title: 'MS Excel Efficiency',
    description: 'Practise spreadsheet formulas and formatting tasks.',
    label: 'OPEN EXCEL TEST',
  },
]

const exams = [
  'SSC',
  'Railway',
  'Banking',
  'High Court',
  'Supreme Court',
  'KVS / NVS',
  'DSSSB',
  'EMRS',
  'RSSB LDC',
  'Other Exams',
]

const games = [
  { id: 'space-defender', icon: '🚀', title: 'Space Defender: Typing Odyssey', description: 'Lock on to asteroid words and blast them with laser fire.' },
  { id: 'cyberpunk-racer', icon: '🏎️', title: 'Cyberpunk Nitro Racer', description: 'Type glowing lane words to boost through a neon city.' },
  { id: 'undersea-bubble-blast', icon: '🫧', title: 'Undersea Bubble Blast', description: 'Pop rising word bubbles, collect oxygen pearls and chain blasts.' },
]

const app = document.querySelector('#app')

let currentSection = 'home'
let appLanguage = localStorage.getItem('ag-language') === 'hi' ? 'hi' : 'en'
let userProfile = null
try { userProfile = JSON.parse(localStorage.getItem('ag-user-profile') || 'null') } catch { userProfile = null }
let selectedExam = 'SSC'
let typingTimer = null
let typingStartedAt = null
let typingRemaining = 0
let typingDuration = 1
let typingFinished = false
let typingPassage = ''
let typingInputValue = ''
let typingBackspaces = 0
let typingImmediateBackspaces = 0
let typingDelayedBackspaces = 0
let typingDeletePresses = 0
let typingKeystrokes = 0
let typingShiftCapsPresses = 0
let typingLastKeyAt = null
let typingPauseCount = 0
let typingLongestPauseMs = 0
let typingKeyDownAt = new Map()
let typingKeyHoldTotalMs = 0
let typingKeyHoldSamples = 0
let typingIkiTotalMs = 0
let typingIkiCount = 0
let typingSpeedSamples = []
let typingWpmMethod = localStorage.getItem('ag-typing-wpm-method') === 'words' ? 'words' : 'standard'
let typingTargetWpm = Math.max(0, Math.min(250, Number(localStorage.getItem('ag-typing-target-wpm') || 35)))

let selectedPracticeCategory = 'All topics'
let selectedPracticeLanguage = 'en'
let customPassage = ''
let selectedExerciseId = 'en-001'
let practiceOptions = { backspace: true, textHighlight: true, wordHighlight: true, wpm: true, wordMeter: true, speedometer: true }
let reviewWords = []
let reviewTarget = ''
let reviewAttempts = 0
const getCompletedExercises = () => { try { return JSON.parse(localStorage.getItem('ag-practice-completed') || '[]') } catch { return [] } }
const setExerciseCompleted = (id) => { const done = new Set(getCompletedExercises()); done.add(String(id)); localStorage.setItem('ag-practice-completed', JSON.stringify([...done])); }
const getLastExerciseAttempt = (id) => getTypingHistory().find((item) => String(item.exerciseId || '') === String(id)) || null;
const getAttemptedExercises = () => [...new Set(getTypingHistory().map((item) => String(item.exerciseId || '')).filter(Boolean))];



const savedTheme = localStorage.getItem('ag-typing-theme')
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light'

function themeButton() {
  const dark = document.documentElement.dataset.theme === 'dark'
  return `<button class="theme-toggle" id="theme-toggle" type="button" aria-label="Switch to ${dark ? 'light' : 'dark'} theme"><span class="theme-toggle-icon">${dark ? '☀️' : '🌙'}</span><span class="theme-toggle-label">${dark ? 'Light mode' : 'Dark mode'}</span></button>`
}

function attachThemeToggle() {
  document.querySelectorAll('#theme-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = nextTheme
      localStorage.setItem('ag-typing-theme', nextTheme)
      if (currentSection === 'home') renderHome()
      else renderSection(currentSection)
    })
  })
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[char])
}

function getTypingHistory() {
  try { return JSON.parse(localStorage.getItem('ag-typing-history') || '[]') } catch { return [] }
}

function saveTypingResult(result) {
  const history = getTypingHistory()
  history.unshift(result)
  try { localStorage.setItem('ag-typing-history', JSON.stringify(history.slice(0, 50))) }
  catch (error) { console.warn('Typing result could not be saved locally:', error) }
}

function calculateTypingStats(value, elapsedSeconds) {
  return calculateDetailedMetrics(value, typingPassage, elapsedSeconds * 1000)
}

function renderTypingPassage(value) {
  const target = document.querySelector('#typing-passage')
  if (!target) return
  const wordAnalysis = analyzeWords(value, typingPassage)
  const tokens = [...typingPassage.matchAll(/\S+|\s+/g)]
  target.innerHTML = tokens.map((match) => {
    const token = match[0]
    const start = match.index
    if (/^\s+$/.test(token)) return escapeHtml(token).replace(/\n/g, '<br>')
    const end = start + token.length
    const word = wordAnalysis.words.find((item) => item.start === start)
    let wordClass = 'typing-word'
    if (practiceOptions.wordHighlight) {
      if (value.length >= end) wordClass += word?.correct ? ' word-correct' : ' word-incorrect'
      else if (value.length > start && value.length < end) wordClass += ' word-in-progress'
    }
    const chars = [...token].map((char, offset) => {
      const index = start + offset
      let charClass = 'typing-char'
      if (practiceOptions.textHighlight) {
        if (index < value.length) charClass += value[index] === char ? ' correct' : ' incorrect'
        else if (index === value.length) charClass += ' current'
      }
      return `<span class="${charClass}">${escapeHtml(char)}</span>`
    }).join('')
    return `<span class="${wordClass}">${chars}</span>`
  }).join('')
  const correctWords = document.querySelector('#typing-correct-words')
  const incorrectWords = document.querySelector('#typing-incorrect-words')
  if (correctWords) correctWords.textContent = String(wordAnalysis.correctWords)
  if (incorrectWords) incorrectWords.textContent = String(wordAnalysis.incorrectWords)
}
function stopTypingTimer() {
  if (typingTimer) clearInterval(typingTimer)
  typingTimer = null
}

function countWords(value) { return (String(value || '').trim().match(/\S+/g) || []).length }

function getSelectedNetWpm(stats, elapsedSeconds, typedText = typingInputValue, targetText = typingPassage) {
  if (typingWpmMethod !== 'words') return Number(stats.netWpm ?? stats.wpm ?? 0)
  const minutes = Math.max(Number(elapsedSeconds || 0) / 60, 1 / 60)
  const wordStats = analyzeWords(typedText, targetText)
  return Math.round(wordStats.correctWords / minutes)
}

function levenshteinDistance(a, b) {
  const left = Array.from(String(a || ''))
  const right = Array.from(String(b || ''))
  if (!left.length) return right.length
  if (!right.length) return left.length
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i)
  for (let i = 1; i <= left.length; i++) {
    const current = [i]
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1))
    }
    previous = current
  }
  return previous[right.length]
}

function getTypingExtraMetrics(result, stats) {
  const elapsedSeconds = Math.max(1, Number(result.elapsedSeconds || 1))
  const minutes = elapsedSeconds / 60
  const typed = String(result.typedText || '')
  const target = String(result.passage || '')
  const chars = Array.from(typed).length
  const targetChars = Array.from(target).length
  const keyCount = Number(result.keystrokes || 0)
  const wordStats = analyzeWords(typed, target)
  const correctChars = Number(stats.correct || 0)
  const incorrectChars = Number(stats.errors || 0)
  const errorRate = chars ? (incorrectChars / chars) * 100 : 0
  const keyErrors = {}
  const pairErrors = {}
  const rowErrors = { top: 0, home: 0, bottom: 0, other: 0 }
  const rows = { top: 'qwertyuiop[]', home: 'asdfghjkl;\'', bottom: 'zxcvbnm,./' }
  for (let i = 0; i < Math.min(typed.length, target.length); i++) {
    if (typed[i] === target[i]) continue
    const key = target[i].toLocaleLowerCase()
    keyErrors[key] = (keyErrors[key] || 0) + 1
    const pair = target.slice(Math.max(0, i - 1), Math.min(target.length, i + 1)).toLocaleLowerCase()
    if (pair.trim().length > 1) pairErrors[pair] = (pairErrors[pair] || 0) + 1
    const row = Object.keys(rows).find((name) => rows[name].includes(key)) || 'other'
    rowErrors[row] += 1
  }
  let transpositions = 0
  for (let i = 0; i < Math.min(typed.length, target.length) - 1; i++) {
    if (typed[i] !== target[i] && typed[i] === target[i + 1] && typed[i + 1] === target[i]) transpositions += 1
  }
  const samples = Array.isArray(result.speedSamples) ? result.speedSamples : []
  const burstWpm = samples.reduce((best, sample, index) => {
    const prev = samples[index - 1]
    if (!prev) return best
    const seconds = Math.max(1, Number(sample.second) - Number(prev.second))
    const charsInWindow = Math.max(0, Number(sample.chars) - Number(prev.chars))
    return Math.max(best, Math.round((charsInWindow / 5) * (60 / seconds)))
  }, 0)
  const speedValues = samples.map((sample) => Number(sample.netWpm || 0))
  const mean = speedValues.length ? speedValues.reduce((a, b) => a + b, 0) / speedValues.length : 0
  const sd = speedValues.length ? Math.sqrt(speedValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / speedValues.length) : 0
  const kspm = Math.round(keyCount / minutes)
  const cpM = Math.round(chars / minutes)
  const standardGross = Number(stats.grossWpm || 0)
  const wordBasedGross = Math.round(countWords(typed) / minutes)
  const wordBasedNet = Math.round(wordStats.correctWords / minutes)
  const adjustedWpm = Math.max(0, Math.round(standardGross * (1 - errorRate / 100)))
  const kspc = chars ? (keyCount / chars).toFixed(2) : '0.00'
  const keyRows = Object.entries(keyErrors).sort((a, b) => b[1] - a[1]).slice(0, 8)
  return {
    elapsedSeconds, minutes, chars, targetChars, keyCount, wordStats, correctChars, incorrectChars,
    errorRate: Math.round(errorRate * 10) / 10, kspm, cpM,
    kph: Math.round(keyCount * 3600 / elapsedSeconds), wordBasedGross, wordBasedNet,
    adjustedWpm, kspc, msd: levenshteinDistance(typed, target.slice(0, Math.min(target.length, typed.length))),
    transpositions, rowErrors, keyRows, keyErrorMap: keyErrors, pairRows: Object.entries(pairErrors).sort((a,b)=>b[1]-a[1]).slice(0,8), mistypedWords: wordStats.words.filter((word) => word.typed && !word.correct).slice(0,10), burstWpm, consistency: Math.max(0, Math.round(100 - sd * 2)),
    medianWpm: speedValues.length ? [...speedValues].sort((a,b)=>a-b)[Math.floor((speedValues.length - 1) / 2)] : Number(stats.netWpm || 0),
    p25Wpm: speedValues.length ? [...speedValues].sort((a,b)=>a-b)[Math.floor((speedValues.length - 1) * .25)] : Number(stats.netWpm || 0),
    avgIki: result.ikiCount ? Math.round(result.ikiTotalMs / result.ikiCount) : 0,
    avgKeyHold: result.keyHoldSamples ? Math.round(result.keyHoldTotalMs / result.keyHoldSamples) : 0,
  }
}

function finishTypingTest() {
  if (typingFinished) return
  typingFinished = true
  stopTypingTimer()
  typingRemaining = Math.max(0, typingRemaining)
  const input = document.querySelector('#typing-input')
  if (input) input.disabled = true
  const endedAt = new Date()
  const elapsed = Math.max(1, Math.round((Date.now() - (typingStartedAt || Date.now())) / 1000))
  const stats = calculateTypingStats(typingInputValue, elapsed)
  const wordStats = analyzeWords(typingInputValue, typingPassage)
  const result = {
    id: `typing-${Date.now()}`,
    date: endedAt.toLocaleDateString(),
    completedAt: endedAt.toLocaleString(),
    startedAt: typingStartedAt ? new Date(typingStartedAt).toLocaleString() : 'Not started',
    duration: typingDuration,
    elapsedSeconds: elapsed,
    mode: currentSection === 'speed' ? 'Speed Test' : 'Typing Practice',
    exerciseId: String(customPassage ? 'custom-1' : selectedExerciseId),
    exerciseTitle: customPassage ? 'Custom Upload · Exercise 1' : (practiceExerciseData.find((x) => String(x.id) === String(selectedExerciseId))?.title || 'Typing Exercise'),
    wpm: stats.netWpm,
    grossWpm: stats.grossWpm,
    netWpm: stats.netWpm,
    accuracy: stats.accuracy,
    errors: stats.errors,
    correct: stats.correct,
    typed: typingInputValue.length,
    passageLength: typingPassage.length,
    completion: stats.completion,
    errorRate: stats.errorRate,
    correctWords: wordStats.correctWords,
    incorrectWords: wordStats.incorrectWords,
    totalWords: wordStats.totalWords,
    backspaces: typingBackspaces,
    immediateBackspaces: typingImmediateBackspaces,
    delayedBackspaces: typingDelayedBackspaces,
    deletePresses: typingDeletePresses,
    keystrokes: typingKeystrokes,
    shiftCapsPresses: typingShiftCapsPresses,
    pauseCount: typingPauseCount,
    longestPauseMs: typingLongestPauseMs,
    keyHoldTotalMs: typingKeyHoldTotalMs,
    keyHoldSamples: typingKeyHoldSamples,
    ikiTotalMs: typingIkiTotalMs,
    ikiCount: typingIkiCount,
    speedSamples: [...typingSpeedSamples],
    language: selectedPracticeLanguage === 'hi' ? 'Hindi' : 'English',
    userName: userProfile?.name || 'Guest',
    rollNumber: userProfile?.rollNumber || 'Not provided',
    exam: userProfile?.exam || (currentSection === 'exams' || currentSection === 'rules' ? selectedExam : 'General Practice'),
    device: navigator.userAgentData?.platform || navigator.platform || 'Unknown device',
    keyboardLayout: 'Browser keyboard input, physical layout not detectable',
    typingMode: practiceOptions.backspace ? 'Correction allowed' : 'Strict, no backspace',
    speedMethod: typingWpmMethod === 'words' ? 'Space-separated words' : 'Standard, 5 characters per word',
    targetWpm: typingTargetWpm,
    passage: typingPassage,
    typedText: typingInputValue,
  }
  const priorExerciseHistory = getTypingHistory().filter((item) => String(item.exerciseId || '') === String(result.exerciseId))
  result.attemptNumber = priorExerciseHistory.length + 1
  result.personalBestBefore = priorExerciseHistory.length ? Math.max(...priorExerciseHistory.map((item) => Number(item.netWpm ?? item.wpm ?? 0))) : 0
  result.averageWpmBefore = priorExerciseHistory.length ? Math.round(priorExerciseHistory.reduce((sum, item) => sum + Number(item.netWpm ?? item.wpm ?? 0), 0) / priorExerciseHistory.length) : 0
  const previousAttempt = getLastExerciseAttempt(result.exerciseId)
  result.previousAttempt = previousAttempt ? { netWpm: previousAttempt.netWpm ?? previousAttempt.wpm ?? 0, grossWpm: previousAttempt.grossWpm ?? previousAttempt.wpm ?? 0, accuracy: previousAttempt.accuracy ?? 0, errors: previousAttempt.errors ?? 0 } : null
  saveTypingResult(result)
  if (currentSection === 'practice' && typingInputValue.length >= typingPassage.length) setExerciseCompleted(result.exerciseId)
  const resultBox = document.querySelector('#typing-result')
  if (resultBox) { resultBox.hidden = true; resultBox.innerHTML = '' }
  try { showTypingReportPopup(result, stats) }
  catch (error) {
    console.error('Could not render the full typing report:', error)
    document.querySelector('#typing-report-modal')?.remove()
    const fallback = document.createElement('div')
    fallback.id = 'typing-report-modal'
    fallback.className = 'typing-report-modal'
    fallback.innerHTML = `<section class="typing-report-dialog" role="dialog" aria-modal="true"><header class="typing-report-modal-header"><h2>Typing test report</h2><button class="secondary-button" type="button" id="typing-fallback-close">Close</button></header><div class="typing-result report-watermark"><h3>${stats.netWpm} Net WPM</h3><p>Gross WPM: ${stats.grossWpm} · Accuracy: ${stats.accuracy}% · Errors: ${stats.errors}</p><p>Your result was saved when browser storage was available. The detailed report could not be rendered, please try again.</p><button class="primary-button" type="button" id="typing-fallback-print">Print / Save PDF</button><button class="secondary-button" type="button" id="typing-fallback-practice">Practice exercises</button></div></section>`
    document.body.appendChild(fallback)
    fallback.querySelector('#typing-fallback-close')?.addEventListener('click', () => fallback.remove())
    fallback.querySelector('#typing-fallback-print')?.addEventListener('click', () => window.print())
    fallback.querySelector('#typing-fallback-practice')?.addEventListener('click', () => { fallback.remove(); document.querySelector('#typing-fullscreen')?.remove(); document.querySelector('.practice-exercise-sidebar')?.classList.remove('is-hidden-during-test'); renderSection('practice') })
  }
  const status = document.querySelector('#typing-status')
  if (status) status.textContent = 'Test complete. Your detailed report is saved in My Performance.'
}

function showTypingReportPopup(result, stats) {
  document.querySelector('#typing-report-modal')?.remove()
  const overlay = document.createElement('div')
  overlay.id = 'typing-report-modal'
  overlay.className = 'typing-report-modal'
  overlay.innerHTML = `<section class="typing-report-dialog" role="dialog" aria-modal="true" aria-label="Typing test report"><header class="typing-report-modal-header"><div><span class="eyebrow">AG TYPING TUTOR BY XTREME AG APPS</span><h2>Typing test report</h2></div><div class="typing-report-toolbar"><button type="button" class="primary-button" id="typing-print"><span aria-hidden="true">▣</span> Print / Save PDF</button><button type="button" class="secondary-button" id="typing-export-csv">Export CSV</button><button type="button" class="secondary-button" id="typing-report-retry">↻ Retry this exercise</button><button type="button" class="secondary-button" id="typing-report-practice">⌂ Practice exercises</button><button type="button" class="secondary-button" id="typing-report-close">Return to practice</button></div></header><div class="typing-result report-watermark">${buildDetailedReportHTML(result, stats)}</div></section>`
  document.body.appendChild(overlay)
  const close = () => { overlay.remove(); window.removeEventListener('keydown', onReportEscape); document.querySelector('#typing-fullscreen')?.remove(); document.querySelector('.practice-exercise-sidebar')?.classList.remove('is-hidden-during-test'); renderSection('practice') }
  overlay.querySelector('#typing-report-close')?.addEventListener('click', close)
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close() })
  overlay.querySelector('#typing-print')?.addEventListener('click', () => { document.body.classList.add('printing-typing-report'); window.print() })
  overlay.querySelector('#typing-export-csv')?.addEventListener('click', () => { const extra = getTypingExtraMetrics(result, stats); const rows = [['Metric','Value'],['Report ID',result.id],['Candidate',result.userName],['Roll number',result.rollNumber],['Date/time',result.completedAt],['Exam',result.exam],['Language',result.language],['Test mode',result.typingMode],['Speed method',result.speedMethod],['Net WPM, 5-char',stats.netWpm],['Gross WPM, 5-char',stats.grossWpm],['Net WPM, word-based',extra.wordBasedNet],['Gross WPM, word-based',extra.wordBasedGross],['Accuracy',`${stats.accuracy}%`],['Completion',`${stats.completion}%`],['Errors',stats.errors],['Untyped words',Math.max(0,(result.totalWords||0)-(result.correctWords||0)-(result.incorrectWords||0))],['CPM',extra.cpM],['KSPM',extra.kspm],['KPH estimate',extra.kph],['Adjusted WPM',extra.adjustedWpm],['Keystrokes',extra.keyCount],['Backspaces',result.backspaces],['Delete presses',result.deletePresses],['KSPC',extra.kspc],['MSD, typed portion',extra.msd],['Consistency score',extra.consistency],['Pause count',result.pauseCount],['Longest pause ms',result.longestPauseMs]]; const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n'); const blob = new Blob([csv],{type:'text/csv;charset=utf-8'}); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download=`AG-Typing-Report-${result.id}.csv`; link.click(); URL.revokeObjectURL(url) })
  window.addEventListener('afterprint', () => document.body.classList.remove('printing-typing-report'), { once: true })
  const onReportEscape = (event) => { if (event.key === 'Escape' && document.querySelector('#typing-report-modal')) close() }
  window.addEventListener('keydown', onReportEscape)
  overlay.querySelector('#typing-report-retry')?.addEventListener('click', async () => { overlay.remove(); await startTypingTest() })
  overlay.querySelector('#typing-report-practice')?.addEventListener('click', close)
  attachTypingReviewPractice()
  overlay.querySelector('#typing-review-words')?.addEventListener('click', () => overlay.querySelector('#typing-error-practice')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}

function buildDetailedReportHTML(result, stats) {
  const safe = escapeHtml
  const typedText = String(result.typedText || '')
  const passageText = String(result.passage || '')
  return `
    <div class="report-heading">
      <div><span class="eyebrow">AG TYPING TUTOR · RESULT REPORT</span><h3>Typing test report</h3><p>${safe(result.completedAt)} · ${safe(result.mode)}</p></div>
      <span class="performance-band" style="color:${getPerformanceBand(stats.netWpm).color}">${safe(getPerformanceBand(stats.netWpm).label)}</span>
    </div>
    <div class="result-metrics report-metrics">
      <span><strong>${stats.netWpm}</strong>Net WPM</span>
      <span><strong>${stats.grossWpm}</strong>Gross WPM</span>
      <span><strong>${stats.accuracy}%</strong>Accuracy</span>
      <span><strong>${stats.errors}</strong>Errors</span>
    </div>
    <div class="report-detail-grid">
      <div><span>Test duration</span><strong>${result.duration} minute(s)</strong></div>
      <div><span>Time used</span><strong>${formatDuration(result.elapsedSeconds)}</strong></div>
      <div><span>Characters typed</span><strong>${stats.typed}</strong></div>
      <div><span>Correct characters</span><strong>${stats.correct}</strong></div>
      <div><span>Full character mistakes</span><strong>${stats.errors}</strong></div><div><span>Half mistakes</span><strong>Exam scoring not configured</strong></div>
      <div><span>Correct words</span><strong>${result.correctWords ?? analyzeWords(result.typedText, result.passage).correctWords}</strong></div>
      <div><span>Incorrect words</span><strong>${result.incorrectWords ?? analyzeWords(result.typedText, result.passage).incorrectWords}</strong></div>
      <div><span>Total passage words</span><strong>${result.totalWords ?? analyzeWords('', result.passage).totalWords}</strong></div>
      <div><span>Completion</span><strong>${stats.completion}%</strong></div><div><span>Attempted words</span><strong>${(result.correctWords || 0) + (result.incorrectWords || 0)}</strong></div><div><span>Untyped words</span><strong>${Math.max(0, (result.totalWords || 0) - (result.correctWords || 0) - (result.incorrectWords || 0))}</strong></div>
      <div><span>Error rate</span><strong>${stats.errorRate}%</strong></div>
      <div><span>Backspaces</span><strong>${result.backspaces}</strong></div>
      <div><span>Exam/category</span><strong>${safe(result.exam)}</strong></div>
      <div><span>Session ID</span><strong>${safe(result.id)}</strong></div>
    </div>
    ${(() => { const m = getTypingExtraMetrics(result, stats); const samples = m ? (result.speedSamples || []) : []; const chart = samples.map((sample) => `<span class="report-chart-bar" title="${sample.second}s, ${sample.netWpm} WPM" style="height:${Math.max(3, Math.min(100, Number(sample.netWpm || 0) * 1.5))}%"><i>${sample.second}s</i></span>`).join(''); const keys = m.keyRows.length ? m.keyRows.map(([key, count]) => `<span class="key-heat-item"><kbd>${safe(key === ' ' ? 'Space' : key)}</kbd><strong>${count}</strong></span>`).join('') : '<span class="helper-text">No character mismatch recorded in the typed section.</span>'; return `<section class="report-section"><h4>Identity and session</h4><div class="report-detail-grid"><div><span>Candidate</span><strong>${safe(result.userName || 'Guest')}</strong></div><div><span>Roll number</span><strong>${safe(result.rollNumber || 'Not provided')}</strong></div><div><span>Exam</span><strong>${safe(result.exam || 'General Practice')}</strong></div><div><span>Language</span><strong>${safe(result.language || 'English')}</strong></div><div><span>Test mode</span><strong>${safe(result.typingMode || 'Correction allowed')}</strong></div><div><span>Speed method</span><strong>${safe(result.speedMethod || 'Standard, 5 characters per word')}</strong></div><div><span>Device</span><strong>${safe(result.device || 'Unknown device')}</strong></div><div><span>Keyboard layout</span><strong>${safe(result.keyboardLayout || 'Not detectable in browser')}</strong></div></div></section><section class="report-section"><h4>Speed analysis</h4><div class="report-detail-grid"><div><span>Standard speed, 5-char</span><strong>${stats.netWpm} WPM</strong></div><div><span>Word-based net speed</span><strong>${m.wordBasedNet} WPM</strong></div><div><span>Word-based gross speed</span><strong>${m.wordBasedGross} WPM</strong></div><div><span>Target speed result</span><strong>${Number(result.targetWpm || 0) > 0 ? (getSelectedNetWpm(stats, result.elapsedSeconds, result.typedText, result.passage) >= Number(result.targetWpm) ? 'PASS' : 'BELOW TARGET') : 'Not set'}</strong></div><div><span>Target speed</span><strong>${Number(result.targetWpm || 0) > 0 ? `${result.targetWpm} WPM` : 'Not set'}</strong></div><div><span>CPM</span><strong>${m.cpM}</strong></div><div><span>KSPM</span><strong>${m.kspm}</strong></div><div><span>KPH / KDPH estimate</span><strong>${m.kph}</strong></div><div><span>Adjusted WPM</span><strong>${m.adjustedWpm}</strong></div><div><span>Fastest sampled 5-sec burst</span><strong>${m.burstWpm} WPM</strong></div><div><span>Consistency score</span><strong>${m.consistency}/100</strong></div><div><span>Median sampled WPM</span><strong>${m.medianWpm}</strong></div><div><span>Lower quartile WPM</span><strong>${m.p25Wpm}</strong></div></div>${Number(result.targetWpm || 0) > 0 ? `<div class="target-progress-wrap"><div><strong>Target goal progress</strong><span>${Math.min(100, Math.round((getSelectedNetWpm(stats, result.elapsedSeconds, result.typedText, result.passage) / Number(result.targetWpm)) * 100))}% of target</span></div><div class="target-progress-track"><span style="width:${Math.min(100, Math.round((getSelectedNetWpm(stats, result.elapsedSeconds, result.typedText, result.passage) / Number(result.targetWpm)) * 100))}%"></span></div></div>` : ''}${chart ? `<div class="report-speed-chart"><span class="report-chart-caption">Sampled speed, each 5 seconds</span><div class="report-chart-bars">${chart}</div></div><div class="report-speed-chart report-accuracy-chart"><span class="report-chart-caption">Accuracy trend, each 5 seconds</span><div class="report-chart-bars">${samples.map((sample) => `<span class="report-chart-bar" title="${sample.second}s, ${sample.accuracy}% accuracy" style="height:${Math.max(3, Math.min(100, Number(sample.accuracy || 0)))}%"><i>${sample.second}s</i></span>`).join('')}</div></div>` : '<p class="helper-text">Speed and accuracy graphs appear after enough typing time has been recorded.</p>'}</section><section class="report-section"><h4>Progress tracking</h4><div class="report-detail-grid"><div><span>Attempt number</span><strong>${result.attemptNumber || 1}</strong></div><div><span>Best previous speed</span><strong>${result.personalBestBefore || 0} WPM</strong></div><div><span>Previous average speed</span><strong>${result.averageWpmBefore || 0} WPM</strong></div><div><span>Change from last attempt</span><strong>${result.previousAttempt ? `${(Number(result.netWpm ?? result.wpm ?? 0) - Number(result.previousAttempt.netWpm ?? result.previousAttempt.wpm ?? 0)) >= 0 ? '+' : ''}${Number(result.netWpm ?? result.wpm ?? 0) - Number(result.previousAttempt.netWpm ?? result.previousAttempt.wpm ?? 0)} WPM` : 'First attempt'}</strong></div></div><p class="helper-text">Percentile and official marks are not shown unless a verified comparison group and the selected exam's exact marking scheme are available.</p></section><section class="report-section"><h4>Keystroke and error analysis</h4><div class="report-detail-grid"><div><span>Total keystrokes</span><strong>${m.keyCount}</strong></div><div><span>Backspace presses</span><strong>${result.backspaces || 0}</strong></div><div><span>Immediate corrections</span><strong>${result.immediateBackspaces || 0}</strong></div><div><span>Delayed corrections</span><strong>${result.delayedBackspaces || 0}</strong></div><div><span>Corrected error rate, estimated</span><strong>${result.typed ? Math.round((Number(result.backspaces || 0) / Math.max(1, result.typed)) * 1000) / 10 : 0}%</strong></div><div><span>Uncorrected error rate</span><strong>${m.errorRate}%</strong></div><div><span>Delete presses</span><strong>${result.deletePresses || 0}</strong></div><div><span>Shift / Caps presses</span><strong>${result.shiftCapsPresses || 0}</strong></div><div><span>KSPC</span><strong>${m.kspc}</strong></div><div><span>Levenshtein distance, typed portion</span><strong>${m.msd}</strong></div><div><span>MSD error rate, typed portion</span><strong>${m.chars ? Math.round((m.msd / m.chars) * 1000) / 10 : 0}%</strong></div><div><span>Transposition pairs detected</span><strong>${m.transpositions}</strong></div><div><span>Pause / hesitation count, over 2 sec</span><strong>${result.pauseCount || 0}</strong></div><div><span>Longest pause</span><strong>${formatDuration(Math.round((result.longestPauseMs || 0)/1000))}</strong></div><div><span>Average inter-key interval</span><strong>${m.avgIki} ms</strong></div><div><span>Average key hold</span><strong>${m.avgKeyHold} ms</strong></div><div><span>Corrected errors</span><strong>${Math.min(Number(result.backspaces || 0), Number(result.keystrokes || 0))} estimated via backspaces</strong></div><div><span>Uncorrected character errors</span><strong>${m.incorrectChars}</strong></div><div><span>Untyped passage characters</span><strong>${Math.max(0, m.targetChars - m.chars)}</strong></div></div><h5>QWERTY key error heatmap</h5><div class="keyboard-heatmap">${['qwertyuiop','asdfghjkl','zxcvbnm'].map((row) => `<div class="keyboard-heat-row">${[...row].map((key) => { const count = Number(m.keyErrorMap[key] || 0); const intensity = count ? Math.min(.88, .18 + count * .12) : .05; return `<span class="keyboard-heat-key" title="${key.toUpperCase()}: ${count} position mismatch(es)" style="--heat:${intensity}">${key.toUpperCase()}<small>${count || ''}</small></span>` }).join('')}</div>`).join('')}</div><h5>Most error-prone expected keys</h5><div class="key-heatmap">${keys}</div><div class="report-detail-grid"><div><span>Top row errors</span><strong>${m.rowErrors.top}</strong></div><div><span>Home row errors</span><strong>${m.rowErrors.home}</strong></div><div><span>Bottom row errors</span><strong>${m.rowErrors.bottom}</strong></div><div><span>Other / punctuation errors</span><strong>${m.rowErrors.other}</strong></div></div><h5>Most mistyped words</h5><div class="report-mistake-list">${m.mistypedWords.length ? m.mistypedWords.map((word) => `<span><strong>${safe(word.text)}</strong><span>typed as</span><em>${safe(word.typed)}</em></span>`).join('') : '<span class="helper-text">No fully typed incorrect words were found.</span>'}</div><h5>Common character pairs near errors</h5><div class="key-heatmap">${m.pairRows.length ? m.pairRows.map(([pair,count]) => `<span class="key-heat-item"><kbd>${safe(pair)}</kbd><strong>${count}</strong></span>`).join('') : '<span class="helper-text">No pair errors detected.</span>'}</div><p class="helper-text">Key errors are estimated by comparing typed characters with the passage at matching positions. Physical finger, hand alternation, true typing percentile, and actual keyboard layout cannot be reliably identified without a dedicated keyboard event recorder or a comparison cohort.</p></section>` })()}
    <div class="report-comparison"><h4>Passage review</h4><p class="report-passage">${safe(passageText)}</p><p class="report-typed"><strong>Your typed text:</strong> ${safe(typedText || '(No text entered)')}</p><p class="helper-text">Green = correct typed character, red = wrong typed character, untyped characters are not counted as typing errors. Completion: ${stats.completion}%.</p><div class="character-review">${[...passageText].map((char, i) => { const cls = i >= typedText.length ? 'char-untyped' : typedText[i] === char ? 'char-match' : 'char-mismatch'; const state = i >= typedText.length ? 'untyped' : typedText[i] === char ? 'correct' : 'incorrect'; return `<span class="${cls}" title="Position ${i + 1}: ${state}, expected ${safe(char)}, typed ${safe(typedText[i] || 'nothing')}">${safe(char === ' ' ? '·' : char)}</span>` }).join('')}</div></div>
    <div class="report-actions screen-only"><button class="secondary-button" id="typing-result-print" type="button">Print / Save PDF</button><button class="secondary-button" id="typing-review-words" type="button">Practise error words (10×)</button></div>
    ${result.previousAttempt ? `<section class="attempt-comparison"><h4>Compared with your last attempt</h4><div><span>Net WPM: ${result.previousAttempt.netWpm} → ${result.netWpm} (${result.netWpm-result.previousAttempt.netWpm>=0?'+':''}${result.netWpm-result.previousAttempt.netWpm})</span><span>Accuracy: ${result.previousAttempt.accuracy}% → ${result.accuracy}%</span><span>Errors: ${result.previousAttempt.errors} → ${result.errors}</span></div></section>` : '<p class="helper-text">This is your first recorded attempt for this exercise. Your next attempt will be compared with it.</p>'}<div id="typing-error-practice" class="typing-error-practice" hidden></div>
    <p class="report-footnote">WPM is based on five characters per word. Net WPM subtracts the uncorrected error rate from gross WPM. Results are stored locally in this browser.</p>
  `
}

function updateTypingStats() {
  const elapsed = typingStartedAt ? Math.max(1, Math.round((Date.now() - typingStartedAt) / 1000)) : 0
  const stats = calculateTypingStats(typingInputValue, elapsed || 1)
  const time = document.querySelector('#typing-time')
  const wpm = document.querySelector('#typing-wpm')
  const accuracy = document.querySelector('#typing-accuracy')
  const errors = document.querySelector('#typing-errors')
  const wordStats = analyzeWords(typingInputValue, typingPassage)
  const timeLabel = `${Math.floor(typingRemaining / 60)}:${String(typingRemaining % 60).padStart(2, '0')}`
  if (time) time.textContent = timeLabel
  const fullscreenTime = document.querySelector('#fullscreen-countdown')
  if (fullscreenTime) fullscreenTime.textContent = timeLabel
  if (wpm) wpm.textContent = String(stats.wpm)
  if (accuracy) accuracy.textContent = `${stats.accuracy}%`
  if (errors) errors.textContent = String(stats.errors)
  const correctWords = document.querySelector('#typing-correct-words')
  const totalWords = document.querySelector('#typing-total-words')
  if (correctWords) correctWords.textContent = String(wordStats.correctWords)
  if (totalWords) totalWords.textContent = String((typingPassage.trim().match(/\S+/g) || []).length)
  const gaugeNet = document.querySelector('#speedometer-net')
  const gaugeGross = document.querySelector('#speedometer-gross')
  const gaugeProgress = document.querySelector('#speedometer-progress')
  const liveNetWpm = getSelectedNetWpm(stats, elapsed || 1)
  if (gaugeNet) gaugeNet.textContent = String(liveNetWpm)
  if (gaugeGross) gaugeGross.textContent = String(stats.grossWpm ?? stats.wpm ?? 0)
  if (gaugeProgress) { const pct = Math.max(0, Math.min(1, liveNetWpm / 60)); const length = 270.2; gaugeProgress.style.strokeDasharray = `${length * pct} ${length}` }
  const needle = document.querySelector('#speedometer-needle'); if (needle) { const net = Math.max(0, Math.min(60, Number(liveNetWpm))); needle.setAttribute('transform', `rotate(${-90 + net * 3} 120 116)`) }
}

async function startTypingTest() {
  stopTypingTimer()
  typingDuration = Number(document.querySelector('[data-minutes].selected')?.dataset.minutes || typingDuration || 1)
  const status = document.querySelector('#typing-status')
  const selectedExercise = practiceExerciseData.find((item) => String(item.id) === String(selectedExerciseId))
  const allAvailable = practiceExerciseData.filter((item) => item.language === selectedPracticeLanguage && (selectedPracticeCategory === 'All topics' || item.category === selectedPracticeCategory))
  const selectedFirst = selectedExercise ? [selectedExercise, ...allAvailable.filter((item) => String(item.id) !== String(selectedExercise.id))] : allAvailable
  if (customPassage) typingPassage = customPassage
  else {
    const parts = []
    let words = 0
    const targetWords = Math.max(850, typingDuration * 35)
    const seenSentences = new Set()
    if (!selectedFirst.length) {
      if (status) status.textContent = 'Exercises are still loading. Please try again shortly.'
      return
    }
    if (status) status.textContent = 'Preparing your exercise…'
    try {
      for (const exercise of selectedFirst) {
        if (words >= targetWords) break
        const passage = await loadPracticeExerciseText(exercise)
        const sentences = passage.split(/(?<=[.!?।])\s+/u)
        const uniqueSentences = sentences.filter((sentence) => {
          const key = sentence.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
          if (!key || seenSentences.has(key)) return false
          seenSentences.add(key)
          return true
        })
        for (const sentence of uniqueSentences) {
          if (words >= targetWords) break
          const remaining = targetWords - words
          const sentenceWords = sentence.trim().split(/\s+/)
          if (!sentence.trim()) continue
          parts.push(sentenceWords.length > remaining ? sentenceWords.slice(0, remaining).join(' ') : sentence.trim())
          words += Math.min(sentenceWords.length, remaining)
        }
      }
    } catch (error) {
      console.error('Failed to prepare typing exercise:', error)
      if (status) status.textContent = `Could not load the selected exercise: ${error.message || error}`
      return
    }
    typingPassage = parts.join(' ')
    if (!typingPassage) {
      if (status) status.textContent = 'The selected exercises did not contain any usable text.'
      return
    }
  }
  typingInputValue = ''
  typingBackspaces = 0
  typingImmediateBackspaces = 0
  typingDelayedBackspaces = 0
  typingDeletePresses = 0
  typingKeystrokes = 0
  typingShiftCapsPresses = 0
  typingLastKeyAt = null
  typingPauseCount = 0
  typingLongestPauseMs = 0
  typingKeyDownAt = new Map()
  typingKeyHoldTotalMs = 0
  typingKeyHoldSamples = 0
  typingIkiTotalMs = 0
  typingIkiCount = 0
  typingSpeedSamples = []
  typingStartedAt = null
  typingRemaining = typingDuration * 60
  typingFinished = false
  const input = document.querySelector('#typing-input')
  const result = document.querySelector('#typing-result')
  if (input) { input.disabled = false; input.value = ''; input.focus() }
  if (result) { result.hidden = true; result.innerHTML = '' }
  if (status) status.textContent = 'Ready. The countdown begins with your first keystroke.'
  renderTypingPassage('')
  updateTypingStats()
  openTypingFullscreen()
}

function attachTypingEngine() {
  const start = document.querySelector('#typing-start')
  const input = document.querySelector('#typing-input')
  if (!start || !input) return
  start.addEventListener('click', startTypingTest)
  document.querySelector('#typing-submit')?.addEventListener('click', () => { if (!typingStartedAt) typingStartedAt = Date.now(); finishTypingTest() })
  input.addEventListener('keydown', (event) => {
    if (event.repeat || typingFinished) return
    const now = Date.now()
    const previousKeyAt = typingLastKeyAt
    const isTimingKey = event.key.length === 1 || ['Space', 'Enter', 'Backspace', 'Delete'].includes(event.key)
    if (typingLastKeyAt !== null && isTimingKey) {
      const gap = now - typingLastKeyAt
      typingIkiTotalMs += gap
      typingIkiCount += 1
      if (gap > 2000) { typingPauseCount += 1; typingLongestPauseMs = Math.max(typingLongestPauseMs, gap) }
    }
    if (isTimingKey) typingLastKeyAt = now
    if (event.key === 'Shift' || event.key === 'CapsLock') { typingShiftCapsPresses += 1; typingKeystrokes += 1 }
    else if (event.key.length === 1 || ['Backspace', 'Delete', 'Enter', 'Tab'].includes(event.key)) typingKeystrokes += 1
    typingKeyDownAt.set(event.code || event.key, now)
    if (event.key === 'Backspace') { if (!practiceOptions.backspace || input.dataset.noBackspace === 'true') event.preventDefault(); else { typingBackspaces += 1; if (previousKeyAt !== null && now - previousKeyAt <= 1500) typingImmediateBackspaces += 1; else typingDelayedBackspaces += 1 }; return }
    if (event.key === 'Delete') typingDeletePresses += 1
    if (event.code === 'Space' || event.key === ' ') {
      if (typingFinished || !typingPassage) return
      const currentValue = input.value
      const caret = input.selectionStart ?? currentValue.length
      if (caret !== currentValue.length) return
      const typedStart = currentValue.lastIndexOf(' ') + 1
      const typedWord = currentValue.slice(typedStart)
      const targetWordMatch = typingPassage.slice(typedStart).match(/^([^\s]+)/)
      if (targetWordMatch && typedWord.length > 0 && targetWordMatch[1].toLowerCase() !== typedWord.toLowerCase()) return
    }
  })
  input.addEventListener('keyup', (event) => {
    const key = event.code || event.key
    const started = typingKeyDownAt.get(key)
    if (started) { typingKeyHoldTotalMs += Math.max(0, Date.now() - started); typingKeyHoldSamples += 1; typingKeyDownAt.delete(key) }
  })
  input.addEventListener('input', () => {
    if (typingFinished || !typingPassage) return
    typingInputValue = input.value.slice(0, typingPassage.length)
    if (!typingStartedAt && typingInputValue.length) {
      typingStartedAt = Date.now()
      typingTimer = setInterval(() => {
        if (typingFinished) { stopTypingTimer(); return }
        typingRemaining = Math.max(0, typingRemaining - 1)
        const elapsedSeconds = Math.max(1, Math.round((Date.now() - typingStartedAt) / 1000))
        if (elapsedSeconds % 5 === 0 && typingSpeedSamples.at(-1)?.second !== elapsedSeconds) {
          const snap = calculateTypingStats(typingInputValue, elapsedSeconds)
          const previousSample = typingSpeedSamples.at(-1)
          const previousSecond = Number(previousSample?.second || 0)
          const previousChars = Number(previousSample?.chars || 0)
          const intervalSeconds = Math.max(1, elapsedSeconds - previousSecond)
          const intervalChars = Math.max(0, typingInputValue.length - previousChars)
          const intervalWpm = Math.round((intervalChars / 5) * (60 / intervalSeconds))
          typingSpeedSamples.push({ second: elapsedSeconds, chars: typingInputValue.length, netWpm: intervalWpm, accuracy: snap.accuracy })
        }
        updateTypingStats()
        if (typingRemaining <= 0) finishTypingTest()
      }, 1000)
    }
    renderTypingPassage(typingInputValue)
    updateTypingStats()
    if (typingInputValue.length >= typingPassage.length) finishTypingTest()
  })
  const categorySelect = document.querySelector('#practice-category')
  if (categorySelect) categorySelect.addEventListener('change', () => {
    selectedPracticeCategory = categorySelect.value
    customPassage = ''
    const customInput = document.querySelector('#custom-passage')
    if (customInput) customInput.value = ''
    const status = document.querySelector('#practice-upload-status')
    if (status) status.textContent = `Topic selected: ${selectedPracticeCategory}. Press Start Typing Test to load an exercise.`
  })
  const customInput = document.querySelector('#custom-passage')
  const status = document.querySelector('#practice-upload-status')
  const useCustom = () => {
    const value = customInput?.value?.trim() || ''
    if (!value) { if (status) status.textContent = 'Paste some text first, or choose a supported file.'; return }
    customPassage = value.replace(/\s+/g, ' ').trim()
    selectedExerciseId = 'custom-1'
    const sidebar = document.querySelector('.practice-exercise-sidebar')
    if (sidebar) { sidebar.outerHTML = renderPracticeSidebar(); attachPracticeSidebar() }
    if (status) status.textContent = `Your custom passage is ready (${customPassage.length} characters). Press Start Typing Test.`
  }
  document.querySelector('#use-custom-passage')?.addEventListener('click', useCustom)
  document.querySelector('#clear-custom-passage')?.addEventListener('click', () => {
    customPassage = ''
    if (customInput) customInput.value = ''
    const file = document.querySelector('#practice-file'); if (file) file.value = ''
    if (status) status.textContent = 'Custom passage cleared. Choose a topic from the exercise bank.'
  })
  document.querySelector('#practice-file')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0]; if (!file) return
    try {
      let text = ''
      const ext = file.name.toLowerCase().split('.').pop()
      if (ext === 'txt') text = await file.text()
      else if (ext === 'docx') {
        const mammoth = await import('https://esm.sh/mammoth@1.9.0')
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
        text = result.value || ''
      } else if (ext === 'pdf') {
        const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs')
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
        const pages = []
        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
          const page = await pdf.getPage(pageNo)
          const content = await page.getTextContent()
          pages.push(content.items.map((item) => item.str || '').join(' '))
        }
        text = pages.join('\n\n')
      } else throw new Error('Please choose a TXT, PDF, or DOCX file.')
      if (!text.trim()) throw new Error('No selectable text found. Scanned/image-only PDFs need OCR; try copying text into the box instead.')
      if (customInput) customInput.value = text.trim()
      customPassage = text.replace(/\s+/g, ' ').trim()
      selectedExerciseId = 'custom-1'
      const sidebar = document.querySelector('.practice-exercise-sidebar')
      if (sidebar) { sidebar.outerHTML = renderPracticeSidebar(); attachPracticeSidebar() }
      if (status) status.textContent = `Loaded ${file.name} (${customPassage.length} characters). Press Start Typing Test.`
    } catch (error) { if (status) status.textContent = `Could not read file: ${error.message || error}. You can paste its text instead.` }
  })
  document.querySelectorAll('[data-minutes]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-minutes]').forEach((item) => item.classList.remove('selected'))
    button.classList.add('selected')
    typingDuration = Number(button.dataset.minutes)
    const status = document.querySelector('#typing-status')
    if (status) status.textContent = `${typingDuration}-minute test selected. Press Start Typing Test to begin.`
    updateTypingStats()
  }))
}

function renderOnboarding() {
  const isHi = appLanguage === 'hi'
  app.innerHTML = `
    <main class="onboarding-shell" lang="${isHi ? 'hi' : 'en'}">
      <section class="onboarding-card">
        <div class="onboarding-brand"><span class="brand-logo">AG</span><div><strong>AG Typing Tutor</strong><small>by Xtreme AG Apps</small></div></div>
        <div class="onboarding-language"><button type="button" data-onboarding-language="en" class="${!isHi ? 'active' : ''}">English</button><button type="button" data-onboarding-language="hi" class="${isHi ? 'active' : ''}">हिन्दी</button></div>
        <span class="eyebrow">${isHi ? 'आपकी व्यक्तिगत टाइपिंग प्रोफ़ाइल' : 'YOUR PERSONAL TYPING PROFILE'}</span>
        <h1>${isHi ? 'अपनी प्रोफ़ाइल बनाएँ' : 'Create your profile'}</h1>
        <p class="onboarding-intro">${isHi ? 'अपना नाम, मोबाइल नंबर और परीक्षा चुनें। इंटरनेट न होने पर भी आपकी जानकारी इस डिवाइस पर सुरक्षित रहेगी।' : 'Add your name, mobile number and target exam. If you are offline, your profile will be saved securely on this device and queued for sync.'}</p>
        <form id="onboarding-form" novalidate>
          <label for="profile-name">${isHi ? 'पूरा नाम' : 'Full name'}</label>
          <input id="profile-name" name="name" autocomplete="name" required maxlength="100" placeholder="${isHi ? 'अपना नाम लिखें' : 'Enter your name'}" />
          <label for="profile-mobile">${isHi ? 'मोबाइल नंबर' : 'Mobile number'}</label>
          <input id="profile-mobile" name="mobile" type="tel" inputmode="numeric" autocomplete="tel" required maxlength="18" placeholder="${isHi ? 'मोबाइल नंबर' : 'Mobile number'}" />
          <label for="profile-exam">${isHi ? 'आप किस परीक्षा की तैयारी कर रहे हैं?' : 'Which exam are you preparing for?'}</label>
          <select id="profile-exam" name="exam" required>
            <option value="">${isHi ? 'परीक्षा चुनें' : 'Select an exam'}</option>
            <option>RSSB LDC</option><option>Rajasthan High Court LDC</option><option>RRB</option><option>SSC</option><option>DSSSB</option><option>KVS / NVS</option><option>EMRS</option><option>Banking</option><option value="Other">${isHi ? 'अन्य (Other)' : 'Other'}</option>
          </select>
          <div id="other-exam-wrap" hidden><label for="profile-other-exam">${isHi ? 'परीक्षा का नाम' : 'Exam name'}</label><input id="profile-other-exam" name="otherExam" maxlength="120" placeholder="${isHi ? 'परीक्षा का नाम लिखें' : 'Enter exam name'}" /></div>
          <p class="onboarding-error" id="onboarding-error" role="alert"></p>
          <button class="primary-button onboarding-submit" type="submit">${isHi ? 'प्रोफ़ाइल बनाएँ और आगे बढ़ें' : 'Create profile & continue'} <span>→</span></button>
        </form>
        <div class="offline-note"><span>●</span><div><strong>${isHi ? 'ऑफ़लाइन-फर्स्ट' : 'Offline-first'}</strong><p>${isHi ? 'इंटरनेट न होने पर प्रोफ़ाइल pending रहेगी। Sync के लिए इंटरनेट और सुरक्षित server setup आवश्यक है।' : 'No internet? Your profile stays queued locally. A secure sync service is required to deliver it to your email.'}</p></div></div>
        <p class="privacy-note">${isHi ? 'आपकी जानकारी केवल प्रोफ़ाइल और sync के उद्देश्य से ली जाती है।' : 'Your details are used for your profile and sync only.'}</p>
      </section>
    </main>`
  document.querySelectorAll('[data-onboarding-language]').forEach((button) => button.addEventListener('click', () => { appLanguage = button.dataset.onboardingLanguage; localStorage.setItem('ag-language', appLanguage); renderOnboarding() }))
  const examSelect = document.querySelector('#profile-exam')
  examSelect.addEventListener('change', () => { const show = examSelect.value === 'Other'; document.querySelector('#other-exam-wrap').hidden = !show; document.querySelector('#profile-other-exam').required = show })
  document.querySelector('#onboarding-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const name = document.querySelector('#profile-name').value.trim()
    const mobile = document.querySelector('#profile-mobile').value.replace(/[\s()-]/g, '')
    const exam = examSelect.value === 'Other' ? document.querySelector('#profile-other-exam').value.trim() : examSelect.value
    const error = document.querySelector('#onboarding-error')
    if (!name || !/^[+0-9]{10,15}$/.test(mobile) || !exam) { error.textContent = isHi ? 'कृपया नाम, सही मोबाइल नंबर और परीक्षा भरें।' : 'Please enter your name, a valid mobile number and exam.'; return }
    const profile = { id: (globalThis.crypto?.randomUUID?.() || `ag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`), name, mobile, exam, language: appLanguage, createdAt: new Date().toISOString(), syncStatus: 'pending' }
    localStorage.setItem('ag-user-profile', JSON.stringify(profile))
    const queue = (() => { try { return JSON.parse(localStorage.getItem('ag-profile-sync-queue') || '[]') } catch { return [] } })()
    if (!queue.some((item) => item.id === profile.id)) queue.push(profile)
    localStorage.setItem('ag-profile-sync-queue', JSON.stringify(queue))
    userProfile = profile
    renderHome()
  })
}

function setAppLanguage(language) {
  appLanguage = language === 'hi' ? 'hi' : 'en'
  localStorage.setItem('ag-language', appLanguage)
  if (currentSection === 'home') renderHome()
  else renderSection(currentSection)
}

function renderHome() {
  if (!userProfile) { renderOnboarding(); return }
  const isHi = appLanguage === 'hi'
  app.innerHTML = `
    <div class="app-layout home-screen">
      <aside class="sidebar">
        <a class="brand" href="#" data-page="home">
          <span class="brand-logo">AG</span>
          <span class="brand-text">
            <strong>AG Typing Tutor</strong>
            <small>by Xtreme AG Apps</small>
          </span>
        </a>

        <div class="sidebar-heading">MAIN MENU</div>

        <nav class="navigation">
          ${sections
            .map(
              (item) => `
                <button class="nav-button ${
                  currentSection === item.id ? 'active' : ''
                }" data-page="${item.id}">
                  <span>${item.icon}</span>
                  ${item.title}
                </button>
              `,
            )
            .join('')}
        </nav>

        <div class="sidebar-bottom sidebar-profile-bottom">
          <button type="button" class="sidebar-profile-button" data-page="profile" aria-label="Open user profile">
            <span class="profile-avatar">${escapeHtml((userProfile?.name || 'U').trim().charAt(0).toUpperCase())}</span>
            <span class="sidebar-profile-copy"><strong>${escapeHtml(userProfile?.name || 'My Profile')}</strong><small>${isHi ? 'प्रोफ़ाइल और रिपोर्ट' : 'Profile & reports'}</small></span>
            <span class="profile-chevron">›</span>
          </button>
        </div>
      </aside>

      <main class="main-area">
        <header class="topbar">
          <div>
            <span class="eyebrow">YOUR PERSONAL TYPING STUDIO</span>
            <h1>${isHi ? `AG Typing Tutor में आपका स्वागत है, ${escapeHtml(userProfile.name)}` : `Welcome to AG Typing Tutor, ${escapeHtml(userProfile.name)}`}</h1>
          </div>
          <div class="topbar-actions"><button class="language-switch ${!isHi ? 'active' : ''}" type="button" data-app-language="en">English</button><button class="language-switch ${isHi ? 'active' : ''}" type="button" data-app-language="hi">हिन्दी</button>${themeButton()}<a class="support-button" href="https://wa.me/7878025556" target="_blank" rel="noreferrer">WhatsApp Support · 7878025556</a><span class="edition-badge">${isHi ? 'हिन्दी संस्करण' : 'ENGLISH EDITION'}</span></div>
        </header>

        <section class="hero">
          <div class="hero-content">
            <span class="hero-label">LEARN · PRACTISE · IMPROVE</span>
            <h2>${isHi ? 'बेहतर टाइपिंग की<br />शुरुआत यहाँ से करें।' : 'Your journey to<br />better typing starts here.'}</h2>
            <p>
              ${isHi ? 'आत्मविश्वास बढ़ाएँ, सटीकता सुधारें और हर पाठ के साथ अपनी टाइपिंग गति बेहतर करें।' : 'Build confidence, improve accuracy and develop your typing speed, one lesson at a time.'}
            </p>
            <button class="primary-button" data-page="learn">
              ${isHi ? 'सीखना शुरू करें' : 'Start Learning'} <span>→</span>
            </button>
          </div>

          <div class="hero-art" aria-hidden="true">
            <div class="art-orbit orbit-one"></div>
            <div class="art-orbit orbit-two"></div>
            <div class="keyboard-card">
              <div class="keyboard-top">
                <span></span><span></span><span></span>
              </div>
              <div class="keyboard-keys">
                ${'QWERTYUIOPASDFGHJKLZXCVBNM'
                  .split('')
                  .map((letter, index) => `
                    <span class="${index % 7 === 0 ? 'key-highlight' : ''}">
                      ${letter}
                    </span>
                  `)
                  .join('')}
              </div>
              <div class="space-key"></div>
            </div>
            <div class="floating-badge">⌨ Type smarter</div>
          </div>
        </section>

        <section class="section-block exam-tile-section">
          <div class="section-title"><div><span class="eyebrow">${isHi ? 'परीक्षा के अनुसार तैयारी' : 'PREPARE FOR YOUR EXAM'}</span><h2>${isHi ? 'अपनी परीक्षा चुनें' : 'Choose your exam'}</h2><p>${isHi ? 'ये परीक्षा विकल्प हिन्दी और English दोनों में हमेशा उपलब्ध रहेंगे।' : 'Exam tiles stay available in both English and Hindi.'}</p></div></div>
          <div class="exam-tile-grid">${[
            ['RSSB LDC','⌨️'],['Rajasthan High Court LDC','⚖️'],['RRB','🚆'],['SSC','🎯'],['DSSSB','🏫'],['KVS / NVS','📚'],['EMRS','🏫'],['Banking','🏦'],['Other Exams','＋']
          ].map(([name,icon])=>`<button type="button" class="exam-tile" data-exam-tile="${escapeHtml(name)}"><span>${icon}</span><strong>${escapeHtml(name)}</strong><small>${isHi ? 'परीक्षा विकल्प देखें' : 'Explore exam options'} →</small></button>`).join('')}</div>
        </section>

        <section class="section-block">
          <div class="section-title">
            <div>
              <span class="eyebrow">YOUR WORKSPACE</span>
              <h2>What would you like to do?</h2>
              <p>Choose an activity to get started.</p>
            </div>
          </div>

          <div class="feature-grid">
            ${sections
              .map(
                (item) => `
                  <button class="feature-card" data-page="${item.id}">
                    <span class="feature-icon icon-${item.id}">
                      ${item.icon}
                    </span>
                    <span class="feature-title">${item.title}</span>
                    <span class="feature-description">
                      ${item.description}
                    </span>
                    <span class="feature-link">
                      ${item.label} <span>→</span>
                    </span>
                  </button>
                `,
              )
              .join('')}
          </div>
        </section>

        <footer class="app-footer">
          <span>AG Typing Tutor</span>
          <span>A product by Xtreme AG Apps</span>
        </footer>
      </main>
    </div>
  `

  attachNavigation()
  attachThemeToggle()
  document.querySelectorAll('[data-app-language]').forEach((button) => button.addEventListener('click', () => setAppLanguage(button.dataset.appLanguage)))
  document.querySelectorAll('[data-exam-tile]').forEach((button) => button.addEventListener('click', () => {
    selectedExam = button.dataset.examTile
    if (selectedExam === 'RSSB LDC') {
      openRssbLdcEntryPopup()
      return
    }
    if (selectedExam === 'Other Exams') { renderSection('exams'); return }
    renderSection('exams')
    const select = document.querySelector('#exam-select')
    if (select) { const option = [...select.options].find((item) => item.value === selectedExam || item.textContent === selectedExam); if (option) select.value = option.value; select.dispatchEvent(new Event('change')) }
  }))
}

function renderPracticeSidebar() {
  const done = new Set(getCompletedExercises().map(String))
  const attempted = new Set(getAttemptedExercises())
  const custom = customPassage ? [{ id: 'custom-1', title: 'Exercise 1 · My Custom Exercise', category: 'Custom Upload', text: customPassage, language: selectedPracticeLanguage }] : []
  const languageExercises = practiceExerciseData.filter((item) => item.language === selectedPracticeLanguage)
  const all = [...custom, ...languageExercises]
  return `<aside class="practice-exercise-sidebar">
    <button class="practice-back-home" id="practice-back-home" type="button">← Back to Home</button>
    <button class="practice-custom-top" id="practice-custom-top" type="button">＋ Custom Upload</button>
    <div class="practice-language-badge">${selectedPracticeLanguage === 'hi' ? 'हिन्दी अभ्यास' : 'English Practice'}</div>
    <div class="practice-sidebar-heading">EXERCISES <span>${languageExercises.filter((item) => done.has(String(item.id))).length}/300 complete</span></div>
    <div class="practice-exercise-list">
      ${all.map((ex, i) => `<button type="button" class="practice-exercise-item ${String(ex.id) === String(selectedExerciseId) ? 'active' : ''} ${done.has(String(ex.id)) ? 'completed' : ''} ${attempted.has(String(ex.id)) ? 'attempted' : ''}" data-exercise-id="${escapeHtml(String(ex.id))}">
        <span class="exercise-number">${i + 1}</span><span class="exercise-title">${escapeHtml(ex.title || `Exercise ${i + 1}`)}<small>${escapeHtml(ex.category || 'Custom Upload')}</small></span><span class="exercise-state">${done.has(String(ex.id)) ? '✓ Done' : attempted.has(String(ex.id)) ? '↻ Tried' : '○'}</span>
      </button>`).join('')}
    </div>
  </aside>`
}

function attachPracticeSidebar() {
  document.querySelector('#practice-back-home')?.addEventListener('click', () => renderSection('home'))
  document.querySelectorAll('[data-exercise-id]').forEach((button) => button.addEventListener('click', () => {
    selectedExerciseId = button.dataset.exerciseId
    customPassage = selectedExerciseId === 'custom-1' ? customPassage : ''
    renderSection('practice')
  }))
  document.querySelector('#practice-custom-top')?.addEventListener('click', () => {
    const panel = document.querySelector('#custom-upload-panel')
    if (panel) panel.classList.toggle('custom-upload-open')
    if (panel?.classList.contains('custom-upload-open')) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' })
      document.querySelector('#custom-passage')?.focus()
    }
  })
  document.querySelectorAll('[data-practice-option]').forEach((box) => box.addEventListener('change', () => {
    practiceOptions[box.dataset.practiceOption] = box.checked
    document.querySelector('#typing-workspace')?.classList.toggle(`hide-${box.dataset.practiceOption}`, !box.checked)
    document.querySelector('#typing-passage')?.classList.toggle('disable-text-highlight', !practiceOptions.textHighlight)
    document.querySelector('#typing-passage')?.classList.toggle('disable-word-highlight', !practiceOptions.wordHighlight)
    renderTypingPassage(typingInputValue)
  }))
}

function openTypingFullscreen() {
  const stats = document.querySelector('.typing-stats')
  const legend = document.querySelector('.word-legend')
  const card = document.querySelector('.typing-test-card')
  if (!stats || !card || document.querySelector('#typing-fullscreen')) return
  const modal = document.createElement('div')
  modal.id = 'typing-fullscreen'
  modal.className = 'typing-fullscreen'
  modal.innerHTML = `<header class="typing-fullscreen-header"><div class="fullscreen-brand"><strong>AG Typing Tutor</strong><span id="fullscreen-exercise-title">${escapeHtml(customPassage ? 'Custom Upload · Exercise 1' : (practiceExerciseData.find(x => String(x.id) === String(selectedExerciseId))?.title || 'Typing Exercise'))}</span></div>
    <div class="fullscreen-options">
      <label><input type="checkbox" data-practice-option="backspace" ${practiceOptions.backspace ? 'checked' : ''}> Allow Backspace</label>
      <label><input type="checkbox" data-practice-option="textHighlight" ${practiceOptions.textHighlight ? 'checked' : ''}> Text highlight</label>
      <label><input type="checkbox" data-practice-option="wordHighlight" ${practiceOptions.wordHighlight ? 'checked' : ''}> Word highlight</label>
      <label><input type="checkbox" data-practice-option="wpm" ${practiceOptions.wpm ? 'checked' : ''}> WPM meter</label>
      <label><input type="checkbox" data-practice-option="wordMeter" ${practiceOptions.wordMeter ? 'checked' : ''}> Word meter</label>
            <label><input type="checkbox" data-practice-option="speedometer" ${practiceOptions.speedometer ? 'checked' : ''}> Speedometer</label>
      <div class="typing-font-controls" role="group" aria-label="Passage font size"><span>Text size</span><button type="button" id="typing-font-decrease" aria-label="Decrease passage font size">A−</button><button type="button" id="typing-font-increase" aria-label="Increase passage font size">A+</button></div><label class="typing-method-control"><span>WPM method</span><select id="typing-wpm-method"><option value="standard" ${typingWpmMethod === 'standard' ? 'selected' : ''}>5-char standard</option><option value="words" ${typingWpmMethod === 'words' ? 'selected' : ''}>Word-based</option></select></label><label class="typing-target-control"><span>Target WPM</span><input id="typing-target-wpm" type="number" min="0" max="250" step="1" value="${typingTargetWpm}" aria-label="Target typing speed"></label><strong class="fullscreen-countdown" id="fullscreen-countdown">${Math.floor(typingRemaining / 60)}:${String(typingRemaining % 60).padStart(2, '0')}</strong></div></header>
      <main class="typing-fullscreen-main"><section class="typing-fullscreen-workarea"><div class="typing-fullscreen-dashboard"><div class="typing-main-column"><div id="typing-fullscreen-passage"></div><div id="typing-fullscreen-card"></div></div><aside class="typing-right-panel"><h3>Live performance</h3><div class="speedometer-card"><svg class="speedometer-svg" viewBox="0 0 220 135" role="img" aria-label="Live net typing speed"><path class="speedometer-track" d="M 34 116 A 86 86 0 0 1 206 116"/><path id="speedometer-progress" class="speedometer-progress" d="M 34 116 A 86 86 0 0 1 206 116"/><g class="speedometer-ticks"><text x="27" y="119">0</text><text x="43" y="77">10</text><text x="72" y="43">20</text><text x="120" y="29">30</text><text x="168" y="43">40</text><text x="197" y="77">50</text><text x="213" y="119">60+</text></g><g id="speedometer-needle" class="speedometer-needle"><line x1="120" y1="116" x2="120" y2="51"/><circle cx="120" cy="116" r="6"/></g><text id="speedometer-net" x="120" y="94" text-anchor="middle">0</text><text x="120" y="111" text-anchor="middle" class="speedometer-unit">NET WPM</text></svg><div class="speedometer-sub">Gross <strong id="speedometer-gross">0</strong> WPM</div><button type="button" class="secondary-button speedometer-toggle" id="speedometer-toggle">Hide speedometer</button></div><div id="typing-fullscreen-stats"></div><div id="typing-fullscreen-legend"></div></aside></div></section></main>`
  document.body.appendChild(modal)
  let passageFontSize = 17
  const applyPassageFontSize = () => { const passage = modal.querySelector('#typing-passage'); if (passage) passage.style.fontSize = `${passageFontSize}px` }
  modal.querySelector('#typing-font-decrease')?.addEventListener('click', () => { passageFontSize = Math.max(13, passageFontSize - 1); applyPassageFontSize() })
  modal.querySelector('#typing-font-increase')?.addEventListener('click', () => { passageFontSize = Math.min(30, passageFontSize + 1); applyPassageFontSize() })
  document.querySelector('.practice-exercise-sidebar')?.classList.add('is-hidden-during-test')
  document.querySelector('#typing-fullscreen-passage').appendChild(document.querySelector('#typing-passage'))
  document.querySelector('#typing-fullscreen-stats').appendChild(stats)
  if (legend) document.querySelector('#typing-fullscreen-legend').appendChild(legend)
  document.querySelector('#typing-fullscreen-card').appendChild(card)
  modal.querySelector('#typing-wpm-method')?.addEventListener('change', (event) => { typingWpmMethod = event.target.value === 'words' ? 'words' : 'standard'; localStorage.setItem('ag-typing-wpm-method', typingWpmMethod); updateTypingStats() })
  modal.querySelector('#typing-target-wpm')?.addEventListener('change', (event) => { typingTargetWpm = Math.max(0, Math.min(250, Number(event.target.value || 0))); event.target.value = String(typingTargetWpm); localStorage.setItem('ag-typing-target-wpm', String(typingTargetWpm)) })
  modal.querySelectorAll('[data-practice-option]').forEach((box) => box.addEventListener('change', () => {
    practiceOptions[box.dataset.practiceOption] = box.checked
    const passage = document.querySelector('#typing-passage')
    passage?.classList.toggle('disable-text-highlight', !practiceOptions.textHighlight)
    passage?.classList.toggle('disable-word-highlight', !practiceOptions.wordHighlight)
    modal.querySelector('.speedometer-card')?.classList.toggle('option-hidden', !practiceOptions.speedometer)
  modal.querySelector('.typing-stats')?.classList.toggle('hide-wpm', !practiceOptions.wpm)
    modal.querySelector('.typing-stats')?.classList.toggle('hide-word-stat', !practiceOptions.wordMeter)
    (() => { const input = document.querySelector('#typing-input'); if (input) input.dataset.noBackspace = String(!practiceOptions.backspace) })()
  }))
  modal.querySelector('.typing-stats')?.classList.toggle('hide-wpm', !practiceOptions.wpm)
  modal.querySelector('.typing-stats')?.classList.toggle('hide-word-stat', !practiceOptions.wordMeter)
  document.querySelector('#typing-passage')?.classList.toggle('disable-text-highlight', !practiceOptions.textHighlight)
  document.querySelector('#typing-passage')?.classList.toggle('disable-word-highlight', !practiceOptions.wordHighlight)
  modal.querySelector('#speedometer-toggle')?.addEventListener('click', () => { const gauge = modal.querySelector('.speedometer-card'); if (gauge) { gauge.classList.toggle('is-collapsed'); modal.querySelector('#speedometer-toggle').textContent = gauge.classList.contains('is-collapsed') ? 'Show speedometer' : 'Hide speedometer' } })
  attachTypingReviewPractice()
}

function attachTypingReviewPractice() {
  document.querySelector('#typing-review-words')?.addEventListener('click', () => {
    const words = [...new Set((typingPassage.match(/\b[a-zA-Z]{2,}\b/g) || []).filter((word) => {
      const idx = typingPassage.toLowerCase().indexOf(word.toLowerCase())
      return idx >= 0 && typingInputValue.slice(idx, idx + word.length).toLowerCase() !== word.toLowerCase()
    }))]
    reviewWords = words.length ? words : ['practice']
    reviewTarget = Array.from({ length: 10 }, () => reviewWords.join(' ')).join(' ')
    reviewAttempts = 0
    const box = document.querySelector('#typing-error-practice')
    if (box) { box.hidden = false; box.innerHTML = `<h3>Practice your error words</h3><p>Type each word 10 times. You can repeat the drill for 15 rounds if needed.</p><p class="review-word-list">${reviewWords.map(escapeHtml).join(', ')}</p><textarea id="typing-error-input" rows="4" placeholder="Type the repeated words here…"></textarea><button type="button" class="primary-button" id="typing-error-check">Check practice</button><p id="typing-error-feedback"></p>` }
    document.querySelector('#typing-error-check')?.addEventListener('click', () => {
      const typed = document.querySelector('#typing-error-input')?.value.trim() || ''
      const expected = reviewTarget.toLowerCase().split(/\\s+/)
      const actual = typed.toLowerCase().split(/\\s+/)
      const correct = expected.filter((word, i) => actual[i] === word).length
      reviewAttempts++
      const feedback = document.querySelector('#typing-error-feedback')
      if (feedback) feedback.textContent = `Round ${reviewAttempts}/15 · ${correct}/${expected.length} words correct. ${correct === expected.length ? 'Excellent—round complete!' : 'Keep practising, then check again.'}`
      if (correct === expected.length) { reviewTarget = Array.from({ length: 10 }, () => reviewWords.join(' ')).join(' '); document.querySelector('#typing-error-input').value = '' }
    })
  })
}

function renderSection(page) {
  if (page === 'performance' || page === 'settings') page = 'profile'
  if (page === 'practice') { selectedPracticeLanguage = appLanguage === 'hi' ? 'hi' : 'en'; selectedPracticeCategory = 'All topics'; if (!practiceExerciseData.some((item) => String(item.id) === String(selectedExerciseId) && item.language === selectedPracticeLanguage)) selectedExerciseId = practiceExerciseData.find((item) => item.language === selectedPracticeLanguage)?.id || (selectedPracticeLanguage === 'hi' ? 'hi-001' : 'en-001') }
  currentSection = page

  if (page === 'home') {
    renderHome()
    return
  }

  const section = sections.find((item) => item.id === page) || (page === 'profile' ? { id: 'profile', icon: '👤', title: appLanguage === 'hi' ? 'मेरी प्रोफ़ाइल' : 'My Profile', description: appLanguage === 'hi' ? 'आपके टेस्ट रिकॉर्ड, रिपोर्ट और सेटिंग्स।' : 'Your test records, reports and settings.' } : page === 'rssb-ldc-exam' ? { id: 'rssb-ldc-exam', icon: '🏛️', title: 'RSSB LDC Phase-II Exam Hall (80 Mock Tests)', description: 'राजस्थान कर्मचारी चयन बोर्ड लिपिक ग्रेड-II / कनिष्ठ सहायक फेज-II — टंकण गति एवं दक्षता परीक्षण (Exam Hall Simulation)' } : null)

  if (!section) {
    renderHome()
    return
  }

  let content = ''

  if (page === 'learn') {
    content = renderLessons(appLanguage)
  } else if (page === 'practice' || page === 'speed') {
    content = `
      <div class="practice-layout">
      ${page === 'practice' ? renderPracticeSidebar() : ''}
      <div class="typing-workspace" id="typing-workspace">
        <div class="typing-setup notice-card">
          <span class="large-icon">${page === 'speed' ? '⚡' : '⌨️'}</span>
          <h3>${page === 'speed' ? 'Typing Speed Test' : 'Typing Practice'}</h3>
          <p>${page === 'speed' ? 'Choose a test duration, then start typing the passage.' : 'Practise a passage and watch your speed and accuracy update.'}</p>
          <div class="practice-source-panel" id="custom-upload-panel">
            <label for="custom-passage">Use your own exercise</label>
            <textarea id="custom-passage" class="custom-passage-input" rows="3" placeholder="Paste your own passage here, or choose a .txt, .pdf, or .docx file below…">${escapeHtml(customPassage)}</textarea>
            <div class="custom-passage-actions">
              <input id="practice-file" type="file" accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
              <button class="secondary-button" type="button" id="use-custom-passage">Use my passage</button>
              <button class="text-button" type="button" id="clear-custom-passage">Clear</button>
            </div>
            <p class="helper-text" id="practice-upload-status">You can paste text or import TXT, PDF, or Word (.docx) files. Your custom passage stays on this device.</p>
          </div>
          <div class="practice-options">
            <label><input type="checkbox" data-practice-option="backspace" ${practiceOptions.backspace ? 'checked' : ''}> Allow Backspace</label>
            <label><input type="checkbox" data-practice-option="textHighlight" ${practiceOptions.textHighlight ? 'checked' : ''}> Text highlight</label>
            <label><input type="checkbox" data-practice-option="wordHighlight" ${practiceOptions.wordHighlight ? 'checked' : ''}> Word highlight</label>
            <label><input type="checkbox" data-practice-option="wpm" ${practiceOptions.wpm ? 'checked' : ''}> WPM meter</label>
            <label><input type="checkbox" data-practice-option="wordMeter" ${practiceOptions.wordMeter ? 'checked' : ''}> Word meter</label>
            <label><input type="checkbox" data-practice-option="speedometer" ${practiceOptions.speedometer ? 'checked' : ''}> Speedometer</label>
          </div>
          <div class="duration-options">
            ${[1, 3, 5, 10, 15, 30].map((minutes) => `
              <button class="duration-button ${typingDuration === minutes ? 'selected' : ''}" data-minutes="${minutes}">${minutes} min</button>
            `).join('')}
          </div>
          <button class="primary-button typing-start" id="typing-start">${typingFinished ? 'Try Again' : 'Start Typing Test'} <span>→</span></button>
          <p class="helper-text" id="typing-status">Select any exercise from the list, choose a duration and start the test.</p><div class="last-attempt-summary" id="last-attempt-summary">${(() => { const prev = getLastExerciseAttempt(customPassage ? 'custom-1' : selectedExerciseId); return prev ? `<strong>Last attempt:</strong> ${prev.netWpm ?? prev.wpm} net WPM · ${prev.accuracy}% accuracy · ${prev.errors} errors` : 'No previous attempt for this exercise yet.'; })()}</div>
        </div>
        <div class="typing-stats" aria-live="polite">
          <div class="typing-stat"><span>Time left</span><strong id="typing-time">${typingDuration}:00</strong></div>
          <div class="typing-stat"><span>WPM</span><strong id="typing-wpm">0</strong></div>
          <div class="typing-stat"><span>Accuracy</span><strong id="typing-accuracy">100%</strong></div>
          <div class="typing-stat"><span>Errors</span><strong id="typing-errors">0</strong></div>
          <div class="typing-stat word-stat"><span>Correct words</span><strong id="typing-correct-words">0</strong></div>
          <div class="typing-stat word-stat"><span>Total words</span><strong id="typing-total-words">0</strong></div>
        </div>
        <div class="word-legend"><span><i class="legend-dot correct-dot"></i> Correct word</span><span><i class="legend-dot incorrect-dot"></i> Incorrect word</span><span><i class="legend-dot progress-dot"></i> In progress</span></div>
        <div class="typing-test-card">
          <div class="typing-card-heading"><h3>Type the passage</h3><span>${selectedPracticeLanguage === 'hi' ? 'हिन्दी · अभ्यास' : 'English · Practice'}</span></div>
          <div class="typing-passage" id="typing-passage">${escapeHtml(typingPassage || 'Press “Start Typing Test” to load a passage. The passage will appear here, and you can begin typing in the box below.')}</div>
          <textarea id="typing-input" class="typing-input" rows="5" placeholder="Click Start Typing Test, then type the passage here…" ${!typingPassage || typingFinished ? 'disabled' : ''} spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
          <div class="typing-submit-row"><span id="typing-submit-status">Submit when you finish, or wait for the timer.</span><button class="primary-button" type="button" id="typing-submit">Submit Test</button></div>
          <div id="typing-result" class="typing-result" ${typingFinished ? '' : 'hidden'}></div>
        </div>
      </div>
      </div>
    `
  } else if (page === 'exams' || page === 'rules') {
    content = `
      <div class="exam-picker">
        <label for="exam-select">Select examination category</label>
        <select id="exam-select">
          ${exams
            .map(
              (exam) => `
                <option value="${exam}" ${
                  exam === selectedExam ? 'selected' : ''
                }>${exam}</option>
              `,
            )
            .join('')}
        </select>

        <div class="notice-card exam-detail">
          <span class="large-icon">${page === 'rules' ? '📋' : '🎯'}</span>
          <h3 id="selected-exam-title">${selectedExam}</h3>
          <p id="selected-exam-description">
            ${page === 'rules'
              ? 'Only officially verified rules will be marked as confirmed.'
              : 'Select the applicable post and test format after checking its official notification.'}
          </p>
          <span class="verification-label">
            OFFICIAL RULE VERIFICATION REQUIRED
          </span>
          <div style="margin-top:16px;">
            <button type="button" class="primary-button" id="open-rssb-ldc-hall-btn">🏛️ Open RSSB LDC Exam Hall Simulator (80 Tests) →</button>
          </div>
        </div>
      </div>
    `
  } else if (page === 'rssb-ldc-exam') {
    content = renderRssbLdcExamHub()
  } else if (page === 'profile') {
    const history = getTypingHistory()
    const bestWpm = history.length ? Math.max(...history.map((item) => Number(item.netWpm ?? item.wpm) || 0)) : 0
    const avgAccuracy = history.length ? Math.round(history.reduce((sum, item) => sum + (Number(item.accuracy) || 0), 0) / history.length) : 0
    const completed = getCompletedExercises().length
    const settings = (() => { try { return JSON.parse(localStorage.getItem('ag-user-settings') || '{}') } catch { return {} } })()
    content = `
      <div class="profile-dashboard">
        <section class="profile-identity-card"><div class="profile-avatar profile-avatar-large">${escapeHtml((userProfile?.name || 'U').trim().charAt(0).toUpperCase())}</div><div class="profile-identity-copy"><span class="eyebrow">${appLanguage === 'hi' ? 'आपकी प्रोफ़ाइल' : 'YOUR PROFILE'}</span><h2>${escapeHtml(userProfile?.name || 'User')}</h2><p>${escapeHtml(userProfile?.exam || 'Exam not selected')} · ${escapeHtml(userProfile?.mobile || '')}</p><small>${appLanguage === 'hi' ? 'प्रोफ़ाइल इस डिवाइस पर सुरक्षित है' : 'Profile saved on this device'} · ${escapeHtml(userProfile?.syncStatus || 'pending')}</small></div><button type="button" class="secondary-button" id="edit-profile-toggle">${appLanguage === 'hi' ? 'प्रोफ़ाइल संपादित करें' : 'Edit profile'}</button></section>
        <section class="profile-edit-card" id="profile-edit-card" hidden><h3>${appLanguage === 'hi' ? 'प्रोफ़ाइल अपडेट करें' : 'Update profile'}</h3><form id="profile-edit-form"><label for="edit-name">${appLanguage === 'hi' ? 'नाम' : 'Name'}</label><input id="edit-name" required maxlength="100" value="${escapeHtml(userProfile?.name || '')}"><label for="edit-mobile">${appLanguage === 'hi' ? 'मोबाइल नंबर' : 'Mobile number'}</label><input id="edit-mobile" required value="${escapeHtml(userProfile?.mobile || '')}" inputmode="tel"><label for="edit-exam">${appLanguage === 'hi' ? 'परीक्षा' : 'Exam'}</label><input id="edit-exam" required maxlength="120" value="${escapeHtml(userProfile?.exam || '')}"><button class="primary-button" type="submit">${appLanguage === 'hi' ? 'सेव करें' : 'Save changes'}</button></form></section>
        <div class="profile-metric-grid"><article class="profile-metric"><span>${appLanguage === 'hi' ? 'कुल टाइपिंग टेस्ट' : 'Typing tests'}</span><strong>${history.length}</strong></article><article class="profile-metric"><span>${appLanguage === 'hi' ? 'सर्वश्रेष्ठ नेट WPM' : 'Best net WPM'}</span><strong>${bestWpm}</strong></article><article class="profile-metric"><span>${appLanguage === 'hi' ? 'औसत सटीकता' : 'Average accuracy'}</span><strong>${history.length ? avgAccuracy + '%' : '—'}</strong></article><article class="profile-metric"><span>${appLanguage === 'hi' ? 'पूरे अभ्यास' : 'Exercises completed'}</span><strong>${completed}</strong></article></div>
        <section class="profile-panel"><div class="profile-panel-heading"><div><span class="eyebrow">${appLanguage === 'hi' ? 'आपका रिकॉर्ड' : 'YOUR RECORDS'}</span><h3>${appLanguage === 'hi' ? 'टेस्ट-वाइज रिपोर्ट' : 'Test-wise reports'}</h3><p>${appLanguage === 'hi' ? 'हर सेव किए गए टेस्ट की रिपोर्ट खोलें या प्रिंट करें।' : 'Open or print the saved report for each test.'}</p></div><button type="button" class="secondary-button" id="print-profile-summary">${appLanguage === 'hi' ? 'सारांश प्रिंट करें' : 'Print summary'}</button></div>
        ${history.length ? `<div class="profile-report-list">${history.map((item,index)=>`<article class="profile-report-row"><div class="profile-report-index">${index+1}</div><div class="profile-report-info"><strong>${escapeHtml(item.exerciseTitle || item.exerciseName || item.exam || 'Typing Test')}</strong><small>${escapeHtml(item.date || '')} · ${escapeHtml(item.exam || 'General Practice')} · ${Number(item.duration)||0} min</small></div><div class="profile-report-stat"><strong>${Number(item.netWpm ?? item.wpm)||0}</strong><small>Net WPM</small></div><div class="profile-report-stat"><strong>${Number(item.accuracy)||0}%</strong><small>Accuracy</small></div><button type="button" class="secondary-button" data-profile-report-id="${escapeHtml(item.id || '')}" data-profile-report-index="${index}">${appLanguage === 'hi' ? 'रिपोर्ट / प्रिंट' : 'Report / Print'}</button></article>`).join('')}</div>` : `<div class="profile-empty-state"><span>📊</span><h4>${appLanguage === 'hi' ? 'अभी कोई टेस्ट रिकॉर्ड नहीं है' : 'No test records yet'}</h4><p>${appLanguage === 'hi' ? 'टाइपिंग टेस्ट पूरा करने के बाद रिपोर्ट यहाँ दिखेगी।' : 'Your report will appear here after you complete a typing test.'}</p><button type="button" class="primary-button" data-page="practice">${appLanguage === 'hi' ? 'अभ्यास शुरू करें' : 'Start practice'} →</button></div>`}
        <div id="profile-saved-report"></div></section>
        <section class="profile-panel"><div class="profile-panel-heading"><div><span class="eyebrow">PREFERENCES</span><h3>${appLanguage === 'hi' ? 'सेटिंग्स' : 'Settings'}</h3><p>${appLanguage === 'hi' ? 'भाषा, थीम और आपकी प्रैक्टिस की पसंद।' : 'Language, theme and practice preferences.'}</p></div></div><div class="profile-settings-grid"><label>${appLanguage === 'hi' ? 'ऐप की भाषा' : 'App language'}<select id="profile-language"><option value="en" ${appLanguage === 'en' ? 'selected' : ''}>English</option><option value="hi" ${appLanguage === 'hi' ? 'selected' : ''}>हिन्दी</option></select></label><label>${appLanguage === 'hi' ? 'थीम' : 'Theme'}<select id="profile-theme"><option value="light" ${document.documentElement.dataset.theme !== 'dark' ? 'selected' : ''}>Light</option><option value="dark" ${document.documentElement.dataset.theme === 'dark' ? 'selected' : ''}>Dark</option></select></label><label class="profile-setting-check"><input type="checkbox" id="profile-backspace" ${settings.backspace !== false ? 'checked' : ''}> ${appLanguage === 'hi' ? 'Backspace की अनुमति' : 'Allow Backspace'}</label><label class="profile-setting-check"><input type="checkbox" id="profile-highlights" ${settings.highlights !== false ? 'checked' : ''}> ${appLanguage === 'hi' ? 'Typing highlights' : 'Typing highlights'}</label><button type="button" class="primary-button" id="save-profile-settings">${appLanguage === 'hi' ? 'सेटिंग्स सेव करें' : 'Save settings'}</button></div></section>
      </div>`
  } else if (page === 'word-efficiency' || page === 'excel-efficiency') {
    const isWord = page === 'word-efficiency'
    content = `<section class="efficiency-simulator" id="efficiency-simulator" data-module="${isWord ? 'word' : 'excel'}"><div class="efficiency-loading"><span class="large-icon">${isWord ? '📝' : '📊'}</span><h2>Loading ${isWord ? 'MS Word' : 'MS Excel'} Efficiency Test</h2><p>Preparing an exam-style task and workspace...</p></div></section>`
  } else if (page === 'games') {
    content = renderGames()
  } else if (page === 'performance') {
    const history = getTypingHistory()
    const bestWpm = history.length ? Math.max(...history.map((item) => item.wpm)) : 0
    const averageAccuracy = history.length ? Math.round(history.reduce((sum, item) => sum + item.accuracy, 0) / history.length) : 0
    let gameHistory = []
    try { gameHistory = JSON.parse(localStorage.getItem('ag-typing-game-history') || '[]') } catch { gameHistory = [] }
    content = `
      <div class="performance-summary">
        <div class="typing-stat"><span>Completed tests</span><strong>${history.length}</strong></div>
        <div class="typing-stat"><span>Best WPM</span><strong>${bestWpm}</strong></div>
        <div class="typing-stat"><span>Average accuracy</span><strong>${history.length ? averageAccuracy + '%' : '—'}</strong></div>
      </div>
      <section class="typing-test-card game-history-card"><div class="typing-card-heading"><div><h3>Arcade mission history</h3><p class="helper-text">All three arcade game results are saved on this device.</p></div><button class="text-button" id="clear-game-history" ${gameHistory.length ? '' : 'disabled'}>Clear games</button></div>${gameHistory.length ? `<div class="game-history-grid">${gameHistory.slice(0,10).map((g) => `<article class="game-history-item"><div><strong>${escapeHtml(g.game || 'Typing game')}</strong><small>${escapeHtml(g.date || '')}</small></div><div class="game-history-metrics"><span><b>${Number(g.score)||0}</b> score</span><span><b>${Number(g.destroyed)||0}</b> destroyed</span><span><b>${Number(g.wpm)||0}</b> WPM</span><span><b>${Number(g.accuracy)||0}%</b> accuracy</span></div></article>`).join('')}</div>` : `<p class="helper-text">Your first result will appear here after playing any of the three arcade games.</p>`}</section>
      ${history.length ? `<div class="typing-test-card"><div class="typing-card-heading"><h3>Recent results</h3><button class="text-button" id="clear-history">Clear history</button></div><div class="history-table"><div class="history-row history-head"><span>Date</span><span>Duration</span><span>Net WPM</span><span>Accuracy</span><span>Details</span></div>${history.slice(0, 20).map((item) => `<div class="history-row"><span>${escapeHtml(item.date)}</span><span>${item.duration} min</span><span>${item.netWpm ?? item.wpm}</span><span>${item.accuracy}%</span><button class="text-button" data-report-id="${escapeHtml(item.id || '')}">View / Print</button></div>`).join('')}</div><p class="helper-text">Select View / Print to reopen a saved detailed report.</p><div id="saved-report"></div></div>` : `<div class="notice-card"><span class="large-icon">📊</span><h3>Your progress starts here</h3><p>Complete a typing session to save your first result. Your test history stays in this browser on this device.</p><button class="primary-button" data-page="practice">Start Practice <span>→</span></button></div>`}
    `
  } else {
    content = `
      <div class="notice-card">
        <span class="large-icon">⚙️</span>
        <h3>Application preferences</h3>
        <p>More settings will be added as the typing engine develops.</p>
      </div>
    `
  }

  app.innerHTML = `
    <div class="app-layout ${page === 'practice' ? 'practice-mode' : ''}">
      <aside class="sidebar">
        <a class="brand" href="#" data-page="home">
          <span class="brand-logo">AG</span>
          <span class="brand-text">
            <strong>AG Typing Tutor</strong>
            <small>by Xtreme AG Apps</small>
          </span>
        </a>

        <div class="sidebar-heading">MAIN MENU</div>

        <nav class="navigation">
          <button class="nav-button" data-page="home">
            <span>⌂</span> Home
          </button>
          ${sections
            .map(
              (item) => `
                <button class="nav-button ${
                  page === item.id ? 'active' : ''
                }" data-page="${item.id}">
                  <span>${item.icon}</span>
                  ${item.title}
                </button>
              `,
            )
            .join('')}
        </nav>

        <div class="sidebar-bottom sidebar-profile-bottom">
          <button type="button" class="sidebar-profile-button" data-page="profile" aria-label="Open user profile">
            <span class="profile-avatar">${escapeHtml((userProfile?.name || 'U').trim().charAt(0).toUpperCase())}</span>
            <span class="sidebar-profile-copy"><strong>${escapeHtml(userProfile?.name || 'My Profile')}</strong><small>${appLanguage === 'hi' ? 'प्रोफ़ाइल और रिपोर्ट' : 'Profile & reports'}</small></span>
            <span class="profile-chevron">›</span>
          </button>
        </div>
      </aside>

      <main class="main-area">
        <header class="topbar">
          <div>
            <button class="back-button" data-page="home">← Home</button>
            <h1>${section.title}</h1>
            <p>${section.description}</p>
          </div>
          <div class="topbar-actions">${themeButton()}<span class="edition-badge">AG TYPING TUTOR</span></div>
        </header>

        <section class="section-page">
          ${content}
        </section>

        <footer class="app-footer">
          <span>AG Typing Tutor</span>
          <span>A product by Xtreme AG Apps</span>
        </footer>
      </main>
    </div>
  `

  attachNavigation()
  attachThemeToggle()
  attachSectionActions()
  if (page === 'word-efficiency' || page === 'excel-efficiency') attachEfficiencySimulator(page)
  if (page === 'rssb-ldc-exam') attachRssbLdcExamHub()
  document.querySelector('#open-rssb-ldc-hall-btn')?.addEventListener('click', () => openRssbLdcEntryPopup())
}

function attachNavigation() {
  document.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault()
      renderSection(button.dataset.page)
    })
  })
}

function attachSectionActions() {
  document.querySelector('#edit-profile-toggle')?.addEventListener('click', () => { const panel = document.querySelector('#profile-edit-card'); if (panel) panel.hidden = !panel.hidden })
  document.querySelector('#profile-edit-form')?.addEventListener('submit', (event) => { event.preventDefault(); const next = { ...userProfile, name: document.querySelector('#edit-name').value.trim(), mobile: document.querySelector('#edit-mobile').value.trim(), exam: document.querySelector('#edit-exam').value.trim() }; if (!next.name || !next.mobile || !next.exam) return; userProfile = next; localStorage.setItem('ag-user-profile', JSON.stringify(userProfile)); renderSection('profile') })
  document.querySelector('#profile-language')?.addEventListener('change', (event) => { appLanguage = event.target.value; localStorage.setItem('ag-language', appLanguage); renderSection('profile') })
  document.querySelector('#profile-theme')?.addEventListener('change', (event) => { document.documentElement.dataset.theme = event.target.value; localStorage.setItem('ag-typing-theme', event.target.value) })
  document.querySelector('#save-profile-settings')?.addEventListener('click', () => { localStorage.setItem('ag-user-settings', JSON.stringify({ backspace: document.querySelector('#profile-backspace')?.checked !== false, highlights: document.querySelector('#profile-highlights')?.checked !== false })); const status = document.createElement('p'); status.className = 'helper-text'; status.textContent = appLanguage === 'hi' ? 'सेटिंग्स इस डिवाइस पर सेव हो गईं।' : 'Settings saved on this device.'; document.querySelector('.profile-settings-grid')?.append(status) })
  document.querySelector('#print-profile-summary')?.addEventListener('click', () => window.print())
  document.querySelectorAll('[data-profile-report-id]').forEach((button) => button.addEventListener('click', () => { const list = getTypingHistory(); const result = button.dataset.profileReportId ? list.find((item) => String(item.id || '') === button.dataset.profileReportId) : list[Number(button.dataset.profileReportIndex)]; const target = document.querySelector('#profile-saved-report'); if (!result || !target) return; const stats = { netWpm: result.netWpm ?? result.wpm ?? 0, grossWpm: result.grossWpm ?? result.wpm ?? 0, accuracy: result.accuracy ?? 0, errors: result.errors ?? 0, correct: result.correct ?? 0, typed: result.typed ?? 0, completion: result.completion ?? 0, errorRate: result.errorRate ?? 0 }; target.innerHTML = `<div class="typing-result saved-report">${buildDetailedReportHTML(result, stats)}</div>`; target.querySelector('#typing-result-print')?.addEventListener('click', () => window.print()); target.scrollIntoView({behavior:'smooth',block:'start'}) }))
  document.querySelector('#clear-game-history')?.addEventListener('click', () => { localStorage.removeItem('ag-typing-game-history'); renderSection('performance') })
  attachTypingEngine()
    if (currentSection === 'practice') attachPracticeSidebar()
  bindLessonActions(() => renderSection('learn'))
  bindGameActions()

  const examSelect = document.querySelector('#exam-select')

  if (examSelect) {
    examSelect.addEventListener('change', () => {
      selectedExam = examSelect.value

      const title = document.querySelector('#selected-exam-title')
      const description = document.querySelector('#selected-exam-description')

      title.textContent = selectedExam

      description.textContent =
        currentSection === 'rules'
          ? 'Official rules must be verified for the relevant post and notification.'
          : 'Select the applicable post and test format after checking its official notification.'
    })
  }

  document.querySelector('#clear-history')?.addEventListener('click', () => {
    localStorage.removeItem('ag-typing-history')
    renderSection('performance')
  })

  document.querySelectorAll('[data-report-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const result = getTypingHistory().find((item) => item.id === button.dataset.reportId)
      const target = document.querySelector('#saved-report')
      if (!result || !target) return
      const stats = {
        netWpm: result.netWpm ?? result.wpm ?? 0,
        grossWpm: result.grossWpm ?? result.wpm ?? 0,
        accuracy: result.accuracy ?? 0,
        errors: result.errors ?? 0,
        correct: result.correct ?? 0,
        typed: result.typed ?? 0,
        completion: result.completion ?? 0,
        errorRate: result.errorRate ?? 0,
      }
      target.innerHTML = `<div class="typing-result saved-report">${buildDetailedReportHTML(result, stats)}</div>`
      target.querySelector('#typing-result-print')?.addEventListener('click', () => window.print())
    })
  })

}


// Exam-style Word and Excel efficiency workspace. The question bank is read from
// the supplied 40-file language-specific banks. Each bank file contains 15 questions.
const efficiencyState = {
  module: '', question: null, questionIndex: 1, startedAt: 0, timer: null, secondsLeft: 900,
  points: 0, wordActions: new Set(), excelDataset: [], excelFormulas: {}, selectedCell: 'A1', history: [],
  language: 'en', fileNo: 1, fileData: null, activePage: '', lastResult: null, started: false, questionMarks: {}
}

function efficiencyEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
}
function efficiencyFormatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}
function efficiencyFileId(moduleName, language, fileNo) {
  return `${moduleName.toUpperCase()}_${language.toUpperCase()}_${String(fileNo).padStart(3, '0')}`
}

const O19_FALLBACK_BANK = {"word_en": {"metadata": {"project": "AG Typing Tutor", "developer": "Xtreme AG Apps", "exam_focus": "Rajasthan RSSB LDC & Rajasthan High Court LDC", "module": "word", "language": "en", "file_id": "WORD_EN_001", "test_number": 1, "duration_minutes": 10, "full_marks": 50, "question_count": 15, "difficulty_breakdown": {"Easy": 3, "Medium": 7, "Hard": 5}, "document_structure": {"doc_type": "NOTICE", "org_name": "Govt. Sen. Sec. School, Jaipur", "date_line": "Date: 4th November 2026", "subject_line": "Debate Competition", "para1": "This is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.", "para2": "During the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.", "para3": "Strict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.", "events_list": "Key Items / Schedule: 100m Race, Long Jump, Shot Put.", "sign_role": "Sports Secretary", "sign_name": "Arjun Kumar", "table": [["Sr. No.", "Branch / Section", "Allocated Files", "Current Status"], ["01", "Establishment Section", "121", "Playground"], ["02", "Accounts & Audit Cell", "96", "Verified"], ["03", "Judicial Record Room", "151", "Completed"]]}}, "questions": [{"id": "WORD_EN_001-Q01", "question_number": 1, "marks": 3.0, "title": "Center align the top heading 'NOTICE' and make it Bold.", "category": "rssb_hc_ldc_word", "difficulty": "Easy", "target_part": "doc_type", "expected_action": "center", "instruction": "Center align the top heading 'NOTICE' and make it Bold.", "tasks": ["Center align the top heading 'NOTICE' and make it Bold."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Select the first line 'NOTICE' at the top of the document.", "2. Go to the 'Home' tab on the Ribbon -> look at the 'Font' group -> click the 'Bold (B)' button (or press Ctrl+B).", "3. In the 'Home' tab -> 'Paragraph' group -> click the 'Center' alignment button (or press Ctrl+E)."]}, {"id": "WORD_EN_001-Q02", "question_number": 2, "marks": 3.0, "title": "Make the Organization Name ('Govt. Sen. Sec. School, Jaipur') Bold, Underlined, and set its Font Size to 18 pt.", "category": "rssb_hc_ldc_word", "difficulty": "Easy", "target_part": "org_name", "expected_action": "font", "instruction": "Make the Organization Name ('Govt. Sen. Sec. School, Jaipur') Bold, Underlined, and set its Font Size to 18 pt.", "tasks": ["Make the Organization Name ('Govt. Sen. Sec. School, Jaipur') Bold, Underlined, and set its Font Size to 18 pt."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Select the second line 'Govt. Sen. Sec. School, Jaipur' in the document.", "2. Go to the 'Home' tab -> 'Font' group -> click the 'Bold (B)' icon and the 'Underline (U)' icon.", "3. In the 'Home' tab -> 'Font' group -> click the 'Font Size' dropdown arrow (▾) and select '18'."]}, {"id": "WORD_EN_001-Q03", "question_number": 3, "marks": 3.0, "title": "Right align the 'Date: 4th November 2026' line and make it Italic.", "category": "rssb_hc_ldc_word", "difficulty": "Easy", "target_part": "date_line", "expected_action": "justifyRight", "instruction": "Right align the 'Date: 4th November 2026' line and make it Italic.", "tasks": ["Right align the 'Date: 4th November 2026' line and make it Italic."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Select the third line ('Date: 4th November 2026').", "2. Go to the 'Home' tab -> 'Paragraph' group -> click the 'Align Right' button (or press Ctrl+R).", "3. In the 'Home' tab -> 'Font' group -> click the 'Italic (I)' button (or press Ctrl+I)."]}, {"id": "WORD_EN_001-Q04", "question_number": 4, "marks": 3.5, "title": "Make the Subject heading ('Debate Competition') Bold, change its font to 'Arial', and apply Yellow Text Highlight Color.", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "subject_line", "expected_action": "highlight", "instruction": "Make the Subject heading ('Debate Competition') Bold, change its font to 'Arial', and apply Yellow Text Highlight Color.", "tasks": ["Make the Subject heading ('Debate Competition') Bold, change its font to 'Arial', and apply Yellow Text Highlight Color."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Select the fourth line ('Debate Competition').", "2. Go to the 'Home' tab -> 'Font' group -> click 'Bold (B)' and select 'Arial' from the 'Font Family' dropdown (▾).", "3. In the 'Home' tab -> 'Font' group -> click the 'Text Highlight Color (ab)' button and choose 'Yellow'."]}, {"id": "WORD_EN_001-Q05", "question_number": 5, "marks": 3.5, "title": "Justify the First Paragraph ('This is to inform...') and set its Line Spacing to 2.0 lines.", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "para1", "expected_action": "line-spacing", "instruction": "Justify the First Paragraph ('This is to inform...') and set its Line Spacing to 2.0 lines.", "tasks": ["Justify the First Paragraph ('This is to inform...') and set its Line Spacing to 2.0 lines."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Click anywhere inside the First Paragraph ('This is to inform...').", "2. Go to the 'Home' tab -> 'Paragraph' group -> click the 'Justify' alignment icon.", "3. In the same 'Paragraph' group -> click the 'Line and Paragraph Spacing (↕)' icon -> select '2.0 Lines' from the submenu."]}, {"id": "WORD_EN_001-Q06", "question_number": 6, "marks": 3.5, "title": "Apply a First-Line Indent of 0.75 inches to the Second Paragraph ('During the recent...').", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "para2", "expected_action": "indent", "instruction": "Apply a First-Line Indent of 0.75 inches to the Second Paragraph ('During the recent...').", "tasks": ["Apply a First-Line Indent of 0.75 inches to the Second Paragraph ('During the recent...')."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Click inside the Second Paragraph ('During the recent administrative review...').", "2. Go to the 'Home' tab -> 'Paragraph' group -> click the 'Line and Paragraph Spacing (↕)' submenu (or click the Paragraph Dialog Launcher '↘').", "3. Under 'Paragraph Indentation', click 'First Line Indent (0.75\")' (or in the Paragraph dialog set Special: 'First line', By: '0.75\"' and click OK)."]}, {"id": "WORD_EN_001-Q07", "question_number": 7, "marks": 3.5, "title": "Add 6 pt Space After Paragraph to the Second Paragraph ('During the recent...').", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "para2", "expected_action": "space-after", "instruction": "Add 6 pt Space After Paragraph to the Second Paragraph ('During the recent...').", "tasks": ["Add 6 pt Space After Paragraph to the Second Paragraph ('During the recent...')."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Click inside the Second Paragraph ('During the recent administrative review...').", "2. Go to the 'Layout' tab -> 'Paragraph' group (or 'Home' tab -> 'Line and Paragraph Spacing ↕' submenu).", "3. Set the 'Spacing After' box to '6 pt' and press Enter (or click 'Add Space After Paragraph (12 pt)' in the Line Spacing menu)."]}, {"id": "WORD_EN_001-Q08", "question_number": 8, "marks": 3.5, "title": "Apply a Hanging Indent of 0.5 inches and Justify alignment to the Third Paragraph ('Strict adherence...').", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "para3", "expected_action": "hanging-indent", "instruction": "Apply a Hanging Indent of 0.5 inches and Justify alignment to the Third Paragraph ('Strict adherence...').", "tasks": ["Apply a Hanging Indent of 0.5 inches and Justify alignment to the Third Paragraph ('Strict adherence...')."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Click inside the Third Paragraph ('Strict adherence to the prescribed...').", "2. Go to the 'Home' tab -> 'Paragraph' group -> click the 'Justify' alignment button.", "3. Click the 'Line and Paragraph Spacing (↕)' icon (or Paragraph Dialog Launcher '↘') and select 'Hanging Indent (0.5\")'."]}, {"id": "WORD_EN_001-Q09", "question_number": 9, "marks": 3.5, "title": "Apply an Outside Border and light Background Shading to the Third Paragraph ('Strict adherence...').", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "para3", "expected_action": "border", "instruction": "Apply an Outside Border and light Background Shading to the Third Paragraph ('Strict adherence...').", "tasks": ["Apply an Outside Border and light Background Shading to the Third Paragraph ('Strict adherence...')."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Click inside the Third Paragraph ('Strict adherence to the prescribed...').", "2. Go to the 'Home' tab -> 'Paragraph' group -> click the 'Shading' (paint bucket) dropdown (▾) and choose a light color.", "3. Next to Shading, click the 'Borders' dropdown (▾) and select 'Outside Borders'."]}, {"id": "WORD_EN_001-Q10", "question_number": 10, "marks": 3.5, "title": "Convert the Key Items line ('Key Items / Schedule: 100m Race, Long Jump, Shot Put.') to UPPERCASE and apply a Bulleted List.", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "events_list", "expected_action": "change-case", "instruction": "Convert the Key Items line ('Key Items / Schedule: 100m Race, Long Jump, Shot Put.') to UPPERCASE and apply a Bulleted List.", "tasks": ["Convert the Key Items line ('Key Items / Schedule: 100m Race, Long Jump, Shot Put.') to UPPERCASE and apply a Bulleted List."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Select the line 'Key Items / Schedule: 100m Race, Long Jump, Shot Put.'.", "2. Go to the 'Home' tab -> 'Font' group -> click the 'Change Case (Aa)' button -> select 'UPPERCASE' from the submenu.", "3. In the 'Home' tab -> 'Paragraph' group -> click the 'Bullets (•)' button."]}, {"id": "WORD_EN_001-Q11", "question_number": 11, "marks": 3.5, "title": "Right align the Signatory Designation ('Sports Secretary') and Signatory Name ('Arjun Kumar') and make them Bold.", "category": "rssb_hc_ldc_word", "difficulty": "Hard", "target_part": "sign_role", "expected_action": "justifyRight", "instruction": "Right align the Signatory Designation ('Sports Secretary') and Signatory Name ('Arjun Kumar') and make them Bold.", "tasks": ["Right align the Signatory Designation ('Sports Secretary') and Signatory Name ('Arjun Kumar') and make them Bold."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Select the signatory lines ('Sports Secretary' and 'Arjun Kumar') near the bottom of the notice.", "2. Go to the 'Home' tab -> 'Paragraph' group -> click the 'Align Right' button.", "3. In the 'Home' tab -> 'Font' group -> click the 'Bold (B)' button."]}, {"id": "WORD_EN_001-Q12", "question_number": 12, "marks": 3.5, "title": "Use Find & Replace to replace all occurrences of the word 'playground' with 'auditorium' in the document.", "category": "rssb_hc_ldc_word", "difficulty": "Hard", "target_part": "para1", "expected_action": "find-replace", "instruction": "Use Find & Replace to replace all occurrences of the word 'playground' with 'auditorium' in the document.", "tasks": ["Use Find & Replace to replace all occurrences of the word 'playground' with 'auditorium' in the document."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Go to the 'Home' tab -> look at the far-right 'Editing' group -> click the 'Replace' button to open the Find and Replace dialog.", "2. In the 'Find what:' box, type 'playground'. In the 'Replace with:' box, type 'auditorium'.", "3. Click the 'OK' button to replace all occurrences across the document."]}, {"id": "WORD_EN_001-Q13", "question_number": 13, "marks": 3.5, "title": "Set the document Page Margins to 'Moderate' and Page Orientation to 'Landscape'.", "category": "rssb_hc_ldc_word", "difficulty": "Hard", "target_part": "document", "expected_action": "margins", "instruction": "Set the document Page Margins to 'Moderate' and Page Orientation to 'Landscape'.", "tasks": ["Set the document Page Margins to 'Moderate' and Page Orientation to 'Landscape'."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Click the 'Layout' tab on the top Word 2019 Ribbon.", "2. In the 'Page Setup' group (left side), click the 'Margins' button -> select 'Moderate' from the dropdown menu.", "3. In the same 'Page Setup' group, click the 'Orientation' button -> select 'Landscape'."]}, {"id": "WORD_EN_001-Q14", "question_number": 14, "marks": 3.0, "title": "In the Reference Table at the bottom, make the Table Header row Bold, Center aligned, and apply Shading.", "category": "rssb_hc_ldc_word", "difficulty": "Hard", "target_part": "table", "expected_action": "center", "instruction": "In the Reference Table at the bottom, make the Table Header row Bold, Center aligned, and apply Shading.", "tasks": ["In the Reference Table at the bottom, make the Table Header row Bold, Center aligned, and apply Shading."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Click inside the first header row ('Sr. No. | Branch / Section | ...') of the Table at the bottom of the document.", "2. Go to the 'Home' tab -> 'Font' group -> click 'Bold (B)'.", "3. In the 'Home' tab -> 'Paragraph' group -> click 'Center' alignment and pick a fill color from the 'Shading' dropdown (▾)."]}, {"id": "WORD_EN_001-Q15", "question_number": 15, "marks": 3.0, "title": "Insert an Official Header & Page Number, and apply a 'CONFIDENTIAL' Watermark to the document.", "category": "rssb_hc_ldc_word", "difficulty": "Hard", "target_part": "document", "expected_action": "watermark", "instruction": "Insert an Official Header & Page Number, and apply a 'CONFIDENTIAL' Watermark to the document.", "tasks": ["Insert an Official Header & Page Number, and apply a 'CONFIDENTIAL' Watermark to the document."], "source_content": "NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 4th November 2026\nDebate Competition\nThis is to inform all concerned officers and staff members that the Debate Competition is scheduled to be conducted on the 21st of next month in the main playground hall. All branch heads must submit their verified compliance lists to the undersigned by the 10th of this month without fail.\nDuring the recent administrative review, it was noticed that several sections have not updated their daily dispatch registers and playground inspection logs. Every nodal officer shall personally inspect the pending files and ensure 100% digital entry on the official portal before Friday.\nStrict adherence to the prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments. Any delay or negligence in submitting the statutory returns will be viewed seriously by the competent authority.\nKey Items / Schedule: 100m Race, Long Jump, Shot Put.\nSports Secretary\nArjun Kumar", "solution_steps": ["1. Go to the 'Insert' tab -> 'Header & Footer' group -> click 'Header' -> 'Blank (Official Header)', and click 'Page Number' -> 'Bottom of Page'.", "2. Go to the 'Design' tab -> 'Page Background' group (far right) -> click 'Watermark' -> select 'CONFIDENTIAL'."]}]}, "word_hi": {"metadata": {"project": "AG Typing Tutor", "developer": "Xtreme AG Apps", "exam_focus": "Rajasthan RSSB LDC & Rajasthan High Court LDC", "module": "word", "language": "hi", "file_id": "WORD_HI_001", "test_number": 1, "duration_minutes": 10, "full_marks": 50, "question_count": 15, "difficulty_breakdown": {"Easy": 3, "Medium": 7, "Hard": 5}, "document_structure": {"doc_type": "सूचना (NOTICE)", "org_name": "राजकीय उच्च माध्यमिक विद्यालय, जयपुर", "date_line": "दिनांक: 4 नवम्बर 2026", "subject_line": "वाद-विवाद एवं खेलकूद प्रतियोगिता", "para1": "समस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।", "para2": "विगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।", "para3": "समस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।", "events_list": "प्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।", "sign_role": "खेल सचिव", "sign_name": "अर्जुन कुमार", "table": [["क्र.सं.", "शाखा / अनुभाग का नाम", "आवंटित पत्रावलियाँ", "वर्तमान स्थिति"], ["01", "स्थापना अनुभाग", "121", "मैदान"], ["02", "लेखा एवं अंकेक्षण प्रकोष्ठ", "96", "सत्यापित"], ["03", "अभिलेख संधारण कक्ष", "151", "पूर्ण"]]}}, "questions": [{"id": "WORD_HI_001-Q01", "question_number": 1, "marks": 3.0, "title": "शीर्ष पंक्ति 'सूचना (NOTICE)' को सेंटर संरेखित (Center Align) करें और उसे बोल्ड (Bold) बनाएँ।", "category": "rssb_hc_ldc_word", "difficulty": "Easy", "target_part": "doc_type", "expected_action": "center", "instruction": "शीर्ष पंक्ति 'सूचना (NOTICE)' को सेंटर संरेखित (Center Align) करें और उसे बोल्ड (Bold) बनाएँ।", "tasks": ["शीर्ष पंक्ति 'सूचना (NOTICE)' को सेंटर संरेखित (Center Align) करें और उसे बोल्ड (Bold) बनाएँ।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. दस्तावेज़ की सबसे पहली पंक्ति 'सूचना (NOTICE)' को माउस से सिलेक्ट करें।", "2. ऊपर 'Home' टैब -> 'Font' ग्रुप में जाकर 'Bold (B)' बटन पर क्लिक करें (या Ctrl+B दबाएँ)।", "3. 'Home' टैब -> 'Paragraph' ग्रुप में 'Center' अलाइनमेंट बटन पर क्लिक करें (या Ctrl+E दबाएँ)।"]}, {"id": "WORD_HI_001-Q02", "question_number": 2, "marks": 3.0, "title": "कार्यालय/संस्थान के नाम ('राजकीय उच्च माध्यमिक विद्यालय, जयपुर') को Bold व Underline करें तथा उसका Font Size 18 pt सेट करें।", "category": "rssb_hc_ldc_word", "difficulty": "Easy", "target_part": "org_name", "expected_action": "font", "instruction": "कार्यालय/संस्थान के नाम ('राजकीय उच्च माध्यमिक विद्यालय, जयपुर') को Bold व Underline करें तथा उसका Font Size 18 pt सेट करें।", "tasks": ["कार्यालय/संस्थान के नाम ('राजकीय उच्च माध्यमिक विद्यालय, जयपुर') को Bold व Underline करें तथा उसका Font Size 18 pt सेट करें।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. दूसरी पंक्ति 'राजकीय उच्च माध्यमिक विद्यालय, जयपुर' को सिलेक्ट करें।", "2. 'Home' टैब -> 'Font' ग्रुप में 'Bold (B)' और 'Underline (U)' आइकन पर क्लिक करें।", "3. 'Font' ग्रुप में 'Font Size' ड्रॉपडाउन (▾) पर क्लिक करके '18' चुनें।"]}, {"id": "WORD_HI_001-Q03", "question_number": 3, "marks": 3.0, "title": "दिनांक पंक्ति ('दिनांक: 4 नवम्बर 2026') को दाएँ संरेखित (Right Align) करें और उसे Italic बनाएँ।", "category": "rssb_hc_ldc_word", "difficulty": "Easy", "target_part": "date_line", "expected_action": "justifyRight", "instruction": "दिनांक पंक्ति ('दिनांक: 4 नवम्बर 2026') को दाएँ संरेखित (Right Align) करें और उसे Italic बनाएँ।", "tasks": ["दिनांक पंक्ति ('दिनांक: 4 नवम्बर 2026') को दाएँ संरेखित (Right Align) करें और उसे Italic बनाएँ।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. तीसरी पंक्ति ('दिनांक: 4 नवम्बर 2026') को सिलेक्ट करें।", "2. 'Home' टैब -> 'Paragraph' ग्रुप में 'Align Right' बटन पर क्लिक करें।", "3. 'Home' टैब -> 'Font' ग्रुप में 'Italic (I)' बटन पर क्लिक करें।"]}, {"id": "WORD_HI_001-Q04", "question_number": 4, "marks": 3.5, "title": "विषय शीर्षक ('वाद-विवाद एवं खेलकूद प्रतियोगिता') को Bold करें, उसका फ़ॉन्ट 'Calibri' करें तथा उस पर Yellow Highlight लगाएँ।", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "subject_line", "expected_action": "highlight", "instruction": "विषय शीर्षक ('वाद-विवाद एवं खेलकूद प्रतियोगिता') को Bold करें, उसका फ़ॉन्ट 'Calibri' करें तथा उस पर Yellow Highlight लगाएँ।", "tasks": ["विषय शीर्षक ('वाद-विवाद एवं खेलकूद प्रतियोगिता') को Bold करें, उसका फ़ॉन्ट 'Calibri' करें तथा उस पर Yellow Highlight लगाएँ।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. चौथी पंक्ति ('वाद-विवाद एवं खेलकूद प्रतियोगिता') को सिलेक्ट करें।", "2. 'Home' टैब -> 'Font' ग्रुप में 'Bold (B)' दबाएँ और Font Family ड्रॉपडाउन (▾) से 'Calibri' चुनें।", "3. 'Font' ग्रुप में 'Text Highlight Color (ab)' बटन पर क्लिक करके पीला (Yellow) रंग चुनें।"]}, {"id": "WORD_HI_001-Q05", "question_number": 5, "marks": 3.5, "title": "प्रथम पैराग्राफ ('समस्त संबंधित अधिकारियों...') को Justify करें और उसकी Line Spacing 2.0 सेट करें।", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "para1", "expected_action": "line-spacing", "instruction": "प्रथम पैराग्राफ ('समस्त संबंधित अधिकारियों...') को Justify करें और उसकी Line Spacing 2.0 सेट करें।", "tasks": ["प्रथम पैराग्राफ ('समस्त संबंधित अधिकारियों...') को Justify करें और उसकी Line Spacing 2.0 सेट करें।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. प्रथम पैराग्राफ ('समस्त संबंधित अधिकारियों...') में कहीं भी क्लिक करें।", "2. 'Home' टैब -> 'Paragraph' ग्रुप में 'Justify' संरेखण आइकन पर क्लिक करें।", "3. उसी 'Paragraph' ग्रुप में 'Line and Paragraph Spacing (↕)' आइकन पर क्लिक करें और सब-मेनू से '2.0 Lines' चुनें।"]}, {"id": "WORD_HI_001-Q06", "question_number": 6, "marks": 3.5, "title": "द्वितीय पैराग्राफ ('विगत प्रशासनिक समीक्षा...') में 0.75 इंच का First-Line Indent लागू करें।", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "para2", "expected_action": "indent", "instruction": "द्वितीय पैराग्राफ ('विगत प्रशासनिक समीक्षा...') में 0.75 इंच का First-Line Indent लागू करें।", "tasks": ["द्वितीय पैराग्राफ ('विगत प्रशासनिक समीक्षा...') में 0.75 इंच का First-Line Indent लागू करें।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. द्वितीय पैराग्राफ ('विगत प्रशासनिक समीक्षा...') में कर्सर रखें।", "2. 'Home' टैब -> 'Paragraph' ग्रुप में 'Line and Paragraph Spacing (↕)' मेनू (या कोने के Paragraph Dialog Launcher '↘') पर क्लिक करें।", "3. सब-मेनू के 'Paragraph Indentation' सेक्शन में 'First Line Indent (0.75\")' पर क्लिक करें।"]}, {"id": "WORD_HI_001-Q07", "question_number": 7, "marks": 3.5, "title": "द्वितीय पैराग्राफ ('विगत प्रशासनिक समीक्षा...') के बाद 6 pt का Space After Paragraph जोड़ें।", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "para2", "expected_action": "space-after", "instruction": "द्वितीय पैराग्राफ ('विगत प्रशासनिक समीक्षा...') के बाद 6 pt का Space After Paragraph जोड़ें।", "tasks": ["द्वितीय पैराग्राफ ('विगत प्रशासनिक समीक्षा...') के बाद 6 pt का Space After Paragraph जोड़ें।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. द्वितीय पैराग्राफ में कर्सर रखें।", "2. ऊपर 'Layout' टैब -> 'Paragraph' ग्रुप में जाएँ (या 'Home' -> 'Line Spacing ↕' सब-मेनू खोलें)।", "3. 'Spacing After' बॉक्स में '6 pt' दर्ज करके Enter दबाएँ (या 'Add Space After Paragraph' पर क्लिक करें)।"]}, {"id": "WORD_HI_001-Q08", "question_number": 8, "marks": 3.5, "title": "तृतीय पैराग्राफ ('समस्त अधीनस्थ कार्यालयों...') को Justify करें और उसमें 0.5 इंच का Hanging Indent लगाएँ।", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "para3", "expected_action": "hanging-indent", "instruction": "तृतीय पैराग्राफ ('समस्त अधीनस्थ कार्यालयों...') को Justify करें और उसमें 0.5 इंच का Hanging Indent लगाएँ।", "tasks": ["तृतीय पैराग्राफ ('समस्त अधीनस्थ कार्यालयों...') को Justify करें और उसमें 0.5 इंच का Hanging Indent लगाएँ।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. तृतीय पैराग्राफ ('समस्त अधीनस्थ कार्यालयों...') में कर्सर रखें।", "2. 'Home' टैब -> 'Paragraph' ग्रुप में 'Justify' बटन दबाएँ।", "3. 'Line and Paragraph Spacing (↕)' सब-मेनू (या Paragraph Dialog '↘') खोलकर 'Hanging Indent (0.5\")' पर क्लिक करें।"]}, {"id": "WORD_HI_001-Q09", "question_number": 9, "marks": 3.5, "title": "तृतीय पैराग्राफ के चारों ओर Outside Border तथा हल्की पृष्ठभूमि शेडिंग (Shading) लागू करें।", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "para3", "expected_action": "border", "instruction": "तृतीय पैराग्राफ के चारों ओर Outside Border तथा हल्की पृष्ठभूमि शेडिंग (Shading) लागू करें।", "tasks": ["तृतीय पैराग्राफ के चारों ओर Outside Border तथा हल्की पृष्ठभूमि शेडिंग (Shading) लागू करें।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. तृतीय पैराग्राफ में कर्सर रखें।", "2. 'Home' टैब -> 'Paragraph' ग्रुप में 'Shading' (रंग की बाल्टी) ड्रॉपडाउन (▾) से हल्का रंग चुनें।", "3. पास वाले 'Borders' ड्रॉपडाउन (▾) पर क्लिक करके 'Outside Borders' चुनें।"]}, {"id": "WORD_HI_001-Q10", "question_number": 10, "marks": 3.5, "title": "प्रमुख विवरण पंक्ति ('प्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।') पर Bulleted List (•) और Italic फॉर्मेटिंग लागू करें।", "category": "rssb_hc_ldc_word", "difficulty": "Medium", "target_part": "events_list", "expected_action": "bullets", "instruction": "प्रमुख विवरण पंक्ति ('प्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।') पर Bulleted List (•) और Italic फॉर्मेटिंग लागू करें।", "tasks": ["प्रमुख विवरण पंक्ति ('प्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।') पर Bulleted List (•) और Italic फॉर्मेटिंग लागू करें।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. 'प्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।' पंक्ति में कर्सर रखें या उसे सिलेक्ट करें।", "2. 'Home' टैब -> 'Paragraph' ग्रुप में 'Bullets (•)' आइकन पर क्लिक करें।", "3. 'Home' टैब -> 'Font' ग्रुप में 'Italic (I)' बटन पर क्लिक करें।"]}, {"id": "WORD_HI_001-Q11", "question_number": 11, "marks": 3.5, "title": "हस्ताक्षरकर्ता पदनाम ('खेल सचिव') एवं नाम ('अर्जुन कुमार') को Right Align और Bold करें।", "category": "rssb_hc_ldc_word", "difficulty": "Hard", "target_part": "sign_role", "expected_action": "justifyRight", "instruction": "हस्ताक्षरकर्ता पदनाम ('खेल सचिव') एवं नाम ('अर्जुन कुमार') को Right Align और Bold करें।", "tasks": ["हस्ताक्षरकर्ता पदनाम ('खेल सचिव') एवं नाम ('अर्जुन कुमार') को Right Align और Bold करें।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. नीचे दिए गए 'खेल सचिव' और 'अर्जुन कुमार' को सिलेक्ट करें।", "2. 'Home' टैब -> 'Paragraph' ग्रुप में 'Align Right' बटन पर क्लिक करें।", "3. 'Home' टैब -> 'Font' ग्रुप में 'Bold (B)' बटन पर क्लिक करें।"]}, {"id": "WORD_HI_001-Q12", "question_number": 12, "marks": 3.5, "title": "दस्तावेज़ में जहाँ भी 'मैदान' शब्द आया है, उसे Find & Replace द्वारा 'सभागार' से बदलें।", "category": "rssb_hc_ldc_word", "difficulty": "Hard", "target_part": "para1", "expected_action": "find-replace", "instruction": "दस्तावेज़ में जहाँ भी 'मैदान' शब्द आया है, उसे Find & Replace द्वारा 'सभागार' से बदलें।", "tasks": ["दस्तावेज़ में जहाँ भी 'मैदान' शब्द आया है, उसे Find & Replace द्वारा 'सभागार' से बदलें।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. 'Home' टैब के सबसे दाएँ 'Editing' ग्रुप में 'Replace' बटन पर क्लिक करें।", "2. 'Find what:' बॉक्स में 'मैदान' लिखें और 'Replace with:' बॉक्स में 'सभागार' लिखें।", "3. 'OK' बटन पर क्लिक करें जिससे सभी स्थानों पर शब्द बदल जाए।"]}, {"id": "WORD_HI_001-Q13", "question_number": 13, "marks": 3.5, "title": "दस्तावेज़ का पेज मार्जिन 'Moderate' तथा पेज ओरिएंटेशन 'Landscape' सेट करें।", "category": "rssb_hc_ldc_word", "difficulty": "Hard", "target_part": "document", "expected_action": "margins", "instruction": "दस्तावेज़ का पेज मार्जिन 'Moderate' तथा पेज ओरिएंटेशन 'Landscape' सेट करें।", "tasks": ["दस्तावेज़ का पेज मार्जिन 'Moderate' तथा पेज ओरिएंटेशन 'Landscape' सेट करें।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. ऊपर 'Layout' टैब पर क्लिक करें।", "2. 'Page Setup' ग्रुप में 'Margins' बटन पर क्लिक करके सब-मेनू से 'Moderate' चुनें।", "3. उसी ग्रुप में 'Orientation' बटन पर क्लिक करके 'Landscape' चुनें।"]}, {"id": "WORD_HI_001-Q14", "question_number": 14, "marks": 3.0, "title": "नीचे दी गई सारणी (Table) की प्रथम हेडर पंक्ति को Bold, Center Aligned और Shading युक्त बनाएँ।", "category": "rssb_hc_ldc_word", "difficulty": "Hard", "target_part": "table", "expected_action": "center", "instruction": "नीचे दी गई सारणी (Table) की प्रथम हेडर पंक्ति को Bold, Center Aligned और Shading युक्त बनाएँ।", "tasks": ["नीचे दी गई सारणी (Table) की प्रथम हेडर पंक्ति को Bold, Center Aligned और Shading युक्त बनाएँ।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. दस्तावेज़ के नीचे दी गई सारणी की पहली पंक्ति ('क्र.सं. | शाखा / अनुभाग...') में क्लिक करें।", "2. 'Home' टैब -> 'Font' ग्रुप में 'Bold (B)' दबाएँ।", "3. 'Paragraph' ग्रुप में 'Center' अलाइनमेंट और 'Shading' से रंग चुनें।"]}, {"id": "WORD_HI_001-Q15", "question_number": 15, "marks": 3.0, "title": "दस्तावेज़ में राजकीय Header व Page Number जोड़ें तथा Design टैब से 'गोपनीय' Watermark लगाएँ।", "category": "rssb_hc_ldc_word", "difficulty": "Hard", "target_part": "document", "expected_action": "watermark", "instruction": "दस्तावेज़ में राजकीय Header व Page Number जोड़ें तथा Design टैब से 'गोपनीय' Watermark लगाएँ।", "tasks": ["दस्तावेज़ में राजकीय Header व Page Number जोड़ें तथा Design टैब से 'गोपनीय' Watermark लगाएँ।"], "source_content": "सूचना (NOTICE)\nराजकीय उच्च माध्यमिक विद्यालय, जयपुर\nदिनांक: 4 नवम्बर 2026\nवाद-विवाद एवं खेलकूद प्रतियोगिता\nसमस्त संबंधित अधिकारियों एवं कर्मचारियों को सूचित किया जाता है कि 'वाद-विवाद एवं खेलकूद प्रतियोगिता' का आयोजन आगामी माह की 21 तारीख को मुख्य मैदान परिसर में किया जाएगा। सभी शाखा प्रभारी अपनी सत्यापित सूचियाँ इस माह की 10 तारीख तक अधोहस्ताक्षरकर्ता को अनिवार्य रूप से प्रस्तुत करें।\nविगत प्रशासनिक समीक्षा के दौरान यह पाया गया कि कतिपय अनुभागों द्वारा दैनिक जावक पंजिका एवं मैदान निरीक्षण अभिलेखों का अद्यतन कार्य पूर्ण नहीं किया गया है। प्रत्येक नोडल अधिकारी लंबित पत्रावलियों की जांच कर शुक्रवार तक विभागीय पोर्टल पर शत-प्रतिशत प्रविष्टि सुनिश्चित करें।\nसमस्त अधीनस्थ कार्यालयों में पत्रावली संधारण, पैराग्राफ फॉर्मेटिंग एवं अभिलेख वर्गीकरण के निर्धारित मानकों का कड़ाई से पालन किया जाना अनिवार्य है। निर्धारित समय-सीमा में प्रतिवेदन प्राप्त नहीं होने पर संबंधित कार्मिक के विरुद्ध नियमानुसार अनुशासनात्मक कार्यवाही की जाएगी।\nप्रमुख विवरण / कार्यसूची: 100 मीटर दौड़, लंबी कूद, गोला फेंक।\nखेल सचिव\nअर्जुन कुमार", "solution_steps": ["1. 'Insert' टैब -> 'Header & Footer' ग्रुप में जाकर 'Header' और 'Page Number -> Bottom of Page' पर क्लिक करें।", "2. 'Design' टैब -> 'Page Background' ग्रुप में 'Watermark' पर क्लिक करके 'गोपनीय' चुनें।"]}]}, "excel_en": {"metadata": {"project": "AG Typing Tutor", "developer": "Xtreme AG Apps", "exam_focus": "Rajasthan RSSB LDC & Rajasthan High Court LDC", "module": "excel", "language": "en", "file_id": "EXCEL_EN_001", "test_number": 1, "duration_minutes": 10, "full_marks": 50, "question_count": 15, "difficulty_breakdown": {"Easy": 3, "Medium": 7, "Hard": 5}, "master_dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]]}, "questions": [{"id": "EXCEL_EN_001-Q01", "question_number": 1, "marks": 3.0, "title": "Make the Column Header Row (Row 2: A2:H2) Bold and apply a light Fill Color.", "category": "rssb_hc_ldc_excel", "difficulty": "Easy", "target_cells": "A2:H2", "expected_formula": "", "expected_action": "bold", "instruction": "Make the Column Header Row (Row 2: A2:H2) Bold and apply a light Fill Color.", "tasks": ["Make the Column Header Row (Row 2: A2:H2) Bold and apply a light Fill Color."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell A2 (or select A2:H2) in Row 2 of the worksheet.", "2. Go to the 'Home' tab -> 'Font' group -> click the 'Bold (B)' button.", "3. In the same 'Font' group, click the 'Fill Color' (paint bucket) button to shade the header row."]}, {"id": "EXCEL_EN_001-Q02", "question_number": 2, "marks": 3.0, "title": "Center align the Employee ID cells in Column A (A3:A7).", "category": "rssb_hc_ldc_excel", "difficulty": "Easy", "target_cells": "A3:A7", "expected_formula": "", "expected_action": "center", "instruction": "Center align the Employee ID cells in Column A (A3:A7).", "tasks": ["Center align the Employee ID cells in Column A (A3:A7)."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Select cell A3 (or range A3:A7) in Column A.", "2. Go to the 'Home' tab -> 'Alignment' group -> click the 'Center' alignment icon."]}, {"id": "EXCEL_EN_001-Q03", "question_number": 3, "marks": 3.0, "title": "Apply 'All Borders' to the main employee data table (A2:H7).", "category": "rssb_hc_ldc_excel", "difficulty": "Easy", "target_cells": "A2:H7", "expected_formula": "", "expected_action": "border", "instruction": "Apply 'All Borders' to the main employee data table (A2:H7).", "tasks": ["Apply 'All Borders' to the main employee data table (A2:H7)."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click inside the table (e.g. cell A2).", "2. Go to the 'Home' tab -> 'Font' group -> click the 'Borders' dropdown arrow (▾) and select 'All Borders'."]}, {"id": "EXCEL_EN_001-Q04", "question_number": 4, "marks": 3.5, "title": "In cell F3, calculate the Gross Pay by adding Basic Pay and DA using =SUM(D3:E3).", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "F3", "expected_formula": "=SUM(D3:E3)", "expected_action": "formula", "instruction": "In cell F3, calculate the Gross Pay by adding Basic Pay and DA using =SUM(D3:E3).", "tasks": ["In cell F3, calculate the Gross Pay by adding Basic Pay and DA using =SUM(D3:E3)."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell F3 (Gross Pay column, first employee row).", "2. Type '=SUM(D3:E3)' in the Formula Bar (or click 'AutoSum Σ' on the Home tab) and press Enter."]}, {"id": "EXCEL_EN_001-Q05", "question_number": 5, "marks": 3.5, "title": "In cell D8 (TOTAL row), calculate the total Basic Pay of all employees using =SUM(D3:D7).", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "D8", "expected_formula": "=SUM(D3:D7)", "expected_action": "formula", "instruction": "In cell D8 (TOTAL row), calculate the total Basic Pay of all employees using =SUM(D3:D7).", "tasks": ["In cell D8 (TOTAL row), calculate the total Basic Pay of all employees using =SUM(D3:D7)."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell D8 in Row 8 (TOTAL row).", "2. Type '=SUM(D3:D7)' in the Formula Bar and press Enter."]}, {"id": "EXCEL_EN_001-Q06", "question_number": 6, "marks": 3.5, "title": "In cell D9 (AVERAGE row), calculate the average Basic Pay using =AVERAGE(D3:D7).", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "D9", "expected_formula": "=AVERAGE(D3:D7)", "expected_action": "formula", "instruction": "In cell D9 (AVERAGE row), calculate the average Basic Pay using =AVERAGE(D3:D7).", "tasks": ["In cell D9 (AVERAGE row), calculate the average Basic Pay using =AVERAGE(D3:D7)."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell D9 in Row 9 (AVERAGE row).", "2. Go to 'Home' -> 'Editing' -> 'AutoSum (Σ) ▾' -> select 'Average' (or type '=AVERAGE(D3:D7)') and press Enter."]}, {"id": "EXCEL_EN_001-Q07", "question_number": 7, "marks": 3.5, "title": "In cell D10 (MAXIMUM row), find the highest Basic Pay using =MAX(D3:D7).", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "D10", "expected_formula": "=MAX(D3:D7)", "expected_action": "formula", "instruction": "In cell D10 (MAXIMUM row), find the highest Basic Pay using =MAX(D3:D7).", "tasks": ["In cell D10 (MAXIMUM row), find the highest Basic Pay using =MAX(D3:D7)."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell D10 in Row 10 (MAXIMUM row).", "2. Go to 'Home' -> 'AutoSum (Σ) ▾' -> select 'Max' (or type '=MAX(D3:D7)') and press Enter."]}, {"id": "EXCEL_EN_001-Q08", "question_number": 8, "marks": 3.5, "title": "In cell D11 (MINIMUM row), find the lowest Basic Pay using =MIN(D3:D7).", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "D11", "expected_formula": "=MIN(D3:D7)", "expected_action": "formula", "instruction": "In cell D11 (MINIMUM row), find the lowest Basic Pay using =MIN(D3:D7).", "tasks": ["In cell D11 (MINIMUM row), find the lowest Basic Pay using =MIN(D3:D7)."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell D11 in Row 11 (MINIMUM row).", "2. Go to 'Home' -> 'AutoSum (Σ) ▾' -> select 'Min' (or type '=MIN(D3:D7)') and press Enter."]}, {"id": "EXCEL_EN_001-Q09", "question_number": 9, "marks": 3.5, "title": "Format the Basic Pay and DA numbers (D3:E7) as Currency (₹) from the Number group.", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "D3:F7", "expected_formula": "", "expected_action": "number-format", "instruction": "Format the Basic Pay and DA numbers (D3:E7) as Currency (₹) from the Number group.", "tasks": ["Format the Basic Pay and DA numbers (D3:E7) as Currency (₹) from the Number group."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell D3 (or select D3:E7).", "2. Go to the 'Home' tab -> 'Number' group -> click the '₹' (Currency) button or select 'Currency' from the Number Format dropdown."]}, {"id": "EXCEL_EN_001-Q10", "question_number": 10, "marks": 3.5, "title": "Select the Report Title Banner in cell A1 and apply 'Merge & Center' and Bold.", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "A1", "expected_formula": "", "expected_action": "merge", "instruction": "Select the Report Title Banner in cell A1 and apply 'Merge & Center' and Bold.", "tasks": ["Select the Report Title Banner in cell A1 and apply 'Merge & Center' and Bold."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell A1 (the top report title row).", "2. Go to the 'Home' tab -> 'Alignment' group -> click the 'Merge & Center' button."]}, {"id": "EXCEL_EN_001-Q11", "question_number": 11, "marks": 3.5, "title": "In cell G3, calculate 10% Bonus on Basic Pay (D3) using the formula =D3*10%.", "category": "rssb_hc_ldc_excel", "difficulty": "Hard", "target_cells": "G3", "expected_formula": "=D3*10%", "expected_action": "formula", "instruction": "In cell G3, calculate 10% Bonus on Basic Pay (D3) using the formula =D3*10%.", "tasks": ["In cell G3, calculate 10% Bonus on Basic Pay (D3) using the formula =D3*10%."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell G3 (Bonus 10% column).", "2. Type '=D3*10%' (or '=D3*0.1') in the Formula Bar and press Enter."]}, {"id": "EXCEL_EN_001-Q12", "question_number": 12, "marks": 3.5, "title": "In cell H3, use the IF formula: if Basic Pay (D3) >= 30000, display \"Senior\", otherwise display \"Junior\".", "category": "rssb_hc_ldc_excel", "difficulty": "Hard", "target_cells": "H3", "expected_formula": "=IF(D3>=30000,\"Senior\",\"Junior\")", "expected_action": "formula", "instruction": "In cell H3, use the IF formula: if Basic Pay (D3) >= 30000, display \"Senior\", otherwise display \"Junior\".", "tasks": ["In cell H3, use the IF formula: if Basic Pay (D3) >= 30000, display \"Senior\", otherwise display \"Junior\"."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell H3 (Category column).", "2. Go to the 'Formulas' tab -> 'Logical' -> 'IF' (or type directly in the Formula Bar).", "3. Enter =IF(D3>=30000,\"Senior\",\"Junior\") and press Enter."]}, {"id": "EXCEL_EN_001-Q13", "question_number": 13, "marks": 3.5, "title": "In cell D12, count how many employees have Basic Pay >= 30000 using =COUNTIF(D3:D7,\">=30000\").", "category": "rssb_hc_ldc_excel", "difficulty": "Hard", "target_cells": "D12", "expected_formula": "=COUNTIF(D3:D7,\">=30000\")", "expected_action": "formula", "instruction": "In cell D12, count how many employees have Basic Pay >= 30000 using =COUNTIF(D3:D7,\">=30000\").", "tasks": ["In cell D12, count how many employees have Basic Pay >= 30000 using =COUNTIF(D3:D7,\">=30000\")."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Click cell D12 in Row 12.", "2. Type =COUNTIF(D3:D7,\">=30000\") in the Formula Bar and press Enter."]}, {"id": "EXCEL_EN_001-Q14", "question_number": 14, "marks": 3.0, "title": "Apply Conditional Formatting ('Highlight Cells Rules -> Greater Than') to the Basic Pay column (D3:D7).", "category": "rssb_hc_ldc_excel", "difficulty": "Hard", "target_cells": "D3:D7", "expected_formula": "", "expected_action": "conditional-format", "instruction": "Apply Conditional Formatting ('Highlight Cells Rules -> Greater Than') to the Basic Pay column (D3:D7).", "tasks": ["Apply Conditional Formatting ('Highlight Cells Rules -> Greater Than') to the Basic Pay column (D3:D7)."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Select cell D3 (or D3:D7).", "2. Go to the 'Home' tab -> 'Styles' group -> click 'Conditional Formatting'.", "3. Click 'Highlight Cells Rules — Greater Than...' from the submenu."]}, {"id": "EXCEL_EN_001-Q15", "question_number": 15, "marks": 3.0, "title": "Apply 'Wrap Text' to the column headers (Row 2) and enable 'Freeze Panes' from the View tab.", "category": "rssb_hc_ldc_excel", "difficulty": "Hard", "target_cells": "A2:H2", "expected_formula": "", "expected_action": "freeze-panes", "instruction": "Apply 'Wrap Text' to the column headers (Row 2) and enable 'Freeze Panes' from the View tab.", "tasks": ["Apply 'Wrap Text' to the column headers (Row 2) and enable 'Freeze Panes' from the View tab."], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Select cell A2 in the header row -> go to 'Home' tab -> 'Alignment' group -> click 'Wrap Text'.", "2. Click the 'View' tab on the Ribbon -> in the 'Window' group, click 'Freeze Panes'."]}]}, "excel_hi": {"metadata": {"project": "AG Typing Tutor", "developer": "Xtreme AG Apps", "exam_focus": "Rajasthan RSSB LDC & Rajasthan High Court LDC", "module": "excel", "language": "hi", "file_id": "EXCEL_HI_001", "test_number": 1, "duration_minutes": 10, "full_marks": 50, "question_count": 15, "difficulty_breakdown": {"Easy": 3, "Medium": 7, "Hard": 5}, "master_dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]]}, "questions": [{"id": "EXCEL_HI_001-Q01", "question_number": 1, "marks": 3.0, "title": "कॉलम हेडर पंक्ति (Row 2: A2:H2) को बोल्ड (Bold) करें और उसमें हल्का Fill Color भरें।", "category": "rssb_hc_ldc_excel", "difficulty": "Easy", "target_cells": "A2:H2", "expected_formula": "", "expected_action": "bold", "instruction": "कॉलम हेडर पंक्ति (Row 2: A2:H2) को बोल्ड (Bold) करें और उसमें हल्का Fill Color भरें।", "tasks": ["कॉलम हेडर पंक्ति (Row 2: A2:H2) को बोल्ड (Bold) करें और उसमें हल्का Fill Color भरें।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. वर्कशीट की दूसरी पंक्ति (Row 2, जैसे सेल A2) पर क्लिक करें।", "2. 'Home' टैब -> 'Font' ग्रुप में जाकर 'Bold (B)' बटन पर क्लिक करें।", "3. उसी 'Font' ग्रुप में 'Fill Color' (रंग की बाल्टी) बटन पर क्लिक करके रंग भरें।"]}, {"id": "EXCEL_HI_001-Q02", "question_number": 2, "marks": 3.0, "title": "कॉलम A में दिए गए Employee ID सेल्स (A3:A7) को सेंटर संरेखित (Center Align) करें।", "category": "rssb_hc_ldc_excel", "difficulty": "Easy", "target_cells": "A3:A7", "expected_formula": "", "expected_action": "center", "instruction": "कॉलम A में दिए गए Employee ID सेल्स (A3:A7) को सेंटर संरेखित (Center Align) करें।", "tasks": ["कॉलम A में दिए गए Employee ID सेल्स (A3:A7) को सेंटर संरेखित (Center Align) करें।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. कॉलम A के सेल A3 को सिलेक्ट करें।", "2. 'Home' टैब -> 'Alignment' ग्रुप में 'Center' अलाइनमेंट बटन पर क्लिक करें।"]}, {"id": "EXCEL_HI_001-Q03", "question_number": 3, "marks": 3.0, "title": "मुख्य कर्मचारी डेटा टेबल (A2:H7) पर 'All Borders' लागू करें।", "category": "rssb_hc_ldc_excel", "difficulty": "Easy", "target_cells": "A2:H7", "expected_formula": "", "expected_action": "border", "instruction": "मुख्य कर्मचारी डेटा टेबल (A2:H7) पर 'All Borders' लागू करें।", "tasks": ["मुख्य कर्मचारी डेटा टेबल (A2:H7) पर 'All Borders' लागू करें।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. टेबल के किसी सेल (जैसे A2) पर क्लिक करें।", "2. 'Home' टैब -> 'Font' ग्रुप में 'Borders' ड्रॉपडाउन तीर (▾) पर क्लिक करें और 'All Borders' चुनें।"]}, {"id": "EXCEL_HI_001-Q04", "question_number": 4, "marks": 3.5, "title": "सेल F3 में Basic Pay और DA का कुल योग (Gross Pay) निकालने के लिए =SUM(D3:E3) फॉर्मूला लगाएँ।", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "F3", "expected_formula": "=SUM(D3:E3)", "expected_action": "formula", "instruction": "सेल F3 में Basic Pay और DA का कुल योग (Gross Pay) निकालने के लिए =SUM(D3:E3) फॉर्मूला लगाएँ।", "tasks": ["सेल F3 में Basic Pay और DA का कुल योग (Gross Pay) निकालने के लिए =SUM(D3:E3) फॉर्मूला लगाएँ।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. सेल F3 पर क्लिक करें।", "2. फॉर्मूला बार में '=SUM(D3:E3)' टाइप करें (या Home टैब पर 'AutoSum Σ' दबाएँ) और Enter दबाएँ।"]}, {"id": "EXCEL_HI_001-Q05", "question_number": 5, "marks": 3.5, "title": "सेल D8 (TOTAL पंक्ति) में सभी कर्मचारियों के Basic Pay का योग =SUM(D3:D7) फॉर्मूले से ज्ञात करें।", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "D8", "expected_formula": "=SUM(D3:D7)", "expected_action": "formula", "instruction": "सेल D8 (TOTAL पंक्ति) में सभी कर्मचारियों के Basic Pay का योग =SUM(D3:D7) फॉर्मूले से ज्ञात करें।", "tasks": ["सेल D8 (TOTAL पंक्ति) में सभी कर्मचारियों के Basic Pay का योग =SUM(D3:D7) फॉर्मूले से ज्ञात करें।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Row 8 के सेल D8 पर क्लिक करें।", "2. फॉर्मूला बार में '=SUM(D3:D7)' लिखकर Enter दबाएँ।"]}, {"id": "EXCEL_HI_001-Q06", "question_number": 6, "marks": 3.5, "title": "सेल D9 (AVERAGE पंक्ति) में Basic Pay का औसत मान =AVERAGE(D3:D7) फंक्शन से ज्ञात करें।", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "D9", "expected_formula": "=AVERAGE(D3:D7)", "expected_action": "formula", "instruction": "सेल D9 (AVERAGE पंक्ति) में Basic Pay का औसत मान =AVERAGE(D3:D7) फंक्शन से ज्ञात करें।", "tasks": ["सेल D9 (AVERAGE पंक्ति) में Basic Pay का औसत मान =AVERAGE(D3:D7) फंक्शन से ज्ञात करें।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Row 9 के सेल D9 पर क्लिक करें।", "2. 'Home' -> 'Editing' -> 'AutoSum (Σ) ▾' मेनू से 'Average' चुनें (या '=AVERAGE(D3:D7)' लिखें) और Enter दबाएँ।"]}, {"id": "EXCEL_HI_001-Q07", "question_number": 7, "marks": 3.5, "title": "सेल D10 (MAXIMUM पंक्ति) में सर्वाधिक Basic Pay ज्ञात करने के लिए =MAX(D3:D7) फॉर्मूला लगाएँ।", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "D10", "expected_formula": "=MAX(D3:D7)", "expected_action": "formula", "instruction": "सेल D10 (MAXIMUM पंक्ति) में सर्वाधिक Basic Pay ज्ञात करने के लिए =MAX(D3:D7) फॉर्मूला लगाएँ।", "tasks": ["सेल D10 (MAXIMUM पंक्ति) में सर्वाधिक Basic Pay ज्ञात करने के लिए =MAX(D3:D7) फॉर्मूला लगाएँ।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Row 10 के सेल D10 पर क्लिक करें।", "2. 'AutoSum (Σ) ▾' मेनू से 'Max' चुनें (या '=MAX(D3:D7)' टाइप करें) और Enter दबाएँ।"]}, {"id": "EXCEL_HI_001-Q08", "question_number": 8, "marks": 3.5, "title": "सेल D11 (MINIMUM पंक्ति) में न्यूनतम Basic Pay ज्ञात करने के लिए =MIN(D3:D7) फॉर्मूला लगाएँ।", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "D11", "expected_formula": "=MIN(D3:D7)", "expected_action": "formula", "instruction": "सेल D11 (MINIMUM पंक्ति) में न्यूनतम Basic Pay ज्ञात करने के लिए =MIN(D3:D7) फॉर्मूला लगाएँ।", "tasks": ["सेल D11 (MINIMUM पंक्ति) में न्यूनतम Basic Pay ज्ञात करने के लिए =MIN(D3:D7) फॉर्मूला लगाएँ।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Row 11 के सेल D11 पर क्लिक करें।", "2. 'AutoSum (Σ) ▾' मेनू से 'Min' चुनें (या '=MIN(D3:D7)' टाइप करें) और Enter दबाएँ।"]}, {"id": "EXCEL_HI_001-Q09", "question_number": 9, "marks": 3.5, "title": "कॉलम D की वेतन राशियों (D3:D7) को Number ग्रुप से Currency (₹) फॉरमेट में बदलें।", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "D3:F7", "expected_formula": "", "expected_action": "number-format", "instruction": "कॉलम D की वेतन राशियों (D3:D7) को Number ग्रुप से Currency (₹) फॉरमेट में बदलें।", "tasks": ["कॉलम D की वेतन राशियों (D3:D7) को Number ग्रुप से Currency (₹) फॉरमेट में बदलें।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. सेल D3 को सिलेक्ट करें।", "2. 'Home' टैब -> 'Number' ग्रुप में जाकर '₹' (Currency) आइकन पर क्लिक करें या ड्रॉपडाउन से 'Currency' चुनें।"]}, {"id": "EXCEL_HI_001-Q10", "question_number": 10, "marks": 3.5, "title": "प्रथम पंक्ति के रिपोर्ट शीर्षक (Cell A1) पर 'Merge & Center' तथा Bold लागू करें।", "category": "rssb_hc_ldc_excel", "difficulty": "Medium", "target_cells": "A1", "expected_formula": "", "expected_action": "merge", "instruction": "प्रथम पंक्ति के रिपोर्ट शीर्षक (Cell A1) पर 'Merge & Center' तथा Bold लागू करें।", "tasks": ["प्रथम पंक्ति के रिपोर्ट शीर्षक (Cell A1) पर 'Merge & Center' तथा Bold लागू करें।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. सेल A1 (शीर्षक पंक्ति) पर क्लिक करें।", "2. 'Home' टैब -> 'Alignment' ग्रुप में 'Merge & Center' बटन पर क्लिक करें।"]}, {"id": "EXCEL_HI_001-Q11", "question_number": 11, "marks": 3.5, "title": "सेल G3 में Basic Pay (D3) का 10% बोनस निकालने के लिए =D3*10% फॉर्मूला लगाएँ।", "category": "rssb_hc_ldc_excel", "difficulty": "Hard", "target_cells": "G3", "expected_formula": "=D3*10%", "expected_action": "formula", "instruction": "सेल G3 में Basic Pay (D3) का 10% बोनस निकालने के लिए =D3*10% फॉर्मूला लगाएँ।", "tasks": ["सेल G3 में Basic Pay (D3) का 10% बोनस निकालने के लिए =D3*10% फॉर्मूला लगाएँ।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. सेल G3 पर क्लिक करें।", "2. फॉर्मूला बार में '=D3*10%' (या '=D3*0.1') लिखकर Enter दबाएँ।"]}, {"id": "EXCEL_HI_001-Q12", "question_number": 12, "marks": 3.5, "title": "सेल H3 में IF फॉर्मूला लगाएँ: यदि Basic Pay (D3) >= 30000 हो तो \"Senior\", अन्यथा \"Junior\" आए।", "category": "rssb_hc_ldc_excel", "difficulty": "Hard", "target_cells": "H3", "expected_formula": "=IF(D3>=30000,\"Senior\",\"Junior\")", "expected_action": "formula", "instruction": "सेल H3 में IF फॉर्मूला लगाएँ: यदि Basic Pay (D3) >= 30000 हो तो \"Senior\", अन्यथा \"Junior\" आए।", "tasks": ["सेल H3 में IF फॉर्मूला लगाएँ: यदि Basic Pay (D3) >= 30000 हो तो \"Senior\", अन्यथा \"Junior\" आए।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. सेल H3 पर क्लिक करें।", "2. 'Formulas' टैब -> 'Logical' -> 'IF' चुनें (या सीधे फॉर्मूला बार में टाइप करें)।", "3. =IF(D3>=30000,\"Senior\",\"Junior\") लिखकर Enter दबाएँ।"]}, {"id": "EXCEL_HI_001-Q13", "question_number": 13, "marks": 3.5, "title": "सेल D12 में =COUNTIF(D3:D7,\">=30000\") का उपयोग करके ज्ञात करें कि कितने कर्मचारियों का वेतन 30000 या अधिक है।", "category": "rssb_hc_ldc_excel", "difficulty": "Hard", "target_cells": "D12", "expected_formula": "=COUNTIF(D3:D7,\">=30000\")", "expected_action": "formula", "instruction": "सेल D12 में =COUNTIF(D3:D7,\">=30000\") का उपयोग करके ज्ञात करें कि कितने कर्मचारियों का वेतन 30000 या अधिक है।", "tasks": ["सेल D12 में =COUNTIF(D3:D7,\">=30000\") का उपयोग करके ज्ञात करें कि कितने कर्मचारियों का वेतन 30000 या अधिक है।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. Row 12 के सेल D12 पर क्लिक करें।", "2. फॉर्मूला बार में =COUNTIF(D3:D7,\">=30000\") टाइप करके Enter दबाएँ।"]}, {"id": "EXCEL_HI_001-Q14", "question_number": 14, "marks": 3.0, "title": "Basic Pay कॉलम (D3:D7) पर 'Conditional Formatting -> Highlight Cells Rules -> Greater Than' लागू करें।", "category": "rssb_hc_ldc_excel", "difficulty": "Hard", "target_cells": "D3:D7", "expected_formula": "", "expected_action": "conditional-format", "instruction": "Basic Pay कॉलम (D3:D7) पर 'Conditional Formatting -> Highlight Cells Rules -> Greater Than' लागू करें।", "tasks": ["Basic Pay कॉलम (D3:D7) पर 'Conditional Formatting -> Highlight Cells Rules -> Greater Than' लागू करें।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. सेल D3 को सिलेक्ट करें।", "2. 'Home' टैब -> 'Styles' ग्रुप में 'Conditional Formatting' बटन पर क्लिक करें।", "3. सब-मेनू से 'Highlight Cells Rules — Greater Than...' पर क्लिक करें।"]}, {"id": "EXCEL_HI_001-Q15", "question_number": 15, "marks": 3.0, "title": "हेडर पंक्ति (Row 2) पर 'Wrap Text' लगाएँ और View टैब से 'Freeze Panes' सक्रिय करें।", "category": "rssb_hc_ldc_excel", "difficulty": "Hard", "target_cells": "A2:H2", "expected_formula": "", "expected_action": "freeze-panes", "instruction": "हेडर पंक्ति (Row 2) पर 'Wrap Text' लगाएँ और View टैब से 'Freeze Panes' सक्रिय करें।", "tasks": ["हेडर पंक्ति (Row 2) पर 'Wrap Text' लगाएँ और View टैब से 'Freeze Panes' सक्रिय करें।"], "sheet_name": "Payroll_Sheet", "dataset_range": "A1:H12", "dataset": [["RAJASTHAN STATE TREASURY PAYROLL STATEMENT — TEST #01", "", "", "", "", "", "", ""], ["Emp ID", "Employee Name", "Department", "Basic Pay", "DA Allowance", "Gross Pay", "Bonus (10%)", "Category"], ["E101", "Amit Kumar Sharma", "Judicial", 28000, 11200, "", "", ""], ["E102", "Priya Verma", "Establishment", 34000, 13600, "", "", ""], ["E103", "Rahul Meena", "Accounts", 26000, 10400, "", "", ""], ["E104", "Neha Gupta", "Audit Cell", 38000, 15200, "", "", ""], ["E105", "Vikram Singh Rathore", "Records", 31000, 12400, "", "", ""], ["TOTAL (SUM)", "", "", "", "", "", "", ""], ["AVERAGE", "", "", "", "", "", "", ""], ["MAXIMUM (MAX)", "", "", "", "", "", "", ""], ["MINIMUM (MIN)", "", "", "", "", "", "", ""], ["COUNT (>=30000)", "", "", "", "", "", "", ""]], "solution_steps": ["1. सेल A2 को सिलेक्ट करके 'Home' -> 'Alignment' ग्रुप में 'Wrap Text' पर क्लिक करें।", "2. ऊपर 'View' टैब पर क्लिक करें और 'Window' ग्रुप में 'Freeze Panes' पर क्लिक करें।"]}]}};

// In-memory + IndexedDB/sessionStorage custom uploaded bank cache so newly uploaded files load immediately
const O19_CUSTOM_UPLOADED_BANK = new Map()
let O19_CACHE_BUST_VERSION = Date.now()

function normalizeEfficiencyJsonData(raw, moduleName, language, fileNo, fileId) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid JSON object')
  const rawQuestions = Array.isArray(raw)
    ? raw
    : (raw.questions || raw.tasks || raw.items || raw.exercises || raw.data?.questions || raw.data?.tasks || [])
  if (!Array.isArray(rawQuestions) || !rawQuestions.length) {
    throw new Error('No questions array found in JSON')
  }

  const meta = (raw.metadata && typeof raw.metadata === 'object') ? { ...raw.metadata } : {}
  meta.file_id = meta.file_id || raw.file_id || raw.id || fileId
  meta.test_number = meta.test_number || raw.test_number || raw.testNo || fileNo
  meta.module = meta.module || raw.module || moduleName
  meta.language = meta.language || raw.language || language

  // Normalize Word document structure across old and new JSON schemas
  const rawDocStruct = meta.document_structure || raw.document_structure || raw.documentStructure || (raw.document && typeof raw.document === 'object' && !Array.isArray(raw.document) ? raw.document : null)
  if (rawDocStruct && typeof rawDocStruct === 'object') {
    const paras = Array.isArray(rawDocStruct.paragraphs) ? rawDocStruct.paragraphs : []
    meta.document_structure = {
      doc_type: rawDocStruct.doc_type || rawDocStruct.heading || rawDocStruct.title || rawDocStruct.header || '',
      org_name: rawDocStruct.org_name || rawDocStruct.organization || rawDocStruct.subtitle || rawDocStruct.department || '',
      date_line: rawDocStruct.date_line || rawDocStruct.date || '',
      subject_line: rawDocStruct.subject_line || rawDocStruct.subject || '',
      para1: rawDocStruct.para1 || paras[0] || rawDocStruct.body1 || rawDocStruct.paragraph1 || '',
      para2: rawDocStruct.para2 || paras[1] || rawDocStruct.body2 || rawDocStruct.paragraph2 || '',
      para3: rawDocStruct.para3 || paras[2] || rawDocStruct.body3 || rawDocStruct.paragraph3 || '',
      events_list: rawDocStruct.events_list || paras[3] || rawDocStruct.schedule || rawDocStruct.list || '',
      sign_role: rawDocStruct.sign_role || rawDocStruct.designation || rawDocStruct.footer_role || '',
      sign_name: rawDocStruct.sign_name || rawDocStruct.signatory || rawDocStruct.footer_name || '',
      table: Array.isArray(rawDocStruct.table) ? rawDocStruct.table : (Array.isArray(raw.table) ? raw.table : [])
    }
  }

  // Normalize top-level passage/source_content if provided at root
  const rootSourceContent = typeof raw.source_content === 'string' ? raw.source_content
    : typeof raw.passage === 'string' ? raw.passage
    : typeof raw.content === 'string' ? raw.content
    : typeof raw.document === 'string' ? raw.document
    : typeof raw.text === 'string' ? raw.text
    : Array.isArray(raw.paragraphs) ? raw.paragraphs.join('\n')
    : ''

  // Normalize Excel master dataset across old and new JSON schemas
  const rawDataset = meta.master_dataset || raw.master_dataset || raw.dataset || raw.table || raw.sheet_data || raw.rows || raw.grid || (Array.isArray(raw.data) ? raw.data : null)
  if (Array.isArray(rawDataset) && rawDataset.length) {
    meta.master_dataset = rawDataset
  }

  const normalizedQuestions = rawQuestions.map((q, idx) => {
    const qNum = idx + 1
    const instrText = q.instruction || q.title || q.question || q.task || q.prompt || q.text || (Array.isArray(q.tasks) && q.tasks[0]) || `Question ${qNum}`
    const qTasks = Array.isArray(q.tasks) && q.tasks.length ? q.tasks : [instrText]
    const qSteps = Array.isArray(q.solution_steps) && q.solution_steps.length
      ? q.solution_steps
      : Array.isArray(q.steps) && q.steps.length
      ? q.steps
      : typeof q.solution === 'string' && q.solution.trim()
      ? q.solution.split(/\n+/)
      : ['1. Select the target text or cell in the workspace.', '2. Go to the required Ribbon Tab and Group.', '3. Apply the formatting or formula as instructed.']

    return {
      ...q,
      id: q.id || `${fileId}-Q${String(qNum).padStart(2, '0')}`,
      question_number: q.question_number || qNum,
      marks: Number(q.marks ?? q.points ?? (qNum <= 3 || qNum >= 14 ? 3.0 : 3.5)),
      title: q.title || instrText,
      instruction: instrText,
      tasks: qTasks,
      difficulty: q.difficulty || (qNum <= 3 ? 'Easy' : qNum <= 10 ? 'Medium' : 'Hard'),
      target_part: q.target_part || q.targetPart || q.part || '',
      target_cells: q.target_cells || q.targetCells || q.cell || q.range || '',
      expected_formula: q.expected_formula || q.expectedFormula || q.formula || q.answer || '',
      expected_action: q.expected_action || q.expectedAction || q.action || q.type || '',
      source_content: q.source_content || q.passage || q.content || q.text || rootSourceContent || '',
      dataset: Array.isArray(q.dataset) && q.dataset.length ? q.dataset : (meta.master_dataset || []),
      sheet_name: q.sheet_name || raw.sheet_name || meta.sheet_name || 'Sheet1',
      solution_steps: qSteps
    }
  })

  if (!meta.master_dataset && Array.isArray(normalizedQuestions[0]?.dataset) && normalizedQuestions[0].dataset.length) {
    meta.master_dataset = normalizedQuestions[0].dataset
  }

  return {
    ...raw,
    metadata: meta,
    questions: normalizedQuestions,
    _loadedFromDisk: true
  }
}

async function efficiencyFetchFile(moduleName, language, fileNo) {
  const modUpper = String(moduleName || 'word').toUpperCase()
  const modLower = String(moduleName || 'word').toLowerCase()
  const langUpper = String(language || 'en').toUpperCase()
  const langLower = String(language || 'en').toLowerCase()
  const prefixUpper = `${modUpper}_${langUpper}`
  const prefixLower = `${modLower}_${langLower}`
  const num3 = String(fileNo).padStart(3, '0')
  const num2 = String(fileNo).padStart(2, '0')
  const num1 = String(fileNo)
  const fileId = efficiencyFileId(moduleName, language, fileNo)

  // 1. Check if user loaded/synced files via the in-app Folder Sync or session cache
  if (O19_CUSTOM_UPLOADED_BANK.has(fileId)) {
    return JSON.parse(JSON.stringify(O19_CUSTOM_UPLOADED_BANK.get(fileId)))
  }

  // Clear any stale old draft in localStorage so old exercises never stick
  try {
    localStorage.removeItem('ag-eff-word-draft')
    localStorage.removeItem('ag-eff-excel-draft')
  } catch {}

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/'
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  // Try all common folder locations and naming conventions where new files may have been uploaded
  const candidateRelativePaths = [
    `efficiency-bank/${prefixUpper}/${prefixUpper}_${num3}.json`,
    `efficiency-bank/${prefixUpper}/${prefixUpper}_${num2}.json`,
    `efficiency-bank/${prefixUpper}/${prefixUpper}_${num1}.json`,
    `efficiency-bank/${prefixLower}/${prefixLower}_${num3}.json`,
    `efficiency-bank/${prefixUpper}_${num3}.json`,
    `efficiency-bank/${prefixLower}_${num3}.json`,
    `src/efficiency-bank/${prefixUpper}/${prefixUpper}_${num3}.json`,
    `src/efficiency-bank/${prefixLower}/${prefixLower}_${num3}.json`,
    `src/efficiency-bank/${prefixUpper}_${num3}.json`,
    `public/efficiency-bank/${prefixUpper}/${prefixUpper}_${num3}.json`,
    `efficiency/${prefixUpper}/${prefixUpper}_${num3}.json`,
    `efficiency/${prefixUpper}_${num3}.json`,
    `exercises/efficiency-bank/${prefixUpper}/${prefixUpper}_${num3}.json`,
    `exercises/${prefixUpper}/${prefixUpper}_${num3}.json`
  ]

  for (const rel of candidateRelativePaths) {
    const url = `${cleanBase}${rel}?v=${O19_CACHE_BUST_VERSION}`
    try {
      const response = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } })
      if (!response.ok) continue
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('text/html')) continue
      const rawData = await response.json()
      const normalized = normalizeEfficiencyJsonData(rawData, modLower, langLower, fileNo, fileId)
      normalized._sourceUrl = rel
      return normalized
    } catch (err) {
      // Try next candidate path
    }
  }

  // Fallback only if none of the paths exist
  const tpl = O19_FALLBACK_BANK[`${modLower}_${langLower}`] || O19_FALLBACK_BANK.word_en
  const clone = JSON.parse(JSON.stringify(tpl))
  clone.metadata.file_id = fileId
  clone.metadata.test_number = fileNo
  clone._isFallback = true
  clone.questions.forEach((q, idx) => { q.id = `${fileId}-Q${String(idx + 1).padStart(2, '0')}` })
  return clone
}

function efficiencyShowLanguagePicker(page) {
  const root = document.querySelector('#efficiency-simulator')
  if (!root) return
  const isWord = page === 'word-efficiency'
  efficiencyState.activePage = page
  efficiencyState.module = isWord ? 'word' : 'excel'
  if (efficiencyState.timer) clearInterval(efficiencyState.timer)
  root.classList.remove('efficiency-fullscreen')
  root.innerHTML = `<section class="efficiency-hub"><div class="efficiency-hub-hero"><span class="eyebrow">RAJASTHAN RSSB LDC &amp; HIGH COURT LDC EFFICIENCY</span><h2>${isWord ? 'MS Word 2019 Efficiency' : 'MS Excel 2019 Efficiency'}</h2><p>Choose your exercise language. Each test has 15 systematic questions (Full Marks: 25 · Qualifying: 9 · Duration: 10:00 Minutes).</p><div class="efficiency-hub-stats"><span><strong>40</strong><small>Tests per language</small></span><span><strong>15</strong><small>Questions (25 Marks)</small></span><span><strong>10:00</strong><small>Minutes Exam Time</small></span></div></div><div class="efficiency-language-grid"><button type="button" class="efficiency-language-card" data-eff-language="en"><span class="efficiency-language-icon">EN</span><span><strong>English Efficiency</strong><small>RSSB LDC Official Pattern (25 Marks · 15 Tasks)</small></span><span class="efficiency-card-arrow">›</span></button><button type="button" class="efficiency-language-card" data-eff-language="hi"><span class="efficiency-language-icon hindi">हि</span><span><strong>हिन्दी Efficiency</strong><small>राजस्थान RSSB LDC आधिकारिक पैटर्न (25 अंक · 15 प्रश्न)</small></span><span class="efficiency-card-arrow">›</span></button></div></section>`
  root.querySelectorAll('[data-eff-language]').forEach(button => button.addEventListener('click', () => efficiencyShowExerciseList(page, button.dataset.effLanguage)))
}

async function efficiencyShowExerciseList(page, language) {
  const root = document.querySelector('#efficiency-simulator')
  if (!root) return
  const moduleName = page === 'word-efficiency' ? 'word' : 'excel'
  efficiencyState.module = moduleName
  efficiencyState.language = language
  if (efficiencyState.timer) { clearInterval(efficiencyState.timer); efficiencyState.timer = null }
  root.classList.remove('efficiency-fullscreen')
  root.innerHTML = `<section class="efficiency-catalog"><div class="efficiency-catalog-top"><button type="button" class="secondary-button" id="eff-back-languages">← Languages</button><div><span class="eyebrow">${language === 'hi' ? 'हिन्दी' : 'ENGLISH'} QUESTION BANK</span><h2>${moduleName === 'word' ? 'MS Word' : 'MS Excel'} Efficiency Tests (1 to 40)</h2><p>Loading 40 exam exercises…</p></div></div></section>`
  const records = await Promise.all(Array.from({ length: 40 }, async (_, index) => {
    const fileNo = index + 1
    try { return { fileNo, data: await efficiencyFetchFile(moduleName, language, fileNo) } }
    catch (error) { return { fileNo, data: null } }
  }))
  if (!document.querySelector('#efficiency-simulator') || efficiencyState.activePage !== page) return
  const available = records.filter(r => r.data)
  const diskLoadedCount = records.filter(r => r.data && !r.data._isFallback).length
  root.innerHTML = `<section class="efficiency-catalog"><div class="efficiency-catalog-top"><button type="button" class="secondary-button" id="eff-back-languages">← Languages</button><div><span class="eyebrow">${language === 'hi' ? 'हिन्दी' : 'ENGLISH'} QUESTION BANK · RSSB &amp; HIGH COURT LDC</span><h2>${moduleName === 'word' ? 'MS Word' : 'MS Excel'} Efficiency Tests</h2><p>Select any exercise below to view the Test Instructions (10:00 Minutes · Full Marks: 50) and start the test.</p><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center;"><button type="button" class="secondary-button" id="eff-force-reload-bank" style="padding:5px 12px;font-size:12px;">🔄 Force Reload New Files</button><label class="secondary-button" style="padding:5px 12px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">📂 Select efficiency-bank Folder<input type="file" id="eff-folder-upload-input" webkitdirectory directory multiple accept=".json" style="display:none;"></label><small style="color:${diskLoadedCount > 0 ? '#15803d' : '#b45309'};font-weight:700;">${diskLoadedCount > 0 ? `✓ ${diskLoadedCount}/40 New JSON Files Active` : '⚠️ Using built-in bank — place JSONs in public/efficiency-bank/ or click Select Folder'}</small></div></div><div class="efficiency-catalog-count"><strong>${available.length}/40</strong><small>Available</small></div></div><div class="efficiency-exercise-grid">${records.map(record => {
    const data = record.data
    const st = data?.metadata?.document_structure
    const title = (st && (st.doc_type || st.org_name)) ? `${st.doc_type || ''} ${st.org_name ? '— ' + st.org_name : ''}`.trim() : (data?.metadata?.title || data?.title || data?.questions?.[0]?.title || `Test #${String(record.fileNo).padStart(2,'0')}`)
    return `<button type="button" class="efficiency-exercise-card" data-eff-file="${record.fileNo}"><span class="efficiency-exercise-number">${String(record.fileNo).padStart(2, '0')}</span><span class="efficiency-exercise-copy"><strong>${efficiencyEscape(title)}</strong><small>Test #${record.fileNo} · ${data?.questions?.length || 15} Questions · 25 Marks · 10:00 Min ${data?._isFallback ? '(Built-in)' : '✓'}</small></span><span class="eff-card-start-btn">Start</span></button>`
  }).join('')}</div></section>`
  root.querySelector('#eff-back-languages')?.addEventListener('click', () => efficiencyShowLanguagePicker(page))
  root.querySelector('#eff-force-reload-bank')?.addEventListener('click', () => {
    O19_CACHE_BUST_VERSION = Date.now()
    efficiencyShowExerciseList(page, language)
  })
  root.querySelector('#eff-folder-upload-input')?.addEventListener('change', async (ev) => {
    const files = Array.from(ev.target.files || []).filter(f => f.name.toLowerCase().endsWith('.json'))
    for (const f of files) {
      try {
        const txt = await f.text()
        const raw = JSON.parse(txt)
        const match = f.name.toUpperCase().match(/(WORD|EXCEL)_(EN|HI)_0*([1-9][0-9]*)/)
        if (match) {
          const mName = match[1].toLowerCase()
          const lName = match[2].toLowerCase()
          const fNo = Number(match[3])
          const fId = efficiencyFileId(mName, lName, fNo)
          const norm = normalizeEfficiencyJsonData(raw, mName, lName, fNo, fId)
          O19_CUSTOM_UPLOADED_BANK.set(fId, norm)
        }
      } catch (e) {
        console.warn('Skipped invalid JSON file:', f.name, e)
      }
    }
    O19_CACHE_BUST_VERSION = Date.now()
    efficiencyShowExerciseList(page, language)
  })
  root.querySelectorAll('[data-eff-file]').forEach(button => button.addEventListener('click', () => {
    const record = records.find(item => item.fileNo === Number(button.dataset.effFile))
    if (record?.data) {
      efficiencyShowQuestionList(page, language, record.fileNo, record.data)
    }
  }))
}

/* ============================================================================
   PRE-TEST INSTRUCTIONS SCREEN (EXACT REPLICA OF USER IMAGE 1: image_9be46b.png)
   Opens immediately when the user clicks an exercise!
   ============================================================================ */
function efficiencyShowQuestionList(page, language, fileNo, fileData) {
  const root = document.querySelector('#efficiency-simulator')
  if (!root) return
  const isWord = page === 'word-efficiency'
  efficiencyState.module = isWord ? 'word' : 'excel'
  efficiencyState.language = language
  efficiencyState.fileNo = fileNo
  efficiencyState.fileData = fileData
  efficiencyState.questionMarks = {}
  efficiencyState.perQuestionActions = {}
  efficiencyState.partActions = {}
  if (efficiencyState.timer) { clearInterval(efficiencyState.timer); efficiencyState.timer = null }
  root.classList.remove('efficiency-fullscreen')

  const candidateName = userProfile?.name || 'Xtreme AG Apps'
  const testDesc = isWord ? 'Word Formatting Test' : 'Excel Spreadsheet Test'
  const isHi = language === 'hi'

  root.innerHTML = `
    <section class="o19-inst-screen">
      <div class="o19-inst-top-cards">
        <article class="o19-inst-info-card">
          <span class="o19-inst-card-label">PERSONAL INFORMATION</span>
          <strong class="o19-inst-card-val">${efficiencyEscape(candidateName)}</strong>
          <small class="o19-inst-card-sub">Rajasthan RSSB LDC &amp; High Court LDC</small>
        </article>
        <article class="o19-inst-info-card">
          <span class="o19-inst-card-label">TEST DESCRIPTION</span>
          <strong class="o19-inst-card-val">${testDesc}</strong>
          <small class="o19-inst-card-sub">(Full Marks: 25 · Qualifying: 9)</small>
        </article>
        <article class="o19-inst-info-card">
          <span class="o19-inst-card-label">TEST ID</span>
          <strong class="o19-inst-card-val">Test #${fileNo}</strong>
          <small class="o19-inst-card-sub">${efficiencyEscape(efficiencyFileId(efficiencyState.module, language, fileNo))} · 15 Questions</small>
        </article>
      </div>

      <h2 class="o19-inst-heading">Instructions:</h2>

      <div class="o19-inst-box">
        <ol class="o19-inst-list">
          <li>1. This is a computer proficiency &amp; efficiency test focusing on <strong>${isWord ? 'Document Formatting' : 'Spreadsheet Formulas &amp; Formatting'}</strong> (as per Rajasthan RSSB LDC &amp; High Court LDC syllabus).</li>
          <li>2. You will be given <strong>15 formatting tasks</strong> (3 Easy, 7 Medium, 5 Hard) on a single unified ${isWord ? 'document' : 'worksheet'} to complete within the time limit.</li>
          <li>3. Total duration of this test is <strong>10:00 minutes</strong>.</li>
          <li>4. Total marks for this test is <strong>25</strong> (as per RSSB LDC pattern). All sub-tasks in a question must be completed accurately; marks and solutions are shown at the end on Submit.</li>
          <li>5. The counting timer in the top right corner of the screen will display the remaining time.</li>
          <li>6. For Word: Ensure you follow the instructions for Font, Bold, Italic, Underline, Line Spacing, Paragraph Indentation, Borders/Shading, Find &amp; Replace, and Tables exactly as mentioned.</li>
          <li>7. For Excel: Accurately enter formulas (SUM, AVERAGE, MAX, MIN, IF, COUNTIF, 10%) and format cells in the specified columns and rows where required.</li>
          <li>8. Click <strong>'Submit'</strong> when you have finished all tasks. Assessment and step-by-step menu solutions are automatic.</li>
        </ol>

        <div class="o19-inst-actions">
          <button type="button" class="o19-inst-start-btn" id="o19-start-exam-now">Start Efficiency Test</button>
          <button type="button" class="secondary-button" id="o19-back-to-exercises">← Back to Exercises</button>
        </div>
      </div>
    </section>
  `

  root.querySelector('#o19-back-to-exercises')?.addEventListener('click', () => {
    efficiencyShowExerciseList(page, language)
  })

  root.querySelector('#o19-start-exam-now')?.addEventListener('click', () => {
    const firstQ = fileData?.questions?.[0]
    if (firstQ) efficiencyRender(page, firstQ, language, 1, false)
  })
}

function efficiencyBuildCohesiveWordHTML(questions, fileData) {
  const st = fileData?.metadata?.document_structure || fileData?.document_structure
  const hasStructFields = st && [st.doc_type, st.org_name, st.date_line, st.subject_line, st.para1, st.para2, st.para3, st.events_list, st.sign_role, st.sign_name].some(Boolean)
  if (hasStructFields) {
    const tblRows = Array.isArray(st.table) ? st.table : (Array.isArray(fileData?.table) ? fileData.table : [])
    const tblHtml = tblRows.length ? `
      <table class="word-inserted-table" id="word-part-table" data-doc-part="table" style="margin-top:14pt;">
        <tbody>
          ${tblRows.map((row) => `<tr data-doc-part="table">${row.map(cell => `<td data-doc-part="table">${efficiencyEscape(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>` : ''
    const orderedParts = [
      ['doc_type', st.doc_type, 'word-doc-line'],
      ['org_name', st.org_name, 'word-doc-line'],
      ['date_line', st.date_line, 'word-doc-line'],
      ['subject_line', st.subject_line, 'word-doc-line'],
      ['para1', st.para1, 'word-doc-para'],
      ['para2', st.para2, 'word-doc-para'],
      ['para3', st.para3, 'word-doc-para'],
      ['events_list', st.events_list, 'word-doc-line'],
      ['sign_role', st.sign_role, 'word-doc-line'],
      ['sign_name', st.sign_name, 'word-doc-line']
    ].filter(([, val]) => Boolean(String(val || '').trim()))
    return orderedParts.map(([pk, val, cls]) =>
      `<p class="${cls}" id="word-part-${pk}" data-doc-part="${pk}">${efficiencyEscape(val)}</p>`
    ).join('\n') + tblHtml
  }
  const rawSource = questions?.find(q => q?.source_content)?.source_content
    || fileData?.source_content
    || fileData?.passage
    || fileData?.content
    || fileData?.document
    || (Array.isArray(fileData?.paragraphs) ? fileData.paragraphs.join('\n') : '')
    || 'NOTICE\nGovt. Sen. Sec. School, Jaipur\nDate: 21st Oct 2026\nDebate Competition\nThis is to inform all students that the Debate Competition will be held next month.'
  const lines = String(rawSource).split(/\n+/).filter(Boolean)
  const partKeys = ['doc_type', 'org_name', 'date_line', 'subject_line', 'para1', 'para2', 'para3', 'events_list', 'sign_role', 'sign_name']
  const tblRows = Array.isArray(fileData?.table) ? fileData.table : (Array.isArray(questions?.[0]?.table) ? questions[0].table : [])
  const tblHtml = tblRows.length ? `
    <table class="word-inserted-table" id="word-part-table" data-doc-part="table" style="margin-top:14pt;">
      <tbody>
        ${tblRows.map((row) => `<tr data-doc-part="table">${row.map(cell => `<td data-doc-part="table">${efficiencyEscape(cell)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>` : ''
  return lines.map((line, idx) => {
    const pk = partKeys[idx] || `para${idx}`
    const cls = pk.startsWith('para') ? 'word-doc-para' : 'word-doc-line'
    return `<p class="${cls}" id="word-part-${pk}" data-doc-part="${pk}">${efficiencyEscape(line)}</p>`
  }).join('') + tblHtml
}

function efficiencyFocusUnifiedQuestion() {
  // Disabled: clicking sidebar instructions must NEVER auto-select paragraphs or cells
}

// ============================================================================
// MICROSOFT OFFICE 2019 REALISTIC RIBBON, TAB BAR, SUBMENUS & DIALOG ENGINE
// Full support for MS Word 2019 & MS Excel 2019 Efficiency Practice
// ============================================================================

const O19_ICONS = {
  save: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2.5 2.5h9l2 2v9h-11v-11z"/><path d="M5 2.5v4h5v-4"/><rect x="4.5" y="9" width="7" height="4.5"/></svg>`,
  undo: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 4L2.5 7.5 6 11"/><path d="M3 7.5h6.5a3.5 3.5 0 1 1 0 7H7"/></svg>`,
  redo: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12.5 5.5A5 5 0 1 0 13 10"/><path d="M13 2.5v3.5H9.5"/></svg>`,
  qatMore: `<svg viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="8" height="1.3"/><path d="M2.5 5.5l3.5 4 3.5-4z"/></svg>`,
  ribbonDisplay: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="3" width="12" height="10"/><path d="M2 6h12M6 11l2-2 2 2M8 9v3.5"/></svg>`,
  launcher: `<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M1.5 8.5V1.5h7M4.5 4.5l4 4M8.5 5.5v3h-3"/></svg>`,

  // Clipboard
  pasteLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="4" y="4" width="14" height="19" rx="1.5" fill="#d9965b" stroke="#9c6334" stroke-width="1.2"/><rect x="8" y="2.5" width="6" height="3" rx="1" fill="#e1dfdd" stroke="#605e5c" stroke-width="1"/><rect x="11" y="9" width="13" height="16" fill="#ffffff" stroke="#605e5c" stroke-width="1.2"/><path d="M14 13h7M14 16.5h7M14 20h5" stroke="#2b579a" stroke-width="1.3"/></svg>`,
  cutSm: `<svg viewBox="0 0 16 16" fill="none"><circle cx="4.5" cy="12" r="2.2" stroke="#2b579a" stroke-width="1.3"/><circle cx="11.5" cy="12" r="2.2" stroke="#2b579a" stroke-width="1.3"/><path d="M6 10.2L12.5 2M10 10.2L3.5 2" stroke="#605e5c" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  copySm: `<svg viewBox="0 0 16 16" fill="none"><rect x="2.5" y="1.5" width="8" height="10" fill="#fff" stroke="#605e5c" stroke-width="1.1"/><rect x="5.5" y="4.5" width="8" height="10" fill="#fff" stroke="#2b579a" stroke-width="1.1"/><path d="M7.5 7.5h4M7.5 10h4M7.5 12h2.5" stroke="#2b579a" stroke-width="1"/></svg>`,
  painterSm: `<svg viewBox="0 0 16 16" fill="none"><path d="M3 3.5h8v4H3z" fill="#f2c94c" stroke="#b7791f" stroke-width="1.1"/><path d="M11 5.5h2v3H7.5v2" stroke="#605e5c" stroke-width="1.2"/><rect x="6.3" y="10.5" width="2.4" height="4.2" rx="0.8" fill="#2b579a"/></svg>`,

  // Font group icons
  fontGrow: `<svg viewBox="0 0 16 16" fill="none"><text x="1.5" y="13" font-family="Segoe UI,Arial" font-size="11.5" font-weight="600" fill="#252423">A</text><path d="M10.5 6.5l2.2-3 2.2 3z" fill="#2b579a"/></svg>`,
  fontShrink: `<svg viewBox="0 0 16 16" fill="none"><text x="2" y="13" font-family="Segoe UI,Arial" font-size="10" font-weight="600" fill="#252423">A</text><path d="M10.2 5l2.2 3 2.2-3z" fill="#2b579a"/></svg>`,
  changeCase: `<svg viewBox="0 0 16 16" fill="none"><text x="1" y="12.5" font-family="Segoe UI,Arial" font-size="10.5" font-weight="600" fill="#252423">Aa</text></svg>`,
  clearFormat: `<svg viewBox="0 0 16 16" fill="none"><text x="1.5" y="12" font-family="Segoe UI,Arial" font-size="11" font-weight="600" fill="#252423">A</text><path d="M9.5 11.5l3-3 2.5 2.5-3 3h-2.5z" fill="#e879a6" stroke="#9d174d" stroke-width="0.9"/></svg>`,
  textEffects: `<svg viewBox="0 0 16 16" fill="none"><text x="3" y="13" font-family="Segoe UI,Arial" font-size="12.5" font-weight="800" fill="#ffffff" stroke="#185abd" stroke-width="1.1">A</text></svg>`,
  highlight: `<svg viewBox="0 0 16 16" fill="none"><text x="1.5" y="10.5" font-family="Segoe UI,Arial" font-size="8.5" font-weight="700" fill="#252423">ab</text><path d="M10 2.5l3 3-3.5 4H6.5v-3z" fill="#605e5c"/><rect x="1.5" y="12.5" width="13" height="2.5" fill="#ffff00" stroke="#d2d0ce" stroke-width="0.5"/></svg>`,
  fontColor: `<svg viewBox="0 0 16 16" fill="none"><text x="3.5" y="11" font-family="Segoe UI,Arial" font-size="11" font-weight="700" fill="#252423">A</text><rect x="2" y="12.5" width="12" height="2.5" fill="#e81123"/></svg>`,

  // Paragraph group icons
  bullets: `<svg viewBox="0 0 16 16" fill="none"><circle cx="2.5" cy="4" r="1.3" fill="#2b579a"/><circle cx="2.5" cy="8" r="1.3" fill="#2b579a"/><circle cx="2.5" cy="12" r="1.3" fill="#2b579a"/><path d="M6 4h8M6 8h8M6 12h8" stroke="#605e5c" stroke-width="1.3"/></svg>`,
  numbering: `<svg viewBox="0 0 16 16" fill="none"><text x="1" y="5.5" font-size="4.8" font-weight="700" fill="#2b579a">1</text><text x="1" y="9.5" font-size="4.8" font-weight="700" fill="#2b579a">2</text><text x="1" y="13.5" font-size="4.8" font-weight="700" fill="#2b579a">3</text><path d="M6 4h8M6 8h8M6 12h8" stroke="#605e5c" stroke-width="1.3"/></svg>`,
  multilevel: `<svg viewBox="0 0 16 16" fill="none"><text x="1" y="5" font-size="4.5" font-weight="700" fill="#2b579a">1</text><text x="3" y="9" font-size="4.5" font-weight="700" fill="#2b579a">a</text><text x="5" y="13" font-size="4.5" font-weight="700" fill="#2b579a">i</text><path d="M5 4h9M7 8h7M9 12h5" stroke="#605e5c" stroke-width="1.2"/></svg>`,
  outdent: `<svg viewBox="0 0 16 16" fill="none"><path d="M2 3h12M8 6.5h6M8 9.5h6M2 13h12" stroke="#605e5c" stroke-width="1.2"/><path d="M6 8H2m0 0l2-2M2 8l2 2" stroke="#2b579a" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  indent: `<svg viewBox="0 0 16 16" fill="none"><path d="M2 3h12M8 6.5h6M8 9.5h6M2 13h12" stroke="#605e5c" stroke-width="1.2"/><path d="M2 8h4m0 0L4 6m2 2l-2 2" stroke="#2b579a" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  sortAZ: `<svg viewBox="0 0 16 16" fill="none"><text x="1.5" y="7.5" font-size="6.5" font-weight="700" fill="#2b579a">A</text><text x="1.5" y="14" font-size="6.5" font-weight="700" fill="#605e5c">Z</text><path d="M11.5 2.5v10.5m0 0l-2.2-2.2m2.2 2.2l2.2-2.2" stroke="#605e5c" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  pilcrow: `<svg viewBox="0 0 16 16" fill="none"><path d="M8.5 3v10.5M11 3v10.5M6.5 3h6M6.5 3a2.8 2.8 0 0 0 0 5.6h2" stroke="#252423" stroke-width="1.3"/></svg>`,
  alignLeft: `<svg viewBox="0 0 16 16" fill="none" stroke="#3b3a39" stroke-width="1.3"><path d="M2 3.5h12M2 6.5h8.5M2 9.5h12M2 12.5h8.5"/></svg>`,
  alignCenter: `<svg viewBox="0 0 16 16" fill="none" stroke="#3b3a39" stroke-width="1.3"><path d="M2 3.5h12M4 6.5h8M2 9.5h12M4 12.5h8"/></svg>`,
  alignRight: `<svg viewBox="0 0 16 16" fill="none" stroke="#3b3a39" stroke-width="1.3"><path d="M2 3.5h12M5.5 6.5H14M2 9.5h12M5.5 12.5H14"/></svg>`,
  alignJustify: `<svg viewBox="0 0 16 16" fill="none" stroke="#3b3a39" stroke-width="1.3"><path d="M2 3.5h12M2 6.5h12M2 9.5h12M2 12.5h12"/></svg>`,
  lineSpacing: `<svg viewBox="0 0 16 16" fill="none"><path d="M7 3.5h7M7 6.5h7M7 9.5h7M7 12.5h7" stroke="#3b3a39" stroke-width="1.3"/><path d="M3.5 2.5v11M1.8 4.5l1.7-2 1.7 2M1.8 11.5l1.7 2 1.7-2" stroke="#2b579a" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  spaceBefore: `<svg viewBox="0 0 16 16" fill="none"><path d="M6 6.5h8M6 9.5h8M6 12.5h8" stroke="#3b3a39" stroke-width="1.2"/><path d="M3 2v4m-1.5-1.5L3 6l1.5-1.5" stroke="#2b579a" stroke-width="1.2"/></svg>`,
  spaceAfter: `<svg viewBox="0 0 16 16" fill="none"><path d="M6 3.5h8M6 6.5h8M6 9.5h8" stroke="#3b3a39" stroke-width="1.2"/><path d="M3 14v-4m-1.5 1.5L3 10l1.5 1.5" stroke="#2b579a" stroke-width="1.2"/></svg>`,
  shading: `<svg viewBox="0 0 16 16" fill="none"><path d="M4.5 6.5l3.5-3.5 4 4-3.5 3.5z" fill="#e1dfdd" stroke="#3b3a39" stroke-width="1.1"/><path d="M12.5 8.5c.8 1 .8 2 0 2.5-.7-.5-.7-1.5 0-2.5z" fill="#2b579a"/><rect x="2" y="12.5" width="12" height="2.5" fill="#f2c94c" stroke="#b3b0ad" stroke-width="0.5"/></svg>`,
  borders: `<svg viewBox="0 0 16 16" fill="none"><rect x="2.5" y="2.5" width="11" height="11" stroke="#8a8886" stroke-width="1" stroke-dasharray="1.5 1.5"/><path d="M8 2.5v11M2.5 8h11" stroke="#8a8886" stroke-width="1" stroke-dasharray="1.5 1.5"/><path d="M2 13.5h12" stroke="#201f1e" stroke-width="1.8"/></svg>`,

  // Editing & General Large Icons
  findSm: `<svg viewBox="0 0 16 16" fill="none"><circle cx="6.8" cy="6.8" r="4.2" stroke="#605e5c" stroke-width="1.3"/><path d="M10 10l3.8 3.8" stroke="#2b579a" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  replaceSm: `<svg viewBox="0 0 16 16" fill="none"><text x="1" y="7" font-size="6" font-weight="700" fill="#252423">ab</text><text x="7.5" y="14" font-size="6" font-weight="700" fill="#2b579a">ac</text><path d="M9.5 4h3.5v3.5M13 4L8.5 8.5" stroke="#2b579a" stroke-width="1.1"/></svg>`,
  selectSm: `<svg viewBox="0 0 16 16" fill="none"><path d="M4 2.5l7.5 6.5-3.5.7 1.8 3.8-1.5.7-1.8-3.8-2.5 2.3z" fill="#fff" stroke="#3b3a39" stroke-width="1.1"/></svg>`,

  tableLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="3" y="4" width="22" height="20" fill="#fff" stroke="#605e5c" stroke-width="1.3"/><rect x="3" y="4" width="22" height="5" fill="#2b579a"/><path d="M3 14h22M3 19h22M10.3 4v20M17.6 4v20" stroke="#605e5c" stroke-width="1.1"/></svg>`,
  pictureLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="3" y="5" width="22" height="18" fill="#fff" stroke="#605e5c" stroke-width="1.3"/><circle cx="9.5" cy="10.5" r="2.2" fill="#f2c94c"/><path d="M4 21l6-6.5 4.5 4.5 4-3.5 5.5 5.5z" fill="#2b579a" opacity="0.8"/></svg>`,
  shapesLg: `<svg viewBox="0 0 28 28" fill="none"><circle cx="10" cy="10" r="6" fill="#2b579a" opacity="0.85"/><rect x="11" y="11" width="12" height="12" fill="#f2c94c" stroke="#b7791f" stroke-width="1.2"/></svg>`,
  chartLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="4" y="14" width="4.5" height="10" fill="#2b579a"/><rect x="11.5" y="7" width="4.5" height="17" fill="#217346"/><rect x="19" y="11" width="4.5" height="13" fill="#d83b01"/><path d="M2 24h24" stroke="#605e5c" stroke-width="1.3"/></svg>`,
  headerLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="5" y="3" width="18" height="22" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><rect x="7" y="5" width="14" height="4" fill="#f2c94c" stroke="#b7791f" stroke-width="0.9"/><path d="M7 13h14M7 16.5h14M7 20h10" stroke="#a19f9d" stroke-width="1.2"/></svg>`,
  footerLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="5" y="3" width="18" height="22" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><rect x="7" y="19" width="14" height="4" fill="#f2c94c" stroke="#b7791f" stroke-width="0.9"/><path d="M7 7h14M7 10.5h14M7 14h10" stroke="#a19f9d" stroke-width="1.2"/></svg>`,
  pageNumLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="5" y="3" width="18" height="22" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><text x="11" y="21" font-size="10" font-weight="800" fill="#2b579a">#1</text><path d="M8 8h12M8 11.5h10" stroke="#a19f9d" stroke-width="1.2"/></svg>`,
  marginsLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="5" y="3" width="18" height="22" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><rect x="8.5" y="6.5" width="11" height="15" stroke="#2b579a" stroke-width="1.1" stroke-dasharray="2 1.5"/></svg>`,
  orientLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="4" y="4" width="12" height="17" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><rect x="9" y="10" width="15" height="12" fill="#dceeff" stroke="#2b579a" stroke-width="1.3"/></svg>`,
  sizeLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="6" y="5" width="16" height="20" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><path d="M6 2.5h16M3.5 5v20" stroke="#2b579a" stroke-width="1.2"/></svg>`,
  columnsLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="4" y="3" width="20" height="22" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><path d="M7 7h5.5M7 10.5h5.5M7 14h5.5M7 17.5h5.5M15.5 7H21M15.5 10.5H21M15.5 14H21M15.5 17.5H21" stroke="#2b579a" stroke-width="1.3"/></svg>`,
  watermarkLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="5" y="3" width="18" height="22" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><text x="8" y="18" font-size="11" font-weight="800" fill="#2b579a" opacity="0.55" transform="rotate(-25 14 14)">A</text></svg>`,
  pageColorLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="5" y="3" width="16" height="20" fill="#dceeff" stroke="#2b579a" stroke-width="1.2"/><path d="M16 14l4-4 4 4-4 4z" fill="#f2c94c" stroke="#b7791f" stroke-width="1.1"/></svg>`,
  pageBorderLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="5" y="3" width="18" height="22" fill="#fff" stroke="#252423" stroke-width="2"/><rect x="7.5" y="5.5" width="13" height="17" stroke="#2b579a" stroke-width="1" stroke-dasharray="2 1.5"/></svg>`,
  autoSumLg: `<svg viewBox="0 0 28 28" fill="none"><path d="M21 5H7l7 9-7 9h14" stroke="#2b579a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  sortFilterLg: `<svg viewBox="0 0 28 28" fill="none"><text x="3" y="11" font-size="8" font-weight="800" fill="#2b579a">A</text><text x="3" y="21" font-size="8" font-weight="800" fill="#605e5c">Z</text><path d="M13 6h12l-4.5 6v8l-3-2v-6z" fill="#f2f2f2" stroke="#605e5c" stroke-width="1.2"/></svg>`,
  condFormatLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="3" y="5" width="22" height="18" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><rect x="5" y="7.5" width="8" height="4" fill="#f8cecc"/><rect x="15" y="7.5" width="8" height="4" fill="#d5e8d4"/><rect x="5" y="13" width="8" height="4" fill="#fff2cc"/><rect x="15" y="13" width="8" height="4" fill="#dae8fc"/><rect x="5" y="18" width="18" height="3" fill="#217346" opacity="0.6"/></svg>`,
  formatTableLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="3" y="5" width="22" height="18" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><rect x="3" y="5" width="22" height="5" fill="#2b579a"/><rect x="3" y="14" width="22" height="4.5" fill="#dceeff"/><path d="M10.5 5v18M17.5 5v18" stroke="#605e5c" stroke-width="1"/></svg>`,
  cellStylesLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="3" y="6" width="16" height="13" fill="#dceeff" stroke="#2b579a" stroke-width="1.2"/><rect x="9" y="11" width="16" height="13" fill="#d5e8d4" stroke="#217346" stroke-width="1.2"/><text x="13" y="20.5" font-size="9" font-weight="700" fill="#217346">A</text></svg>`,
  cellsInsertLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="6" y="4" width="16" height="20" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><rect x="6" y="11" width="16" height="6" fill="#d5e8d4" stroke="#217346" stroke-width="1.3"/><path d="M2.5 14h4m-2-2v4" stroke="#217346" stroke-width="1.5"/></svg>`,
  cellsDeleteLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="6" y="4" width="16" height="20" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><rect x="6" y="11" width="16" height="6" fill="#f8cecc" stroke="#e81123" stroke-width="1.2"/><path d="M11 11l6 6m0-6l-6 6" stroke="#e81123" stroke-width="1.4"/></svg>`,
  cellsFormatLg: `<svg viewBox="0 0 28 28" fill="none"><rect x="5" y="6" width="18" height="16" fill="#fff" stroke="#605e5c" stroke-width="1.2"/><rect x="5" y="6" width="18" height="4.5" fill="#2b579a"/><path d="M5 3.5h18M2.5 6v16" stroke="#217346" stroke-width="1.2"/></svg>`,
  wrapTextSm: `<svg viewBox="0 0 16 16" fill="none"><text x="1" y="7" font-size="6" font-weight="700" fill="#252423">ab</text><text x="1" y="13.5" font-size="6" font-weight="700" fill="#252423">c</text><path d="M9.5 5h3a2 2 0 1 1 0 4H7.5m0 0l1.8-1.8M7.5 9l1.8 1.8" stroke="#217346" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  mergeCenterSm: `<svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#605e5c" stroke-width="1.1"/><text x="6" y="10" font-size="6.5" font-weight="700" fill="#252423">a</text><path d="M3 8h2.2M10.8 8H13" stroke="#217346" stroke-width="1.2"/></svg>`,
  orientCellSm: `<svg viewBox="0 0 16 16" fill="none"><text x="2" y="11" font-size="6.5" font-weight="700" fill="#252423" transform="rotate(-30 6 8)">ab</text><path d="M5 13.5l8-8m0 0H9.5m3.5 0V9" stroke="#217346" stroke-width="1.2"/></svg>`
}

const O19_THEME_COLORS = [
  '#ffffff', '#000000', '#e7e6e6', '#44546a', '#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47',
  '#f2f2f2', '#7f7f7f', '#d0cece', '#d6dce4', '#d9e1f2', '#fce4d6', '#ededed', '#fff2cc', '#ddebf7', '#e2efda',
  '#d8d8d8', '#595959', '#aeaaaa', '#acb9ca', '#b4c6e7', '#f8cbad', '#dbdbdb', '#ffe699', '#bdd7ee', '#c6e0b4',
  '#bfbfbf', '#3f3f3f', '#757171', '#8497b0', '#8ea9db', '#f4b084', '#c9c9c9', '#ffd966', '#9bc2e6', '#a9d08e',
  '#a5a5a5', '#262626', '#3a3838', '#333f4f', '#2f5597', '#c65911', '#7b7b7b', '#bf8f00', '#2f75b5', '#548235',
  '#7f7f7f', '#0c0c0c', '#161616', '#222b35', '#1f3864', '#833c0c', '#525252', '#806000', '#1f4e78', '#375623'
]

const O19_STANDARD_COLORS = [
  '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'
]

const O19_HIGHLIGHT_COLORS = [
  '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#0000ff',
  '#ff0000', '#000080', '#008080', '#008000', '#800080',
  '#800000', '#808000', '#808080', '#c0c0c0', '#000000'
]

const O19_FONTS = [
  'Calibri (Body)', 'Calibri Light (Headings)', 'Arial', 'Times New Roman', 'Cambria',
  'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New', 'Garamond',
  'Book Antiqua', 'Century Gothic', 'Kruti Dev 010', 'DevLys 010', 'Mangal', 'Aparajita', 'Kokila'
]

const O19_FONT_SIZES = ['8', '9', '10', '10.5', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72']

function o19Group(title, bodyHtml, dialogId = '') {
  const launcher = dialogId
    ? `<button type="button" class="o19-dialog-launcher" data-o19-dialog="${dialogId}" title="${title} Settings">${O19_ICONS.launcher}</button>`
    : ''
  return `<div class="o19-group"><div class="o19-group-body">${bodyHtml}</div><div class="o19-group-footer"><span class="o19-group-title">${title}</span>${launcher}</div></div>`
}

function o19LargeBtn({ label, icon, action = '', cmd = '', menu = '', title = '' }) {
  const caret = menu ? `<span class="o19-caret">▾</span>` : ''
  const attrs = [
    action ? `data-word-extra="${action}" data-excel-extra="${action}"` : '',
    cmd ? `data-word-command="${cmd}"` : '',
    menu ? `data-o19-menu="${menu}"` : '',
    title ? `title="${title}"` : `title="${label.replace(/<br>/g, ' ')}"`
  ].filter(Boolean).join(' ')
  return `<button type="button" class="o19-btn-large" ${attrs}><span class="o19-icon-lg">${icon}</span><span class="o19-lbl-lg">${label}</span>${caret}</button>`
}

function o19SmBtn({ label, icon = '', action = '', cmd = '', menu = '', title = '' }) {
  const caret = menu ? `<span class="o19-caret">▾</span>` : ''
  const attrs = [
    action ? `data-word-extra="${action}" data-excel-extra="${action}"` : '',
    cmd ? `data-word-command="${cmd}"` : '',
    menu ? `data-o19-menu="${menu}"` : '',
    title ? `title="${title}"` : `title="${label}"`
  ].filter(Boolean).join(' ')
  return `<button type="button" class="o19-btn-sm" ${attrs}>${icon}<span>${label}</span>${caret}</button>`
}

function o19IconBtn({ content, action = '', cmd = '', menu = '', title = '', id = '' }) {
  const caret = menu ? `<span class="o19-caret">▾</span>` : ''
  const attrs = [
    id ? `id="${id}"` : '',
    action ? `data-word-extra="${action}" data-excel-extra="${action}"` : '',
    cmd ? `data-word-command="${cmd}"` : '',
    menu ? `data-o19-menu="${menu}"` : '',
    title ? `title="${title}"` : ''
  ].filter(Boolean).join(' ')
  return `<button type="button" class="o19-btn-icon" ${attrs}>${content}${caret}</button>`
}

// ============================================================================
// WORD 2019 RIBBON TABS (File, Home, Insert, Design, Layout, References, Mailings, Review, View, Developer, Help)
// ============================================================================
function efficiencyWordRibbon(tab = 'Home') {
  if (tab === 'File') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('File Backstage', `
        ${o19LargeBtn({ label: 'Info', icon: O19_ICONS.headerLg, action: 'file-info' })}
        ${o19LargeBtn({ label: 'New', icon: O19_ICONS.sizeLg, action: 'new-document' })}
        ${o19LargeBtn({ label: 'Open', icon: O19_ICONS.copySm, action: 'open-document' })}
        ${o19LargeBtn({ label: 'Save', icon: O19_ICONS.save, action: 'save' })}
        ${o19LargeBtn({ label: 'Save As', icon: O19_ICONS.save, action: 'save-as' })}
        ${o19LargeBtn({ label: 'Print', icon: O19_ICONS.marginsLg, action: 'print' })}
        ${o19LargeBtn({ label: 'Export', icon: O19_ICONS.orientLg, action: 'export-pdf' })}
      `)}
    </div>`
  }

  if (tab === 'Home') {
    const clipboard = o19Group('Clipboard', `
      ${o19LargeBtn({ label: 'Paste', icon: O19_ICONS.pasteLg, menu: 'paste-menu', action: 'paste', title: 'Paste (Ctrl+V)' })}
      <div class="o19-col-stack">
        ${o19SmBtn({ label: 'Cut', icon: O19_ICONS.cutSm, cmd: 'cut', title: 'Cut (Ctrl+X)' })}
        ${o19SmBtn({ label: 'Copy', icon: O19_ICONS.copySm, cmd: 'copy', title: 'Copy (Ctrl+C)' })}
        ${o19SmBtn({ label: 'Format Painter', icon: O19_ICONS.painterSm, action: 'format-painter', title: 'Format Painter (Ctrl+Shift+C)' })}
      </div>
    `, 'word-clipboard-dlg')

    const font = o19Group('Font', `
      <div class="o19-col-stack" style="justify-content:space-around;">
        <div class="o19-row">
          <div class="o19-combo" style="width:108px;" data-o19-menu="word-font-family-menu" title="Font (Ctrl+Shift+F)">
            <input type="text" id="word-font-family" class="o19-combo-input" value="Calibri (Body)" readonly aria-label="Font family">
            <span class="o19-combo-arrow">▾</span>
          </div>
          <div class="o19-combo" style="width:42px;" data-o19-menu="word-font-size-menu" title="Font Size (Ctrl+Shift+P)">
            <input type="text" id="word-font-size" class="o19-combo-input" value="11" readonly aria-label="Font size">
            <span class="o19-combo-arrow">▾</span>
          </div>
          ${o19IconBtn({ content: O19_ICONS.fontGrow, action: 'font-grow', title: 'Increase Font Size (Ctrl+Shift+>)' })}
          ${o19IconBtn({ content: O19_ICONS.fontShrink, action: 'font-shrink', title: 'Decrease Font Size (Ctrl+Shift+<)' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: O19_ICONS.changeCase, menu: 'change-case-menu', title: 'Change Case' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: O19_ICONS.clearFormat, action: 'clear-formatting', title: 'Clear All Formatting' })}
        </div>
        <div class="o19-row">
          ${o19IconBtn({ content: '<b style="font-family:Georgia,serif;font-size:12.5px;">B</b>', cmd: 'bold', title: 'Bold (Ctrl+B)' })}
          ${o19IconBtn({ content: '<i style="font-family:Georgia,serif;font-size:12.5px;">I</i>', cmd: 'italic', title: 'Italic (Ctrl+I)' })}
          ${o19IconBtn({ content: '<u style="font-family:Georgia,serif;font-size:12.5px;">U</u>', cmd: 'underline', menu: 'underline-menu', title: 'Underline (Ctrl+U)' })}
          ${o19IconBtn({ content: '<s style="font-size:11px;">ab</s>', cmd: 'strikeThrough', action: 'strikethrough', title: 'Strikethrough' })}
          ${o19IconBtn({ content: '<span style="font-size:11px;font-weight:600;">x<sub style="color:#2b579a;font-weight:800;">2</sub></span>', cmd: 'subscript', action: 'subscript', title: 'Subscript (Ctrl+=)' })}
          ${o19IconBtn({ content: '<span style="font-size:11px;font-weight:600;">x<sup style="color:#2b579a;font-weight:800;">2</sup></span>', cmd: 'superscript', action: 'superscript', title: 'Superscript (Ctrl+Shift++)' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: O19_ICONS.textEffects, menu: 'text-effects-menu', title: 'Text Effects and Typography' })}
          ${o19IconBtn({ content: O19_ICONS.highlight, menu: 'highlight-menu', title: 'Text Highlight Color' })}
          ${o19IconBtn({ content: O19_ICONS.fontColor, menu: 'font-color-menu', title: 'Font Color' })}
          <input type="color" id="word-font-color" value="#e81123" style="display:none;" aria-label="Font color">
        </div>
      </div>
    `, 'word-font-dlg')

    const paragraph = o19Group('Paragraph', `
      <div class="o19-col-stack" style="justify-content:space-around;">
        <div class="o19-row">
          ${o19IconBtn({ content: O19_ICONS.bullets, cmd: 'insertUnorderedList', menu: 'bullets-menu', title: 'Bullets' })}
          ${o19IconBtn({ content: O19_ICONS.numbering, cmd: 'insertOrderedList', menu: 'numbering-menu', title: 'Numbering' })}
          ${o19IconBtn({ content: O19_ICONS.multilevel, menu: 'multilevel-menu', title: 'Multilevel List' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: O19_ICONS.outdent, action: 'decrease-indent', title: 'Decrease Indent' })}
          ${o19IconBtn({ content: O19_ICONS.indent, action: 'indent', title: 'Increase Indent' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: O19_ICONS.sortAZ, action: 'open-sort-dialog', title: 'Sort' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: O19_ICONS.pilcrow, action: 'toggle-pilcrow', title: 'Show/Hide ¶ (Ctrl+*)' })}
        </div>
        <div class="o19-row">
          ${o19IconBtn({ content: O19_ICONS.alignLeft, cmd: 'justifyLeft', title: 'Align Left (Ctrl+L)' })}
          ${o19IconBtn({ content: O19_ICONS.alignCenter, cmd: 'justifyCenter', title: 'Center (Ctrl+E)' })}
          ${o19IconBtn({ content: O19_ICONS.alignRight, cmd: 'justifyRight', title: 'Align Right (Ctrl+R)' })}
          ${o19IconBtn({ content: O19_ICONS.alignJustify, cmd: 'justifyFull', menu: 'justify-menu', title: 'Justify (Ctrl+J)' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: O19_ICONS.lineSpacing, menu: 'line-spacing-menu', title: 'Line and Paragraph Spacing' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: O19_ICONS.shading, menu: 'shading-menu', title: 'Shading' })}
          ${o19IconBtn({ content: O19_ICONS.borders, menu: 'borders-menu', title: 'Borders' })}
        </div>
      </div>
    `, 'word-paragraph-dlg')

    const styles = o19Group('Styles', `
      <div class="o19-styles-gallery">
        <button type="button" class="o19-style-card is-selected" data-word-extra="style-normal" title="Normal">
          <span class="o19-style-preview">AaBbCcDd</span>
          <span class="o19-style-name">¶ Normal</span>
        </button>
        <button type="button" class="o19-style-card" data-word-extra="style-no-spacing" title="No Spacing">
          <span class="o19-style-preview">AaBbCcDd</span>
          <span class="o19-style-name">¶ No Spac…</span>
        </button>
        <button type="button" class="o19-style-card" data-word-extra="style-heading-1" title="Heading 1">
          <span class="o19-style-preview" style="color:#2f5597;font-size:15px;">AaBbCc</span>
          <span class="o19-style-name">Heading 1</span>
        </button>
        <button type="button" class="o19-style-card" data-word-extra="style-heading-2" title="Heading 2">
          <span class="o19-style-preview" style="color:#2f5597;font-size:13px;">AaBbCc</span>
          <span class="o19-style-name">Heading 2</span>
        </button>

        <div class="o19-styles-more-col">
          <button type="button" data-word-extra="style-normal" title="Previous">▲</button>
          <button type="button" data-word-extra="style-heading-1" title="Next">▼</button>
          <button type="button" data-o19-menu="styles-menu" title="More Styles">⏷</button>
        </div>
      </div>
    `, 'word-styles-dlg')

    const editing = o19Group('Editing', `
      <div class="o19-col-stack">
        ${o19SmBtn({ label: 'Find', icon: O19_ICONS.findSm, menu: 'find-menu', action: 'open-find-dialog', title: 'Find (Ctrl+F)' })}
        ${o19SmBtn({ label: 'Replace', icon: O19_ICONS.replaceSm, action: 'find-replace', title: 'Replace (Ctrl+H)' })}
        ${o19SmBtn({ label: 'Select', icon: O19_ICONS.selectSm, menu: 'select-menu', title: 'Select text or objects' })}
      </div>
    `)

    return `<div class="o19-ribbon-strip">${clipboard}${font}${paragraph}${styles}${editing}</div>`
  }

  if (tab === 'Insert') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Pages', `
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Cover Page', icon: O19_ICONS.headerLg, menu: 'cover-page-menu' })}
          ${o19SmBtn({ label: 'Blank Page', icon: O19_ICONS.copySm, action: 'blank-page' })}
          ${o19SmBtn({ label: 'Page Break', icon: O19_ICONS.sizeLg, action: 'page-break' })}
        </div>
      `)}
      ${o19Group('Tables', `
        ${o19LargeBtn({ label: 'Table', icon: O19_ICONS.tableLg, menu: 'insert-table-menu', action: 'insert-table' })}
      `)}
      ${o19Group('Illustrations', `
        ${o19LargeBtn({ label: 'Pictures', icon: O19_ICONS.pictureLg, menu: 'pictures-menu', action: 'picture' })}
        ${o19LargeBtn({ label: 'Shapes', icon: O19_ICONS.shapesLg, menu: 'shapes-menu' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Icons', icon: O19_ICONS.shapesLg, action: 'insert-icon' })}
          ${o19SmBtn({ label: 'SmartArt', icon: O19_ICONS.chartLg, menu: 'smartart-menu' })}
          ${o19SmBtn({ label: 'Chart', icon: O19_ICONS.chartLg, menu: 'word-chart-menu' })}
        </div>
      `)}
      ${o19Group('Links', `
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Link', icon: O19_ICONS.findSm, action: 'insert-hyperlink', menu: 'link-menu' })}
          ${o19SmBtn({ label: 'Bookmark', icon: O19_ICONS.copySm, action: 'insert-bookmark' })}
          ${o19SmBtn({ label: 'Cross-reference', icon: O19_ICONS.replaceSm, action: 'cross-reference' })}
        </div>
      `)}
      ${o19Group('Comments', `
        ${o19LargeBtn({ label: 'Comment', icon: O19_ICONS.headerLg, action: 'new-comment' })}
      `)}
      ${o19Group('Header & Footer', `
        ${o19LargeBtn({ label: 'Header', icon: O19_ICONS.headerLg, menu: 'header-menu', action: 'header' })}
        ${o19LargeBtn({ label: 'Footer', icon: O19_ICONS.footerLg, menu: 'footer-menu', action: 'footer' })}
        ${o19LargeBtn({ label: 'Page<br>Number', icon: O19_ICONS.pageNumLg, menu: 'page-number-menu', action: 'page-number' })}
      `)}
      ${o19Group('Text', `
        ${o19LargeBtn({ label: 'Text<br>Box', icon: O19_ICONS.headerLg, menu: 'textbox-menu', action: 'insert-textbox' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'WordArt', icon: O19_ICONS.textEffects, menu: 'wordart-menu' })}
          ${o19SmBtn({ label: 'Drop Cap', icon: O19_ICONS.changeCase, menu: 'drop-cap-menu', action: 'drop-cap' })}
          ${o19SmBtn({ label: 'Date & Time', icon: O19_ICONS.copySm, action: 'insert-datetime' })}
        </div>
      `)}
      ${o19Group('Symbols', `
        ${o19LargeBtn({ label: 'Equation', icon: `<span style="font-size:18px;font-weight:700;color:#2b579a;">π</span>`, menu: 'equation-menu', action: 'insert-equation' })}
        ${o19LargeBtn({ label: 'Symbol', icon: `<span style="font-size:18px;font-weight:700;color:#2b579a;">Ω</span>`, menu: 'symbol-menu', action: 'symbol' })}
      `)}
    </div>`
  }

  if (tab === 'Design') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Document Formatting', `
        ${o19LargeBtn({ label: 'Themes', icon: O19_ICONS.pageColorLg, menu: 'themes-menu', action: 'themes' })}
        <div class="o19-styles-gallery">
          <button type="button" class="o19-style-card is-selected" data-word-extra="theme-office"><span class="o19-style-preview">Title</span><span class="o19-style-name">Default</span></button>
          <button type="button" class="o19-style-card" data-word-extra="theme-classic"><span class="o19-style-preview" style="font-family:Georgia,serif;">Title</span><span class="o19-style-name">Classic</span></button>
          <button type="button" class="o19-style-card" data-word-extra="theme-modern"><span class="o19-style-preview" style="color:#185abd;">Title</span><span class="o19-style-name">Modern</span></button>
          <button type="button" class="o19-style-card" data-word-extra="theme-formal"><span class="o19-style-preview" style="font-family:'Times New Roman',serif;">Title</span><span class="o19-style-name">Formal</span></button>
        </div>
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Colors', icon: O19_ICONS.shading, menu: 'theme-colors-menu' })}
          ${o19SmBtn({ label: 'Fonts', icon: O19_ICONS.changeCase, menu: 'theme-fonts-menu' })}
          ${o19SmBtn({ label: 'Paragraph Spacing', icon: O19_ICONS.lineSpacing, menu: 'design-spacing-menu' })}
        </div>
      `)}
      ${o19Group('Page Background', `
        ${o19LargeBtn({ label: 'Watermark', icon: O19_ICONS.watermarkLg, menu: 'watermark-menu', action: 'watermark' })}
        ${o19LargeBtn({ label: 'Page<br>Color', icon: O19_ICONS.pageColorLg, menu: 'page-color-menu', action: 'page-color' })}
        ${o19LargeBtn({ label: 'Page<br>Borders', icon: O19_ICONS.pageBorderLg, action: 'open-borders-dialog' })}
      `)}
    </div>`
  }

  if (tab === 'Layout') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Page Setup', `
        ${o19LargeBtn({ label: 'Margins', icon: O19_ICONS.marginsLg, menu: 'margins-menu', action: 'margins' })}
        ${o19LargeBtn({ label: 'Orientation', icon: O19_ICONS.orientLg, menu: 'orientation-menu', action: 'orientation' })}
        ${o19LargeBtn({ label: 'Size', icon: O19_ICONS.sizeLg, menu: 'size-menu', action: 'paper-size' })}
        ${o19LargeBtn({ label: 'Columns', icon: O19_ICONS.columnsLg, menu: 'columns-menu', action: 'columns' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Breaks', icon: O19_ICONS.sizeLg, menu: 'breaks-menu' })}
          ${o19SmBtn({ label: 'Line Numbers', icon: O19_ICONS.numbering, menu: 'line-numbers-menu' })}
          ${o19SmBtn({ label: 'Hyphenation', icon: O19_ICONS.changeCase, menu: 'hyphenation-menu' })}
        </div>
      `, 'word-pagesetup-dlg')}
      ${o19Group('Paragraph', `
        <div class="o19-col-stack">
          <strong style="font-size:10px;color:#605e5c;">Indent</strong>
          <div class="o19-spinner-row"><span class="o19-spinner-lbl">Left:</span><div class="o19-spinner-box"><input type="text" id="word-indent-left" value="0&quot;"><div class="o19-spinner-btns"><button type="button" data-word-extra="indent">▲</button><button type="button" data-word-extra="decrease-indent">▼</button></div></div></div>
          <div class="o19-spinner-row"><span class="o19-spinner-lbl">Right:</span><div class="o19-spinner-box"><input type="text" id="word-indent-right" value="0&quot;"><div class="o19-spinner-btns"><button type="button" data-word-extra="indent-right-up">▲</button><button type="button" data-word-extra="indent-right-down">▼</button></div></div></div>
        </div>
        <div class="o19-col-stack" style="margin-left:8px;">
          <strong style="font-size:10px;color:#605e5c;">Spacing</strong>
          <div class="o19-spinner-row"><span class="o19-spinner-lbl">Before:</span><div class="o19-spinner-box"><input type="text" id="word-space-before" value="0 pt"><div class="o19-spinner-btns"><button type="button" data-word-extra="space-before-add">▲</button><button type="button" data-word-extra="space-before-remove">▼</button></div></div></div>
          <div class="o19-spinner-row"><span class="o19-spinner-lbl">After:</span><div class="o19-spinner-box"><input type="text" id="word-space-after" value="8 pt"><div class="o19-spinner-btns"><button type="button" data-word-extra="space-after-add">▲</button><button type="button" data-word-extra="space-after-remove">▼</button></div></div></div>
        </div>
      `, 'word-paragraph-dlg')}
      ${o19Group('Arrange', `
        ${o19LargeBtn({ label: 'Position', icon: O19_ICONS.marginsLg, menu: 'position-menu' })}
        ${o19LargeBtn({ label: 'Wrap<br>Text', icon: O19_ICONS.wrapTextSm, menu: 'wrap-text-menu' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Bring Forward', icon: O19_ICONS.copySm, action: 'bring-forward' })}
          ${o19SmBtn({ label: 'Send Backward', icon: O19_ICONS.copySm, action: 'send-backward' })}
          ${o19SmBtn({ label: 'Align', icon: O19_ICONS.alignLeft, menu: 'align-objects-menu' })}
        </div>
      `)}
    </div>`
  }

  if (tab === 'References') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Table of Contents', `
        ${o19LargeBtn({ label: 'Table of<br>Contents', icon: O19_ICONS.columnsLg, menu: 'toc-menu', action: 'contents' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Add Text', icon: O19_ICONS.bullets, menu: 'toc-level-menu' })}
          ${o19SmBtn({ label: 'Update Table', icon: O19_ICONS.tableLg, action: 'contents' })}
        </div>
      `)}
      ${o19Group('Footnotes', `
        ${o19LargeBtn({ label: 'Insert<br>Footnote', icon: `<span style="font-size:15px;font-weight:800;color:#2b579a;">AB¹</span>`, action: 'footnote' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Insert Endnote', icon: O19_ICONS.footerLg, action: 'endnote' })}
          ${o19SmBtn({ label: 'Next Footnote', icon: O19_ICONS.findSm, menu: 'footnote-nav-menu' })}
          ${o19SmBtn({ label: 'Show Notes', icon: O19_ICONS.copySm, action: 'footnote' })}
        </div>
      `)}
      ${o19Group('Citations & Bibliography', `
        ${o19LargeBtn({ label: 'Insert<br>Citation', icon: O19_ICONS.headerLg, menu: 'citation-menu', action: 'citation' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Manage Sources', icon: O19_ICONS.copySm, action: 'citation' })}
          ${o19SmBtn({ label: 'Style: APA', icon: O19_ICONS.changeCase, menu: 'bib-style-menu' })}
          ${o19SmBtn({ label: 'Bibliography', icon: O19_ICONS.columnsLg, menu: 'bibliography-menu' })}
        </div>
      `)}
      ${o19Group('Captions', `
        ${o19LargeBtn({ label: 'Insert<br>Caption', icon: O19_ICONS.pictureLg, action: 'caption' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Insert Table of Figures', icon: O19_ICONS.tableLg, action: 'caption' })}
          ${o19SmBtn({ label: 'Cross-reference', icon: O19_ICONS.replaceSm, action: 'cross-reference' })}
        </div>
      `)}
      ${o19Group('Index', `
        ${o19LargeBtn({ label: 'Mark<br>Entry', icon: O19_ICONS.headerLg, action: 'index' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Insert Index', icon: O19_ICONS.columnsLg, action: 'index' })}
          ${o19SmBtn({ label: 'Update Index', icon: O19_ICONS.redo, action: 'index' })}
        </div>
      `)}
    </div>`
  }

  if (tab === 'Mailings') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Create', `
        ${o19LargeBtn({ label: 'Envelopes', icon: O19_ICONS.orientLg, action: 'envelopes' })}
        ${o19LargeBtn({ label: 'Labels', icon: O19_ICONS.tableLg, action: 'labels' })}
      `)}
      ${o19Group('Start Mail Merge', `
        ${o19LargeBtn({ label: 'Start Mail<br>Merge', icon: O19_ICONS.headerLg, menu: 'mail-merge-menu', action: 'mail-merge' })}
        ${o19LargeBtn({ label: 'Select<br>Recipients', icon: O19_ICONS.copySm, menu: 'recipients-menu', action: 'recipients' })}
        ${o19LargeBtn({ label: 'Edit Recipient<br>List', icon: O19_ICONS.tableLg, action: 'recipients' })}
      `)}
      ${o19Group('Write & Insert Fields', `
        ${o19LargeBtn({ label: 'Address<br>Block', icon: O19_ICONS.headerLg, action: 'address-block' })}
        ${o19LargeBtn({ label: 'Greeting<br>Line', icon: O19_ICONS.footerLg, action: 'greeting-line' })}
        ${o19LargeBtn({ label: 'Insert Merge<br>Field', icon: O19_ICONS.columnsLg, menu: 'merge-field-menu' })}
      `)}
      ${o19Group('Preview Results', `
        ${o19LargeBtn({ label: 'Preview<br>Results', icon: O19_ICONS.findSm, action: 'preview-merge' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Find Recipient', icon: O19_ICONS.findSm, action: 'preview-merge' })}
          ${o19SmBtn({ label: 'Check for Errors', icon: O19_ICONS.replaceSm, action: 'preview-merge' })}
        </div>
      `)}
      ${o19Group('Finish', `
        ${o19LargeBtn({ label: 'Finish &<br>Merge', icon: O19_ICONS.pasteLg, menu: 'finish-merge-menu', action: 'mail-merge' })}
      `)}
    </div>`
  }

  if (tab === 'Review') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Proofing', `
        ${o19LargeBtn({ label: 'Spelling &<br>Grammar', icon: `<span style="font-size:13px;font-weight:800;color:#2b579a;">ABC✓</span>`, action: 'spelling' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Thesaurus', icon: O19_ICONS.columnsLg, action: 'thesaurus' })}
          ${o19SmBtn({ label: 'Word Count', icon: O19_ICONS.numbering, action: 'word-count' })}
        </div>
      `)}
      ${o19Group('Language', `
        ${o19LargeBtn({ label: 'Translate', icon: O19_ICONS.changeCase, menu: 'translate-menu' })}
        ${o19LargeBtn({ label: 'Language', icon: O19_ICONS.changeCase, menu: 'language-menu' })}
      `)}
      ${o19Group('Comments', `
        ${o19LargeBtn({ label: 'New<br>Comment', icon: O19_ICONS.headerLg, action: 'new-comment' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Delete', icon: O19_ICONS.cellsDeleteLg, action: 'delete-comment' })}
          ${o19SmBtn({ label: 'Previous / Next', icon: O19_ICONS.findSm, action: 'new-comment' })}
          ${o19SmBtn({ label: 'Show Comments', icon: O19_ICONS.copySm, action: 'new-comment' })}
        </div>
      `)}
      ${o19Group('Tracking', `
        ${o19LargeBtn({ label: 'Track<br>Changes', icon: O19_ICONS.replaceSm, menu: 'track-changes-menu', action: 'track-changes' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'All Markup', icon: O19_ICONS.bullets, menu: 'markup-view-menu' })}
          ${o19SmBtn({ label: 'Show Markup', icon: O19_ICONS.findSm, menu: 'markup-view-menu' })}
          ${o19SmBtn({ label: 'Reviewing Pane', icon: O19_ICONS.columnsLg, action: 'track-changes' })}
        </div>
      `)}
      ${o19Group('Changes', `
        ${o19LargeBtn({ label: 'Accept', icon: `<span style="color:#217346;font-size:18px;font-weight:800;">✓</span>`, menu: 'accept-changes-menu', action: 'accept-changes' })}
        ${o19LargeBtn({ label: 'Reject', icon: `<span style="color:#e81123;font-size:18px;font-weight:800;">✕</span>`, menu: 'reject-changes-menu', action: 'reject-changes' })}
      `)}
      ${o19Group('Protect', `
        ${o19LargeBtn({ label: 'Restrict<br>Editing', icon: O19_ICONS.pageBorderLg, action: 'protect' })}
      `)}
    </div>`
  }

  if (tab === 'View') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Views', `
        ${o19LargeBtn({ label: 'Read<br>Mode', icon: O19_ICONS.columnsLg, action: 'read-mode' })}
        ${o19LargeBtn({ label: 'Print<br>Layout', icon: O19_ICONS.marginsLg, action: 'print-layout' })}
        ${o19LargeBtn({ label: 'Web<br>Layout', icon: O19_ICONS.orientLg, action: 'web-layout' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Outline', icon: O19_ICONS.bullets, action: 'outline-view' })}
          ${o19SmBtn({ label: 'Draft', icon: O19_ICONS.alignLeft, action: 'draft-view' })}
        </div>
      `)}
      ${o19Group('Show', `
        <div class="o19-col-stack">
          <label class="o19-field-check"><input type="checkbox" data-word-extra="ruler" checked> Ruler</label>
          <label class="o19-field-check"><input type="checkbox" data-word-extra="gridlines"> Gridlines</label>
          <label class="o19-field-check"><input type="checkbox" data-word-extra="open-find-dialog"> Navigation Pane</label>
        </div>
      `)}
      ${o19Group('Zoom', `
        ${o19LargeBtn({ label: 'Zoom', icon: O19_ICONS.findSm, menu: 'zoom-menu', action: 'zoom-in' })}
        ${o19LargeBtn({ label: '100%', icon: `<span style="font-size:13px;font-weight:800;color:#2b579a;">100%</span>`, action: 'zoom-100' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'One Page', icon: O19_ICONS.sizeLg, action: 'zoom-100' })}
          ${o19SmBtn({ label: 'Multiple Pages', icon: O19_ICONS.copySm, action: 'zoom-out' })}
          ${o19SmBtn({ label: 'Page Width', icon: O19_ICONS.orientLg, action: 'page-width' })}
        </div>
      `)}
      ${o19Group('Window', `
        ${o19LargeBtn({ label: 'New<br>Window', icon: O19_ICONS.copySm, action: 'new-window' })}
        ${o19LargeBtn({ label: 'Split', icon: O19_ICONS.tableLg, action: 'split-window' })}
      `)}
      ${o19Group('Macros', `
        ${o19LargeBtn({ label: 'Macros', icon: O19_ICONS.headerLg, menu: 'macros-menu' })}
      `)}
    </div>`
  }

  if (tab === 'Developer') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Code', `
        ${o19LargeBtn({ label: 'Visual<br>Basic', icon: O19_ICONS.tableLg, action: 'macro-vb' })}
        ${o19LargeBtn({ label: 'Macros', icon: O19_ICONS.headerLg, menu: 'macros-menu' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Record Macro', icon: O19_ICONS.redo, action: 'record-macro' })}
          ${o19SmBtn({ label: 'Macro Security', icon: O19_ICONS.pageBorderLg, action: 'protect' })}
        </div>
      `)}
      ${o19Group('Controls', `
        <div class="o19-col-stack">
          <div class="o19-row">
            ${o19SmBtn({ label: 'Rich Text', icon: O19_ICONS.changeCase, action: 'insert-control-text' })}
            ${o19SmBtn({ label: 'Check Box', icon: `<span style="border:1px solid #2b579a;padding:0 2px;font-size:9px;">☑</span>`, action: 'insert-control-checkbox' })}
          </div>
          <div class="o19-row">
            ${o19SmBtn({ label: 'Drop-Down List', icon: O19_ICONS.bullets, action: 'insert-control-dropdown' })}
            ${o19SmBtn({ label: 'Date Picker', icon: O19_ICONS.tableLg, action: 'insert-datetime' })}
          </div>
          <div class="o19-row">
            ${o19SmBtn({ label: 'Design Mode', icon: O19_ICONS.shapesLg, action: 'design-mode' })}
          </div>
        </div>
      `)}
      ${o19Group('Protect', `
        ${o19LargeBtn({ label: 'Restrict<br>Editing', icon: O19_ICONS.pageBorderLg, action: 'protect' })}
      `)}
    </div>`
  }

  // Help tab
  return `<div class="o19-ribbon-strip">
    ${o19Group('Help', `
      ${o19LargeBtn({ label: 'Help', icon: `<span style="font-size:20px;font-weight:800;color:#2b579a;">?</span>`, action: 'help-panel' })}
      ${o19LargeBtn({ label: 'Show<br>Training', icon: O19_ICONS.columnsLg, action: 'help-panel' })}
      ${o19LargeBtn({ label: 'Keyboard<br>Shortcuts', icon: O19_ICONS.tableLg, action: 'shortcuts-guide' })}
    `)}
  </div>`
}

// ============================================================================
// EXCEL 2019 RIBBON TABS (File, Home, Insert, Page Layout, Formulas, Data, Review, View, Developer, Help)
// ============================================================================
function efficiencyExcelRibbon(tab = 'Home') {
  if (tab === 'File') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Workbook Backstage', `
        ${o19LargeBtn({ label: 'Info', icon: O19_ICONS.headerLg, action: 'workbook-info' })}
        ${o19LargeBtn({ label: 'New', icon: O19_ICONS.sizeLg, action: 'new-workbook' })}
        ${o19LargeBtn({ label: 'Open', icon: O19_ICONS.copySm, action: 'open-workbook' })}
        ${o19LargeBtn({ label: 'Save', icon: O19_ICONS.save, action: 'save' })}
        ${o19LargeBtn({ label: 'Print', icon: O19_ICONS.marginsLg, action: 'print' })}
        ${o19LargeBtn({ label: 'Export', icon: O19_ICONS.orientLg, action: 'export-csv' })}
      `)}
    </div>`
  }

  if (tab === 'Home') {
    const clipboard = o19Group('Clipboard', `
      ${o19LargeBtn({ label: 'Paste', icon: O19_ICONS.pasteLg, menu: 'excel-paste-menu', action: 'paste', title: 'Paste (Ctrl+V)' })}
      <div class="o19-col-stack">
        ${o19SmBtn({ label: 'Cut', icon: O19_ICONS.cutSm, action: 'excel-cut', title: 'Cut (Ctrl+X)' })}
        ${o19SmBtn({ label: 'Copy', icon: O19_ICONS.copySm, action: 'excel-copy', title: 'Copy (Ctrl+C)' })}
        ${o19SmBtn({ label: 'Format Painter', icon: O19_ICONS.painterSm, action: 'excel-format-painter', title: 'Format Painter' })}
      </div>
    `, 'excel-format-dlg')

    const font = o19Group('Font', `
      <div class="o19-col-stack" style="justify-content:space-around;">
        <div class="o19-row">
          <div class="o19-combo" style="width:88px;" data-o19-menu="excel-font-family-menu" title="Font">
            <input type="text" id="excel-font-family" class="o19-combo-input" value="Calibri" readonly aria-label="Font family">
            <span class="o19-combo-arrow">▾</span>
          </div>
          <div class="o19-combo" style="width:40px;" data-o19-menu="excel-font-size-menu" title="Font Size">
            <input type="text" id="excel-font-size" class="o19-combo-input" value="11" readonly aria-label="Font size">
            <span class="o19-combo-arrow">▾</span>
          </div>
          ${o19IconBtn({ content: O19_ICONS.fontGrow, action: 'excel-font-grow', title: 'Increase Font Size' })}
          ${o19IconBtn({ content: O19_ICONS.fontShrink, action: 'excel-font-shrink', title: 'Decrease Font Size' })}
        </div>
        <div class="o19-row">
          ${o19IconBtn({ id: 'excel-bold', content: '<b style="font-family:Georgia,serif;font-size:12.5px;">B</b>', action: 'excel-bold', title: 'Bold (Ctrl+B)' })}
          ${o19IconBtn({ id: 'excel-italic', content: '<i style="font-family:Georgia,serif;font-size:12.5px;">I</i>', action: 'excel-italic', title: 'Italic (Ctrl+I)' })}
          ${o19IconBtn({ id: 'excel-underline', content: '<u style="font-family:Georgia,serif;font-size:12.5px;">U</u>', action: 'excel-underline', menu: 'excel-underline-menu', title: 'Underline (Ctrl+U)' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ id: 'excel-border', content: O19_ICONS.borders, action: 'excel-border', menu: 'excel-borders-menu', title: 'Borders' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ id: 'excel-fill', content: O19_ICONS.shading, action: 'excel-fill', menu: 'excel-fill-color-menu', title: 'Fill Color' })}
          ${o19IconBtn({ id: 'excel-font-color-btn', content: O19_ICONS.fontColor, action: 'excel-font-color', menu: 'excel-font-color-menu', title: 'Font Color' })}
        </div>
      </div>
    `, 'excel-format-dlg')

    const alignment = o19Group('Alignment', `
      <div class="o19-col-stack" style="justify-content:space-around;">
        <div class="o19-row">
          ${o19IconBtn({ content: '<span style="font-size:9px;border-top:2px solid #3b3a39;padding-top:2px;">≡</span>', action: 'excel-valign-top', title: 'Top Align' })}
          ${o19IconBtn({ content: '<span style="font-size:9px;">≡</span>', action: 'excel-valign-middle', title: 'Middle Align' })}
          ${o19IconBtn({ content: '<span style="font-size:9px;border-bottom:2px solid #3b3a39;padding-bottom:1px;">≡</span>', action: 'excel-valign-bottom', title: 'Bottom Align' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: O19_ICONS.orientCellSm, menu: 'excel-orient-menu', title: 'Orientation' })}
          <span class="o19-mini-sep"></span>
          ${o19SmBtn({ label: 'Wrap Text', icon: O19_ICONS.wrapTextSm, action: 'excel-wrap-text', title: 'Wrap Text' })}
        </div>
        <div class="o19-row">
          ${o19IconBtn({ content: O19_ICONS.alignLeft, action: 'excel-align-left', title: 'Align Left' })}
          ${o19IconBtn({ content: O19_ICONS.alignCenter, action: 'excel-align-center', title: 'Center' })}
          ${o19IconBtn({ content: O19_ICONS.alignRight, action: 'excel-align-right', title: 'Align Right' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: O19_ICONS.outdent, action: 'excel-outdent', title: 'Decrease Indent' })}
          ${o19IconBtn({ content: O19_ICONS.indent, action: 'excel-indent', title: 'Increase Indent' })}
          <span class="o19-mini-sep"></span>
          <button type="button" id="excel-merge" class="o19-btn-sm" data-excel-extra="excel-merge" data-o19-menu="excel-merge-menu" title="Merge & Center">${O19_ICONS.mergeCenterSm}<span>Merge &amp; Center</span><span class="o19-caret">▾</span></button>
        </div>
      </div>
    `, 'excel-format-dlg')

    const numberGroup = o19Group('Number', `
      <div class="o19-col-stack" style="justify-content:space-around;">
        <div class="o19-row">
          <div class="o19-combo" style="width:102px;" data-o19-menu="excel-numfmt-menu" title="Number Format">
            <select id="excel-number-format" class="o19-combo-input" style="appearance:none;border:0;width:100%;" aria-label="Number Format">
              <option value="General">General</option>
              <option value="Number">Number</option>
              <option value="Currency">Currency</option>
              <option value="Accounting">Accounting</option>
              <option value="Short Date">Short Date</option>
              <option value="Long Date">Long Date</option>
              <option value="Percent">Percentage</option>
              <option value="Fraction">Fraction</option>
              <option value="Scientific">Scientific</option>
              <option value="Text">Text</option>
            </select>
            <span class="o19-combo-arrow">▾</span>
          </div>
        </div>
        <div class="o19-row">
          ${o19IconBtn({ content: '<b style="color:#217346;font-size:11px;">₹/$</b>', action: 'excel-fmt-currency', menu: 'excel-accounting-menu', title: 'Accounting Number Format' })}
          ${o19IconBtn({ content: '<b style="font-size:11px;">%</b>', action: 'excel-fmt-percent', title: 'Percent Style (Ctrl+Shift+%)' })}
          ${o19IconBtn({ content: '<b style="font-size:12px;">,</b>', action: 'excel-fmt-comma', title: 'Comma Style' })}
          <span class="o19-mini-sep"></span>
          ${o19IconBtn({ content: '<span style="font-size:9px;font-weight:700;color:#2b579a;">.00</span>', action: 'excel-decimal-inc', title: 'Increase Decimal' })}
          ${o19IconBtn({ content: '<span style="font-size:9px;font-weight:700;color:#2b579a;">.0</span>', action: 'excel-decimal-dec', title: 'Decrease Decimal' })}
        </div>
      </div>
    `, 'excel-format-dlg')

    const styles = o19Group('Styles', `
      ${o19LargeBtn({ label: 'Conditional<br>Formatting', icon: O19_ICONS.condFormatLg, menu: 'excel-condfmt-menu', action: 'conditional-format' })}
      ${o19LargeBtn({ label: 'Format as<br>Table', icon: O19_ICONS.formatTableLg, menu: 'excel-table-style-menu', action: 'table' })}
      ${o19LargeBtn({ label: 'Cell<br>Styles', icon: O19_ICONS.cellStylesLg, menu: 'excel-cell-styles-menu', action: 'cell-style' })}
    `)

    const cells = o19Group('Cells', `
      ${o19LargeBtn({ label: 'Insert', icon: O19_ICONS.cellsInsertLg, menu: 'excel-insert-cells-menu', action: 'insert-row' })}
      ${o19LargeBtn({ label: 'Delete', icon: O19_ICONS.cellsDeleteLg, menu: 'excel-delete-cells-menu', action: 'delete-row' })}
      ${o19LargeBtn({ label: 'Format', icon: O19_ICONS.cellsFormatLg, menu: 'excel-format-cells-menu', action: 'open-excel-format-dlg' })}
    `)

    const editing = o19Group('Editing', `
      <div class="o19-col-stack">
        <button type="button" id="excel-autosum" class="o19-btn-sm" data-o19-menu="excel-autosum-menu" title="AutoSum (Alt+=)"><b style="color:#2b579a;font-size:13px;">Σ</b><span>AutoSum</span><span class="o19-caret">▾</span></button>
        ${o19SmBtn({ label: 'Fill', icon: `<span style="color:#217346;font-weight:800;">↓</span>`, menu: 'excel-fill-series-menu', action: 'fill-down' })}
        ${o19SmBtn({ label: 'Clear', icon: O19_ICONS.clearFormat, menu: 'excel-clear-menu', action: 'clear-cells' })}
      </div>
      <button type="button" id="excel-sort" class="o19-btn-large" data-excel-extra="sort" data-o19-menu="excel-sort-filter-menu" title="Sort & Filter"><span class="o19-icon-lg">${O19_ICONS.sortFilterLg}</span><span class="o19-lbl-lg">Sort &amp;<br>Filter</span><span class="o19-caret">▾</span></button>
      ${o19LargeBtn({ label: 'Find &amp;<br>Select', icon: O19_ICONS.findSm, menu: 'excel-find-select-menu', action: 'excel-find-replace' })}
    `)

    return `<div class="o19-ribbon-strip">${clipboard}${font}${alignment}${numberGroup}${styles}${cells}${editing}</div>`
  }

  if (tab === 'Insert') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Tables', `
        ${o19LargeBtn({ label: 'PivotTable', icon: O19_ICONS.tableLg, action: 'pivot' })}
        ${o19LargeBtn({ label: 'Recommended<br>PivotTables', icon: O19_ICONS.formatTableLg, action: 'pivot' })}
        ${o19LargeBtn({ label: 'Table', icon: O19_ICONS.tableLg, action: 'table' })}
      `)}
      ${o19Group('Illustrations', `
        ${o19LargeBtn({ label: 'Pictures', icon: O19_ICONS.pictureLg, menu: 'pictures-menu', action: 'picture' })}
        ${o19LargeBtn({ label: 'Shapes', icon: O19_ICONS.shapesLg, menu: 'shapes-menu' })}
        ${o19LargeBtn({ label: 'SmartArt', icon: O19_ICONS.chartLg, menu: 'smartart-menu' })}
      `)}
      ${o19Group('Charts', `
        ${o19LargeBtn({ label: 'Recommended<br>Charts', icon: O19_ICONS.chartLg, action: 'column-chart' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Column / Bar', icon: O19_ICONS.chartLg, menu: 'excel-chart-col-menu', action: 'column-chart' })}
          ${o19SmBtn({ label: 'Line / Area', icon: O19_ICONS.chartLg, menu: 'excel-chart-line-menu', action: 'line-chart' })}
          ${o19SmBtn({ label: 'Pie / Doughnut', icon: O19_ICONS.shapesLg, menu: 'excel-chart-pie-menu', action: 'pie-chart' })}
        </div>
        ${o19LargeBtn({ label: 'PivotChart', icon: O19_ICONS.chartLg, action: 'pivot' })}
      `, 'excel-format-dlg')}
      ${o19Group('Sparklines', `
        ${o19LargeBtn({ label: 'Line', icon: O19_ICONS.chartLg, action: 'line-chart' })}
        ${o19LargeBtn({ label: 'Column', icon: O19_ICONS.chartLg, action: 'column-chart' })}
      `)}
      ${o19Group('Filters', `
        ${o19LargeBtn({ label: 'Slicer', icon: O19_ICONS.sortFilterLg, action: 'filter' })}
        ${o19LargeBtn({ label: 'Timeline', icon: O19_ICONS.tableLg, action: 'filter' })}
      `)}
      ${o19Group('Links', `
        ${o19LargeBtn({ label: 'Link', icon: O19_ICONS.findSm, action: 'hyperlink' })}
      `)}
      ${o19Group('Text & Symbols', `
        ${o19LargeBtn({ label: 'Text<br>Box', icon: O19_ICONS.headerLg, action: 'excel-textbox' })}
        ${o19LargeBtn({ label: 'Header &<br>Footer', icon: O19_ICONS.headerLg, action: 'excel-header-footer' })}
        ${o19LargeBtn({ label: 'Symbol', icon: `<span style="font-size:18px;font-weight:700;color:#217346;">Ω</span>`, menu: 'symbol-menu' })}
      `)}
    </div>`
  }

  if (tab === 'Page Layout') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Themes', `
        ${o19LargeBtn({ label: 'Themes', icon: O19_ICONS.pageColorLg, menu: 'themes-menu' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Colors', icon: O19_ICONS.shading, menu: 'theme-colors-menu' })}
          ${o19SmBtn({ label: 'Fonts', icon: O19_ICONS.changeCase, menu: 'theme-fonts-menu' })}
          ${o19SmBtn({ label: 'Effects', icon: O19_ICONS.shapesLg, action: 'themes' })}
        </div>
      `)}
      ${o19Group('Page Setup', `
        ${o19LargeBtn({ label: 'Margins', icon: O19_ICONS.marginsLg, menu: 'margins-menu', action: 'margins' })}
        ${o19LargeBtn({ label: 'Orientation', icon: O19_ICONS.orientLg, menu: 'orientation-menu', action: 'orientation' })}
        ${o19LargeBtn({ label: 'Size', icon: O19_ICONS.sizeLg, menu: 'size-menu', action: 'paper-size' })}
        ${o19LargeBtn({ label: 'Print<br>Area', icon: O19_ICONS.tableLg, menu: 'print-area-menu', action: 'print-area' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Breaks', icon: O19_ICONS.sizeLg, menu: 'breaks-menu' })}
          ${o19SmBtn({ label: 'Background', icon: O19_ICONS.pictureLg, action: 'background' })}
          ${o19SmBtn({ label: 'Print Titles', icon: O19_ICONS.headerLg, action: 'print-area' })}
        </div>
      `, 'word-pagesetup-dlg')}
      ${o19Group('Scale to Fit', `
        <div class="o19-col-stack">
          <div class="o19-spinner-row"><span class="o19-spinner-lbl">Width:</span><div class="o19-spinner-box"><input type="text" value="Automatic" readonly></div></div>
          <div class="o19-spinner-row"><span class="o19-spinner-lbl">Height:</span><div class="o19-spinner-box"><input type="text" value="Automatic" readonly></div></div>
          <div class="o19-spinner-row"><span class="o19-spinner-lbl">Scale:</span><div class="o19-spinner-box"><input type="text" value="100%"><div class="o19-spinner-btns"><button type="button" data-excel-extra="zoom-in">▲</button><button type="button" data-excel-extra="zoom-out">▼</button></div></div></div>
        </div>
      `)}
      ${o19Group('Sheet Options', `
        <div class="o19-col-stack">
          <strong style="font-size:10px;color:#605e5c;">Gridlines</strong>
          <label class="o19-field-check"><input type="checkbox" data-excel-extra="gridlines" checked> View</label>
          <label class="o19-field-check"><input type="checkbox" data-excel-extra="print-gridlines"> Print</label>
        </div>
        <div class="o19-col-stack" style="margin-left:8px;">
          <strong style="font-size:10px;color:#605e5c;">Headings</strong>
          <label class="o19-field-check"><input type="checkbox" data-excel-extra="headings" checked> View</label>
          <label class="o19-field-check"><input type="checkbox" data-excel-extra="print-headings"> Print</label>
        </div>
      `)}
    </div>`
  }

  if (tab === 'Formulas') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Function Library', `
        ${o19LargeBtn({ label: 'Insert<br>Function', icon: `<span style="font-family:Georgia,serif;font-style:italic;font-size:19px;font-weight:700;color:#217346;">fx</span>`, action: 'open-function-dlg' })}
        ${o19LargeBtn({ label: 'AutoSum', icon: O19_ICONS.autoSumLg, menu: 'excel-autosum-menu', action: 'autosum' })}
        ${o19LargeBtn({ label: 'Recently<br>Used', icon: O19_ICONS.tableLg, menu: 'excel-fn-recent-menu' })}
        ${o19LargeBtn({ label: 'Financial', icon: O19_ICONS.chartLg, menu: 'excel-fn-financial-menu' })}
        ${o19LargeBtn({ label: 'Logical', icon: O19_ICONS.shapesLg, menu: 'excel-fn-logical-menu' })}
        ${o19LargeBtn({ label: 'Text', icon: O19_ICONS.changeCase, menu: 'excel-fn-text-menu' })}
        ${o19LargeBtn({ label: 'Date &amp;<br>Time', icon: O19_ICONS.headerLg, menu: 'excel-fn-datetime-menu' })}
        ${o19LargeBtn({ label: 'Lookup &amp;<br>Reference', icon: O19_ICONS.findSm, menu: 'excel-fn-lookup-menu' })}
        ${o19LargeBtn({ label: 'Math &amp;<br>Trig', icon: O19_ICONS.columnsLg, menu: 'excel-fn-math-menu' })}
        ${o19LargeBtn({ label: 'More<br>Functions', icon: O19_ICONS.numbering, menu: 'excel-fn-stat-menu' })}
      `)}
      ${o19Group('Defined Names', `
        ${o19LargeBtn({ label: 'Name<br>Manager', icon: O19_ICONS.headerLg, action: 'name-manager' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Define Name', icon: O19_ICONS.copySm, action: 'define-name' })}
          ${o19SmBtn({ label: 'Use in Formula', icon: O19_ICONS.pasteLg, action: 'define-name' })}
          ${o19SmBtn({ label: 'Create from Selection', icon: O19_ICONS.tableLg, action: 'define-name' })}
        </div>
      `)}
      ${o19Group('Formula Auditing', `
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Trace Precedents', icon: O19_ICONS.indent, action: 'trace-precedents' })}
          ${o19SmBtn({ label: 'Trace Dependents', icon: O19_ICONS.outdent, action: 'trace-dependents' })}
          ${o19SmBtn({ label: 'Show Formulas', icon: `<span style="font-style:italic;font-weight:700;color:#217346;">fx</span>`, action: 'show-formulas' })}
        </div>
        ${o19LargeBtn({ label: 'Error<br>Checking', icon: O19_ICONS.replaceSm, action: 'error-checking' })}
        ${o19LargeBtn({ label: 'Evaluate<br>Formula', icon: O19_ICONS.findSm, action: 'evaluate-formula' })}
      `)}
      ${o19Group('Calculation', `
        ${o19LargeBtn({ label: 'Calculation<br>Options', icon: O19_ICONS.tableLg, menu: 'excel-calc-menu' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Calculate Now', icon: O19_ICONS.redo, action: 'calculate-now' })}
          ${o19SmBtn({ label: 'Calculate Sheet', icon: O19_ICONS.tableLg, action: 'calculate-now' })}
        </div>
      `)}
    </div>`
  }

  if (tab === 'Data') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Get & Transform Data', `
        ${o19LargeBtn({ label: 'Get<br>Data', icon: O19_ICONS.tableLg, action: 'get-data' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'From Text/CSV', icon: O19_ICONS.copySm, action: 'get-data' })}
          ${o19SmBtn({ label: 'From Table/Range', icon: O19_ICONS.tableLg, action: 'get-data' })}
        </div>
      `)}
      ${o19Group('Sort & Filter', `
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Sort A → Z', icon: O19_ICONS.sortAZ, action: 'sort-asc' })}
          ${o19SmBtn({ label: 'Sort Z → A', icon: O19_ICONS.sortAZ, action: 'sort-desc' })}
          ${o19SmBtn({ label: 'Custom Sort', icon: O19_ICONS.tableLg, action: 'open-sort-dialog' })}
        </div>
        ${o19LargeBtn({ label: 'Filter', icon: O19_ICONS.sortFilterLg, action: 'filter' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Clear', icon: O19_ICONS.clearFormat, action: 'clear-filter' })}
          ${o19SmBtn({ label: 'Reapply', icon: O19_ICONS.redo, action: 'filter' })}
          ${o19SmBtn({ label: 'Advanced', icon: O19_ICONS.findSm, action: 'filter' })}
        </div>
      `)}
      ${o19Group('Data Tools', `
        ${o19LargeBtn({ label: 'Text to<br>Columns', icon: O19_ICONS.columnsLg, action: 'text-columns' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Flash Fill', icon: O19_ICONS.painterSm, action: 'flash-fill' })}
          ${o19SmBtn({ label: 'Remove Duplicates', icon: O19_ICONS.cellsDeleteLg, action: 'remove-duplicates' })}
          ${o19SmBtn({ label: 'Data Validation', icon: `<span style="color:#217346;font-weight:800;">✓</span>`, menu: 'excel-validation-menu', action: 'data-validation' })}
        </div>
        ${o19LargeBtn({ label: 'Consolidate', icon: O19_ICONS.tableLg, action: 'consolidate' })}
      `)}
      ${o19Group('Forecast', `
        ${o19LargeBtn({ label: 'What-If<br>Analysis', icon: O19_ICONS.chartLg, menu: 'excel-whatif-menu' })}
        ${o19LargeBtn({ label: 'Forecast<br>Sheet', icon: O19_ICONS.chartLg, action: 'line-chart' })}
      `)}
      ${o19Group('Outline', `
        ${o19LargeBtn({ label: 'Group', icon: O19_ICONS.indent, action: 'group-rows' })}
        ${o19LargeBtn({ label: 'Ungroup', icon: O19_ICONS.outdent, action: 'ungroup-rows' })}
        ${o19LargeBtn({ label: 'Subtotal', icon: O19_ICONS.autoSumLg, action: 'subtotal' })}
      `)}
    </div>`
  }

  if (tab === 'Review') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Proofing', `
        ${o19LargeBtn({ label: 'Spelling', icon: `<span style="font-size:13px;font-weight:800;color:#217346;">ABC✓</span>`, action: 'spellcheck' })}
        ${o19LargeBtn({ label: 'Thesaurus', icon: O19_ICONS.columnsLg, action: 'thesaurus' })}
        ${o19LargeBtn({ label: 'Workbook<br>Statistics', icon: O19_ICONS.chartLg, action: 'workbook-stats' })}
      `)}
      ${o19Group('Comments', `
        ${o19LargeBtn({ label: 'New<br>Comment', icon: O19_ICONS.headerLg, action: 'new-comment' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Delete', icon: O19_ICONS.cellsDeleteLg, action: 'delete-comment' })}
          ${o19SmBtn({ label: 'Show/Hide Comment', icon: O19_ICONS.copySm, action: 'new-comment' })}
          ${o19SmBtn({ label: 'Show All Comments', icon: O19_ICONS.copySm, action: 'new-comment' })}
        </div>
      `)}
      ${o19Group('Protect', `
        ${o19LargeBtn({ label: 'Protect<br>Sheet', icon: O19_ICONS.pageBorderLg, action: 'protect-sheet' })}
        ${o19LargeBtn({ label: 'Protect<br>Workbook', icon: O19_ICONS.pageBorderLg, action: 'protect-workbook' })}
        ${o19LargeBtn({ label: 'Allow Edit<br>Ranges', icon: O19_ICONS.tableLg, action: 'protect-sheet' })}
      `)}
    </div>`
  }

  if (tab === 'View') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Workbook Views', `
        ${o19LargeBtn({ label: 'Normal', icon: O19_ICONS.tableLg, action: 'normal-view' })}
        ${o19LargeBtn({ label: 'Page Break<br>Preview', icon: O19_ICONS.sizeLg, action: 'page-break' })}
        ${o19LargeBtn({ label: 'Page<br>Layout', icon: O19_ICONS.marginsLg, action: 'page-layout-view' })}
      `)}
      ${o19Group('Show', `
        <div class="o19-col-stack">
          <label class="o19-field-check"><input type="checkbox" data-excel-extra="gridlines" checked> Gridlines</label>
          <label class="o19-field-check"><input type="checkbox" data-excel-extra="formula-bar" checked> Formula Bar</label>
          <label class="o19-field-check"><input type="checkbox" data-excel-extra="headings" checked> Headings</label>
        </div>
      `)}
      ${o19Group('Zoom', `
        ${o19LargeBtn({ label: 'Zoom', icon: O19_ICONS.findSm, menu: 'zoom-menu', action: 'zoom-in' })}
        ${o19LargeBtn({ label: '100%', icon: `<span style="font-size:13px;font-weight:800;color:#217346;">100%</span>`, action: 'zoom-100' })}
        ${o19LargeBtn({ label: 'Zoom to<br>Selection', icon: O19_ICONS.findSm, action: 'zoom-in' })}
      `)}
      ${o19Group('Window', `
        ${o19LargeBtn({ label: 'Freeze<br>Panes', icon: O19_ICONS.tableLg, menu: 'excel-freeze-menu', action: 'freeze-panes' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Split', icon: O19_ICONS.columnsLg, action: 'split-window' })}
          ${o19SmBtn({ label: 'Hide / Unhide', icon: O19_ICONS.copySm, action: 'hide-window' })}
        </div>
      `)}
      ${o19Group('Macros', `
        ${o19LargeBtn({ label: 'Macros', icon: O19_ICONS.headerLg, menu: 'macros-menu' })}
      `)}
    </div>`
  }

  if (tab === 'Developer') {
    return `<div class="o19-ribbon-strip">
      ${o19Group('Code', `
        ${o19LargeBtn({ label: 'Visual<br>Basic', icon: O19_ICONS.tableLg, action: 'macro-vb' })}
        ${o19LargeBtn({ label: 'Macros', icon: O19_ICONS.headerLg, menu: 'macros-menu' })}
        <div class="o19-col-stack">
          ${o19SmBtn({ label: 'Record Macro', icon: O19_ICONS.redo, action: 'record-macro' })}
          ${o19SmBtn({ label: 'Use Relative References', icon: O19_ICONS.tableLg, action: 'record-macro' })}
        </div>
      `)}
      ${o19Group('Controls', `
        ${o19LargeBtn({ label: 'Insert', icon: O19_ICONS.cellsInsertLg, action: 'insert-control' })}
        ${o19LargeBtn({ label: 'Design<br>Mode', icon: O19_ICONS.shapesLg, action: 'design-mode' })}
      `)}
    </div>`
  }

  return `<div class="o19-ribbon-strip">
    ${o19Group('Help', `
      ${o19LargeBtn({ label: 'Help', icon: `<span style="font-size:20px;font-weight:800;color:#217346;">?</span>`, action: 'help-panel' })}
      ${o19LargeBtn({ label: 'Show<br>Training', icon: O19_ICONS.columnsLg, action: 'help-panel' })}
      ${o19LargeBtn({ label: 'Formula<br>Guide', icon: O19_ICONS.autoSumLg, action: 'open-function-dlg' })}
    `)}
  </div>`
}

// ============================================================================
// OFFICE 2019 SUBMENU ("SAB MENU") GENERATOR
// ============================================================================
function o19MenuItem(label, action, icon = '', shortcut = '', subtitle = '', isExcel = false) {
  const attr = isExcel ? `data-excel-extra="${action}"` : `data-word-extra="${action}" data-excel-extra="${action}"`
  const sub = subtitle ? `<div class="o19-menu-item-copy"><strong>${label}</strong><small>${subtitle}</small></div>` : `<span>${label}</span>`
  const sc = shortcut ? `<span class="o19-menu-shortcut">${shortcut}</span>` : ''
  return `<button type="button" class="o19-menu-item" ${attr}><span class="o19-menu-item-icon">${icon}</span>${sub}${sc}</button>`
}

function o19ColorPaletteHTML(actionPrefix) {
  return `
    <button type="button" class="o19-menu-item" data-word-extra="${actionPrefix}-auto" data-excel-extra="${actionPrefix}-auto">
      <span class="o19-menu-item-icon"><span style="width:13px;height:13px;background:#000;border:1px solid #8a8886;display:inline-block;"></span></span>
      <span>Automatic</span>
    </button>
    <div class="o19-menu-header">Theme Colors</div>
    <div class="o19-color-grid">
      ${O19_THEME_COLORS.map(c => `<button type="button" class="o19-color-swatch" style="background:${c};" data-word-extra="${actionPrefix}:${c}" data-excel-extra="${actionPrefix}:${c}" title="${c}"></button>`).join('')}
    </div>
    <div class="o19-menu-header">Standard Colors</div>
    <div class="o19-color-grid">
      ${O19_STANDARD_COLORS.map(c => `<button type="button" class="o19-color-swatch" style="background:${c};" data-word-extra="${actionPrefix}:${c}" data-excel-extra="${actionPrefix}:${c}" title="${c}"></button>`).join('')}
    </div>
    <div class="o19-menu-divider"></div>
    ${o19MenuItem('No Color', `${actionPrefix}:transparent`, '')}
    ${o19MenuItem('More Colors...', `${actionPrefix}-picker`, O19_ICONS.shading)}
  `
}

function o19BuildSubmenuHTML(menuId) {
  switch (menuId) {
    // Exact replica of MS Word 2019 Line and Paragraph Spacing menu (from user image)
    case 'line-spacing-menu':
      return `
        <div class="o19-menu-header">Line Spacing</div>
        ${o19MenuItem('1.0 (Single)', 'line-spacing:1.0', '<span style="font-size:11px;">✓</span>')}
        ${o19MenuItem('1.15', 'line-spacing:1.15')}
        ${o19MenuItem('1.5 Lines', 'line-spacing:1.5')}
        ${o19MenuItem('2.0 (Double)', 'line-spacing:2.0')}
        ${o19MenuItem('2.5 Lines', 'line-spacing:2.5')}
        ${o19MenuItem('3.0 Lines', 'line-spacing:3.0')}
        <div class="o19-menu-divider"></div>
        <div class="o19-menu-header">Paragraph Spacing</div>
        ${o19MenuItem('Add Space <span class="o19-accel">B</span>efore Paragraph (12 pt)', 'space-before-add', O19_ICONS.spaceBefore)}
        ${o19MenuItem('Add Space <span class="o19-accel">A</span>fter Paragraph (12 pt)', 'space-after-add', O19_ICONS.spaceAfter)}
        ${o19MenuItem('Remove Space Before Paragraph', 'space-before-remove')}
        ${o19MenuItem('Remove Space After Paragraph', 'space-after-remove')}
        <div class="o19-menu-divider"></div>
        <div class="o19-menu-header">Paragraph Indentation</div>
        ${o19MenuItem('First Line Indent (0.5")', 'indent-first-line:0.5', O19_ICONS.indent)}
        ${o19MenuItem('First Line Indent (0.75")', 'indent-first-line:0.75', O19_ICONS.indent)}
        ${o19MenuItem('Hanging Indent (0.5")', 'indent-hanging:0.5', O19_ICONS.indent)}
        ${o19MenuItem('Left Indent (0.5")', 'indent-left:0.5', O19_ICONS.indent)}
        ${o19MenuItem('Right Indent (0.5")', 'indent-right:0.5', O19_ICONS.outdent)}
        ${o19MenuItem('Clear Indentation (0")', 'decrease-indent', O19_ICONS.outdent)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Line Spacing &amp; Indentation Options...', 'open-paragraph-dialog')}
      `

    case 'paste-menu':
    case 'excel-paste-menu':
      return `
        <div class="o19-menu-header">Paste Options:</div>
        ${o19MenuItem('Keep Source Formatting (K)', 'paste', O19_ICONS.pasteLg, 'Ctrl+V')}
        ${o19MenuItem('Merge Formatting (M)', 'paste-merge', O19_ICONS.copySm)}
        ${o19MenuItem('Keep Text Only (T)', 'paste-text', O19_ICONS.changeCase)}
        ${menuId === 'excel-paste-menu' ? `
          ${o19MenuItem('Paste Formulas (F)', 'paste-formulas', '<b style="color:#217346;">fx</b>')}
          ${o19MenuItem('Paste Values (V)', 'paste-values', '<b>123</b>')}
          ${o19MenuItem('Transpose (T)', 'paste-transpose', O19_ICONS.orientLg)}
        ` : ''}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Paste Special...', 'paste', '', 'Alt+Ctrl+V')}
        ${o19MenuItem('Set Default Paste...', 'paste')}
      `

    case 'word-font-family-menu':
    case 'excel-font-family-menu':
      return `
        <div class="o19-menu-header">Theme &amp; Exam Fonts</div>
        ${O19_FONTS.map(f => `<button type="button" class="o19-menu-item" data-word-extra="set-font:${f}" data-excel-extra="excel-set-font:${f}" style="font-family:'${f.replace(/ \(.*\)/, '')}',sans-serif;"><span class="o19-menu-item-icon"></span><span>${f}</span></button>`).join('')}
      `

    case 'word-font-size-menu':
    case 'excel-font-size-menu':
      return O19_FONT_SIZES.map(s => `<button type="button" class="o19-menu-item" data-word-extra="set-size:${s}" data-excel-extra="excel-set-size:${s}"><span class="o19-menu-item-icon"></span><span>${s}</span></button>`).join('')

    case 'change-case-menu':
      return `
        ${o19MenuItem('<span class="o19-accel">S</span>entence case.', 'case-sentence')}
        ${o19MenuItem('<span class="o19-accel">l</span>owercase', 'case-lowercase')}
        ${o19MenuItem('<span class="o19-accel">U</span>PPERCASE', 'case-uppercase')}
        ${o19MenuItem('<span class="o19-accel">C</span>apitalize Each Word', 'case-capitalize')}
        ${o19MenuItem('<span class="o19-accel">t</span>OGGLE cASE', 'case-toggle')}
      `

    case 'underline-menu':
    case 'excel-underline-menu':
      return `
        ${o19MenuItem('<span style="text-decoration:underline;">Single Underline</span>', 'underline-single', '<b><u>U</u></b>', 'Ctrl+U')}
        ${o19MenuItem('<span style="text-decoration:underline double;">Double Underline</span>', 'underline-double', '<b><u>U</u></b>')}
        ${o19MenuItem('<span style="border-bottom:2.5px solid #252423;">Thick Underline</span>', 'underline-thick')}
        ${o19MenuItem('<span style="border-bottom:1.5px dotted #252423;">Dotted Underline</span>', 'underline-dotted')}
        ${o19MenuItem('<span style="border-bottom:1.5px dashed #252423;">Dashed Underline</span>', 'underline-dashed')}
        ${o19MenuItem('<span style="text-decoration:underline wavy;">Wave Underline</span>', 'underline-wavy')}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('More Underlines...', 'open-font-dialog')}
      `

    case 'text-effects-menu':
      return `
        <div class="o19-menu-header">Text Effects Gallery</div>
        <div class="o19-submenu-gallery">
          <button type="button" class="o19-gallery-tile" data-word-extra="text-effect:shadow"><b style="font-size:16px;color:#2b579a;text-shadow:1px 2px 2px rgba(0,0,0,.35);">A</b><small>Shadow</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="text-effect:outline"><b style="font-size:16px;color:#fff;-webkit-text-stroke:1px #2b579a;">A</b><small>Outline</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="text-effect:glow"><b style="font-size:16px;color:#185abd;text-shadow:0 0 6px #60a5fa;">A</b><small>Glow</small></button>
        </div>
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Outline', 'text-effect:outline')}
        ${o19MenuItem('Shadow', 'text-effect:shadow')}
        ${o19MenuItem('Reflection', 'text-effect:reflection')}
        ${o19MenuItem('Glow', 'text-effect:glow')}
        ${o19MenuItem('Clear Text Effects', 'text-effect:none')}
      `

    case 'highlight-menu':
      return `
        <div class="o19-menu-header">Text Highlight Color</div>
        <div class="o19-color-grid-5">
          ${O19_HIGHLIGHT_COLORS.map(c => `<button type="button" class="o19-color-swatch" style="background:${c};" data-word-extra="highlight-color:${c}" title="${c}"></button>`).join('')}
        </div>
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('No Color', 'highlight-color:transparent')}
      `

    case 'font-color-menu':
    case 'excel-font-color-menu':
      return o19ColorPaletteHTML('font-color')

    case 'shading-menu':
    case 'excel-fill-color-menu':
      return o19ColorPaletteHTML('shading-color')

    case 'page-color-menu':
      return o19ColorPaletteHTML('page-color')

    case 'bullets-menu':
      return `
        <div class="o19-menu-header">Bullet Library</div>
        <div class="o19-submenu-gallery">
          <button type="button" class="o19-gallery-tile" data-word-extra="bullet-style:none"><b>None</b></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="bullet-style:disc"><b style="font-size:16px;">•</b><small>Disc</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="bullet-style:circle"><b style="font-size:16px;">○</b><small>Circle</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="bullet-style:square"><b style="font-size:16px;">▪</b><small>Square</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="bullet-style:diamond"><b style="font-size:15px;">❖</b><small>Diamond</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="bullet-style:check"><b style="font-size:15px;">✓</b><small>Check</small></button>
        </div>
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Change List Level', 'indent')}
        ${o19MenuItem('Define New Bullet...', 'bullet-style:disc')}
      `

    case 'numbering-menu':
      return `
        <div class="o19-menu-header">Numbering Library</div>
        <div class="o19-submenu-gallery">
          <button type="button" class="o19-gallery-tile" data-word-extra="number-style:none"><b>None</b></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="number-style:decimal"><b>1. 2. 3.</b></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="number-style:upper-alpha"><b>A. B. C.</b></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="number-style:lower-alpha"><b>a. b. c.</b></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="number-style:upper-roman"><b>I. II. III.</b></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="number-style:lower-roman"><b>i. ii. iii.</b></button>
        </div>
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Set Numbering Value...', 'number-style:decimal')}
      `

    case 'multilevel-menu':
      return `
        <div class="o19-menu-header">List Library</div>
        ${o19MenuItem('1) → a) → i) Standard Outline', 'number-style:decimal', O19_ICONS.multilevel)}
        ${o19MenuItem('1 → 1.1 → 1.1.1 Legal Numbering', 'number-style:decimal', O19_ICONS.numbering)}
        ${o19MenuItem('Heading 1 → Heading 2 → Heading 3', 'style-heading-1', O19_ICONS.bullets)}
      `

    case 'justify-menu':
      return `
        ${o19MenuItem('Justify', 'justify-normal', O19_ICONS.alignJustify, 'Ctrl+J')}
        ${o19MenuItem('Justify Low', 'justify-low', O19_ICONS.alignJustify)}
        ${o19MenuItem('Justify Medium', 'justify-medium', O19_ICONS.alignJustify)}
        ${o19MenuItem('Justify High', 'justify-high', O19_ICONS.alignJustify)}
      `

    case 'borders-menu':
    case 'excel-borders-menu':
      return `
        <div class="o19-menu-header">Borders</div>
        ${o19MenuItem('Bottom Border', 'border-bottom', O19_ICONS.borders)}
        ${o19MenuItem('Top Border', 'border-top', O19_ICONS.borders)}
        ${o19MenuItem('Left Border', 'border-left', O19_ICONS.borders)}
        ${o19MenuItem('Right Border', 'border-right', O19_ICONS.borders)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('No Border', 'border-none')}
        ${o19MenuItem('All Borders', 'border-all', O19_ICONS.borders)}
        ${o19MenuItem('Outside Borders', 'border-outside', O19_ICONS.borders)}
        ${o19MenuItem('Thick Box Border', 'border-thick', O19_ICONS.borders)}
        ${o19MenuItem('Bottom Double Border', 'border-double', O19_ICONS.borders)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Horizontal Line', 'horizontal-line')}
        ${o19MenuItem('View Gridlines', 'gridlines')}
        ${o19MenuItem('Borders and Shading...', 'open-borders-dialog', O19_ICONS.pageBorderLg)}
      `

    case 'styles-menu':
      return `
        <div class="o19-menu-header">Styles Gallery</div>
        <div class="o19-submenu-gallery">
          <button type="button" class="o19-gallery-tile" data-word-extra="style-normal"><b>AaBbCcDd</b><small>¶ Normal</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="style-no-spacing"><b>AaBbCcDd</b><small>¶ No Spacing</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="style-heading-1"><b style="color:#2f5597;">AaBbCc</b><small>Heading 1</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="style-heading-2"><b style="color:#2f5597;">AaBbCc</b><small>Heading 2</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="style-heading-3"><b style="color:#2f5597;">AaBbCc</b><small>Heading 3</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="style-title"><b>AaB</b><small>Title</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="style-subtitle"><b style="color:#595959;">AaBbCcDd</b><small>Subtitle</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="style-quote"><i>AaBbCcDd</i><small>Quote</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="style-strong"><b>AaBbCcDd</b><small>Strong</small></button>
        </div>
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Create a Style...', 'style-heading-1')}
        ${o19MenuItem('Clear Formatting', 'clear-formatting', O19_ICONS.clearFormat)}
      `

    case 'find-menu':
      return `
        ${o19MenuItem('Find', 'open-find-dialog', O19_ICONS.findSm, 'Ctrl+F')}
        ${o19MenuItem('Advanced Find...', 'open-find-dialog', O19_ICONS.findSm)}
        ${o19MenuItem('Go To...', 'open-find-dialog', '', 'Ctrl+G')}
      `

    case 'select-menu':
      return `
        ${o19MenuItem('Select All', 'select-all', '', 'Ctrl+A')}
        ${o19MenuItem('Select Objects', 'select-all', O19_ICONS.selectSm)}
        ${o19MenuItem('Select Text with Similar Formatting', 'select-all')}
      `

    case 'insert-table-menu': {
      let cells = ''
      for (let r = 1; r <= 6; r++) {
        for (let c = 1; c <= 10; c++) {
          cells += `<button type="button" class="o19-table-cell-pick" data-table-r="${r}" data-table-c="${c}" data-word-extra="insert-table-grid:${r}x${c}" title="${c}x${r} Table"></button>`
        }
      }
      return `
        <div class="o19-table-picker">
          <div id="o19-table-picker-label" style="font-size:11px;font-weight:600;color:#252423;">Insert Table</div>
          <div class="o19-table-picker-grid">${cells}</div>
        </div>
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Insert Table...', 'open-table-dialog', O19_ICONS.tableLg)}
        ${o19MenuItem('Draw Table', 'insert-table', O19_ICONS.painterSm)}
        ${o19MenuItem('Convert Text to Table...', 'open-table-dialog', O19_ICONS.tableLg)}
        ${o19MenuItem('Excel Spreadsheet', 'insert-table', O19_ICONS.tableLg)}
        ${o19MenuItem('Quick Tables', 'insert-table:3x3', O19_ICONS.tableLg)}
      `
    }

    case 'cover-page-menu':
      return `
        <div class="o19-menu-header">Built-In Cover Pages</div>
        ${o19MenuItem('Austin', 'cover-page:Austin', O19_ICONS.headerLg)}
        ${o19MenuItem('Banded', 'cover-page:Banded', O19_ICONS.headerLg)}
        ${o19MenuItem('Facet', 'cover-page:Facet', O19_ICONS.headerLg)}
        ${o19MenuItem('Integral', 'cover-page:Integral', O19_ICONS.headerLg)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Remove Current Cover Page', 'cover-page:remove')}
      `

    case 'pictures-menu':
      return `
        ${o19MenuItem('This Device...', 'picture', O19_ICONS.pictureLg)}
        ${o19MenuItem('Stock Images...', 'picture', O19_ICONS.pictureLg)}
        ${o19MenuItem('Online Pictures...', 'picture', O19_ICONS.pictureLg)}
      `

    case 'shapes-menu':
      return `
        <div class="o19-menu-header">Basic Shapes &amp; Arrows</div>
        <div class="o19-submenu-gallery">
          <button type="button" class="o19-gallery-tile" data-word-extra="insert-shape:rectangle" data-excel-extra="insert-shape:rectangle"><b>▭</b><small>Rectangle</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="insert-shape:oval" data-excel-extra="insert-shape:oval"><b>◯</b><small>Oval</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="insert-shape:triangle" data-excel-extra="insert-shape:triangle"><b>△</b><small>Triangle</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="insert-shape:arrow" data-excel-extra="insert-shape:arrow"><b>➔</b><small>Arrow</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="insert-shape:star" data-excel-extra="insert-shape:star"><b>★</b><small>Star</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="insert-shape:callout" data-excel-extra="insert-shape:callout"><b>💬</b><small>Callout</small></button>
        </div>
      `

    case 'smartart-menu':
      return `
        <div class="o19-menu-header">Choose a SmartArt Graphic</div>
        ${o19MenuItem('List', 'insert-smartart:List', O19_ICONS.bullets)}
        ${o19MenuItem('Process', 'insert-smartart:Process', O19_ICONS.indent)}
        ${o19MenuItem('Cycle', 'insert-smartart:Cycle', O19_ICONS.redo)}
        ${o19MenuItem('Hierarchy', 'insert-smartart:Hierarchy', O19_ICONS.tableLg)}
      `

    case 'word-chart-menu':
    case 'excel-chart-col-menu':
    case 'excel-chart-line-menu':
    case 'excel-chart-pie-menu':
      return `
        <div class="o19-menu-header">Insert Chart</div>
        ${o19MenuItem('Clustered Column', 'column-chart', O19_ICONS.chartLg)}
        ${o19MenuItem('Stacked Column', 'column-chart', O19_ICONS.chartLg)}
        ${o19MenuItem('Line with Markers', 'line-chart', O19_ICONS.chartLg)}
        ${o19MenuItem('2-D Pie Chart', 'pie-chart', O19_ICONS.shapesLg)}
        ${o19MenuItem('Bar Chart', 'column-chart', O19_ICONS.chartLg)}
      `

    case 'link-menu':
      return `
        ${o19MenuItem('Insert Link...', 'insert-hyperlink', O19_ICONS.findSm, 'Ctrl+K')}
        ${o19MenuItem('Remove Link', 'remove-hyperlink')}
      `

    case 'header-menu':
      return `
        <div class="o19-menu-header">Built-in Headers</div>
        ${o19MenuItem('Blank', 'header', O19_ICONS.headerLg, '', 'Type text in top header area')}
        ${o19MenuItem('Blank (Three Columns)', 'header-3col', O19_ICONS.headerLg, '', 'Left, Center, Right header')}
        ${o19MenuItem('Austin', 'header-austin', O19_ICONS.headerLg, '', 'Bordered document title header')}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Edit Header...', 'header-custom', O19_ICONS.headerLg)}
        ${o19MenuItem('Remove Header', 'header-remove')}
      `

    case 'footer-menu':
      return `
        <div class="o19-menu-header">Built-in Footers</div>
        ${o19MenuItem('Blank', 'footer', O19_ICONS.footerLg, '', 'Type text in bottom footer area')}
        ${o19MenuItem('Blank (Three Columns)', 'footer-3col', O19_ICONS.footerLg, '', 'Left, Center, Right footer')}
        ${o19MenuItem('Austin', 'footer-austin', O19_ICONS.footerLg, '', 'Page number & footer')}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Edit Footer...', 'footer-custom', O19_ICONS.footerLg)}
        ${o19MenuItem('Remove Footer', 'footer-remove')}
      `

    case 'page-number-menu':
      return `
        ${o19MenuItem('Top of Page (Header)', 'page-number-top', O19_ICONS.pageNumLg)}
        ${o19MenuItem('Bottom of Page (Footer)', 'page-number', O19_ICONS.pageNumLg)}
        ${o19MenuItem('Page Margins', 'page-number', O19_ICONS.pageNumLg)}
        ${o19MenuItem('Current Position', 'page-number', O19_ICONS.pageNumLg)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Format Page Numbers...', 'page-number')}
        ${o19MenuItem('Remove Page Numbers', 'page-number-remove')}
      `

    case 'textbox-menu':
      return `
        ${o19MenuItem('Simple Text Box', 'insert-textbox', O19_ICONS.headerLg)}
        ${o19MenuItem('Austin Quote', 'insert-textbox', O19_ICONS.headerLg)}
        ${o19MenuItem('Draw Text Box', 'insert-textbox', O19_ICONS.headerLg)}
      `

    case 'wordart-menu':
      return `
        <div class="o19-menu-header">WordArt Styles</div>
        <div class="o19-submenu-gallery">
          <button type="button" class="o19-gallery-tile" data-word-extra="wordart-1"><b style="font-size:18px;color:#2b579a;">A</b><small>Fill Blue</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="wordart-2"><b style="font-size:18px;color:#d83b01;">A</b><small>Fill Orange</small></button>
          <button type="button" class="o19-gallery-tile" data-word-extra="wordart-3"><b style="font-size:18px;color:#217346;text-shadow:1px 2px 2px rgba(0,0,0,.3);">A</b><small>Shadow</small></button>
        </div>
      `

    case 'drop-cap-menu':
      return `
        <div class="o19-menu-header">Drop Cap</div>
        ${o19MenuItem('None', 'drop-cap-none')}
        ${o19MenuItem('Dropped', 'drop-cap', O19_ICONS.changeCase, '', 'Large initial capital letter inside paragraph')}
        ${o19MenuItem('In margin', 'drop-cap-margin', O19_ICONS.changeCase, '', 'Large initial capital letter in left margin')}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Drop Cap Options...', 'drop-cap')}
      `

    case 'equation-menu':
      return `
        <div class="o19-menu-header">Built-In Equations</div>
        ${o19MenuItem('Area of Circle: A = πr²', 'insert-eq:A = πr²')}
        ${o19MenuItem('Quadratic Formula: x = (-b ± √(b²-4ac)) / 2a', 'insert-eq:x = (-b ± √(b²-4ac)) / 2a')}
        ${o19MenuItem('Pythagorean Theorem: a² + b² = c²', 'insert-eq:a² + b² = c²')}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Insert New Equation', 'insert-equation')}
      `

    case 'symbol-menu': {
      const syms = ['©', '®', '™', '₹', '€', '£', '¥', '±', '≠', '≤', '≥', '÷', '×', '∞', '√', 'α', 'β', 'π', 'Ω', '∑']
      return `
        <div class="o19-menu-header">Symbols</div>
        <div class="o19-color-grid-5">
          ${syms.map(s => `<button type="button" class="o19-color-swatch" style="font-size:13px;font-weight:600;background:#fff;" data-word-extra="insert-sym:${s}" data-excel-extra="insert-sym:${s}">${s}</button>`).join('')}
        </div>
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('More Symbols...', 'symbol')}
      `
    }

    case 'themes-menu':
      return `
        <div class="o19-menu-header">Office Themes</div>
        ${o19MenuItem('Office (Default)', 'theme-office', O19_ICONS.pageColorLg)}
        ${o19MenuItem('Facet', 'theme-modern', O19_ICONS.pageColorLg)}
        ${o19MenuItem('Integral', 'theme-classic', O19_ICONS.pageColorLg)}
        ${o19MenuItem('Ion', 'theme-formal', O19_ICONS.pageColorLg)}
        ${o19MenuItem('Retrospect', 'themes', O19_ICONS.pageColorLg)}
      `

    case 'theme-colors-menu':
      return `
        <div class="o19-menu-header">Theme Colors</div>
        ${o19MenuItem('Office', 'theme-office', O19_ICONS.shading)}
        ${o19MenuItem('Blue Warm', 'theme-modern', O19_ICONS.shading)}
        ${o19MenuItem('Green', 'themes', O19_ICONS.shading)}
        ${o19MenuItem('Grayscale', 'themes', O19_ICONS.shading)}
      `

    case 'theme-fonts-menu':
      return `
        <div class="o19-menu-header">Theme Fonts</div>
        ${o19MenuItem('Office (Calibri Light / Calibri)', 'set-font:Calibri')}
        ${o19MenuItem('Office Classic (Arial / Times New Roman)', 'set-font:Times New Roman')}
        ${o19MenuItem('Georgia / Verdana', 'set-font:Georgia')}
        ${o19MenuItem('Hindi Official (Mangal / Kruti Dev 010)', 'set-font:Mangal')}
      `

    case 'design-spacing-menu':
      return `
        ${o19MenuItem('Default', 'line-spacing:1.15')}
        ${o19MenuItem('No Paragraph Space', 'line-spacing:1.0')}
        ${o19MenuItem('Compact', 'line-spacing:1.0')}
        ${o19MenuItem('Tight', 'line-spacing:1.15')}
        ${o19MenuItem('Open', 'line-spacing:1.5')}
        ${o19MenuItem('Relaxed', 'line-spacing:1.5')}
        ${o19MenuItem('Double', 'line-spacing:2.0')}
      `

    case 'watermark-menu':
      return `
        <div class="o19-menu-header">Confidential &amp; Disclaimers</div>
        ${o19MenuItem('CONFIDENTIAL 1 (Diagonal)', 'watermark:CONFIDENTIAL', O19_ICONS.watermarkLg)}
        ${o19MenuItem('CONFIDENTIAL 2 (Horizontal)', 'watermark:CONFIDENTIAL', O19_ICONS.watermarkLg)}
        ${o19MenuItem('DO NOT COPY 1', 'watermark:DO NOT COPY', O19_ICONS.watermarkLg)}
        ${o19MenuItem('DRAFT', 'watermark:DRAFT', O19_ICONS.watermarkLg)}
        ${o19MenuItem('SAMPLE', 'watermark:SAMPLE', O19_ICONS.watermarkLg)}
        ${o19MenuItem('URGENT', 'watermark:URGENT', O19_ICONS.watermarkLg)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Custom Watermark...', 'open-watermark-dialog', O19_ICONS.watermarkLg)}
        ${o19MenuItem('Remove Watermark', 'watermark-remove')}
      `

    case 'margins-menu':
      return `
        <div class="o19-menu-header">Margin Presets</div>
        ${o19MenuItem('Normal', 'margins:normal', O19_ICONS.marginsLg, '', 'Top: 1"  Bottom: 1"  Left: 1"  Right: 1"')}
        ${o19MenuItem('Narrow', 'margins:narrow', O19_ICONS.marginsLg, '', 'Top: 0.5"  Bottom: 0.5"  Left: 0.5"  Right: 0.5"')}
        ${o19MenuItem('Moderate', 'margins:moderate', O19_ICONS.marginsLg, '', 'Top: 1"  Bottom: 1"  Left: 0.75"  Right: 0.75"')}
        ${o19MenuItem('Wide', 'margins:wide', O19_ICONS.marginsLg, '', 'Top: 1"  Bottom: 1"  Left: 2"  Right: 2"')}
        ${o19MenuItem('Mirrored', 'margins:normal', O19_ICONS.marginsLg, '', 'Top: 1"  Bottom: 1"  Inside: 1.25"  Outside: 1"')}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Custom Margins...', 'open-pagesetup-dialog', O19_ICONS.marginsLg)}
      `

    case 'orientation-menu':
      return `
        ${o19MenuItem('Portrait', 'orientation:portrait', O19_ICONS.sizeLg)}
        ${o19MenuItem('Landscape', 'orientation:landscape', O19_ICONS.orientLg)}
      `

    case 'size-menu':
      return `
        <div class="o19-menu-header">Page Sizes</div>
        ${o19MenuItem('Letter', 'paper-size:letter', O19_ICONS.sizeLg, '', '8.5" x 11" (21.59 cm x 27.94 cm)')}
        ${o19MenuItem('Legal', 'paper-size:legal', O19_ICONS.sizeLg, '', '8.5" x 14" (21.59 cm x 35.56 cm)')}
        ${o19MenuItem('A4', 'paper-size:a4', O19_ICONS.sizeLg, '', '8.27" x 11.69" (21 cm x 29.7 cm)')}
        ${o19MenuItem('A3', 'paper-size:a3', O19_ICONS.sizeLg, '', '11.69" x 16.54" (29.7 cm x 42 cm)')}
        ${o19MenuItem('A5', 'paper-size:a5', O19_ICONS.sizeLg, '', '5.83" x 8.27" (14.8 cm x 21 cm)')}
        ${o19MenuItem('Executive', 'paper-size:executive', O19_ICONS.sizeLg, '', '7.25" x 10.5"')}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('More Paper Sizes...', 'open-pagesetup-dialog')}
      `

    case 'columns-menu':
      return `
        ${o19MenuItem('One', 'columns:1', O19_ICONS.columnsLg)}
        ${o19MenuItem('Two', 'columns:2', O19_ICONS.columnsLg)}
        ${o19MenuItem('Three', 'columns:3', O19_ICONS.columnsLg)}
        ${o19MenuItem('Left', 'columns:2', O19_ICONS.columnsLg)}
        ${o19MenuItem('Right', 'columns:2', O19_ICONS.columnsLg)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('More Columns...', 'columns:2')}
      `

    case 'breaks-menu':
      return `
        <div class="o19-menu-header">Page Breaks</div>
        ${o19MenuItem('Page', 'page-break', O19_ICONS.sizeLg, '', 'Mark the point at which one page ends')}
        ${o19MenuItem('Column', 'columns:2', O19_ICONS.columnsLg, '', 'Indicate that text follows in the next column')}
        ${o19MenuItem('Text Wrapping', 'page-break', '', '', 'Separate text around objects')}
        <div class="o19-menu-header">Section Breaks</div>
        ${o19MenuItem('Next Page', 'page-break', '', '', 'Insert a section break and start on the next page')}
        ${o19MenuItem('Continuous', 'page-break', '', '', 'Insert a section break and start on the same page')}
      `

    case 'line-numbers-menu':
      return `
        ${o19MenuItem('None', 'line-numbers:none')}
        ${o19MenuItem('Continuous', 'line-numbers:continuous')}
        ${o19MenuItem('Restart Each Page', 'line-numbers:continuous')}
        ${o19MenuItem('Restart Each Section', 'line-numbers:continuous')}
      `

    case 'hyphenation-menu':
      return `
        ${o19MenuItem('None', 'hyphenation:none')}
        ${o19MenuItem('Automatic', 'hyphenation:auto')}
        ${o19MenuItem('Manual...', 'hyphenation:auto')}
      `

    case 'position-menu':
    case 'wrap-text-menu':
    case 'align-objects-menu':
      return `
        ${o19MenuItem('In Line with Text', 'wrap-inline', O19_ICONS.wrapTextSm)}
        ${o19MenuItem('Square', 'wrap-square', O19_ICONS.wrapTextSm)}
        ${o19MenuItem('Tight', 'wrap-tight', O19_ICONS.wrapTextSm)}
        ${o19MenuItem('Through', 'wrap-tight', O19_ICONS.wrapTextSm)}
        ${o19MenuItem('Behind Text', 'wrap-behind', O19_ICONS.wrapTextSm)}
        ${o19MenuItem('In Front of Text', 'wrap-front', O19_ICONS.wrapTextSm)}
      `

    case 'toc-menu':
    case 'toc-level-menu':
      return `
        ${o19MenuItem('Automatic Table 1', 'contents', O19_ICONS.columnsLg)}
        ${o19MenuItem('Automatic Table 2', 'contents', O19_ICONS.columnsLg)}
        ${o19MenuItem('Manual Table', 'contents', O19_ICONS.columnsLg)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Remove Table of Contents', 'contents-remove')}
      `

    case 'footnote-nav-menu':
    case 'citation-menu':
    case 'bib-style-menu':
    case 'bibliography-menu':
      return `
        ${o19MenuItem('Insert Footnote', 'footnote')}
        ${o19MenuItem('Insert Citation (APA / MLA / Chicago)', 'citation')}
        ${o19MenuItem('Insert Bibliography', 'citation')}
      `

    case 'mail-merge-menu':
    case 'recipients-menu':
    case 'merge-field-menu':
    case 'finish-merge-menu':
      return `
        ${o19MenuItem('Letters', 'mail-merge')}
        ${o19MenuItem('E-mail Messages', 'mail-merge')}
        ${o19MenuItem('Envelopes...', 'envelopes')}
        ${o19MenuItem('Labels...', 'labels')}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Insert <<First_Name>>', 'merge-field:First_Name')}
        ${o19MenuItem('Insert <<Last_Name>>', 'merge-field:Last_Name')}
        ${o19MenuItem('Insert <<Designation>>', 'merge-field:Designation')}
        ${o19MenuItem('Insert <<City>>', 'merge-field:City')}
      `

    case 'translate-menu':
    case 'language-menu':
      return `
        ${o19MenuItem('Translate Selection', 'translate')}
        ${o19MenuItem('Translate Document', 'translate')}
        ${o19MenuItem('Set Proofing Language...', 'language')}
      `

    case 'track-changes-menu':
    case 'markup-view-menu':
    case 'accept-changes-menu':
    case 'reject-changes-menu':
      return `
        ${o19MenuItem('Track Changes', 'track-changes', O19_ICONS.replaceSm, 'Ctrl+Shift+E')}
        ${o19MenuItem('Accept and Move to Next', 'accept-changes')}
        ${o19MenuItem('Accept All Changes', 'accept-changes')}
        ${o19MenuItem('Reject and Move to Next', 'reject-changes')}
        ${o19MenuItem('Reject All Changes', 'reject-changes')}
      `

    case 'zoom-menu':
      return `
        ${o19MenuItem('200%', 'zoom-set:200')}
        ${o19MenuItem('150%', 'zoom-set:150')}
        ${o19MenuItem('125%', 'zoom-set:125')}
        ${o19MenuItem('100%', 'zoom-set:100')}
        ${o19MenuItem('75%', 'zoom-set:75')}
        ${o19MenuItem('Page Width', 'page-width')}
      `

    case 'macros-menu':
      return `
        ${o19MenuItem('View Macros', 'macro-vb', '', 'Alt+F8')}
        ${o19MenuItem('Record Macro...', 'record-macro')}
        ${o19MenuItem('Pause Recording', 'record-macro')}
      `

    case 'qat-menu':
      return `
        <div class="o19-menu-header">Customize Quick Access Toolbar</div>
        ${o19MenuItem('New', 'new-document', '')}
        ${o19MenuItem('Open', 'open-document', '')}
        ${o19MenuItem('✓ Save', 'save', O19_ICONS.save)}
        ${o19MenuItem('Print Preview and Print', 'print', '')}
        ${o19MenuItem('Spelling &amp; Grammar', 'spelling', '')}
        ${o19MenuItem('✓ Undo', 'undo-cmd', O19_ICONS.undo)}
        ${o19MenuItem('✓ Redo', 'redo-cmd', O19_ICONS.redo)}
      `

    case 'ribbon-display-menu':
      return `
        ${o19MenuItem('Auto-hide Ribbon', 'ribbon-toggle', O19_ICONS.ribbonDisplay, '', 'Hide the ribbon. Click at the top to show it.')}
        ${o19MenuItem('Show Tabs', 'ribbon-toggle', O19_ICONS.ribbonDisplay, '', 'Show ribbon tabs only.')}
        ${o19MenuItem('Show Tabs and Commands', 'ribbon-show', O19_ICONS.ribbonDisplay, '', 'Show ribbon tabs and commands all the time.')}
      `

    // EXCEL SPECIFIC MENUS
    case 'excel-orient-menu':
      return `
        ${o19MenuItem('Angle Counterclockwise', 'excel-orient:ccw', O19_ICONS.orientCellSm, '', '', true)}
        ${o19MenuItem('Angle Clockwise', 'excel-orient:cw', O19_ICONS.orientCellSm, '', '', true)}
        ${o19MenuItem('Vertical Text', 'excel-orient:vertical', O19_ICONS.orientCellSm, '', '', true)}
        ${o19MenuItem('Rotate Text Up', 'excel-orient:up', O19_ICONS.orientCellSm, '', '', true)}
        ${o19MenuItem('Rotate Text Down', 'excel-orient:down', O19_ICONS.orientCellSm, '', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Format Cell Alignment...', 'open-excel-format-dlg', '', '', '', true)}
      `

    case 'excel-merge-menu':
      return `
        ${o19MenuItem('Merge &amp; Center', 'excel-merge', O19_ICONS.mergeCenterSm, '', '', true)}
        ${o19MenuItem('Merge Across', 'excel-merge', O19_ICONS.mergeCenterSm, '', '', true)}
        ${o19MenuItem('Merge Cells', 'excel-merge', O19_ICONS.mergeCenterSm, '', '', true)}
        ${o19MenuItem('Unmerge Cells', 'excel-unmerge', '', '', '', true)}
      `

    case 'excel-numfmt-menu':
      return `
        ${o19MenuItem('General', 'excel-numfmt:General', '', 'No specific format', '', true)}
        ${o19MenuItem('Number', 'excel-numfmt:Number', '', '1,234.00', '', true)}
        ${o19MenuItem('Currency', 'excel-numfmt:Currency', '', '₹1,234.00', '', true)}
        ${o19MenuItem('Accounting', 'excel-numfmt:Accounting', '', '₹ 1,234.00', '', true)}
        ${o19MenuItem('Short Date', 'excel-numfmt:Short Date', '', '16-10-2026', '', true)}
        ${o19MenuItem('Percentage', 'excel-numfmt:Percent', '', '100.00%', '', true)}
        ${o19MenuItem('Text', 'excel-numfmt:Text', '', 'ABC', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('More Number Formats...', 'open-excel-format-dlg', '', '', '', true)}
      `

    case 'excel-accounting-menu':
      return `
        ${o19MenuItem('₹  Hindi / English (India)', 'excel-fmt-currency:₹', '', '', '', true)}
        ${o19MenuItem('$  English (United States)', 'excel-fmt-currency:$', '', '', '', true)}
        ${o19MenuItem('£  English (United Kingdom)', 'excel-fmt-currency:£', '', '', '', true)}
        ${o19MenuItem('€  Euro', 'excel-fmt-currency:€', '', '', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('More Accounting Formats...', 'open-excel-format-dlg', '', '', '', true)}
      `

    case 'excel-condfmt-menu':
      return `
        <div class="o19-menu-header">Highlight Cells Rules</div>
        ${o19MenuItem('Greater Than...', 'condfmt-gt', O19_ICONS.condFormatLg, '', '', true)}
        ${o19MenuItem('Less Than...', 'condfmt-lt', O19_ICONS.condFormatLg, '', '', true)}
        ${o19MenuItem('Between...', 'condfmt-gt', O19_ICONS.condFormatLg, '', '', true)}
        ${o19MenuItem('Equal To...', 'condfmt-eq', O19_ICONS.condFormatLg, '', '', true)}
        ${o19MenuItem('Duplicate Values...', 'condfmt-dup', O19_ICONS.condFormatLg, '', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Top/Bottom Rules (Top 10 Items)', 'condfmt-top', '', '', '', true)}
        ${o19MenuItem('Data Bars (Green / Blue)', 'condfmt-bars', '', '', '', true)}
        ${o19MenuItem('Color Scales', 'condfmt-scales', '', '', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Clear Rules from Entire Sheet', 'condfmt-clear', '', '', '', true)}
      `

    case 'excel-table-style-menu':
      return `
        <div class="o19-menu-header">Table Styles</div>
        ${o19MenuItem('Table Style Light 1 (Blue)', 'table', O19_ICONS.formatTableLg, '', '', true)}
        ${o19MenuItem('Table Style Medium 2 (Green)', 'table', O19_ICONS.formatTableLg, '', '', true)}
        ${o19MenuItem('Table Style Dark 1', 'table', O19_ICONS.formatTableLg, '', '', true)}
      `

    case 'excel-cell-styles-menu':
      return `
        <div class="o19-menu-header">Good, Bad and Neutral</div>
        <div class="o19-submenu-gallery">
          <button type="button" class="o19-gallery-tile" data-excel-extra="cell-style:normal"><b>Normal</b></button>
          <button type="button" class="o19-gallery-tile" style="background:#ffc7ce;color:#9c0006;" data-excel-extra="cell-style:bad"><b>Bad</b></button>
          <button type="button" class="o19-gallery-tile" style="background:#c6efce;color:#006100;" data-excel-extra="cell-style:good"><b>Good</b></button>
          <button type="button" class="o19-gallery-tile" style="background:#ffeb9c;color:#9c6500;" data-excel-extra="cell-style:neutral"><b>Neutral</b></button>
          <button type="button" class="o19-gallery-tile" style="border-bottom:2px solid #2b579a;color:#1f4e78;" data-excel-extra="cell-style:heading"><b>Heading 1</b></button>
          <button type="button" class="o19-gallery-tile" style="border-top:1px solid #2b579a;border-bottom:3px double #2b579a;" data-excel-extra="cell-style:total"><b>Total</b></button>
        </div>
      `

    case 'excel-insert-cells-menu':
      return `
        ${o19MenuItem('Insert Cells...', 'insert-row', O19_ICONS.cellsInsertLg, '', '', true)}
        ${o19MenuItem('Insert Sheet Rows', 'insert-row', O19_ICONS.cellsInsertLg, '', '', true)}
        ${o19MenuItem('Insert Sheet Columns', 'insert-col', O19_ICONS.cellsInsertLg, '', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Insert Sheet', 'add-sheet', '', '', '', true)}
      `

    case 'excel-delete-cells-menu':
      return `
        ${o19MenuItem('Delete Cells...', 'delete-row', O19_ICONS.cellsDeleteLg, '', '', true)}
        ${o19MenuItem('Delete Sheet Rows', 'delete-row', O19_ICONS.cellsDeleteLg, '', '', true)}
        ${o19MenuItem('Delete Sheet Columns', 'delete-col', O19_ICONS.cellsDeleteLg, '', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Delete Sheet', 'delete-row', '', '', '', true)}
      `

    case 'excel-format-cells-menu':
      return `
        <div class="o19-menu-header">Cell Size</div>
        ${o19MenuItem('Row Height...', 'row-height', O19_ICONS.cellsFormatLg, '', '', true)}
        ${o19MenuItem('AutoFit Row Height', 'autofit-row', '', '', '', true)}
        ${o19MenuItem('Column Width...', 'col-width', O19_ICONS.cellsFormatLg, '', '', true)}
        ${o19MenuItem('AutoFit Column Width', 'autofit-col', '', '', '', true)}
        ${o19MenuItem('Default Width...', 'col-width', '', '', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Rename Sheet', 'rename-sheet', '', '', '', true)}
        ${o19MenuItem('Format Cells...', 'open-excel-format-dlg', O19_ICONS.cellsFormatLg, 'Ctrl+1', '', true)}
      `

    case 'excel-autosum-menu':
      return `
        ${o19MenuItem('Sum', 'formula:SUM', '<b style="color:#2b579a;">Σ</b>', 'Alt+=', '', true)}
        ${o19MenuItem('Average', 'formula:AVERAGE', '', '', '', true)}
        ${o19MenuItem('Count Numbers', 'formula:COUNT', '', '', '', true)}
        ${o19MenuItem('Max', 'formula:MAX', '', '', '', true)}
        ${o19MenuItem('Min', 'formula:MIN', '', '', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('More Functions...', 'open-function-dlg', '<b style="font-style:italic;">fx</b>', '', '', true)}
      `

    case 'excel-fill-series-menu':
      return `
        ${o19MenuItem('Down', 'fill-down', '', 'Ctrl+D', '', true)}
        ${o19MenuItem('Right', 'fill-right', '', 'Ctrl+R', '', true)}
        ${o19MenuItem('Up', 'fill-down', '', '', '', true)}
        ${o19MenuItem('Left', 'fill-right', '', '', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Series...', 'fill-down', '', '', '', true)}
        ${o19MenuItem('Flash Fill', 'flash-fill', '', 'Ctrl+E', '', true)}
      `

    case 'excel-clear-menu':
      return `
        ${o19MenuItem('Clear All', 'clear-cells', O19_ICONS.clearFormat, '', '', true)}
        ${o19MenuItem('Clear Formats', 'clear-formats', O19_ICONS.clearFormat, '', '', true)}
        ${o19MenuItem('Clear Contents', 'clear-cells', '', 'Del', '', true)}
        ${o19MenuItem('Clear Comments and Notes', 'delete-comment', '', '', '', true)}
      `

    case 'excel-sort-filter-menu':
      return `
        ${o19MenuItem('Sort A to Z (Smallest to Largest)', 'sort-asc', O19_ICONS.sortAZ, '', '', true)}
        ${o19MenuItem('Sort Z to A (Largest to Smallest)', 'sort-desc', O19_ICONS.sortAZ, '', '', true)}
        ${o19MenuItem('Custom Sort...', 'open-sort-dialog', O19_ICONS.tableLg, '', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Filter', 'filter', O19_ICONS.sortFilterLg, 'Ctrl+Shift+L', '', true)}
        ${o19MenuItem('Clear', 'clear-filter', '', '', '', true)}
      `

    case 'excel-find-select-menu':
      return `
        ${o19MenuItem('Find...', 'excel-find-replace', O19_ICONS.findSm, 'Ctrl+F', '', true)}
        ${o19MenuItem('Replace...', 'excel-find-replace', O19_ICONS.replaceSm, 'Ctrl+H', '', true)}
        ${o19MenuItem('Go To...', 'excel-goto', '', 'Ctrl+G', '', true)}
        <div class="o19-menu-divider"></div>
        ${o19MenuItem('Formulas', 'show-formulas', '', '', '', true)}
        ${o19MenuItem('Conditional Formatting', 'conditional-format', '', '', '', true)}
      `

    case 'excel-fn-recent-menu':
      return ['SUM', 'AVERAGE', 'IF', 'COUNT', 'COUNTA', 'MAX', 'MIN', 'SUMIF', 'COUNTIF', 'VLOOKUP'].map(fn =>
        o19MenuItem(fn, `formula:${fn}`, '<b style="font-style:italic;color:#217346;">fx</b>', '', '', true)
      ).join('')

    case 'excel-fn-financial-menu':
      return ['PMT', 'FV', 'PV', 'RATE', 'NPV', 'IRR'].map(fn =>
        o19MenuItem(fn, `formula:${fn}`, '<b style="font-style:italic;color:#217346;">fx</b>', '', '', true)
      ).join('')

    case 'excel-fn-logical-menu':
      return ['IF', 'AND', 'OR', 'NOT', 'IFERROR', 'TRUE', 'FALSE'].map(fn =>
        o19MenuItem(fn, `formula:${fn}`, '<b style="font-style:italic;color:#217346;">fx</b>', '', '', true)
      ).join('')

    case 'excel-fn-text-menu':
      return ['CONCAT', 'UPPER', 'LOWER', 'PROPER', 'LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM', 'EXACT'].map(fn =>
        o19MenuItem(fn, `formula:${fn}`, '<b style="font-style:italic;color:#217346;">fx</b>', '', '', true)
      ).join('')

    case 'excel-fn-datetime-menu':
      return ['TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY'].map(fn =>
        o19MenuItem(fn, `formula:${fn}`, '<b style="font-style:italic;color:#217346;">fx</b>', '', '', true)
      ).join('')

    case 'excel-fn-lookup-menu':
      return ['VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 'CHOOSE'].map(fn =>
        o19MenuItem(fn, `formula:${fn}`, '<b style="font-style:italic;color:#217346;">fx</b>', '', '', true)
      ).join('')

    case 'excel-fn-math-menu':
      return ['SUM', 'SUMIF', 'SUMIFS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'INT', 'ABS', 'MOD', 'POWER', 'SQRT', 'PRODUCT'].map(fn =>
        o19MenuItem(fn, `formula:${fn}`, '<b style="font-style:italic;color:#217346;">fx</b>', '', '', true)
      ).join('')

    case 'excel-fn-stat-menu':
      return ['AVERAGE', 'AVERAGEIF', 'COUNT', 'COUNTA', 'COUNTBLANK', 'COUNTIF', 'MAX', 'MIN', 'MEDIAN', 'MODE', 'RANK'].map(fn =>
        o19MenuItem(fn, `formula:${fn}`, '<b style="font-style:italic;color:#217346;">fx</b>', '', '', true)
      ).join('')

    case 'excel-validation-menu':
      return `
        ${o19MenuItem('Data Validation...', 'data-validation', '', '', '', true)}
        ${o19MenuItem('Circle Invalid Data', 'data-validation', '', '', '', true)}
        ${o19MenuItem('Clear Validation Circles', 'data-validation', '', '', '', true)}
      `

    case 'excel-whatif-menu':
      return `
        ${o19MenuItem('Scenario Manager...', 'what-if', '', '', '', true)}
        ${o19MenuItem('Goal Seek...', 'what-if', '', '', '', true)}
        ${o19MenuItem('Data Table...', 'what-if', '', '', '', true)}
      `

    case 'excel-freeze-menu':
      return `
        ${o19MenuItem('Freeze Panes', 'freeze-panes', O19_ICONS.tableLg, '', 'Keep rows and columns visible while scrolling', true)}
        ${o19MenuItem('Freeze Top Row', 'freeze-panes', O19_ICONS.tableLg, '', 'Keep the top row visible while scrolling', true)}
        ${o19MenuItem('Freeze First Column', 'freeze-panes', O19_ICONS.tableLg, '', 'Keep the first column visible while scrolling', true)}
      `

    case 'print-area-menu':
      return `
        ${o19MenuItem('Set Print Area', 'print-area', '', '', '', true)}
        ${o19MenuItem('Clear Print Area', 'print-area', '', '', '', true)}
      `

    case 'excel-calc-menu':
      return `
        ${o19MenuItem('✓ Automatic', 'calculate-now', '', '', '', true)}
        ${o19MenuItem('Automatic Except for Data Tables', 'calculate-now', '', '', '', true)}
        ${o19MenuItem('Manual', 'calculate-now', '', '', '', true)}
      `

    default:
      return `${o19MenuItem('Apply Command', menuId)}`
  }
}

// ============================================================================
// FLOATING SUBMENU CONTROLLER & MODAL DIALOG ENGINE
// ============================================================================
let o19ActiveMenuEl = null
let o19ActiveTriggerEl = null

function o19CloseMenu() {
  if (o19ActiveMenuEl) {
    o19ActiveMenuEl.remove()
    o19ActiveMenuEl = null
  }
  if (o19ActiveTriggerEl) {
    o19ActiveTriggerEl.classList.remove('is-open')
    o19ActiveTriggerEl = null
  }
}

function o19OpenSubmenu(triggerEl, menuId, onSelectAction) {
  if (o19ActiveTriggerEl === triggerEl && o19ActiveMenuEl) {
    o19CloseMenu()
    return
  }
  o19CloseMenu()
  const html = o19BuildSubmenuHTML(menuId)
  if (!html) return
  const menu = document.createElement('div')
  menu.className = 'o19-dropdown-menu'
  menu.setAttribute('role', 'menu')
  menu.innerHTML = html
  document.body.appendChild(menu)

  const rect = triggerEl.getBoundingClientRect()
  const menuRect = menu.getBoundingClientRect()
  let left = rect.left
  let top = rect.bottom + 2
  if (left + menuRect.width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - menuRect.width - 8)
  }
  if (top + menuRect.height > window.innerHeight - 8) {
    top = Math.max(8, rect.top - menuRect.height - 2)
  }
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`

  triggerEl.classList.add('is-open')
  o19ActiveMenuEl = menu
  o19ActiveTriggerEl = triggerEl

  // Interactive Table Grid Picker hover inside insert-table-menu
  const gridCells = menu.querySelectorAll('.o19-table-cell-pick')
  if (gridCells.length) {
    const label = menu.querySelector('#o19-table-picker-label')
    gridCells.forEach(cell => {
      cell.addEventListener('mouseenter', () => {
        const r = Number(cell.dataset.tableR)
        const c = Number(cell.dataset.tableC)
        if (label) label.textContent = `${c}x${r} Table`
        gridCells.forEach(other => {
          const or = Number(other.dataset.tableR)
          const oc = Number(other.dataset.tableC)
          other.classList.toggle('is-highlighted', or <= r && oc <= c)
        })
      })
    })
  }

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-word-extra],[data-excel-extra]')
    if (!item) return
    e.stopPropagation()
    const action = efficiencyState.module === 'excel'
      ? (item.dataset.excelExtra || item.dataset.wordExtra)
      : (item.dataset.wordExtra || item.dataset.excelExtra)
    o19CloseMenu()
    if (action && onSelectAction) onSelectAction(action)
  })
}

document.addEventListener('click', (e) => {
  if (o19ActiveMenuEl && !o19ActiveMenuEl.contains(e.target) && (!o19ActiveTriggerEl || !o19ActiveTriggerEl.contains(e.target))) {
    o19CloseMenu()
  }
})

function o19OpenDialog(dialogId, onAction) {
  o19CloseMenu()
  document.querySelector('.o19-modal-overlay')?.remove()
  const isExcel = efficiencyState.module === 'excel' || dialogId.startsWith('excel-')
  const overlay = document.createElement('div')
  overlay.className = 'o19-modal-overlay'

  let title = 'Options'
  let body = ''
  let applyHandler = null

  if (dialogId === 'word-font-dlg' || dialogId === 'open-font-dialog') {
    title = 'Font'
    body = `
      <div class="o19-dialog-tabs"><button type="button" class="o19-dialog-tab active">Font</button><button type="button" class="o19-dialog-tab">Advanced</button></div>
      <div class="o19-dialog-body">
        <div class="o19-dialog-grid-3">
          <label class="o19-field"><span>Font:</span><select id="dlg-font-family">${O19_FONTS.map(f => `<option value="${f}">${f}</option>`).join('')}</select></label>
          <label class="o19-field"><span>Font style:</span><select id="dlg-font-style"><option value="regular">Regular</option><option value="italic">Italic</option><option value="bold">Bold</option><option value="bold-italic">Bold Italic</option></select></label>
          <label class="o19-field"><span>Size:</span><select id="dlg-font-size">${O19_FONT_SIZES.map(s => `<option value="${s}" ${s==='12'?'selected':''}>${s}</option>`).join('')}</select></label>
        </div>
        <div class="o19-dialog-grid-3">
          <label class="o19-field"><span>Font color:</span><input type="color" id="dlg-font-color" value="#201f1e" style="height:24px;width:100%;"></label>
          <label class="o19-field"><span>Underline style:</span><select id="dlg-underline"><option value="none">(none)</option><option value="single">Single</option><option value="double">Double</option><option value="dotted">Dotted</option><option value="dashed">Dashed</option><option value="wavy">Wave</option></select></label>
          <label class="o19-field"><span>Character spacing:</span><select id="dlg-char-spacing"><option value="normal">Normal</option><option value="expanded">Expanded (1.5 pt)</option><option value="condensed">Condensed (-0.5 pt)</option></select></label>
        </div>
        <div class="o19-dialog-section">
          <span class="o19-dialog-sec-title">Effects</span>
          <div class="o19-dialog-grid-2">
            <label class="o19-field-check"><input type="checkbox" id="dlg-fx-strike"> Strikethrough</label>
            <label class="o19-field-check"><input type="checkbox" id="dlg-fx-smallcaps"> Small caps</label>
            <label class="o19-field-check"><input type="checkbox" id="dlg-fx-dstrike"> Double strikethrough</label>
            <label class="o19-field-check"><input type="checkbox" id="dlg-fx-allcaps"> All caps</label>
            <label class="o19-field-check"><input type="checkbox" id="dlg-fx-sup"> Superscript</label>
            <label class="o19-field-check"><input type="checkbox" id="dlg-fx-hidden"> Hidden</label>
            <label class="o19-field-check"><input type="checkbox" id="dlg-fx-sub"> Subscript</label>
          </div>
        </div>
      </div>
    `
    applyHandler = () => {
      const f = overlay.querySelector('#dlg-font-family').value
      const sz = overlay.querySelector('#dlg-font-size').value
      const st = overlay.querySelector('#dlg-font-style').value
      const col = overlay.querySelector('#dlg-font-color').value
      const ul = overlay.querySelector('#dlg-underline').value
      const sp = overlay.querySelector('#dlg-char-spacing').value
      onAction(`set-font:${f}`)
      onAction(`set-size:${sz}`)
      if (st.includes('bold')) onAction('cmd:bold')
      if (st.includes('italic')) onAction('cmd:italic')
      if (col && col !== '#201f1e') onAction(`font-color:${col}`)
      if (ul !== 'none') onAction(`underline-${ul}`)
      if (sp === 'expanded') onAction('char-spacing:expanded')
      if (sp === 'condensed') onAction('char-spacing:condensed')
      if (overlay.querySelector('#dlg-fx-strike').checked || overlay.querySelector('#dlg-fx-dstrike').checked) onAction('strikethrough')
      if (overlay.querySelector('#dlg-fx-sup').checked) onAction('superscript')
      if (overlay.querySelector('#dlg-fx-sub').checked) onAction('subscript')
      if (overlay.querySelector('#dlg-fx-allcaps').checked) onAction('case-uppercase')
      if (overlay.querySelector('#dlg-fx-smallcaps').checked) onAction('small-caps')
    }
  } else if (dialogId === 'word-paragraph-dlg' || dialogId === 'open-paragraph-dialog') {
    title = 'Paragraph'
    body = `
      <div class="o19-dialog-tabs"><button type="button" class="o19-dialog-tab active">Indents and Spacing</button><button type="button" class="o19-dialog-tab">Line and Page Breaks</button></div>
      <div class="o19-dialog-body">
        <div class="o19-dialog-section">
          <span class="o19-dialog-sec-title">General</span>
          <div class="o19-dialog-grid-2">
            <label class="o19-field"><span>Alignment:</span><select id="dlg-para-align"><option value="left">Left</option><option value="center">Centered</option><option value="right">Right</option><option value="justify">Justified</option></select></label>
            <label class="o19-field"><span>Outline level:</span><select><option>Body Text</option><option>Level 1</option><option>Level 2</option></select></label>
          </div>
        </div>
        <div class="o19-dialog-section">
          <span class="o19-dialog-sec-title">Indentation</span>
          <div class="o19-dialog-grid-2">
            <label class="o19-field"><span>Left:</span><input type="text" id="dlg-indent-left" value="0&quot;"></label>
            <label class="o19-field"><span>Special:</span><select id="dlg-indent-special"><option value="none">(none)</option><option value="first-line">First line</option><option value="hanging">Hanging</option></select></label>
            <label class="o19-field"><span>Right:</span><input type="text" id="dlg-indent-right" value="0&quot;"></label>
            <label class="o19-field"><span>By:</span><input type="text" id="dlg-indent-by" value="0.5&quot;"></label>
          </div>
        </div>
        <div class="o19-dialog-section">
          <span class="o19-dialog-sec-title">Spacing</span>
          <div class="o19-dialog-grid-2">
            <label class="o19-field"><span>Before:</span><input type="text" id="dlg-space-before" value="0 pt"></label>
            <label class="o19-field"><span>Line spacing:</span><select id="dlg-line-spacing"><option value="1.0">Single</option><option value="1.15" selected>1.15 lines</option><option value="1.5">1.5 lines</option><option value="2.0">Double</option><option value="2.5">Multiple (2.5)</option><option value="3.0">Multiple (3.0)</option></select></label>
            <label class="o19-field"><span>After:</span><input type="text" id="dlg-space-after" value="8 pt"></label>
            <label class="o19-field"><span>At:</span><input type="text" id="dlg-line-at" value="1.15"></label>
          </div>
        </div>
      </div>
    `
    applyHandler = () => {
      const align = overlay.querySelector('#dlg-para-align').value
      const special = overlay.querySelector('#dlg-indent-special').value
      const ls = overlay.querySelector('#dlg-line-spacing').value
      const bef = parseFloat(overlay.querySelector('#dlg-space-before').value) || 0
      const aft = parseFloat(overlay.querySelector('#dlg-space-after').value) || 0
      const leftIn = parseFloat(overlay.querySelector('#dlg-indent-left').value) || 0
      if (align === 'center') onAction('cmd:justifyCenter')
      else if (align === 'right') onAction('cmd:justifyRight')
      else if (align === 'justify') onAction('cmd:justifyFull')
      else onAction('cmd:justifyLeft')
      const byVal = parseFloat(overlay.querySelector('#dlg-indent-by').value) || 0.5
      const rightIn = parseFloat(overlay.querySelector('#dlg-indent-right').value) || 0
      if (leftIn > 0) onAction(`indent-left:${leftIn}`)
      if (rightIn > 0) onAction(`indent-right:${rightIn}`)
      if (special === 'first-line') onAction(`indent-first-line:${byVal}`)
      else if (special === 'hanging') onAction(`indent-hanging:${byVal}`)
      onAction(`line-spacing:${ls}`)
      if (bef > 0) onAction(`space-before:${bef}`)
      if (aft >= 0) onAction(`space-after:${aft}`)
    }
  } else if (dialogId === 'word-pagesetup-dlg' || dialogId === 'open-pagesetup-dialog') {
    title = 'Page Setup'
    body = `
      <div class="o19-dialog-tabs"><button type="button" class="o19-dialog-tab active">Margins</button><button type="button" class="o19-dialog-tab">Paper</button><button type="button" class="o19-dialog-tab">Layout</button></div>
      <div class="o19-dialog-body">
        <div class="o19-dialog-section">
          <span class="o19-dialog-sec-title">Margins</span>
          <div class="o19-dialog-grid-2">
            <label class="o19-field"><span>Top:</span><input type="text" id="dlg-margin-top" value="1&quot;"></label>
            <label class="o19-field"><span>Bottom:</span><input type="text" id="dlg-margin-bottom" value="1&quot;"></label>
            <label class="o19-field"><span>Left:</span><input type="text" id="dlg-margin-left" value="1&quot;"></label>
            <label class="o19-field"><span>Right:</span><input type="text" id="dlg-margin-right" value="1&quot;"></label>
          </div>
        </div>
        <div class="o19-dialog-section">
          <span class="o19-dialog-sec-title">Orientation &amp; Paper</span>
          <div class="o19-dialog-grid-2">
            <label class="o19-field"><span>Orientation:</span><select id="dlg-orient"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
            <label class="o19-field"><span>Paper size:</span><select id="dlg-paper"><option value="a4">A4 (210 x 297 mm)</option><option value="letter">Letter (8.5 x 11 in)</option><option value="legal">Legal (8.5 x 14 in)</option><option value="a3">A3</option><option value="a5">A5</option></select></label>
          </div>
        </div>
      </div>
    `
    applyHandler = () => {
      const topVal = parseFloat(overlay.querySelector('#dlg-margin-top').value) || 1
      const orient = overlay.querySelector('#dlg-orient').value
      const paper = overlay.querySelector('#dlg-paper').value
      onAction(topVal <= 0.6 ? 'margins:narrow' : topVal >= 1.5 ? 'margins:wide' : 'margins:normal')
      onAction(`orientation:${orient}`)
      onAction(`paper-size:${paper}`)
    }
  } else if (dialogId === 'open-find-dialog' || dialogId === 'find-replace') {
    title = 'Find and Replace'
    body = `
      <div class="o19-dialog-tabs"><button type="button" class="o19-dialog-tab">Find</button><button type="button" class="o19-dialog-tab active">Replace</button><button type="button" class="o19-dialog-tab">Go To</button></div>
      <div class="o19-dialog-body">
        <label class="o19-field"><span>Find what:</span><input type="text" id="dlg-find-what" placeholder="Enter word or phrase to find"></label>
        <label class="o19-field"><span>Replace with:</span><input type="text" id="dlg-replace-with" placeholder="Enter replacement text"></label>
        <div class="o19-dialog-section">
          <span class="o19-dialog-sec-title">Search &amp; Formatting Options</span>
          <div class="o19-dialog-grid-2">
            <label class="o19-field-check"><input type="checkbox" id="dlg-find-case"> Match case</label>
            <label class="o19-field-check"><input type="checkbox" id="dlg-find-whole"> Find whole words only</label>
            <label class="o19-field-check"><input type="checkbox" id="dlg-replace-bold"> Format replacement: Bold</label>
            <label class="o19-field-check"><input type="checkbox" id="dlg-replace-hl"> Format replacement: Highlight</label>
          </div>
        </div>
      </div>
    `
    applyHandler = () => {
      const findText = overlay.querySelector('#dlg-find-what').value
      const repText = overlay.querySelector('#dlg-replace-with').value
      const bold = overlay.querySelector('#dlg-replace-bold').checked
      const hl = overlay.querySelector('#dlg-replace-hl').checked
      onAction(`exec-find-replace:${findText}:::=${repText}:::=bold=${bold}:::=hl=${hl}`)
    }
  } else if (dialogId === 'open-table-dialog') {
    title = 'Insert Table'
    body = `
      <div class="o19-dialog-body">
        <div class="o19-dialog-section">
          <span class="o19-dialog-sec-title">Table size</span>
          <div class="o19-dialog-grid-2">
            <label class="o19-field"><span>Number of columns:</span><input type="number" id="dlg-tbl-cols" min="1" max="15" value="4"></label>
            <label class="o19-field"><span>Number of rows:</span><input type="number" id="dlg-tbl-rows" min="1" max="30" value="3"></label>
          </div>
        </div>
        <div class="o19-dialog-section">
          <span class="o19-dialog-sec-title">AutoFit behavior</span>
          <label class="o19-field-check"><input type="radio" name="autofit" checked> Fixed column width: Auto</label>
          <label class="o19-field-check"><input type="radio" name="autofit"> AutoFit to contents</label>
          <label class="o19-field-check"><input type="radio" name="autofit"> AutoFit to window</label>
        </div>
      </div>
    `
    applyHandler = () => {
      const c = Math.max(1, Number(overlay.querySelector('#dlg-tbl-cols').value) || 3)
      const r = Math.max(1, Number(overlay.querySelector('#dlg-tbl-rows').value) || 3)
      onAction(`insert-table-grid:${r}x${c}`)
    }
  } else if (dialogId === 'open-borders-dialog') {
    title = 'Borders and Shading'
    body = `
      <div class="o19-dialog-tabs"><button type="button" class="o19-dialog-tab">Borders</button><button type="button" class="o19-dialog-tab active">Page Border</button><button type="button" class="o19-dialog-tab">Shading</button></div>
      <div class="o19-dialog-body">
        <div class="o19-dialog-grid-3">
          <label class="o19-field"><span>Setting:</span><select id="dlg-bdr-setting"><option value="box">Box</option><option value="shadow">Shadow</option><option value="3d">3-D</option><option value="none">None</option></select></label>
          <label class="o19-field"><span>Style:</span><select id="dlg-bdr-style"><option value="solid">─── Solid</option><option value="double">═══ Double</option><option value="dashed">- - - Dashed</option><option value="dotted">···· Dotted</option></select></label>
          <label class="o19-field"><span>Color:</span><input type="color" id="dlg-bdr-color" value="#2b579a" style="height:24px;width:100%;"></label>
        </div>
        <div class="o19-dialog-grid-2">
          <label class="o19-field"><span>Apply to:</span><select id="dlg-bdr-target"><option value="page">Whole document (Page Border)</option><option value="paragraph">Paragraph</option></select></label>
          <label class="o19-field"><span>Paragraph Shading Fill:</span><input type="color" id="dlg-bdr-fill" value="#ffffff" style="height:24px;width:100%;"></label>
        </div>
      </div>
    `
    applyHandler = () => {
      const setting = overlay.querySelector('#dlg-bdr-setting').value
      const style = overlay.querySelector('#dlg-bdr-style').value
      const color = overlay.querySelector('#dlg-bdr-color').value
      const target = overlay.querySelector('#dlg-bdr-target').value
      const fill = overlay.querySelector('#dlg-bdr-fill').value
      if (setting === 'none') onAction('border-none')
      else if (target === 'page') onAction(`page-border:${style}:${color}`)
      else onAction(`border-outside:${style}:${color}`)
      if (fill && fill !== '#ffffff') onAction(`shading-color:${fill}`)
    }
  } else if (dialogId === 'open-watermark-dialog') {
    title = 'Printed Watermark'
    body = `
      <div class="o19-dialog-body">
        <label class="o19-field-check"><input type="radio" name="wm-type" value="none"> No watermark</label>
        <label class="o19-field-check"><input type="radio" name="wm-type" value="text" checked> Text watermark</label>
        <div class="o19-dialog-grid-2">
          <label class="o19-field"><span>Text:</span><input type="text" id="dlg-wm-text" value="CONFIDENTIAL"></label>
          <label class="o19-field"><span>Layout:</span><select id="dlg-wm-layout"><option value="diagonal">Diagonal</option><option value="horizontal">Horizontal</option></select></label>
        </div>
      </div>
    `
    applyHandler = () => {
      const none = overlay.querySelector('input[name="wm-type"][value="none"]').checked
      const text = overlay.querySelector('#dlg-wm-text').value || 'CONFIDENTIAL'
      onAction(none ? 'watermark-remove' : `watermark:${text}`)
    }
  } else if (dialogId === 'open-sort-dialog') {
    title = isExcel ? 'Sort' : 'Sort Text'
    body = `
      <div class="o19-dialog-body">
        <div class="o19-dialog-grid-3">
          <label class="o19-field"><span>Sort by:</span><select id="dlg-sort-by"><option value="0">${isExcel ? 'Column A' : 'Paragraphs'}</option><option value="1">${isExcel ? 'Column B' : 'Headings'}</option><option value="2">${isExcel ? 'Column C' : 'Fields'}</option></select></label>
          <label class="o19-field"><span>Type:</span><select id="dlg-sort-type"><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option></select></label>
          <label class="o19-field"><span>Order:</span><select id="dlg-sort-order"><option value="asc">Ascending (A to Z)</option><option value="desc">Descending (Z to A)</option></select></label>
        </div>
      </div>
    `
    applyHandler = () => {
      const ord = overlay.querySelector('#dlg-sort-order').value
      onAction(ord === 'desc' ? 'sort-desc' : 'sort-asc')
    }
  } else if (dialogId === 'excel-format-dlg' || dialogId === 'open-excel-format-dlg') {
    title = 'Format Cells'
    body = `
      <div class="o19-dialog-tabs"><button type="button" class="o19-dialog-tab active">Number</button><button type="button" class="o19-dialog-tab">Alignment</button><button type="button" class="o19-dialog-tab">Font</button><button type="button" class="o19-dialog-tab">Border</button><button type="button" class="o19-dialog-tab">Fill</button></div>
      <div class="o19-dialog-body">
        <div class="o19-dialog-grid-2">
          <label class="o19-field"><span>Category:</span><select id="dlg-xl-numfmt"><option value="General">General</option><option value="Number">Number</option><option value="Currency">Currency (₹)</option><option value="Accounting">Accounting</option><option value="Percent">Percentage (%)</option><option value="Short Date">Date</option><option value="Text">Text</option></select></label>
          <label class="o19-field"><span>Horizontal Alignment:</span><select id="dlg-xl-align"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
        </div>
        <div class="o19-dialog-grid-2">
          <label class="o19-field"><span>Fill Color:</span><input type="color" id="dlg-xl-fill" value="#ffffff" style="height:24px;width:100%;"></label>
          <label class="o19-field"><span>Font Color:</span><input type="color" id="dlg-xl-color" value="#201f1e" style="height:24px;width:100%;"></label>
        </div>
        <div class="o19-dialog-grid-2">
          <label class="o19-field-check"><input type="checkbox" id="dlg-xl-wrap"> Wrap text</label>
          <label class="o19-field-check"><input type="checkbox" id="dlg-xl-merge"> Merge cells</label>
        </div>
      </div>
    `
    applyHandler = () => {
      const nf = overlay.querySelector('#dlg-xl-numfmt').value
      const al = overlay.querySelector('#dlg-xl-align').value
      const fill = overlay.querySelector('#dlg-xl-fill').value
      const col = overlay.querySelector('#dlg-xl-color').value
      onAction(`excel-numfmt:${nf}`)
      onAction(`excel-align-${al}`)
      if (fill && fill !== '#ffffff') onAction(`shading-color:${fill}`)
      if (col && col !== '#201f1e') onAction(`font-color:${col}`)
      if (overlay.querySelector('#dlg-xl-wrap').checked) onAction('excel-wrap-text')
      if (overlay.querySelector('#dlg-xl-merge').checked) onAction('excel-merge')
    }
  } else if (dialogId === 'open-function-dlg') {
    title = 'Insert Function'
    body = `
      <div class="o19-dialog-body">
        <label class="o19-field"><span>Select a function:</span>
          <select id="dlg-xl-fn" size="7" style="height:140px;">
            <option value="SUM" selected>SUM — Adds all the numbers in a range of cells</option>
            <option value="AVERAGE">AVERAGE — Returns the average (arithmetic mean) of arguments</option>
            <option value="IF">IF — Checks whether a condition is met</option>
            <option value="COUNT">COUNT — Counts the number of cells in a range that contain numbers</option>
            <option value="COUNTA">COUNTA — Counts the number of cells in a range that are not empty</option>
            <option value="MAX">MAX — Returns the largest value in a set of values</option>
            <option value="MIN">MIN — Returns the smallest value in a set of values</option>
            <option value="SUMIF">SUMIF — Adds the cells specified by a given condition or criteria</option>
            <option value="COUNTIF">COUNTIF — Counts the number of cells within a range that meet a criterion</option>
            <option value="VLOOKUP">VLOOKUP — Looks for a value in the leftmost column of a table</option>
          </select>
        </label>
      </div>
    `
    applyHandler = () => {
      const fn = overlay.querySelector('#dlg-xl-fn').value
      onAction(`formula:${fn}`)
    }
  } else {
    title = 'Office 2019 Settings'
    body = `<div class="o19-dialog-body"><p style="margin:0;">Configure formatting and layout options for the current selection.</p></div>`
    applyHandler = () => {}
  }

  overlay.innerHTML = `
    <section class="o19-dialog ${isExcel ? 'excel-dialog' : ''}" role="dialog" aria-modal="true">
      <header class="o19-dialog-titlebar">
        <span>${title}</span>
        <button type="button" class="o19-dialog-close" aria-label="Close">✕</button>
      </header>
      ${body}
      <footer class="o19-dialog-footer">
        <button type="button" class="o19-dlg-btn primary" id="o19-dlg-ok">OK</button>
        <button type="button" class="o19-dlg-btn" id="o19-dlg-cancel">Cancel</button>
      </footer>
    </section>
  `
  document.body.appendChild(overlay)
  overlay.querySelector('.o19-dialog-close')?.addEventListener('click', () => overlay.remove())
  overlay.querySelector('#o19-dlg-cancel')?.addEventListener('click', () => overlay.remove())
  overlay.querySelector('#o19-dlg-ok')?.addEventListener('click', () => {
    if (applyHandler) applyHandler()
    overlay.remove()
  })
}

/* ============================================================================
   FULLSCREEN WORKSPACE (MATCHING IMAGE 2: image_9c3722.png + FULL OFFICE 2019 RIBBON)
   - Top bar with Back arrow, Module Title, Pause button, 10:00 Timer, and Submit
   - Full-width Office 2019 Tabs & Ribbon below top bar
   - Below Ribbon: Left "Formatting Instructions" Panel (Q1..Q15 cards) + Right Document/Sheet
   ============================================================================ */
function efficiencyRender(page, question, language, questionIndex = 1, preserveSession = false) {
  const root = document.querySelector('#efficiency-simulator')
  if (!root) return
  o19CloseMenu()
  if (preserveSession && root.classList.contains('efficiency-fullscreen') && root.querySelector('.office-app')) {
    efficiencyFocusUnifiedQuestion(questionIndex)
    return
  }
  const isWord = page === 'word-efficiency'
  efficiencyState.module = isWord ? 'word' : 'excel'
  efficiencyState.language = language || 'en'
  efficiencyState.question = question
  efficiencyState.questionIndex = questionIndex
  efficiencyState.activePage = page
  efficiencyState.points = 0
  efficiencyState.wordActions = new Set()
  efficiencyState.perQuestionActions = {}
  efficiencyState.partActions = {}
  efficiencyState.excelFormulas = {}
  efficiencyState.selectedCell = 'A2'
  efficiencyState.questionMarks = {}
  efficiencyState.lastActiveParagraph = null
  efficiencyState.paused = false

  const questions = Array.isArray(efficiencyState.fileData?.questions) && efficiencyState.fileData.questions.length ? efficiencyState.fileData.questions : [question]
  questions.forEach((_, idx) => { efficiencyState.perQuestionActions[idx + 1] = new Set() })

  const fileNo = efficiencyState.fileNo || 1
  const fileIdStr = efficiencyFileId(efficiencyState.module, language, fileNo)
  root.classList.add('efficiency-fullscreen')

  const isExamHall = Boolean(efficiencyState.examHallMode)
  const examMeta = efficiencyState.examHallMeta || {}
  efficiencyState.selectedWordElements = []
  efficiencyState.selectedExcelCells = []
  const topHeaderBar = `
    <header class="o19-nexus-topbar ${isWord ? 'word-theme' : 'excel-theme'}">
      <div class="o19-nexus-top-left">
        <button type="button" class="o19-nexus-back-btn" id="efficiency-exit" title="${isExamHall ? 'Exit Exam Hall' : 'Back to Instructions'}">←</button>
        <div class="o19-nexus-mod-title">
          <strong>${isExamHall ? `${efficiencyEscape(examMeta.paperLabel || (isWord ? 'MS Word Efficiency' : 'MS Excel Efficiency'))} · Exercise #${String(fileNo).padStart(2, '0')}` : `${isWord ? 'Word' : 'Excel'} Module ${String(fileNo).padStart(2, '0')}`}</strong>
          <span>${isExamHall ? `RSSB LDC EXAM HALL · ROLL NO: admin · NAME: admin · MAX MARKS: 25 (QUALIFYING: 9)` : `RSSB LDC OFFICIAL PATTERN · 15 QUESTIONS · FULL MARKS: 25 (MARKS AT END)`}</span>
        </div>
      </div>
      <div class="o19-nexus-top-right">
        ${isExamHall ? `<span class="o19-live-score-badge" style="background:rgba(255,255,255,0.16);color:#fff;">Roll No: admin · 25 Marks</span>` : `<button type="button" class="o19-nexus-pause-btn" id="o19-pause-btn">⏸ Pause</button>`}
        <div class="o19-nexus-timer-pill" id="efficiency-timer">10:00</div>
        <button type="button" class="o19-nexus-submit-top" id="efficiency-submit">${isExamHall ? 'Submit Paper →' : 'Submit Test'}</button>
      </div>
    </header>
  `

  const sidebarPanel = `
    <aside class="o19-nexus-sidebar" id="o19-nexus-sidebar">
      <div class="o19-nexus-sidebar-head ${isWord ? 'word-theme' : 'excel-theme'}">
        <div>
          <h3>Formatting Instructions (प्रश्न-पत्र)</h3>
          <span>${isWord ? `WORD EFFICIENCY EXAM (15 QUESTIONS · 25 MARKS)` : `EXCEL EFFICIENCY EXAM (15 QUESTIONS · 25 MARKS)`}</span>
        </div>
        ${isExamHall ? `<span style="font-size:11px;font-weight:800;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.18);color:#fff;">${language === 'hi' ? 'हिन्दी' : 'EN'}</span>` : `<button type="button" class="o19-lang-switch-btn" id="o19-sidebar-lang-toggle" title="Switch EN / HI">${language === 'hi' ? 'EN' : 'HI'}</button>`}
      </div>

      <div class="o19-nexus-q-list" id="o19-questions-scroll-area">
        ${questions.map((item, idx) => {
          const qNum = idx + 1
          const instr = item.instruction || (Array.isArray(item.tasks) ? item.tasks[0] : '') || item.title
          return `
            <article class="o19-nexus-q-card o19-readonly-q-card" id="o19-q-card-${qNum}">
              <div class="o19-nexus-q-card-top">
                <div class="o19-nexus-q-badges">
                  <span class="o19-nexus-q-num">Q${qNum}</span>
                </div>
              </div>
              <p class="o19-nexus-q-text">${efficiencyEscape(instr)}</p>
            </article>
          `
        }).join('')}
      </div>

      <div class="o19-nexus-sidebar-foot">
        <button type="button" class="o19-nexus-submit-foot" id="efficiency-submit-foot">${isExamHall ? '✓ Submit Efficiency Paper &amp; Proceed' : '✓ Submit Test &amp; View Result'}</button>
      </div>

      <button type="button" class="o19-sidebar-collapse-handle" id="o19-sidebar-collapse-btn" title="Collapse / Expand Instructions">‹</button>
    </aside>
  `

  if (isWord) {
    const cohesiveWordHTML = efficiencyBuildCohesiveWordHTML(questions, efficiencyState.fileData)
    const plain = cohesiveWordHTML.replace(/<[^>]+>/g, ' ').trim()
    const totalWordsCount = plain ? plain.split(/\s+/).length : 0
    const wordTabs = ['File', 'Home', 'Insert', 'Design', 'Layout', 'References', 'Mailings', 'Review', 'View', 'Developer', 'Help']

    root.innerHTML = `
      ${topHeaderBar}
      <section class="office-app office-word o19-full-suite-layout">
        <nav class="office-tabs">
          ${wordTabs.map((tab, i) => `<button type="button" class="${i === 1 ? 'active' : ''} ${i === 0 ? 'office-file-tab' : ''}" data-word-tab="${tab}">${tab}</button>`).join('')}
          <div class="o19-qat-inline">
            <button type="button" class="o19-qat-btn" data-word-extra="save" title="Save (Ctrl+S)">${O19_ICONS.save}</button>
            <button type="button" class="o19-qat-btn" data-word-extra="undo-cmd" title="Undo (Ctrl+Z)">${O19_ICONS.undo}</button>
            <button type="button" class="o19-qat-btn" data-word-extra="redo-cmd" title="Redo (Ctrl+Y)">${O19_ICONS.redo}</button>
          </div>
          <label class="o19-tell-me"><span class="o19-tell-me-icon">💡</span><input type="text" id="word-tell-me" placeholder="Tell me what you want to do"></label>
        </nav>
        <div class="office-ribbon" id="word-ribbon-content">${efficiencyWordRibbon('Home')}</div>

        <div class="o19-below-ribbon-split">
          ${sidebarPanel}
          <div class="o19-doc-stage-col">
            <div class="word-ruler" id="word-horizontal-ruler">
              <span class="o19-tab-selector" id="o19-tab-stop-btn">L</span>
              <div class="o19-ruler-track">
                <span class="o19-ruler-marker marker-left" id="o19-ruler-left-indent" style="cursor:pointer;">▽</span>
                <span>1</span><span>·</span><span>2</span><span>·</span><span>3</span><span>·</span><span>4</span><span>·</span><span>5</span><span>·</span><span>6</span>
                <span class="o19-ruler-marker marker-right" id="o19-ruler-right-indent" style="cursor:pointer;">△</span>
              </div>
            </div>
            <div class="o19-word-workarea">
              <aside class="o19-vertical-ruler" id="word-vertical-ruler"><div class="o19-vruler-track"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span></div></aside>
              <div class="word-document-wrap">
                <article id="word-document" class="word-document" contenteditable="true" spellcheck="false">${cohesiveWordHTML}</article>
              </div>
            </div>
            <div class="office-statusbar">
              <div class="o19-status-left"><span class="o19-status-item">Page 1 of 1</span><span class="o19-status-item" id="word-word-count">${totalWordsCount} words</span><span class="o19-status-item" id="efficiency-save-status">· Saved</span></div>
              <div class="o19-status-right">
                <div class="o19-zoom-controls"><button type="button" class="o19-zoom-btn" data-word-extra="zoom-out">−</button><input type="range" class="o19-zoom-slider" id="word-zoom-slider" min="50" max="200" value="100"><button type="button" class="o19-zoom-btn" data-word-extra="zoom-in">+</button><span id="word-zoom-status">100%</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
    efficiencyAttachWord([], question)
  } else {
    const master = efficiencyState.fileData?.metadata?.master_dataset || question.dataset || [['Emp ID', 'Name', 'Dept', 'Basic Pay', 'DA', 'Gross Pay', 'Bonus', 'Category']]
    const cols = 9
    efficiencyState.excelDataset = master.map(r => { const c = r.map(v => v ?? ''); while (c.length < cols) c.push(''); return c })
    while (efficiencyState.excelDataset.length < 18) efficiencyState.excelDataset.push(Array.from({ length: cols }, () => ''))
    const excelTabs = ['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View', 'Developer', 'Help']

    root.innerHTML = `
      ${topHeaderBar}
      <section class="office-app office-excel o19-full-suite-layout">
        <nav class="office-tabs">
          ${excelTabs.map((tab, i) => `<button type="button" class="${i === 1 ? 'active' : ''} ${i === 0 ? 'office-file-tab' : ''}" data-excel-tab="${tab}">${tab}</button>`).join('')}
          <label class="o19-tell-me"><span class="o19-tell-me-icon">💡</span><input type="text" id="excel-tell-me" placeholder="Tell me what you want to do"></label>
        </nav>
        <div class="office-ribbon" id="excel-ribbon-content">${efficiencyExcelRibbon('Home')}</div>

        <div class="o19-below-ribbon-split">
          ${sidebarPanel}
          <div class="o19-doc-stage-col">
            <div class="excel-formula-row">
              <div class="o19-name-box-wrap"><span id="excel-name-box">A2</span><span style="font-size:8px;color:#605e5c;">▾</span></div>
              <div class="o19-formula-btns"><button type="button" id="excel-cancel-cell">✕</button><button type="button" id="excel-apply-cell">✓</button><button type="button" class="fx-btn" data-excel-extra="open-function-dlg">fx</button></div>
              <input id="excel-formula-input" placeholder="Enter a value or formula (e.g. =SUM(D3:E3), =AVERAGE(D3:D7), =IF(D3>=30000,&quot;Senior&quot;,&quot;Junior&quot;))">
            </div>
            <div class="excel-grid-wrap">
              <table class="excel-grid" id="excel-grid">
                <thead><tr><th class="excel-corner">◢</th>${Array.from({ length: cols }, (_, i) => `<th data-col-header="${i}">${String.fromCharCode(65 + i)}</th>`).join('')}</tr></thead>
                <tbody>
                  ${efficiencyState.excelDataset.map((row, r) => `
                    <tr>
                      <th data-row-header="${r}">${r + 1}</th>
                      ${Array.from({ length: cols }, (_, c) => `<td><input class="excel-cell ${r === 0 && c === 0 ? 'excel-q-banner-cell' : ''} ${r === 1 && (row[c] ?? '') !== '' ? 'excel-heading-cell' : ''}" data-row="${r}" data-col="${c}" data-cell="${efficiencyCellRef(r, c)}" value="${efficiencyEscape(row[c] ?? '')}"></td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="excel-sheet-tabs"><span style="font-size:10px;color:#605e5c;padding:0 6px;">◄ ►</span><button type="button" class="active">${efficiencyEscape(question.sheet_name || 'Payroll_Sheet')}</button><button type="button" id="excel-add-sheet">＋</button><span id="excel-status">Ready</span></div>
            <div class="office-statusbar">
              <div class="o19-status-left"><span class="o19-status-item" id="excel-cell-count">Ready</span><span class="o19-status-item">Master Sheet A1:H12</span></div>
              <div class="o19-status-right">
                <div class="o19-zoom-controls"><button type="button" class="o19-zoom-btn" data-excel-extra="zoom-out">−</button><input type="range" class="o19-zoom-slider" id="excel-zoom-slider" min="60" max="150" value="100"><button type="button" class="o19-zoom-btn" data-excel-extra="zoom-in">+</button><span id="excel-zoom-status">100%</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `
    efficiencyAttachExcel([], question)
  }

  // Store initial paragraph texts to check RSSB LDC rule against unauthorized text deletion/modification
  efficiencyState.initialWordParts = {}
  if (isWord) {
    document.querySelectorAll('#word-document [data-doc-part]').forEach(el => {
      efficiencyState.initialWordParts[el.dataset.docPart] = (el.textContent || '').trim()
    })
  }
  efficiencyState.blockedShortcutAttempts = 0

  // Enforce RSSB LDC Efficiency Exam Restrictions (Cut/Copy/Paste, Right-Click, Select All, Function Keys blocked; Ctrl+Z allowed)
  const enforceRssbEfficiencyRestrictions = (container) => {
    if (!container) return
    const showBlockNotice = (msg) => {
      efficiencyState.blockedShortcutAttempts = (efficiencyState.blockedShortcutAttempts || 0) + 1
      const st = document.querySelector('#efficiency-save-status') || document.querySelector('#excel-status')
      if (st) st.textContent = `⚠️ ${msg}`
    }
    ;['cut', 'copy', 'paste'].forEach(evtName => {
      container.addEventListener(evtName, (ev) => {
        ev.preventDefault()
        showBlockNotice(`RSSB LDC Rule: ${evtName.toUpperCase()} is disabled in Efficiency Exam`)
      })
    })
    container.addEventListener('contextmenu', (ev) => {
      ev.preventDefault()
      showBlockNotice('RSSB LDC Rule: Right Mouse Click is disabled in Efficiency Exam')
    })
    container.addEventListener('keydown', (ev) => {
      if (/^F([1-9]|1[0-2])$/i.test(ev.key)) {
        ev.preventDefault()
        showBlockNotice(`RSSB LDC Rule: Function Key (${ev.key}) is disabled`)
        return
      }
      if (ev.ctrlKey || ev.metaKey) {
        const k = String(ev.key || '').toLowerCase()
        if (['c', 'x', 'v', 'a'].includes(k)) {
          ev.preventDefault()
          showBlockNotice(`RSSB LDC Rule: Ctrl+${k.toUpperCase()} (Cut/Copy/Paste/Select All) is disabled`)
        }
      }
    })
  }
  enforceRssbEfficiencyRestrictions(root)

  document.querySelector('#efficiency-exit')?.addEventListener('click', () => {
    o19CloseMenu()
    if (efficiencyState.timer) clearInterval(efficiencyState.timer)
    efficiencyState.timer = null
    if (efficiencyState.examHallMode && typeof efficiencyState.examHallAbort === 'function') {
      efficiencyState.examHallAbort()
      return
    }
    efficiencyShowExerciseList(page, language)
  })

  document.querySelector('#efficiency-submit')?.addEventListener('click', () => efficiencySubmit(page, [], efficiencyState.question, false))
  document.querySelector('#efficiency-submit-foot')?.addEventListener('click', () => efficiencySubmit(page, [], efficiencyState.question, false))

  document.querySelector('#o19-sidebar-collapse-btn')?.addEventListener('click', (e) => {
    const sb = document.querySelector('#o19-nexus-sidebar')
    if (sb) {
      sb.classList.toggle('is-collapsed')
      e.currentTarget.textContent = sb.classList.contains('is-collapsed') ? '›' : '‹'
    }
  })

  document.querySelector('#o19-sidebar-lang-toggle')?.addEventListener('click', async () => {
    const nextLang = efficiencyState.language === 'hi' ? 'en' : 'hi'
    const newData = await efficiencyFetchFile(efficiencyState.module, nextLang, efficiencyState.fileNo || 1)
    efficiencyState.language = nextLang
    efficiencyState.fileData = newData
    efficiencyRender(page, newData.questions[0], nextLang, 1, false)
  })

  document.querySelector('#o19-pause-btn')?.addEventListener('click', (e) => {
    efficiencyState.paused = !efficiencyState.paused
    e.currentTarget.textContent = efficiencyState.paused ? '▶ Resume' : '⏸ Pause'
  })

  // Read-only question cards: clicking sidebar instructions does not select paragraphs/cells

  // Official 10:00 Minute (600 seconds) RSSB LDC / High Court LDC Timer
  if (efficiencyState.timer) clearInterval(efficiencyState.timer)
  efficiencyState.started = true
  efficiencyState.startedAt = Date.now()
  efficiencyState.secondsLeft = 600
  efficiencyState.timer = setInterval(() => {
    if (efficiencyState.paused) return
    efficiencyState.secondsLeft = Math.max(0, efficiencyState.secondsLeft - 1)
    const t = document.querySelector('#efficiency-timer')
    if (t) t.textContent = efficiencyFormatTime(efficiencyState.secondsLeft)
    if (efficiencyState.secondsLeft <= 0) efficiencySubmit(page, [], efficiencyState.question, true)
  }, 1000)
}
function attachEfficiencySimulator(page) { efficiencyShowLanguagePicker(page) }

function efficiencyAttachWord(tasks, question) {
  const root = document.querySelector('#efficiency-simulator')
  const editor = document.querySelector('#word-document')
  efficiencyState.lastActiveParagraph = null
  efficiencyState.selectedWordElements = []

  const showSelectionHint = (msg) => {
    const status = document.querySelector('#efficiency-save-status')
    if (status) status.textContent = msg
  }

  const rememberActiveParagraph = () => {
    if (!editor) return []
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return efficiencyState.selectedWordElements || []
    const anchor = sel.anchorNode
    if (!anchor || !editor.contains(anchor)) return efficiencyState.selectedWordElements || []

    const range = sel.getRangeAt(0)
    const allParts = [...editor.querySelectorAll('p, table, tr')]
    let matched = []
    if (!sel.isCollapsed) {
      matched = allParts.filter(el => {
        try { return range.intersectsNode(el) } catch { return false }
      }).map(el => el.closest('p, table') || el)
      matched = [...new Set(matched)]
    }
    if (!matched.length) {
      const baseEl = (anchor.nodeType === 1 ? anchor : anchor.parentElement)?.closest('p, table, tr, td, h1, h2, h3, li, blockquote')
      if (baseEl && editor.contains(baseEl)) {
        const blk = baseEl.closest('p, table') || baseEl
        matched = [blk]
      }
    }
    if (matched.length) {
      efficiencyState.selectedWordElements = matched
      efficiencyState.lastActiveParagraph = matched[0]
      editor.querySelectorAll('.is-active-doc-part').forEach(x => x.classList.remove('is-active-doc-part'))
      matched.forEach(blk => blk.classList.add('is-active-doc-part'))
    }
    return efficiencyState.selectedWordElements || []
  }

  const getActiveParagraphs = () => {
    if (!editor) return []
    const sel = window.getSelection()
    if (sel && sel.rangeCount && sel.anchorNode && editor.contains(sel.anchorNode)) {
      rememberActiveParagraph()
    }
    const valid = (efficiencyState.selectedWordElements || []).filter(el => el && editor.contains(el))
    return valid
  }

  const getActiveParagraph = () => {
    const list = getActiveParagraphs()
    return list[0] || null
  }

  const record = (...actions) => {
    const activeList = getActiveParagraphs()
    efficiencyState.partActions ||= {}
    activeList.forEach(activeEl => {
      const partName = activeEl?.dataset?.docPart || activeEl?.closest('[data-doc-part]')?.dataset?.docPart || 'document'
      efficiencyState.partActions[partName] ||= new Set()
      actions.forEach(a => { if (a) efficiencyState.partActions[partName].add(a) })
    })
    actions.forEach(a => { if (a) efficiencyState.wordActions.add(a) })
    showSelectionHint('· Saved')
  }

  const applyToTargets = (fn) => {
    const list = getActiveParagraphs()
    if (!list.length) {
      showSelectionHint('⚠️ पहले दस्तावेज़ में संबंधित पंक्ति/पैराग्राफ को माउस से सिलेक्ट या क्लिक करें')
      return false
    }
    list.forEach(el => {
      fn(el)
      if (el.tagName === 'TABLE') {
        const hdrCells = el.querySelectorAll('tr:first-child td, tr:first-child th')
        hdrCells.forEach(td => fn(td, true))
      }
    })
    return true
  }

  const transformCase = (mode) => {
    if (!editor) return
    const convert = (str) => {
      if (mode === 'upper') return str.toUpperCase()
      if (mode === 'lower') return str.toLowerCase()
      if (mode === 'capitalize') return str.replace(/\b\w/g, ch => ch.toUpperCase())
      if (mode === 'toggle') return [...str].map(ch => ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()).join('')
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    }
    const ok = applyToTargets((p, isTableCell) => {
      if (isTableCell) return
      if (p.tagName === 'P') {
        const hasBullet = p.dataset.fmtBullets === 'true' && p.textContent.trim().startsWith('• ')
        const rawTxt = hasBullet ? p.textContent.trim().slice(2) : p.textContent
        p.textContent = (hasBullet ? '• ' : '') + convert(rawTxt)
      }
      p.dataset.fmtCase = mode
    })
    if (ok) record(`case-${mode}`, 'change-case')
  }

  const insertWordTable = (rows = 3, cols = 3) => {
    if (!editor) return
    const table = document.createElement('table')
    table.className = 'word-inserted-table'
    table.dataset.docPart = 'inserted_table'
    let html = '<tbody>'
    for (let r = 0; r < rows; r++) {
      html += '<tr>'
      for (let c = 0; c < cols; c++) {
        html += `<td>${r === 0 ? `Heading ${c + 1}` : 'Enter text'}</td>`
      }
      html += '</tr>'
    }
    html += '</tbody>'
    table.innerHTML = html
    editor.append(table)
    editor.dataset.fmtInsertedTable = 'true'
    record('insert-table', `table-${rows}x${cols}`)
  }

  const setWatermark = (text) => {
    if (!editor) return
    editor.querySelector('.word-watermark-layer')?.remove()
    if (text) {
      const wm = document.createElement('div')
      wm.className = 'word-watermark-layer'
      wm.contentEditable = 'false'
      wm.textContent = text
      editor.prepend(wm)
      editor.dataset.fmtWatermark = text
      record('watermark', `watermark-${text.toLowerCase()}`)
    } else {
      delete editor.dataset.fmtWatermark
    }
  }

  const applyWordExtra = (rawAction) => {
    if (!editor || !rawAction) return
    if (rawAction.startsWith('cmd:')) {
      const cmd = rawAction.slice(4)
      handleWordCommand(cmd)
      return
    }
    if (rawAction.startsWith('set-font:')) {
      const font = rawAction.slice(9).replace(/ \(.*\)/, '').trim()
      const input = document.querySelector('#word-font-family')
      if (input) input.value = font
      const ok = applyToTargets((p) => {
        p.style.fontFamily = `'${font}', sans-serif`
        p.dataset.fmtFont = font.toLowerCase()
      })
      if (ok) record(`font-${font.toLowerCase()}`, 'font')
      return
    }
    if (rawAction.startsWith('set-size:')) {
      const size = String(rawAction.slice(9)).replace(/pt/i, '').trim()
      const input = document.querySelector('#word-font-size')
      if (input) input.value = size
      const ok = applyToTargets((p) => {
        p.style.fontSize = `${size}pt`
        p.dataset.fmtSize = size
      })
      if (ok) record(`font-size-${size}`, 'font')
      return
    }
    if (rawAction.startsWith('line-spacing:')) {
      const val = rawAction.slice(13).trim()
      const ok = applyToTargets((p) => {
        p.style.lineHeight = val
        p.dataset.fmtLineSpacing = val
      })
      if (ok) record('line-spacing', `line-spacing-${val}`)
      return
    }
    if (rawAction.startsWith('indent-first-line')) {
      const inches = parseFloat(rawAction.split(':')[1]) || 0.75
      const ok = applyToTargets((p) => {
        p.style.textIndent = `${inches}in`
        p.style.paddingLeft = '0in'
        p.dataset.fmtIndentType = 'first-line'
        p.dataset.fmtIndentVal = String(inches)
      })
      const box = document.querySelector('#word-indent-left')
      if (box) box.value = `${inches}"`
      if (ok) record('indent', 'first-line-indent')
      return
    }
    if (rawAction.startsWith('indent-hanging')) {
      const inches = parseFloat(rawAction.split(':')[1]) || 0.5
      const ok = applyToTargets((p) => {
        p.style.paddingLeft = `${inches}in`
        p.style.textIndent = `-${inches}in`
        p.dataset.fmtIndentType = 'hanging'
        p.dataset.fmtIndentVal = String(inches)
      })
      const box = document.querySelector('#word-indent-left')
      if (box) box.value = `${inches}"`
      if (ok) record('indent', 'hanging-indent')
      return
    }
    if (rawAction.startsWith('indent-left:')) {
      const inches = parseFloat(rawAction.slice(12)) || 0.5
      const ok = applyToTargets((p) => {
        p.style.marginLeft = `${inches}in`
        p.dataset.fmtIndentType = inches > 0 ? 'left' : 'none'
        p.dataset.fmtIndentVal = String(inches)
      })
      const box = document.querySelector('#word-indent-left')
      if (box) box.value = `${inches}"`
      if (ok) record('indent', 'left-indent')
      return
    }
    if (rawAction.startsWith('indent-right:')) {
      const inches = parseFloat(rawAction.slice(13)) || 0.5
      const ok = applyToTargets((p) => {
        p.style.marginRight = `${inches}in`
        p.dataset.fmtIndentRight = String(inches)
      })
      const box = document.querySelector('#word-indent-right')
      if (box) box.value = `${inches}"`
      if (ok) record('indent', 'right-indent')
      return
    }
    if (rawAction.startsWith('space-before:')) {
      const pt = parseFloat(rawAction.slice(13)) || 0
      const ok = applyToTargets((p) => {
        p.style.marginTop = `${pt}pt`
        p.dataset.fmtSpaceBefore = String(pt)
      })
      if (ok) record('line-spacing', 'space-before')
      return
    }
    if (rawAction.startsWith('space-after:')) {
      const pt = parseFloat(rawAction.slice(12)) || 0
      const ok = applyToTargets((p) => {
        p.style.marginBottom = `${pt}pt`
        p.dataset.fmtSpaceAfter = String(pt)
      })
      if (ok) record('line-spacing', 'space-after')
      return
    }
    if (rawAction.startsWith('font-color:')) {
      const col = rawAction.slice(11)
      const ok = applyToTargets((p) => {
        p.style.color = col
        p.dataset.fmtFontColor = col
      })
      if (ok) record('font-color')
      return
    }
    if (rawAction.startsWith('highlight-color:')) {
      const col = rawAction.slice(16)
      const ok = applyToTargets((p) => {
        p.style.backgroundColor = col === 'transparent' ? '' : col
        p.dataset.fmtHighlight = col === 'transparent' ? 'false' : 'true'
      })
      if (ok) record('highlight', 'paragraph-shading')
      return
    }
    if (rawAction.startsWith('shading-color:')) {
      const col = rawAction.slice(14)
      const ok = applyToTargets((p) => {
        p.style.backgroundColor = col === 'transparent' ? '' : col
        p.dataset.fmtShading = col === 'transparent' ? 'false' : 'true'
      })
      if (ok) record('paragraph-shading', 'shading')
      return
    }
    if (rawAction.startsWith('page-color:')) {
      const col = rawAction.slice(11)
      editor.style.backgroundColor = col === 'transparent' ? '#ffffff' : col
      editor.dataset.fmtPageColor = col === 'transparent' ? 'false' : 'true'
      record('page-color')
      return
    }
    if (rawAction.startsWith('insert-table-grid:') || rawAction.startsWith('insert-table:')) {
      const dims = rawAction.split(':')[1] || '3x3'
      const [r, c] = dims.split('x').map(Number)
      insertWordTable(r || 3, c || 3)
      return
    }
    if (rawAction.startsWith('watermark:')) {
      setWatermark(rawAction.slice(10))
      return
    }
    if (rawAction.startsWith('margins:')) {
      const type = rawAction.slice(8).toLowerCase()
      const map = { narrow: '36px 38px', moderate: '64px 48px', wide: '64px 110px', normal: '64px 66px' }
      editor.style.padding = map[type] || '64px 66px'
      editor.dataset.fmtMargins = type
      record('margins', `margins-${type}`)
      return
    }
    if (rawAction.startsWith('orientation:')) {
      const type = rawAction.slice(12).toLowerCase()
      editor.style.maxWidth = type === 'landscape' ? '1020px' : '780px'
      editor.style.minHeight = type === 'landscape' ? '560px' : '760px'
      editor.dataset.fmtOrientation = type
      record('orientation', `orientation-${type}`)
      return
    }
    if (rawAction.startsWith('paper-size:')) {
      const sz = rawAction.slice(11).toLowerCase()
      const widths = { a4: '780px', letter: '790px', legal: '790px', a3: '980px', a5: '580px', executive: '680px' }
      editor.style.maxWidth = widths[sz] || '780px'
      editor.dataset.fmtPaperSize = sz
      record('paper-size', `size-${sz}`, 'margins')
      return
    }
    if (rawAction.startsWith('columns:')) {
      const count = rawAction.slice(8)
      editor.style.columnCount = count
      editor.style.columnGap = count === '1' ? '0' : '28px'
      editor.dataset.fmtColumns = String(count)
      record('columns', `columns-${count}`)
      return
    }
    if (rawAction.startsWith('page-border:')) {
      const [, style, color] = rawAction.split(':')
      editor.style.border = `3px ${style || 'double'} ${color || '#2b579a'}`
      editor.dataset.fmtPageBorder = 'true'
      record('page-border')
      return
    }
    if (rawAction.startsWith('border-outside:')) {
      const [, style, color] = rawAction.split(':')
      const ok = applyToTargets((p) => {
        p.style.border = `1.5px ${style || 'solid'} ${color || '#252423'}`
        p.style.padding = '6px 8px'
        p.dataset.fmtBorder = 'true'
      })
      if (ok) record('page-border', 'border')
      return
    }
    if (rawAction.startsWith('bullet-style:')) {
      const ok = applyToTargets((p, isTableCell) => {
        if (isTableCell) return
        p.style.paddingLeft = '24px'
        if (!p.textContent.trim().startsWith('•')) p.textContent = '• ' + p.textContent.trim()
        p.dataset.fmtBullets = 'true'
      })
      if (ok) record('insertUnorderedList', 'bullets')
      return
    }
    if (rawAction.startsWith('number-style:')) {
      const ok = applyToTargets((p, isTableCell) => {
        if (isTableCell) return
        p.style.paddingLeft = '24px'
        if (!/^\d+\./.test(p.textContent.trim())) p.textContent = '1. ' + p.textContent.trim()
        p.dataset.fmtNumbering = 'true'
      })
      if (ok) record('insertOrderedList', 'numbering')
      return
    }
    if (rawAction.startsWith('text-effect:')) {
      const fx = rawAction.slice(12)
      const ok = applyToTargets((p) => {
        if (fx === 'shadow') p.style.textShadow = '1px 2px 3px rgba(0,0,0,0.35)'
        else if (fx === 'glow') p.style.textShadow = '0 0 8px rgba(43,87,154,0.65)'
        else if (fx === 'outline') p.style.webkitTextStroke = '0.8px #2b579a'
        else { p.style.textShadow = ''; p.style.webkitTextStroke = '' }
        p.dataset.fmtTextEffect = fx === 'none' ? '' : fx
      })
      if (ok) record('text-effects', 'font')
      return
    }
    if (rawAction.startsWith('insert-sym:') || rawAction.startsWith('insert-eq:')) {
      const val = rawAction.split(':').slice(1).join(':')
      const p = getActiveParagraph() || editor
      p.insertAdjacentHTML('beforeend', `<span>${efficiencyEscape(val)}</span>`)
      editor.dataset.fmtSymbol = 'true'
      record('symbol', 'insert-equation')
      return
    }
    if (rawAction.startsWith('exec-find-replace:')) {
      const parts = rawAction.slice(18).split(':::=')
      const find = (parts[0] || '').trim()
      const rep = (parts[1] || '').trim()
      const makeBold = parts.includes('bold=true')
      const makeHl = parts.includes('hl=true')
      if (find) {
        editor.querySelectorAll('p, td, th').forEach(el => {
          if (el.textContent.includes(find)) {
            el.textContent = el.textContent.replaceAll(find, rep || find)
            if (makeBold) { el.style.fontWeight = '700'; el.dataset.fmtBold = 'true' }
            if (makeHl) { el.style.backgroundColor = '#ffff00'; el.dataset.fmtHighlight = 'true' }
          }
        })
        editor.dataset.fmtFindReplace = 'true'
        editor.dataset.fmtLastFind = find
        editor.dataset.fmtLastReplace = rep
      }
      record('find-replace')
      return
    }
    if (rawAction.startsWith('zoom-set:')) {
      const pct = Number(rawAction.slice(9)) || 100
      editor.style.zoom = String(pct / 100)
      const lbl = document.querySelector('#word-zoom-status')
      if (lbl) lbl.textContent = `${pct}%`
      const slider = document.querySelector('#word-zoom-slider')
      if (slider) slider.value = String(pct)
      return
    }

    switch (rawAction) {
      case 'open-font-dialog': o19OpenDialog('word-font-dlg', applyWordExtra); break
      case 'open-paragraph-dialog': o19OpenDialog('word-paragraph-dlg', applyWordExtra); break
      case 'open-pagesetup-dialog': o19OpenDialog('word-pagesetup-dlg', applyWordExtra); break
      case 'open-find-dialog':
      case 'find-replace': o19OpenDialog('find-replace', applyWordExtra); break
      case 'open-table-dialog': o19OpenDialog('open-table-dialog', applyWordExtra); break
      case 'open-borders-dialog': o19OpenDialog('open-borders-dialog', applyWordExtra); break
      case 'open-watermark-dialog': o19OpenDialog('open-watermark-dialog', applyWordExtra); break
      case 'open-sort-dialog': o19OpenDialog('open-sort-dialog', applyWordExtra); break

      case 'font-grow': {
        const input = document.querySelector('#word-font-size')
        const next = Math.min(72, (Number(input?.value) || 12) + 2)
        applyWordExtra(`set-size:${next}`)
        break
      }
      case 'font-shrink': {
        const input = document.querySelector('#word-font-size')
        const next = Math.max(8, (Number(input?.value) || 12) - 1)
        applyWordExtra(`set-size:${next}`)
        break
      }
      case 'case-sentence': transformCase('sentence'); break
      case 'case-lowercase': transformCase('lower'); break
      case 'case-uppercase': transformCase('upper'); break
      case 'case-capitalize': transformCase('capitalize'); break
      case 'case-toggle': transformCase('toggle'); break

      case 'clear-formatting': {
        applyToTargets((p) => {
          p.removeAttribute('style')
          Object.keys(p.dataset).forEach(k => {
            if (k.startsWith('fmt')) delete p.dataset[k]
          })
        })
        record('clear-formatting')
        break
      }

      case 'underline-single':
      case 'underline-double':
      case 'underline-thick':
      case 'underline-dotted':
      case 'underline-dashed':
      case 'underline-wavy': {
        const style = rawAction.replace('underline-', '')
        const ok = applyToTargets((p) => {
          p.style.textDecoration = 'underline'
          p.style.textDecorationStyle = style === 'single' || style === 'thick' ? 'solid' : style
          p.dataset.fmtUnderline = 'true'
          p.dataset.fmtUnderlineStyle = style
        })
        if (ok) record('underline', rawAction)
        break
      }
      case 'strikethrough': {
        const ok = applyToTargets((p) => {
          const next = p.dataset.fmtStrike !== 'true'
          p.dataset.fmtStrike = next ? 'true' : 'false'
          p.style.textDecoration = next ? 'line-through' : (p.dataset.fmtUnderline === 'true' ? 'underline' : 'none')
        })
        if (ok) record('strikethrough')
        break
      }
      case 'subscript': {
        const ok = applyToTargets((p) => {
          const next = p.dataset.fmtSubscript !== 'true'
          p.dataset.fmtSubscript = next ? 'true' : 'false'
        })
        if (ok) record('subscript')
        break
      }
      case 'superscript': {
        const ok = applyToTargets((p) => {
          const next = p.dataset.fmtSuperscript !== 'true'
          p.dataset.fmtSuperscript = next ? 'true' : 'false'
        })
        if (ok) record('superscript')
        break
      }

      case 'indent':
      case 'indent-first-line':
        applyWordExtra('indent-first-line:0.75')
        break
      case 'indent-hanging':
        applyWordExtra('indent-hanging:0.5')
        break
      case 'decrease-indent': {
        const ok = applyToTargets((p) => {
          p.style.textIndent = '0in'
          p.style.paddingLeft = '0in'
          p.style.marginLeft = '0in'
          p.dataset.fmtIndentType = 'none'
          p.dataset.fmtIndentVal = '0'
        })
        const box = document.querySelector('#word-indent-left')
        if (box) box.value = '0"'
        if (ok) record('decrease-indent')
        break
      }
      case 'space-before-add':
        applyWordExtra('space-before:12')
        break
      case 'space-before-remove':
        applyWordExtra('space-before:0')
        break
      case 'space-after-add':
        applyWordExtra('space-after:12')
        break
      case 'space-after-remove':
        applyWordExtra('space-after:0')
        break
      case 'toggle-pilcrow':
        editor.classList.toggle('show-pilcrow')
        record('pilcrow')
        break
      case 'sort-asc':
      case 'sort-desc': {
        const paras = [...editor.querySelectorAll('p')].filter(p => p.textContent.trim())
        const sorted = paras.map(p => p.outerHTML).sort((a, b) => a.localeCompare(b) * (rawAction === 'sort-desc' ? -1 : 1))
        if (sorted.length) editor.innerHTML = sorted.join('')
        editor.dataset.fmtSorted = rawAction
        record('sort')
        break
      }

      case 'border-bottom': { const ok = applyToTargets(p => { p.style.borderBottom = '1.5px solid #252423'; p.dataset.fmtBorder = 'true' }); if (ok) record('page-border', 'border'); break }
      case 'border-top': { const ok = applyToTargets(p => { p.style.borderTop = '1.5px solid #252423'; p.dataset.fmtBorder = 'true' }); if (ok) record('page-border', 'border'); break }
      case 'border-left': { const ok = applyToTargets(p => { p.style.borderLeft = '1.5px solid #252423'; p.dataset.fmtBorder = 'true' }); if (ok) record('page-border', 'border'); break }
      case 'border-right': { const ok = applyToTargets(p => { p.style.borderRight = '1.5px solid #252423'; p.dataset.fmtBorder = 'true' }); if (ok) record('page-border', 'border'); break }
      case 'border-all':
      case 'border-outside': { const ok = applyToTargets(p => { p.style.border = '1.5px solid #252423'; p.style.padding = '6px 8px'; p.dataset.fmtBorder = 'true' }); if (ok) record('page-border', 'border'); break }
      case 'border-thick': { const ok = applyToTargets(p => { p.style.border = '2.5px solid #252423'; p.style.padding = '6px 8px'; p.dataset.fmtBorder = 'true' }); if (ok) record('page-border', 'border'); break }
      case 'border-double': { const ok = applyToTargets(p => { p.style.borderBottom = '3px double #252423'; p.dataset.fmtBorder = 'true' }); if (ok) record('page-border', 'border'); break }
      case 'border-none': { applyToTargets(p => { p.style.border = '0'; p.dataset.fmtBorder = 'false' }); editor.style.border = '1px solid #b3b0ad'; delete editor.dataset.fmtPageBorder; record('border-none'); break }
      case 'horizontal-line': editor.insertAdjacentHTML('beforeend', '<hr style="border:0;border-top:1.5px solid #8a8886;margin:10px 0;">'); record('border'); break

      case 'style-normal': { applyToTargets(p => { p.style.fontSize = '11pt'; p.style.fontWeight = '400'; p.style.color = '#201f1e'; p.dataset.fmtBold = 'false'; p.dataset.fmtSize = '11' }); record('style-normal'); break }
      case 'style-no-spacing': { applyToTargets(p => { p.style.margin = '0'; p.style.lineHeight = '1.0'; p.dataset.fmtLineSpacing = '1.0' }); record('line-spacing'); break }
      case 'style-heading-1': { applyToTargets(p => { p.style.fontSize = '16pt'; p.style.fontWeight = '600'; p.style.color = '#2f5597'; p.dataset.fmtSize = '16'; p.dataset.fmtBold = 'true' }); record('style-heading-1', 'font-size-16'); break }
      case 'style-heading-2': { applyToTargets(p => { p.style.fontSize = '14pt'; p.style.fontWeight = '600'; p.style.color = '#2f5597'; p.dataset.fmtSize = '14'; p.dataset.fmtBold = 'true' }); record('style-heading-2', 'font-size-14'); break }
      case 'style-heading-3': { applyToTargets(p => { p.style.fontSize = '12pt'; p.style.fontWeight = '600'; p.style.color = '#1f3763'; p.dataset.fmtSize = '12'; p.dataset.fmtBold = 'true' }); record('style-heading-3', 'font-size-12'); break }
      case 'style-title': { applyToTargets(p => { p.style.fontSize = '24pt'; p.style.fontWeight = '300'; p.style.color = '#201f1e'; p.dataset.fmtSize = '24' }); record('style-title'); break }
      case 'style-subtitle': { applyToTargets(p => { p.style.fontSize = '12pt'; p.style.color = '#595959'; p.style.fontStyle = 'italic'; p.dataset.fmtItalic = 'true' }); record('italic'); break }
      case 'style-quote': { applyToTargets(p => { p.style.borderLeft = '3px solid #2b579a'; p.style.paddingLeft = '10px'; p.style.fontStyle = 'italic'; p.dataset.fmtItalic = 'true'; p.dataset.fmtIndentType = 'left' }); record('indent'); break }
      case 'style-strong': { applyToTargets(p => { p.style.fontWeight = '700'; p.dataset.fmtBold = 'true' }); record('bold'); break }

      case 'insert-table': insertWordTable(2, 2); break
      case 'margins': applyWordExtra(editor.dataset.fmtMargins === 'narrow' ? 'margins:normal' : 'margins:Moderate'.toLowerCase()); break
      case 'line-spacing': applyWordExtra('line-spacing:2.0'); break
      case 'page-border': applyWordExtra('page-border:double:#2b579a'); break
      case 'drop-cap':
      case 'drop-cap-margin': {
        const para = getActiveParagraph() || editor.querySelector('#word-part-para1') || editor.querySelector('p')
        if (para && para.textContent.trim()) {
          para.style.setProperty('initial-letter', '3')
          para.style.setProperty('-webkit-initial-letter', '3')
          editor.dataset.fmtDropCap = 'true'
          para.dataset.fmtDropCap = 'true'
          record('drop-cap')
        }
        break
      }
      case 'drop-cap-none': {
        const para = getActiveParagraph() || editor.querySelector('#word-part-para1') || editor.querySelector('p')
        if (para) {
          para.style.removeProperty('initial-letter')
          para.style.removeProperty('-webkit-initial-letter')
          delete para.dataset.fmtDropCap
        }
        delete editor.dataset.fmtDropCap
        break
      }
      case 'watermark': setWatermark('CONFIDENTIAL'); break
      case 'watermark-remove': setWatermark(''); break
      case 'page-color': applyWordExtra('page-color:#fffef0'); break
      case 'orientation': applyWordExtra(editor.dataset.fmtOrientation === 'landscape' ? 'orientation:portrait' : 'orientation:landscape'); break
      case 'columns': applyWordExtra(editor.dataset.fmtColumns === '2' ? 'columns:1' : 'columns:2'); break
      case 'header':
      case 'header-3col':
      case 'header-austin':
      case 'header-custom': {
        editor.querySelector('.word-inserted-header')?.remove()
        editor.insertAdjacentHTML('afterbegin', '<p class="word-inserted-header" contenteditable="false" style="border-top:0;border-bottom:1px solid #c8c6c4;padding-bottom:6px;margin-bottom:14px;">Official Document Header</p>')
        editor.dataset.fmtHeader = 'true'
        record('header')
        break
      }
      case 'header-remove': editor.querySelector('.word-inserted-header')?.remove(); delete editor.dataset.fmtHeader; break
      case 'footer':
      case 'footer-3col':
      case 'footer-austin':
      case 'footer-custom': {
        editor.querySelector('.word-inserted-footer')?.remove()
        editor.insertAdjacentHTML('beforeend', '<p class="word-inserted-footer" contenteditable="false">Official Footer · Confidential</p>')
        editor.dataset.fmtFooter = 'true'
        record('footer')
        break
      }
      case 'footer-remove': editor.querySelector('.word-inserted-footer')?.remove(); delete editor.dataset.fmtFooter; break
      case 'page-number':
      case 'page-number-top': {
        editor.querySelector('.word-page-number')?.remove()
        editor.insertAdjacentHTML(rawAction === 'page-number-top' ? 'afterbegin' : 'beforeend', '<p class="word-page-number" contenteditable="false" style="text-align:right;">Page 1 of 1</p>')
        editor.dataset.fmtPageNumber = 'true'
        record('page-number')
        break
      }
      case 'page-number-remove': editor.querySelector('.word-page-number')?.remove(); delete editor.dataset.fmtPageNumber; break
      case 'insert-textbox':
        editor.insertAdjacentHTML('beforeend', '<div style="border:1px solid #2b579a;padding:10px 12px;margin:10px 0;background:#f8fbff;">Text Box: Enter callout text here.</div>')
        record('textbox')
        break
      case 'insert-datetime':
        editor.insertAdjacentHTML('beforeend', `<span> ${new Date().toLocaleDateString('en-IN')} </span>`)
        record('datetime')
        break
      case 'insert-equation':
        editor.insertAdjacentHTML('beforeend', '<p style="font-family:Cambria Math,Georgia,serif;font-style:italic;text-align:center;">A = πr²</p>')
        record('insert-equation', 'symbol')
        break
      case 'symbol':
        editor.insertAdjacentHTML('beforeend', '<span> ₹ </span>')
        record('symbol')
        break
      case 'contents':
        editor.insertAdjacentHTML('afterbegin', '<div class="word-toc" style="border-bottom:1px solid #d2d0ce;padding-bottom:8px;margin-bottom:12px;"><strong style="color:#2f5597;">Table of Contents</strong><p style="margin:4px 0 0;font-size:10pt;">1. Office Order .......................................................... 1</p></div>')
        record('contents')
        break
      case 'contents-remove': editor.querySelector('.word-toc')?.remove(); break
      case 'footnote':
      case 'endnote':
        editor.insertAdjacentHTML('beforeend', '<p class="word-footnote">¹ Official reference note attached to this paragraph.</p>')
        record('footnote')
        break
      case 'citation':
        editor.insertAdjacentHTML('beforeend', '<span> (Government Press, 2026) </span>')
        record('citation')
        break
      case 'caption':
        editor.insertAdjacentHTML('beforeend', '<p style="font-size:9.5pt;color:#44546a;font-style:italic;">Figure 1: Official Record Summary</p>')
        record('caption')
        break
      case 'index': record('index'); break
      case 'new-comment':
        editor.insertAdjacentHTML('beforeend', '<p class="word-comment">💬 Comment: Verified for official dispatch.</p>')
        record('new-comment')
        break
      case 'delete-comment': editor.querySelector('.word-comment')?.remove(); break
      case 'track-changes':
        editor.classList.toggle('word-track-changes')
        record('track-changes')
        break
      case 'ruler':
        document.querySelector('#word-horizontal-ruler')?.classList.toggle('is-hidden')
        document.querySelector('#word-vertical-ruler')?.classList.toggle('is-hidden')
        break
      case 'gridlines':
        editor.classList.toggle('show-gridlines')
        break
      case 'read-mode':
        editor.classList.toggle('word-read-mode')
        break
      case 'print-layout':
        editor.classList.remove('word-read-mode')
        editor.style.maxWidth = '780px'
        break
      case 'web-layout':
      case 'page-width':
        editor.style.maxWidth = '100%'
        record('page-width')
        break
      case 'zoom-in': {
        const cur = Math.round(parseFloat(editor.style.zoom || '1') * 100)
        applyWordExtra(`zoom-set:${Math.min(200, cur + 10)}`)
        break
      }
      case 'zoom-out': {
        const cur = Math.round(parseFloat(editor.style.zoom || '1') * 100)
        applyWordExtra(`zoom-set:${Math.max(50, cur - 10)}`)
        break
      }
      case 'zoom-100':
        applyWordExtra('zoom-set:100')
        break
      case 'undo-cmd':
        editor.focus()
        try { document.execCommand('undo', false, null) } catch {}
        break
      case 'redo-cmd':
        editor.focus()
        try { document.execCommand('redo', false, null) } catch {}
        break
      case 'select-all':
        editor.focus()
        try { document.execCommand('selectAll', false, null) } catch {}
        break
      case 'paste':
      case 'paste-merge':
      case 'paste-text':
        editor.focus()
        record('paste', 'edit-text')
        break
      case 'ribbon-toggle':
        document.querySelector('#word-ribbon-content')?.classList.toggle('is-collapsed')
        break
      case 'ribbon-show':
        document.querySelector('#word-ribbon-content')?.classList.remove('is-collapsed')
        break
      case 'save':
      case 'save-as':
        record('save')
        break
      case 'print':
      case 'export-pdf':
        window.print()
        break
      case 'word-count': {
        const words = (editor.innerText.trim().match(/\S+/g) || []).length
        const chars = editor.innerText.length
        o19OpenDialog('word-count-dlg', () => {})
        const dlgBody = document.querySelector('.o19-modal-overlay .o19-dialog-body')
        const dlgTitle = document.querySelector('.o19-modal-overlay .o19-dialog-titlebar span')
        if (dlgTitle) dlgTitle.textContent = 'Word Count'
        if (dlgBody) dlgBody.innerHTML = `<div style="display:grid;gap:6px;font-size:12px;"><div>Pages: <b>1</b></div><div>Words: <b>${words}</b></div><div>Characters (with spaces): <b>${chars}</b></div><div>Paragraphs: <b>${editor.querySelectorAll('p').length}</b></div></div>`
        break
      }
      default:
        record(rawAction)
    }
  }

  const handleWordCommand = (cmd) => {
    const list = getActiveParagraphs()
    if (!list.length) {
      showSelectionHint('⚠️ पहले दस्तावेज़ में संबंधित पंक्ति/पैराग्राफ को माउस से सिलेक्ट या क्लिक करें')
      return
    }
    const firstEl = list[0]
    if (cmd === 'bold') {
      const nextState = firstEl.dataset.fmtBold !== 'true'
      applyToTargets((p) => {
        p.dataset.fmtBold = nextState ? 'true' : 'false'
        p.style.fontWeight = nextState ? '700' : '400'
      })
      record('bold')
    } else if (cmd === 'italic') {
      const nextState = firstEl.dataset.fmtItalic !== 'true'
      applyToTargets((p) => {
        p.dataset.fmtItalic = nextState ? 'true' : 'false'
        p.style.fontStyle = nextState ? 'italic' : 'normal'
      })
      record('italic')
    } else if (cmd === 'underline') {
      const nextState = firstEl.dataset.fmtUnderline !== 'true'
      applyToTargets((p) => {
        p.dataset.fmtUnderline = nextState ? 'true' : 'false'
        p.style.textDecoration = nextState ? 'underline' : (p.dataset.fmtStrike === 'true' ? 'line-through' : 'none')
      })
      record('underline')
    } else if (cmd === 'justifyLeft') {
      applyToTargets((p) => {
        p.dataset.fmtAlign = 'left'
        p.style.textAlign = 'left'
      })
      record('justifyLeft', 'align-left')
    } else if (cmd === 'justifyCenter') {
      applyToTargets((p) => {
        p.dataset.fmtAlign = 'center'
        p.style.textAlign = 'center'
      })
      record('justifyCenter', 'center')
    } else if (cmd === 'justifyRight') {
      applyToTargets((p) => {
        p.dataset.fmtAlign = 'right'
        p.style.textAlign = 'right'
      })
      record('justifyRight', 'align-right')
    } else if (cmd === 'justifyFull') {
      applyToTargets((p) => {
        p.dataset.fmtAlign = 'justify'
        p.style.textAlign = 'justify'
      })
      record('justifyFull')
    } else if (cmd === 'insertUnorderedList') {
      const nextState = firstEl.dataset.fmtBullets !== 'true'
      applyToTargets((p, isTableCell) => {
        if (isTableCell) return
        p.dataset.fmtBullets = nextState ? 'true' : 'false'
        if (nextState) {
          p.style.paddingLeft = '24px'
          if (!p.textContent.trim().startsWith('•')) p.textContent = '• ' + p.textContent.trim()
        } else {
          p.style.paddingLeft = ''
          p.textContent = p.textContent.replace(/^\s*•\s*/, '')
        }
      })
      record('bullets', cmd)
    } else if (cmd === 'insertOrderedList') {
      const nextState = firstEl.dataset.fmtNumbering !== 'true'
      applyToTargets((p, isTableCell) => {
        if (isTableCell) return
        p.dataset.fmtNumbering = nextState ? 'true' : 'false'
        if (nextState) {
          p.style.paddingLeft = '24px'
          if (!/^\d+\./.test(p.textContent.trim())) p.textContent = '1. ' + p.textContent.trim()
        } else {
          p.style.paddingLeft = ''
          p.textContent = p.textContent.replace(/^\s*\d+\.\s*/, '')
        }
      })
      record('numbering', cmd)
    } else {
      record(cmd)
    }
  }

  const wordApp = root?.querySelector('.office-word')
  wordApp?.addEventListener('click', (event) => {
    const dialogBtn = event.target.closest('[data-o19-dialog]')
    if (dialogBtn) {
      event.stopPropagation()
      o19OpenDialog(dialogBtn.dataset.o19Dialog, applyWordExtra)
      return
    }
    const tabBtn = event.target.closest('[data-word-tab]')
    if (tabBtn) {
      o19CloseMenu()
      wordApp.querySelectorAll('[data-word-tab]').forEach(b => b.classList.toggle('active', b === tabBtn))
      const ribbon = wordApp.querySelector('#word-ribbon-content')
      if (ribbon) {
        ribbon.classList.remove('is-collapsed')
        ribbon.innerHTML = efficiencyWordRibbon(tabBtn.dataset.wordTab)
      }
      return
    }
    const caretClick = event.target.closest('.o19-caret, .o19-combo-arrow')
    const menuTrigger = event.target.closest('[data-o19-menu]')
    if (menuTrigger) {
      const hasDirectCmd = menuTrigger.dataset.wordCommand
      if (caretClick || !hasDirectCmd) {
        event.stopPropagation()
        o19OpenSubmenu(menuTrigger, menuTrigger.dataset.o19Menu, applyWordExtra)
        return
      }
    }
    const button = event.target.closest('button, [data-word-extra]')
    if (!button) return
    if (button.dataset.wordCommand) {
      handleWordCommand(button.dataset.wordCommand)
      return
    }
    if (button.dataset.wordExtra) {
      applyWordExtra(button.dataset.wordExtra)
    }
  })

  wordApp?.querySelector('#word-zoom-slider')?.addEventListener('input', (e) => {
    applyWordExtra(`zoom-set:${e.target.value}`)
  })

  wordApp?.querySelector('#o19-tab-stop-btn')?.addEventListener('click', (e) => {
    const stops = ['L', '⊥', '⅃', '⟘', '|']
    const idx = (stops.indexOf(e.currentTarget.textContent.trim()) + 1) % stops.length
    e.currentTarget.textContent = stops[idx]
  })

  editor?.addEventListener('mousedown', () => setTimeout(rememberActiveParagraph, 10))
  editor?.addEventListener('mouseup', () => rememberActiveParagraph())
  editor?.addEventListener('keyup', () => rememberActiveParagraph())
  wordApp?.addEventListener('change', (e) => {
    const t = e.target
    if (t.id === 'word-indent-left') applyWordExtra(`indent-first-line:${parseFloat(t.value) || 0.75}`)
    else if (t.id === 'word-indent-right') applyWordExtra(`indent-right:${parseFloat(t.value) || 0.5}`)
    else if (t.id === 'word-space-before') applyWordExtra(`space-before:${parseFloat(t.value) || 6}`)
    else if (t.id === 'word-space-after') applyWordExtra(`space-after:${parseFloat(t.value) || 6}`)
    else if (t.id === 'word-font-family') applyWordExtra(`set-font:${t.value}`)
    else if (t.id === 'word-font-size') applyWordExtra(`set-size:${t.value}`)
  })
  editor?.addEventListener('input', () => {
    const count = (editor.innerText.trim().match(/\S+/g) || []).length
    const target = document.querySelector('#word-word-count')
    if (target) target.textContent = `${count} words`
  })
}

// ============================================================================
// EXCEL 2019 FORMULA ENGINE & WORKSPACE CONTROLLER
// ============================================================================
function efficiencyCellRef(row, col) {
  let n = col + 1, letters = ''
  while (n) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return `${letters}${row + 1}`
}

function efficiencyParseRef(ref) {
  const m = /^([A-Z]+)(\d+)$/i.exec(String(ref).trim())
  if (!m) return null
  let col = 0
  for (const ch of m[1].toUpperCase()) col = col * 26 + ch.charCodeAt(0) - 64
  return { row: Number(m[2]) - 1, col: col - 1 }
}

function efficiencyCellValue(ref) {
  const pos = efficiencyParseRef(ref)
  if (!pos) return 0
  const raw = efficiencyState.excelDataset[pos.row]?.[pos.col] ?? 0
  if (typeof raw === 'string' && raw.startsWith('=') && raw !== efficiencyState._evalGuard) {
    efficiencyState._evalGuard = raw
    const v = efficiencyEvaluateFormula(raw)
    efficiencyState._evalGuard = ''
    return v
  }
  return raw
}

function efficiencyRangeValues(range) {
  const parts = String(range).split(':')
  const a = efficiencyParseRef(parts[0])
  const b = efficiencyParseRef(parts[1] || parts[0])
  if (!a || !b) return []
  const values = []
  for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
      values.push(efficiencyCellValue(efficiencyCellRef(r, c)))
    }
  }
  return values
}

function efficiencyEvaluateFormula(formula) {
  const text = String(formula || '').trim()
  if (!text.startsWith('=')) return text

  const fn = text.match(/^=(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA|COUNTBLANK|PRODUCT|MEDIAN)\(([A-Z]+\d+(?::[A-Z]+\d+)?)\)$/i)
  if (fn) {
    const rawVals = efficiencyRangeValues(fn[2])
    const vals = rawVals.filter(v => v !== '' && v !== null && v !== undefined)
    const nums = vals.map(v => Number(String(v).replace(/[^\d.-]/g, ''))).filter(v => Number.isFinite(v))
    switch (fn[1].toUpperCase()) {
      case 'SUM': return nums.reduce((a, b) => a + b, 0)
      case 'AVERAGE': return nums.length ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 0
      case 'MIN': return nums.length ? Math.min(...nums) : 0
      case 'MAX': return nums.length ? Math.max(...nums) : 0
      case 'COUNT': return nums.length
      case 'COUNTA': return vals.length
      case 'COUNTBLANK': return rawVals.length - vals.length
      case 'PRODUCT': return nums.length ? nums.reduce((a, b) => a * b, 1) : 0
      case 'MEDIAN': {
        if (!nums.length) return 0
        const s = [...nums].sort((a, b) => a - b)
        const mid = Math.floor(s.length / 2)
        return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
      }
    }
  }

  const singleFn = text.match(/^=(UPPER|LOWER|PROPER|LEN|TRIM|ABS|INT|SQRT)\(([A-Z]+\d+|"[^"]*"|-?\d+(?:\.\d+)?)\)$/i)
  if (singleFn) {
    const fnName = singleFn[1].toUpperCase()
    const arg = singleFn[2]
    const val = /^".*"$/.test(arg) ? arg.slice(1, -1) : (/^[A-Z]+\d+$/i.test(arg) ? efficiencyCellValue(arg) : arg)
    const str = String(val ?? '')
    switch (fnName) {
      case 'UPPER': return str.toUpperCase()
      case 'LOWER': return str.toLowerCase()
      case 'PROPER': return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
      case 'LEN': return str.length
      case 'TRIM': return str.trim().replace(/\s+/g, ' ')
      case 'ABS': return Math.abs(Number(val) || 0)
      case 'INT': return Math.floor(Number(val) || 0)
      case 'SQRT': return +(Math.sqrt(Math.max(0, Number(val) || 0))).toFixed(2)
    }
  }

  const ifFn = text.match(/^=IF\(([A-Z]+\d+)\s*(>=|<=|<>|=|>|<)\s*(-?\d+(?:\.\d+)?|"[^"]*")\s*,\s*(-?\d+(?:\.\d+)?|"[^"]*")\s*,\s*(-?\d+(?:\.\d+)?|"[^"]*")\)$/i)
  if (ifFn) {
    const lhsRaw = efficiencyCellValue(ifFn[1])
    const rhsRaw = ifFn[3].replace(/^"|"$/g, '')
    const lhsNum = Number(String(lhsRaw).replace(/[^\d.-]/g, ''))
    const rhsNum = Number(String(rhsRaw).replace(/[^\d.-]/g, ''))
    const lhs = Number.isFinite(lhsNum) && String(lhsRaw) !== '' ? lhsNum : String(lhsRaw)
    const rhs = Number.isFinite(rhsNum) && String(rhsRaw) !== '' ? rhsNum : String(rhsRaw)
    const ok = ({
      '>': lhs > rhs, '<': lhs < rhs, '>=': lhs >= rhs, '<=': lhs <= rhs, '=': lhs == rhs, '<>': lhs != rhs
    })[ifFn[2]]
    return (ok ? ifFn[4] : ifFn[5]).replace(/^"|"$/g, '')
  }

  const condFn = text.match(/^=(COUNTIF|SUMIF)\(([A-Z]+\d+:[A-Z]+\d+)\s*,\s*("[^"]*"|-?\d+(?:\.\d+)?)\)$/i)
  if (condFn) {
    const vals = efficiencyRangeValues(condFn[2])
    const crit = condFn[3].replace(/^"|"$/g, '')
    const matchVal = (v) => {
      const m = /^(>=|<=|<>|>|<|=)?(.*)$/.exec(crit)
      const op = m?.[1] || '='
      const target = m?.[2] ?? ''
      const nv = Number(String(v).replace(/[^\d.-]/g, '')), nt = Number(target)
      if (Number.isFinite(nv) && Number.isFinite(nt) && target !== '') {
        return ({ '>': nv > nt, '<': nv < nt, '>=': nv >= nt, '<=': nv <= nt, '=': nv === nt, '<>': nv !== nt })[op]
      }
      return String(v).toLowerCase() === String(target).toLowerCase()
    }
    const matched = vals.filter(matchVal)
    return condFn[1].toUpperCase() === 'COUNTIF'
      ? matched.length
      : matched.map(v => Number(String(v).replace(/[^\d.-]/g, ''))).filter(Number.isFinite).reduce((a, b) => a + b, 0)
  }

  if (/^=TODAY\(\)$/i.test(text)) return new Date().toLocaleDateString('en-IN')
  if (/^=NOW\(\)$/i.test(text)) return new Date().toLocaleString('en-IN')

  try {
    const expr = text.slice(1).replace(/([A-Z]+\d+)/gi, (_, ref) => String(Number(String(efficiencyCellValue(ref)).replace(/[^\d.-]/g, '')) || 0)).replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
    if (!/^[\d+\-*/().\s]+$/.test(expr)) return '#VALUE!'
    return Function(`"use strict"; return (${expr})`)()
  } catch {
    return '#VALUE!'
  }
}

function efficiencyCommitExcelCell(cell) {
  const pos = efficiencyParseRef(cell.dataset.cell)
  if (!pos) return
  efficiencyState.excelDataset[pos.row] ||= []
  const raw = cell.value.trim()
  efficiencyState.excelDataset[pos.row][pos.col] = raw
  if (String(raw).startsWith('=')) {
    efficiencyState.excelFormulas[cell.dataset.cell] = raw
    const result = efficiencyEvaluateFormula(raw)
    cell.title = `${raw} = ${result}`
    cell.classList.toggle('excel-formula-error', result === '#VALUE!')
    cell.dataset.calculated = String(result)
  } else {
    delete efficiencyState.excelFormulas[cell.dataset.cell]
    delete cell.dataset.calculated
  }
  const name = document.querySelector('#excel-name-box')
  if (name) name.textContent = cell.dataset.cell
  const bar = document.querySelector('#excel-formula-input')
  if (bar) bar.value = raw
  const status = document.querySelector('#excel-status')
  if (status) status.textContent = String(raw).startsWith('=') ? `${raw} = ${efficiencyEvaluateFormula(raw)}` : 'Ready'
}

function efficiencyAttachExcel(tasks, question) {
  const root = document.querySelector('#efficiency-simulator')
  const grid = document.querySelector('#excel-grid')
  efficiencyState.selectedCell = 'A2'
  efficiencyState.selectedExcelCells = []

  const getActiveCellEl = () => document.querySelector(`[data-cell="${efficiencyState.selectedCell}"]`) || grid?.querySelector('.excel-cell')

  const getSelectedCellElements = () => {
    const list = (efficiencyState.selectedExcelCells || []).filter(c => c && grid?.contains(c))
    if (list.length) return list
    const single = getActiveCellEl()
    return single ? [single] : []
  }

  const selectRangeFromAnchor = (startRef, endRef) => {
    const a = efficiencyParseRef(startRef)
    const b = efficiencyParseRef(endRef || startRef)
    if (!a || !b || !grid) return
    const selected = []
    grid.querySelectorAll('.excel-cell.is-selected-range').forEach(el => el.classList.remove('is-selected-range'))
    for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
        const ref = efficiencyCellRef(r, c)
        const el = grid.querySelector(`.excel-cell[data-cell="${ref}"]`)
        if (el) {
          el.classList.add('is-selected-range')
          selected.push(el)
        }
      }
    }
    efficiencyState.selectedExcelCells = selected
    const name = document.querySelector('#excel-name-box')
    if (name) name.textContent = startRef === endRef ? startRef : `${startRef}:${endRef}`
  }

  const highlightActiveHeaders = (cellEl) => {
    if (!grid || !cellEl) return
    const r = cellEl.dataset.row
    const c = cellEl.dataset.col
    grid.querySelectorAll('th.is-active-header').forEach(th => th.classList.remove('is-active-header'))
    grid.querySelector(`th[data-col-header="${c}"]`)?.classList.add('is-active-header')
    grid.querySelector(`th[data-row-header="${r}"]`)?.classList.add('is-active-header')
  }

  let isDraggingCells = false
  let dragStartRef = null

  const bindCells = () => grid?.querySelectorAll('.excel-cell').forEach(cell => {
    cell.addEventListener('mousedown', (ev) => {
      if (ev.shiftKey && efficiencyState.selectedCell) {
        selectRangeFromAnchor(efficiencyState.selectedCell, cell.dataset.cell)
      } else {
        isDraggingCells = true
        dragStartRef = cell.dataset.cell
        efficiencyState.selectedCell = cell.dataset.cell
        selectRangeFromAnchor(cell.dataset.cell, cell.dataset.cell)
      }
    })
    cell.addEventListener('mouseenter', () => {
      if (isDraggingCells && dragStartRef) {
        selectRangeFromAnchor(dragStartRef, cell.dataset.cell)
      }
    })
    cell.addEventListener('focus', () => {
      efficiencyState.selectedCell = cell.dataset.cell
      if (!efficiencyState.selectedExcelCells?.length) {
        selectRangeFromAnchor(cell.dataset.cell, cell.dataset.cell)
      }
      const bar = document.querySelector('#excel-formula-input')
      if (bar) bar.value = efficiencyState.excelFormulas[cell.dataset.cell] || cell.value
      highlightActiveHeaders(cell)
    })
    cell.addEventListener('change', () => efficiencyCommitExcelCell(cell))
    cell.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        efficiencyCommitExcelCell(cell)
        const next = Number(cell.dataset.row) + 1
        grid.querySelector(`[data-row="${next}"][data-col="${cell.dataset.col}"]`)?.focus()
      }
    })
  })
  window.addEventListener('mouseup', () => { isDraggingCells = false })
  bindCells()

  const applyCellFromBar = () => {
    const cell = getActiveCellEl()
    const bar = document.querySelector('#excel-formula-input')
    if (cell && bar) {
      cell.value = bar.value
      efficiencyCommitExcelCell(cell)
      cell.focus()
    }
  }

  document.querySelector('#excel-formula-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyCellFromBar()
    }
  })

  const insertExcelFormula = (fnName) => {
    const pos = efficiencyParseRef(efficiencyState.selectedCell) || { row: 7, col: 3 }
    const col = String.fromCharCode(65 + pos.col)
    const endRow = Math.max(3, pos.row)
    let formula = `=${fnName}(${col}3:${col}${endRow})`
    if (pos.row === 2 && pos.col === 5) formula = `=SUM(D3:E3)`
    else if (fnName === 'IF') formula = `=IF(D3>=30000,"Senior","Junior")`
    else if (fnName === 'COUNTIF') formula = `=COUNTIF(D3:D7,">=30000")`
    else if (fnName === 'SUMIF') formula = `=SUMIF(D3:D7,">=30000")`
    else if (['UPPER', 'LOWER', 'PROPER', 'LEN', 'TRIM'].includes(fnName)) formula = `=${fnName}(B3)`
    else if (fnName === 'TODAY' || fnName === 'NOW') formula = `=${fnName}()`
    const bar = document.querySelector('#excel-formula-input')
    if (bar) {
      bar.value = formula
      applyCellFromBar()
    }
  }

  const applyToSelectedExcelCells = (fn) => {
    const cells = getSelectedCellElements()
    cells.forEach(c => fn(c))
  }

  const applyExcelExtra = (rawAction) => {
    if (!rawAction) return
    const cell = getActiveCellEl()
    const status = document.querySelector('#excel-status')

    if (rawAction.startsWith('formula:')) {
      insertExcelFormula(rawAction.slice(8))
      return
    }
    if (rawAction.startsWith('excel-set-font:')) {
      const font = rawAction.slice(15).replace(/ \(.*\)/, '').trim()
      const input = document.querySelector('#excel-font-family')
      if (input) input.value = font
      applyToSelectedExcelCells(c => {
        c.style.fontFamily = `'${font}', sans-serif`
        c.dataset.fmtFont = font.toLowerCase()
      })
      return
    }
    if (rawAction.startsWith('excel-set-size:')) {
      const sz = String(rawAction.slice(15)).replace(/pt/i, '').trim()
      const input = document.querySelector('#excel-font-size')
      if (input) input.value = sz
      applyToSelectedExcelCells(c => {
        c.style.fontSize = `${sz}pt`
        c.dataset.fmtSize = sz
      })
      return
    }
    if (rawAction.startsWith('shading-color:')) {
      const col = rawAction.slice(14)
      applyToSelectedExcelCells(c => {
        c.style.backgroundColor = col === 'transparent' ? '' : col
        c.dataset.fmtFill = col === 'transparent' ? 'false' : 'true'
      })
      return
    }
    if (rawAction.startsWith('font-color:')) {
      const col = rawAction.slice(11)
      applyToSelectedExcelCells(c => {
        c.style.color = col
        c.dataset.fmtFontColor = col
      })
      return
    }
    if (rawAction.startsWith('excel-numfmt:')) {
      const fmt = rawAction.slice(13)
      const sel = document.querySelector('#excel-number-format')
      if (sel) sel.value = fmt
      applyToSelectedExcelCells(c => {
        c.dataset.fmtNum = fmt.toLowerCase()
        const num = Number(String(c.value).replace(/[^\d.-]/g, ''))
        if (Number.isFinite(num) && c.value !== '' && !String(c.value).startsWith('=')) {
          if (fmt === 'Currency' || fmt === 'Accounting') c.value = `₹${num.toFixed(2)}`
          else if (fmt === 'Percent') c.value = `${num}%`
          else if (fmt === 'Number') c.value = num.toFixed(2)
        }
      })
      return
    }
    if (rawAction.startsWith('excel-fmt-currency')) {
      const sym = rawAction.split(':')[1] || '₹'
      applyToSelectedExcelCells(c => {
        c.dataset.fmtNum = 'currency'
        if (c.value && !String(c.value).startsWith('=')) {
          const num = Number(String(c.value).replace(/[^\d.-]/g, ''))
          if (Number.isFinite(num)) c.value = `${sym}${num.toFixed(2)}`
        }
      })
      return
    }
    if (rawAction.startsWith('excel-orient:')) {
      const mode = rawAction.slice(13)
      applyToSelectedExcelCells(c => {
        c.style.transform = mode === 'ccw' ? 'rotate(-15deg)' : mode === 'cw' ? 'rotate(15deg)' : 'none'
        c.dataset.fmtOrient = mode
      })
      return
    }
    if (rawAction.startsWith('cell-style:')) {
      const st = rawAction.slice(11)
      const styles = {
        bad: { bg: '#ffc7ce', col: '#9c0006' },
        good: { bg: '#c6efce', col: '#006100' },
        neutral: { bg: '#ffeb9c', col: '#9c6500' },
        heading: { bg: '#d9e1f2', col: '#1f4e78' },
        total: { bg: '#f2f2f2', col: '#000000' },
        normal: { bg: '', col: '#201f1e' }
      }
      const s = styles[st] || styles.normal
      applyToSelectedExcelCells(c => {
        c.style.backgroundColor = s.bg
        c.style.color = s.col
        c.dataset.fmtFill = s.bg ? 'true' : 'false'
      })
      return
    }

    switch (rawAction) {
      case 'open-excel-format-dlg': o19OpenDialog('excel-format-dlg', applyExcelExtra); break
      case 'open-function-dlg': o19OpenDialog('open-function-dlg', applyExcelExtra); break
      case 'open-sort-dialog': o19OpenDialog('open-sort-dialog', applyExcelExtra); break
      case 'autosum': insertExcelFormula('SUM'); break
      case 'excel-bold': {
        const next = cell?.dataset.fmtBold !== 'true'
        applyToSelectedExcelCells(c => {
          c.classList.toggle('excel-bold-cell', next)
          c.style.fontWeight = next ? '700' : '400'
          c.dataset.fmtBold = next ? 'true' : 'false'
        })
        break
      }
      case 'excel-italic': {
        const next = cell?.dataset.fmtItalic !== 'true'
        applyToSelectedExcelCells(c => {
          c.style.fontStyle = next ? 'italic' : 'normal'
          c.dataset.fmtItalic = next ? 'true' : 'false'
        })
        break
      }
      case 'excel-underline':
      case 'underline-single':
      case 'underline-double': {
        const next = cell?.dataset.fmtUnderline !== 'true'
        applyToSelectedExcelCells(c => {
          c.style.textDecoration = next ? 'underline' : 'none'
          c.dataset.fmtUnderline = next ? 'true' : 'false'
        })
        break
      }
      case 'excel-fill': {
        const next = cell?.dataset.fmtFill !== 'true'
        applyToSelectedExcelCells(c => {
          c.classList.toggle('excel-fill-cell', next)
          c.style.backgroundColor = next ? '#fef9c3' : ''
          c.dataset.fmtFill = next ? 'true' : 'false'
        })
        break
      }
      case 'excel-border':
      case 'border-all':
      case 'border-outside':
      case 'border-bottom':
      case 'border-thick':
      case 'border-double':
        applyToSelectedExcelCells(c => {
          c.classList.add('excel-border-cell')
          c.dataset.fmtBorder = 'true'
        })
        break
      case 'border-none':
        applyToSelectedExcelCells(c => {
          c.classList.remove('excel-border-cell')
          c.dataset.fmtBorder = 'false'
        })
        break
      case 'excel-merge': {
        const next = cell?.dataset.fmtMerge !== 'true'
        applyToSelectedExcelCells(c => {
          c.classList.toggle('excel-merged-cell', next)
          c.style.textAlign = next ? 'center' : ''
          c.dataset.fmtMerge = next ? 'true' : 'false'
          if (next) c.dataset.fmtAlign = 'center'
        })
        break
      }
      case 'excel-unmerge':
        applyToSelectedExcelCells(c => {
          c.classList.remove('excel-merged-cell')
          c.dataset.fmtMerge = 'false'
        })
        break
      case 'excel-wrap-text': {
        const next = cell?.dataset.fmtWrap !== 'true'
        applyToSelectedExcelCells(c => {
          c.style.whiteSpace = next ? 'normal' : ''
          c.dataset.fmtWrap = next ? 'true' : 'false'
        })
        break
      }
      case 'excel-align-left':
        applyToSelectedExcelCells(c => { c.style.textAlign = 'left'; c.dataset.fmtAlign = 'left' })
        break
      case 'excel-align-center':
        applyToSelectedExcelCells(c => { c.style.textAlign = 'center'; c.dataset.fmtAlign = 'center' })
        break
      case 'excel-align-right':
        applyToSelectedExcelCells(c => { c.style.textAlign = 'right'; c.dataset.fmtAlign = 'right' })
        break
      case 'excel-font-grow': {
        const inp = document.querySelector('#excel-font-size')
        applyExcelExtra(`excel-set-size:${Math.min(72, (Number(inp?.value) || 11) + 1)}`)
        break
      }
      case 'excel-font-shrink': {
        const inp = document.querySelector('#excel-font-size')
        applyExcelExtra(`excel-set-size:${Math.max(8, (Number(inp?.value) || 11) - 1)}`)
        break
      }
      case 'excel-fmt-percent': applyExcelExtra('excel-numfmt:Percent'); break
      case 'excel-fmt-comma': applyExcelExtra('excel-numfmt:Number'); break
      case 'excel-decimal-inc':
      case 'excel-decimal-dec':
        applyToSelectedExcelCells(c => {
          const n = Number(String(c.value).replace(/[^\d.-]/g, ''))
          if (Number.isFinite(n) && c.value !== '') {
            const dec = rawAction === 'excel-decimal-inc' ? 2 : 0
            c.value = n.toFixed(dec)
            c.dataset.fmtNum = 'decimal'
          }
        })
        break
      case 'conditional-format':
      case 'condfmt-gt':
      case 'condfmt-lt':
      case 'condfmt-eq':
      case 'condfmt-dup':
      case 'condfmt-top':
      case 'condfmt-bars':
      case 'condfmt-scales':
        applyToSelectedExcelCells(c => {
          c.dataset.fmtCond = 'true'
          const n = Number(String(c.value).replace(/[^\d.-]/g, ''))
          if (Number.isFinite(n) && c.value !== '') {
            c.style.backgroundColor = n >= 30000 ? '#c6efce' : '#ffeb9c'
          }
        })
        if (grid) grid.dataset.fmtCond = 'true'
        break
      case 'condfmt-clear':
        grid?.querySelectorAll('.excel-cell').forEach(c => { c.style.backgroundColor = ''; delete c.dataset.fmtCond })
        if (grid) delete grid.dataset.fmtCond
        break
      case 'insert-row': {
        const pos = efficiencyParseRef(efficiencyState.selectedCell) || { row: 1, col: 0 }
        const colsCount = Math.max(9, ...efficiencyState.excelDataset.map(r => r.length))
        efficiencyState.excelDataset.splice(pos.row + 1, 0, Array.from({ length: colsCount }, () => ''))
        if (status) status.textContent = `Row inserted at ${pos.row + 2}`
        if (grid) grid.dataset.fmtInsertRow = 'true'
        break
      }
      case 'delete-row': {
        const pos = efficiencyParseRef(efficiencyState.selectedCell) || { row: 1, col: 0 }
        if (efficiencyState.excelDataset.length > 2) efficiencyState.excelDataset.splice(pos.row, 1)
        if (status) status.textContent = `Row ${pos.row + 1} deleted`
        if (grid) grid.dataset.fmtDeleteRow = 'true'
        break
      }
      case 'row-height':
      case 'autofit-row':
        grid?.querySelectorAll('td, .excel-cell').forEach(el => { el.style.height = '28px' })
        if (grid) grid.dataset.fmtRowHeight = 'true'
        break
      case 'col-width':
      case 'autofit-col':
        grid?.querySelectorAll('th:not(.excel-corner), td').forEach(el => { el.style.minWidth = '115px' })
        if (grid) grid.dataset.fmtColWidth = 'true'
        break
      case 'sort-asc':
      case 'sort-desc':
      case 'sort': {
        const header = efficiencyState.excelDataset[0]
        const dataRows = efficiencyState.excelDataset.slice(1).filter(r => r.some(v => String(v).trim() !== ''))
        const emptyRows = efficiencyState.excelDataset.slice(1).filter(r => !r.some(v => String(v).trim() !== ''))
        dataRows.sort((a, b) => String(a[0] || '').localeCompare(String(b[0] || ''), undefined, { numeric: true }) * (rawAction === 'sort-desc' ? -1 : 1))
        efficiencyState.excelDataset = [header, ...dataRows, ...emptyRows]
        grid?.querySelectorAll('tbody tr').forEach((tr, r) => {
          tr.querySelectorAll('.excel-cell').forEach((inp, c) => {
            inp.value = efficiencyState.excelDataset[r]?.[c] ?? ''
          })
        })
        if (grid) grid.dataset.fmtSorted = rawAction
        if (status) status.textContent = rawAction === 'sort-desc' ? 'Sorted Z to A' : 'Sorted A to Z'
        break
      }
      case 'filter':
        grid?.classList.toggle('excel-filter-on')
        if (grid) grid.dataset.fmtFilter = grid.classList.contains('excel-filter-on') ? 'true' : 'false'
        if (status) status.textContent = 'Filter toggled'
        break
      case 'chart':
      case 'column-chart':
      case 'line-chart':
      case 'pie-chart': {
        grid?.parentElement?.querySelector('.excel-chart-preview')?.remove()
        const chartDiv = document.createElement('div')
        chartDiv.className = 'excel-chart-preview'
        chartDiv.style.cssText = 'position:absolute;right:24px;bottom:36px;width:280px;background:#fff;border:1px solid #8a8886;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:12px;z-index:20;'
        chartDiv.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:8px;"><span>📊 ${rawAction.toUpperCase()}</span><button type="button" onclick="this.closest('.excel-chart-preview').remove()" style="border:0;background:none;cursor:pointer;">✕</button></div><div style="display:flex;align-items:flex-end;gap:10px;height:90px;padding:8px;background:#f8fafc;border:1px solid #e1dfdd;"><div style="flex:1;background:#2b579a;height:65%;"></div><div style="flex:1;background:#217346;height:85%;"></div><div style="flex:1;background:#d24726;height:50%;"></div><div style="flex:1;background:#742774;height:95%;"></div></div>`
        grid?.parentElement?.append(chartDiv)
        if (grid) grid.dataset.fmtChart = 'true'
        break
      }
      case 'freeze-panes':
        grid?.classList.toggle('excel-frozen')
        if (grid) grid.dataset.fmtFreezePanes = grid.classList.contains('excel-frozen') ? 'true' : 'false'
        if (status) status.textContent = grid?.dataset.fmtFreezePanes === 'true' ? 'Freeze Panes active' : 'Freeze Panes off'
        break
      case 'gridlines':
        grid?.classList.toggle('hide-gridlines')
        break
      case 'zoom-in':
      case 'zoom-out':
      case 'zoom-100': {
        const current = parseFloat(grid?.style.zoom || '1')
        const next = rawAction === 'zoom-100' ? 1 : Math.max(0.6, Math.min(1.5, current + (rawAction === 'zoom-in' ? 0.1 : -0.1)))
        if (grid) grid.style.zoom = String(next)
        const pct = Math.round(next * 100)
        const z = document.querySelector('#excel-zoom-status')
        if (z) z.textContent = `${pct}%`
        const slider = document.querySelector('#excel-zoom-slider')
        if (slider) slider.value = String(pct)
        break
      }
      case 'ribbon-toggle':
        document.querySelector('#excel-ribbon-content')?.classList.toggle('is-collapsed')
        break
      case 'ribbon-show':
        document.querySelector('#excel-ribbon-content')?.classList.remove('is-collapsed')
        break
      case 'save':
        if (status) status.textContent = 'Workbook saved'
        break
      case 'print':
        window.print()
        break
      default:
        if (status) status.textContent = `${rawAction.replaceAll('-', ' ')} applied`
    }
  }

  const excelApp = root?.querySelector('.office-excel')
  excelApp?.addEventListener('click', (event) => {
    const dialogBtn = event.target.closest('[data-o19-dialog]')
    if (dialogBtn) {
      event.stopPropagation()
      o19OpenDialog(dialogBtn.dataset.o19Dialog, applyExcelExtra)
      return
    }
    const tabBtn = event.target.closest('[data-excel-tab]')
    if (tabBtn) {
      o19CloseMenu()
      excelApp.querySelectorAll('[data-excel-tab]').forEach(b => b.classList.toggle('active', b === tabBtn))
      const ribbon = excelApp.querySelector('#excel-ribbon-content')
      if (ribbon) {
        ribbon.classList.remove('is-collapsed')
        ribbon.innerHTML = efficiencyExcelRibbon(tabBtn.dataset.excelTab)
      }
      return
    }
    const caretClick = event.target.closest('.o19-caret, .o19-combo-arrow')
    const menuTrigger = event.target.closest('[data-o19-menu]')
    if (menuTrigger) {
      const hasDirectExtra = menuTrigger.dataset.excelExtra
      if (caretClick || !hasDirectExtra) {
        event.stopPropagation()
        o19OpenSubmenu(menuTrigger, menuTrigger.dataset.o19Menu, applyExcelExtra)
        return
      }
    }
    const extraBtn = event.target.closest('[data-excel-extra]')
    if (extraBtn) {
      applyExcelExtra(extraBtn.dataset.excelExtra)
    }
  })

  document.querySelector('#excel-apply-cell')?.addEventListener('click', applyCellFromBar)
  document.querySelector('#excel-cancel-cell')?.addEventListener('click', () => {
    const cell = getActiveCellEl()
    const bar = document.querySelector('#excel-formula-input')
    if (cell && bar) bar.value = efficiencyState.excelFormulas[cell.dataset.cell] || cell.value
  })
  document.querySelector('#excel-add-sheet')?.addEventListener('click', () => {
    const st = document.querySelector('#excel-status')
    if (st) st.textContent = 'Sheet2 added'
  })

  excelApp?.querySelector('#excel-Font')?.addEventListener('change', e => applyExcelExtra(`excel-set-font:${e.target.value}`))
  excelApp?.addEventListener('change', (e) => {
    const t = e.target
    if (t.id === 'excel-font-family') applyExcelExtra(`excel-set-font:${t.value}`)
    else if (t.id === 'excel-font-size') applyExcelExtra(`excel-set-size:${t.value}`)
    else if (t.id === 'excel-number-format') applyExcelExtra(`excel-numfmt:${t.value}`)
  })
  excelApp?.querySelector('#excel-zoom-slider')?.addEventListener('input', (e) => {
    const pct = Number(e.target.value) || 100
    if (grid) grid.style.zoom = String(pct / 100)
    const z = document.querySelector('#excel-zoom-status')
    if (z) z.textContent = `${pct}%`
  })
}

/* ============================================================================
   STRICT MULTI-REQUIREMENT DOM & STATE EVALUATOR
   Every single task/requirement inside a question MUST be satisfied on the
   exact target paragraph/table/cell, and no unrequested wrong formatting
   may be applied. Evaluation & marks are shown ONLY at the end on Submit!
   ============================================================================ */
function efficiencyGetExcelRangeCells(rangeStr) {
  const grid = document.querySelector('#excel-grid')
  if (!grid || !rangeStr) return []
  const parts = String(rangeStr).split(':')
  const a = efficiencyParseRef(parts[0])
  const b = efficiencyParseRef(parts[1] || parts[0])
  if (!a || !b) return []
  const out = []
  for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
      const ref = efficiencyCellRef(r, c)
      const el = grid.querySelector(`.excel-cell[data-cell="${ref}"]`)
      if (el) out.push(el)
    }
  }
  return out
}

function efficiencyEvaluateQuestionDetailed(q, qNum, allQuestions = []) {
  const instr = String(q.instruction || (Array.isArray(q.tasks) ? q.tasks.join(' ') : '') || q.title || '')
  const lower = instr.toLowerCase()
  const checks = []

  if (efficiencyState.module === 'word') {
    const editor = document.querySelector('#word-document')
    const partName = q.target_part || 'document'
    const targetEl = partName === 'document'
      ? editor
      : (editor?.querySelector(`#word-part-${partName}`) || editor?.querySelector(`[data-doc-part="${partName}"]`))

    // 1. Bold check
    if (/\bbold\b|बोल्ड/i.test(instr)) {
      checks.push({
        label: 'Bold (बोल्ड)',
        passed: targetEl?.dataset?.fmtBold === 'true'
      })
    }
    // 2. Italic check
    if (/\bitalic\b|इटैलिक|तिरछा/i.test(instr)) {
      checks.push({
        label: 'Italic (इटैलिक)',
        passed: targetEl?.dataset?.fmtItalic === 'true'
      })
    }
    // 3. Underline check
    if (/\bunderlin\w*|अंडरलाइन|रेखांकित/i.test(instr)) {
      checks.push({
        label: 'Underline (अंडरलाइन)',
        passed: targetEl?.dataset?.fmtUnderline === 'true'
      })
    }
    // 4. Strikethrough check
    if (/\bstrike\w*|स्ट्राइकथ्रू/i.test(instr)) {
      checks.push({
        label: 'Strikethrough',
        passed: targetEl?.dataset?.fmtStrike === 'true'
      })
    }
    // 5. Subscript / Superscript
    if (/\bsubscript\b|सबस्क्रिप्ट/i.test(instr)) {
      checks.push({ label: 'Subscript', passed: targetEl?.dataset?.fmtSubscript === 'true' })
    }
    if (/\bsuperscript\b|सुपरस्क्रिप्ट/i.test(instr)) {
      checks.push({ label: 'Superscript', passed: targetEl?.dataset?.fmtSuperscript === 'true' })
    }
    // 6. Alignment checks
    if (/\bcenter\b|सेंटर|मध्य\s*संरेखित|बीच\s*में/i.test(instr)) {
      checks.push({
        label: 'Center Align (सेंटर संरेखण)',
        passed: targetEl?.dataset?.fmtAlign === 'center'
      })
    } else if (/\bright\s*align|align\s*right|दाएँ\s*संरेखित|दाईं\s*ओर/i.test(instr)) {
      checks.push({
        label: 'Right Align (दाएँ संरेखण)',
        passed: targetEl?.dataset?.fmtAlign === 'right'
      })
    } else if (/\bjustif\w*|जस्टिफाई/i.test(instr)) {
      checks.push({
        label: 'Justify Align (जस्टिफाई)',
        passed: targetEl?.dataset?.fmtAlign === 'justify'
      })
    } else if (/\bleft\s*align|align\s*left|बाएँ\s*संरेखित/i.test(instr)) {
      checks.push({
        label: 'Left Align (बाएँ संरेखण)',
        passed: targetEl?.dataset?.fmtAlign === 'left'
      })
    }
    // 7. Font Size check (only when font size is mentioned, not space after/before!)
    const sizeMatch = instr.match(/(?:font\s*size|फ़ॉन्ट\s*(?:का\s*)?आकार|आकार)[^0-9]*(\d+(?:\.\d+)?)\s*(?:pt|पॉइंट)?/i)
    if (sizeMatch) {
      const expSize = sizeMatch[1]
      checks.push({
        label: `Font Size ${expSize} pt`,
        passed: String(targetEl?.dataset?.fmtSize || '') === String(expSize)
      })
    }
    // 8. Font Family check
    const knownFonts = ['Calibri', 'Arial', 'Times New Roman', 'Cambria', 'Georgia', 'Verdana', 'Tahoma', 'Courier New', 'Garamond', 'Kruti Dev 010', 'DevLys 010', 'Mangal', 'Kokila', 'Aparajita']
    for (const fName of knownFonts) {
      if (new RegExp(`['"‘’]?\\b${fName.replace(/\s+/g, '\\s+')}\\b['"‘’]?`, 'i').test(instr)) {
        checks.push({
          label: `Font Family '${fName}'`,
          passed: String(targetEl?.dataset?.fmtFont || '').toLowerCase() === fName.toLowerCase()
        })
        break
      }
    }
    // 9. Text Highlight vs Shading
    if (/\bhighlight\b|हाइलाइट/i.test(instr)) {
      checks.push({
        label: 'Text Highlight Color',
        passed: targetEl?.dataset?.fmtHighlight === 'true'
      })
    }
    if (/\bshad(?:ing|e)\b|शेडिंग|पृष्ठभूमि/i.test(instr)) {
      checks.push({
        label: 'Shading (पृष्ठभूमि रंग)',
        passed: targetEl?.dataset?.fmtShading === 'true' || targetEl?.dataset?.fmtHighlight === 'true'
      })
    }
    // 10. Line Spacing
    if (/line\s*spacing|लाइन\s*स्पेसिंग/i.test(instr)) {
      const spMatch = instr.match(/(?:line\s*spacing|लाइन\s*स्पेसिंग)[^0-9]*(\d+(?:\.\d+)?)/i)
      const expSp = spMatch ? parseFloat(spMatch[1]) : null
      const actualSp = parseFloat(targetEl?.dataset?.fmtLineSpacing || '0')
      checks.push({
        label: `Line Spacing ${expSp || ''}`.trim(),
        passed: expSp ? Math.abs(actualSp - expSp) < 0.05 : actualSp > 0
      })
    }
    // 11. Indentation (First-Line vs Hanging)
    if (/first[-\s]*line\s*indent|फर्स्ट[-\s]*लाइन\s*इंडेंट|प्रथम\s*पंक्ति\s*इंडेंट/i.test(instr)) {
      checks.push({
        label: 'First-Line Indent',
        passed: targetEl?.dataset?.fmtIndentType === 'first-line'
      })
    } else if (/hanging\s*indent|हैंगिंग\s*इंडेंट/i.test(instr)) {
      checks.push({
        label: 'Hanging Indent',
        passed: targetEl?.dataset?.fmtIndentType === 'hanging'
      })
    } else if (/\bindent\b|इंडेंट/i.test(instr)) {
      checks.push({
        label: 'Paragraph Indent',
        passed: Boolean(targetEl?.dataset?.fmtIndentType && targetEl?.dataset?.fmtIndentType !== 'none')
      })
    }
    // 12. Space After / Before Paragraph
    if (/space\s*after|spacing\s*after|के\s*बाद.*space/i.test(instr)) {
      checks.push({
        label: 'Space After Paragraph',
        passed: parseFloat(targetEl?.dataset?.fmtSpaceAfter || '0') > 0
      })
    }
    if (/space\s*before|spacing\s*before|से\s*पहले.*space/i.test(instr)) {
      checks.push({
        label: 'Space Before Paragraph',
        passed: parseFloat(targetEl?.dataset?.fmtSpaceBefore || '0') > 0
      })
    }
    // 13. Borders
    if (/page\s*border|पेज\s*बॉर्डर/i.test(instr)) {
      checks.push({
        label: 'Page Border',
        passed: editor?.dataset?.fmtPageBorder === 'true'
      })
    } else if (/\bborder\w*|बॉर्डर/i.test(instr)) {
      checks.push({
        label: 'Outside / Paragraph Border',
        passed: targetEl?.dataset?.fmtBorder === 'true'
      })
    }
    // 14. Bulleted / Numbered List
    if (/\bbullet\w*|बुलेट/i.test(instr)) {
      checks.push({
        label: 'Bulleted List (•)',
        passed: targetEl?.dataset?.fmtBullets === 'true'
      })
    }
    if (/\bnumber(?:ed|ing)\s*list|क्रमांकित\s*सूची/i.test(instr)) {
      checks.push({
        label: 'Numbered List',
        passed: targetEl?.dataset?.fmtNumbering === 'true'
      })
    }
    // 15. Change Case
    if (/\buppercase\b|अपरकेस|बड़े\s*अक्षरों/i.test(instr)) {
      checks.push({ label: 'UPPERCASE', passed: targetEl?.dataset?.fmtCase === 'upper' })
    } else if (/\blowercase\b|लोअरकेस|छोटे\s*अक्षरों/i.test(instr)) {
      checks.push({ label: 'lowercase', passed: targetEl?.dataset?.fmtCase === 'lower' })
    } else if (/\bcapitalize\s*each\s*word\b/i.test(instr)) {
      checks.push({ label: 'Capitalize Each Word', passed: targetEl?.dataset?.fmtCase === 'capitalize' })
    } else if (/\btoggle\s*case\b/i.test(instr)) {
      checks.push({ label: 'tOGGLE cASE', passed: targetEl?.dataset?.fmtCase === 'toggle' })
    }
    // 16. Find & Replace
    if (/find\s*(?:&|and)?\s*replace|replace\s*all|बदलें/i.test(instr)) {
      checks.push({
        label: 'Find & Replace Executed',
        passed: editor?.dataset?.fmtFindReplace === 'true'
      })
    }
    // 17. Page Margins & Orientation
    if (/\bmargin\w*|मार्जिन/i.test(instr)) {
      let expMargin = ''
      if (/moderate/i.test(instr)) expMargin = 'moderate'
      else if (/narrow/i.test(instr)) expMargin = 'narrow'
      else if (/wide/i.test(instr)) expMargin = 'wide'
      else if (/normal/i.test(instr)) expMargin = 'normal'
      checks.push({
        label: `Page Margins (${expMargin || 'Set'})`,
        passed: expMargin ? editor?.dataset?.fmtMargins === expMargin : Boolean(editor?.dataset?.fmtMargins)
      })
    }
    if (/\borientation\b|\blandscape\b|\bportrait\b|ओरिएंटेशन/i.test(instr)) {
      const expOrient = /portrait|पोर्ट्रेट/i.test(instr) ? 'portrait' : 'landscape'
      checks.push({
        label: `Page Orientation (${expOrient})`,
        passed: editor?.dataset?.fmtOrientation === expOrient
      })
    }
    // 18. Header, Footer, Page Number, Watermark, Drop Cap
    if (/\bheader\b|हेडर/i.test(instr) && !/table\s*header|column\s*header|हेडर\s*पंक्ति|सारणी/i.test(instr)) {
      checks.push({
        label: 'Document Header',
        passed: Boolean(editor?.querySelector('.word-inserted-header'))
      })
    }
    if (/\bfooter\b|फुटर/i.test(instr)) {
      checks.push({
        label: 'Document Footer',
        passed: Boolean(editor?.querySelector('.word-inserted-footer'))
      })
    }
    if (/page\s*number|पृष्ठ\s*संख्या/i.test(instr)) {
      checks.push({
        label: 'Page Number',
        passed: Boolean(editor?.querySelector('.word-page-number'))
      })
    }
    if (/\bwatermark\b|वाटरमार्क/i.test(instr)) {
      checks.push({
        label: 'Watermark',
        passed: Boolean(editor?.querySelector('.word-watermark-layer'))
      })
    }
    if (/drop\s*cap|ड्रॉप\s*कैप/i.test(instr)) {
      checks.push({
        label: 'Drop Cap',
        passed: editor?.dataset?.fmtDropCap === 'true'
      })
    }

    // Check against unrequested extra formatting on this target paragraph
    if (targetEl && partName !== 'document') {
      const samePartText = allQuestions
        .filter(item => (item.target_part || 'document') === partName)
        .map(item => item.instruction || item.title || '')
        .join(' ')
      const boldAllowed = /\bbold\b|बोल्ड/i.test(samePartText)
      const italicAllowed = /\bitalic\b|इटैलिक|तिरछा/i.test(samePartText)
      const underlineAllowed = /\bunderlin\w*|अंडरलाइन|रेखांकित/i.test(samePartText)
      const strikeAllowed = /\bstrike\w*|स्ट्राइकथ्रू/i.test(samePartText)
      if (!boldAllowed && targetEl.dataset.fmtBold === 'true') {
        checks.push({ label: 'No Unrequested Bold (अनावश्यक बोल्ड निषेध)', passed: false })
      }
      if (!italicAllowed && targetEl.dataset.fmtItalic === 'true') {
        checks.push({ label: 'No Unrequested Italic (अनावश्यक इटैलिक निषेध)', passed: false })
      }
      if (!underlineAllowed && targetEl.dataset.fmtUnderline === 'true') {
        checks.push({ label: 'No Unrequested Underline (अनावश्यक अंडरलाइन निषेध)', passed: false })
      }
      if (!strikeAllowed && targetEl.dataset.fmtStrike === 'true') {
        checks.push({ label: 'No Unrequested Strikethrough', passed: false })
      }
    }
  } else {
    // EXCEL MODULE STRICT MULTI-REQUIREMENT VALIDATION
    const grid = document.querySelector('#excel-grid')
    const rangeStr = q.target_cells || 'A2'
    const rangeCells = efficiencyGetExcelRangeCells(rangeStr)
    const firstRef = String(rangeStr).split(':')[0].trim().toUpperCase()
    const firstCell = grid?.querySelector(`.excel-cell[data-cell="${firstRef}"]`) || rangeCells[0]
    const targetHasFmt = (key, expectedVal) => {
      if (firstCell?.dataset?.[key] === expectedVal) return true
      return rangeCells.length > 0 && rangeCells.some(c => c.dataset?.[key] === expectedVal)
    }

    // 1. Formula Check
    if (q.expected_formula || /=sum|=average|=max|=min|=count|=if|\bformula\b|फॉर्मूला/i.test(instr)) {
      const actualRaw = String(efficiencyState.excelFormulas?.[firstRef] || '').replace(/\s+/g, '').toUpperCase()
      const expRaw = String(q.expected_formula || '').replace(/\s+/g, '').toUpperCase()
      let formulaOk = false
      if (actualRaw.startsWith('=')) {
        if (expRaw && actualRaw === expRaw) {
          formulaOk = true
        } else if (expRaw) {
          const actualVal = efficiencyEvaluateFormula(actualRaw)
          const expVal = efficiencyEvaluateFormula(expRaw)
          const fnPrefix = expRaw.match(/^=([A-Z]+)/)?.[1]
          const hasMatchingFn = !fnPrefix || actualRaw.startsWith(`=${fnPrefix}(`)
          if (actualVal !== '#VALUE!' && String(actualVal) === String(expVal) && hasMatchingFn) {
            formulaOk = true
          }
        }
      }
      checks.push({
        label: `Formula ${q.expected_formula || ''} in ${firstRef}`.trim(),
        passed: formulaOk
      })
    }
    // 2. Bold
    if (/\bbold\b|बोल्ड/i.test(instr)) {
      checks.push({ label: `Bold on ${rangeStr}`, passed: targetHasFmt('fmtBold', 'true') })
    }
    // 3. Italic
    if (/\bitalic\b|इटैलिक/i.test(instr)) {
      checks.push({ label: `Italic on ${rangeStr}`, passed: targetHasFmt('fmtItalic', 'true') })
    }
    // 4. Underline
    if (/\bunderlin\w*|अंडरलाइन/i.test(instr)) {
      checks.push({ label: `Underline on ${rangeStr}`, passed: targetHasFmt('fmtUnderline', 'true') })
    }
    // 5. Fill Color
    if ((/fill\s*color|fill|shading|रंग\s*भरें|शेडिंग/i.test(instr)) && !(/conditional\s*formatting|कंडीशनल/i.test(instr))) {
      checks.push({ label: `Fill Color on ${rangeStr}`, passed: targetHasFmt('fmtFill', 'true') })
    }
    // 6. Merge & Center vs Center Align
    if (/merge\s*(?:&|and)?\s*center|मर्ज/i.test(instr)) {
      checks.push({ label: `Merge & Center on ${rangeStr}`, passed: targetHasFmt('fmtMerge', 'true') })
    } else if (/\bcenter\b|सेंटर/i.test(instr)) {
      checks.push({ label: `Center Align on ${rangeStr}`, passed: targetHasFmt('fmtAlign', 'center') })
    } else if (/\bright\s*align|align\s*right|दाएँ/i.test(instr)) {
      checks.push({ label: `Right Align on ${rangeStr}`, passed: targetHasFmt('fmtAlign', 'right') })
    } else if (/\bleft\s*align|align\s*left|बाएँ/i.test(instr)) {
      checks.push({ label: `Left Align on ${rangeStr}`, passed: targetHasFmt('fmtAlign', 'left') })
    }
    // 7. Borders
    if (/\bborder\w*|बॉर्डर/i.test(instr)) {
      checks.push({ label: `Borders on ${rangeStr}`, passed: targetHasFmt('fmtBorder', 'true') })
    }
    // 8. Currency / Number Format
    if (/currency|₹|\$|करेंसी/i.test(instr)) {
      checks.push({ label: `Currency Format (₹) on ${rangeStr}`, passed: targetHasFmt('fmtNum', 'currency') })
    }
    // 9. Conditional Formatting
    if (/conditional\s*formatting|कंडीशनल\s*फॉर्मेटिंग/i.test(instr)) {
      checks.push({ label: `Conditional Formatting on ${rangeStr}`, passed: targetHasFmt('fmtCond', 'true') || grid?.dataset?.fmtCond === 'true' })
    }
    // 10. Wrap Text
    if (/wrap\s*text|रैप\s*टेक्स्ट/i.test(instr)) {
      checks.push({ label: `Wrap Text on ${rangeStr}`, passed: targetHasFmt('fmtWrap', 'true') })
    }
    // 11. Freeze Panes
    if (/freeze\s*panes|फ्रीज\s*पेन्स/i.test(instr)) {
      checks.push({ label: 'Freeze Panes (View Tab)', passed: grid?.dataset?.fmtFreezePanes === 'true' })
    }
  }

  const solved = checks.length > 0 && checks.every(c => c.passed)
  return { solved, checks }
}

function efficiencyEvaluateQuestionSolved(q, qNum) {
  const questions = Array.isArray(efficiencyState.fileData?.questions) ? efficiencyState.fileData.questions : []
  return efficiencyEvaluateQuestionDetailed(q, qNum, questions).solved
}

// During the active test, efficiencyUpdateScore is a no-op so no live marks or green status appear on screen!
function efficiencyUpdateScore() {
  // All evaluation and marks calculation happen strictly on Submit Test
}

function efficiencySubmit(page, tasks, question, timedOut = false) {
  if (document.querySelector('#efficiency-result-modal')) return
  o19CloseMenu()
  if (efficiencyState.timer) { clearInterval(efficiencyState.timer); efficiencyState.timer = null }
  const isWord = page === 'word-efficiency'
  const lang = efficiencyState.language || 'en'
  const questions = Array.isArray(efficiencyState.fileData?.questions) && efficiencyState.fileData.questions.length ? efficiencyState.fileData.questions : [question]
  const total50 = 50

  // Check RSSB LDC Rule: if default paragraph/table text was deleted or arbitrarily altered
  const corruptedParts = new Set()
  if (isWord && efficiencyState.initialWordParts) {
    Object.entries(efficiencyState.initialWordParts).forEach(([partKey, initialTxt]) => {
      const currentEl = document.querySelector(`#word-document [data-doc-part="${partKey}"]`)
      const currentTxt = (currentEl?.textContent || '').trim()
      if (!currentTxt || currentTxt.length < Math.floor(initialTxt.length * 0.45)) {
        corruptedParts.add(partKey)
      }
    })
  }

  let adjustedRawPoints50 = 0
  const questionBreakdown = questions.map((q, i) => {
    const qNum = i + 1
    const qMax50 = Number(q.marks) || (qNum <= 3 || qNum >= 14 ? 3.0 : 3.5)
    const qMax25 = +(qMax50 * 0.5).toFixed(2)
    const evalDetail = efficiencyEvaluateQuestionDetailed(q, qNum, questions)
    const partDeletedPenalty = Boolean(isWord && q.target_part && corruptedParts.has(q.target_part))
    const isOk = evalDetail.solved && !partDeletedPenalty
    const earned50 = isOk ? qMax50 : 0
    const earned25 = isOk ? qMax25 : 0
    adjustedRawPoints50 = +(adjustedRawPoints50 + earned50).toFixed(2)
    return {
      qNum,
      id: q.id || `Q${qNum}`,
      title: q.instruction || (Array.isArray(q.tasks) ? q.tasks[0] : '') || q.title || `Question ${qNum}`,
      difficulty: q.difficulty || (qNum <= 3 ? 'Easy' : qNum <= 10 ? 'Medium' : 'Hard'),
      targetPart: q.target_part || q.target_cells || 'Document',
      expectedAction: q.expected_action || '',
      expectedFormula: q.expected_formula || '',
      maxMarks50: qMax50,
      maxMarks25: qMax25,
      earnedMarks50: earned50,
      earnedMarks25: earned25,
      solved: isOk,
      checks: evalDetail.checks,
      partDeletedPenalty,
      solutionSteps: Array.isArray(q.solution_steps) && q.solution_steps.length ? q.solution_steps : ['1. Select the target text or cell.', '2. Go to the appropriate Ribbon Tab and Group.', '3. Click the required command or submenu option.']
    }
  })

  const earned50 = Math.min(total50, Math.max(0, +(adjustedRawPoints50 || 0).toFixed(1)))
  const marksOutOf25 = Math.min(25, Math.max(0, +(earned50 * 0.5).toFixed(2)))
  const percent = Math.round((marksOutOf25 / 25) * 100)
  const duration = Math.max(1, Math.round((Date.now() - (efficiencyState.startedAt || Date.now())) / 1000))
  const fileIdStr = efficiencyFileId(efficiencyState.module, lang, efficiencyState.fileNo || 1)
  const solvedCount = questionBreakdown.filter(item => item.solved).length
  const wrongCount = questions.length - solvedCount

  if (efficiencyState.examHallMode && typeof efficiencyState.examHallCallback === 'function') {
    const editorEl = isWord ? document.querySelector('#word-document') : document.querySelector('#excel-grid')
    const snapshotHtml = editorEl ? editorEl.outerHTML : ''
    const cb = efficiencyState.examHallCallback
    efficiencyState.examHallMode = false
    efficiencyState.examHallCallback = null
    efficiencyState.examHallAbort = null
    cb({
      module: efficiencyState.module,
      language: lang,
      fileNo: efficiencyState.fileNo || 1,
      fileId: fileIdStr,
      rawEarned50: earned50,
      marksOutOf25,
      maxMarks25: 25,
      qualifyingMarks: 9.0,
      scStQualifyingMarks: 7.75,
      qualified: marksOutOf25 >= 9.0,
      scStQualified: marksOutOf25 >= 7.75,
      percent,
      solvedCount,
      wrongCount,
      totalQuestions: questions.length,
      durationSeconds: duration,
      timedOut,
      blockedShortcutAttempts: efficiencyState.blockedShortcutAttempts || 0,
      corruptedPartsCount: corruptedParts.size,
      snapshotHtml,
      questionBreakdown
    })
    return
  }

  const overlay = document.createElement('div')
  overlay.id = 'efficiency-result-modal'
  overlay.className = 'efficiency-result-overlay'
  overlay.innerHTML = `
    <section class="efficiency-result-dialog" role="dialog" aria-modal="true" style="max-width:880px;width:95vw;">
      <div class="efficiency-result-brand">
        <span>${isWord ? 'W' : 'X'}</span>
        <div>
          <small>RAJASTHAN RSSB LDC OFFICIAL 25-MARK EVALUATION &amp; STEP-BY-STEP SOLUTIONS</small>
          <h2 id="efficiency-result-title">${timedOut ? 'Time Up (10:00) — Final Result & Solutions' : 'Efficiency Test Final Result & Step-by-Step Solutions'}</h2>
          <p>Test #${efficiencyState.fileNo || 1} (${efficiencyEscape(fileIdStr)}) · Fully Solved: ${solvedCount}/15 · Incomplete/Missed: ${wrongCount}/15 · Qualifying: 9.00 / 25</p>
        </div>
        <button type="button" id="efficiency-result-close">×</button>
      </div>
      <div class="efficiency-result-score">
        <div>
          <small>Marks Obtained (RSSB LDC 25-Mark Scale)</small>
          <strong>${marksOutOf25.toFixed(2)} <span>/ 25.00</span></strong>
          <small style="display:block;margin-top:4px;font-weight:700;color:${marksOutOf25 >= 9 ? '#15803d' : '#b91c1c'};">
            ${marksOutOf25 >= 9 ? '✓ QUALIFIED (उत्तीर्ण ≥ 9.00)' : '✗ NOT QUALIFIED (अनुत्तीर्ण < 9.00)'}
          </small>
        </div>
        <div class="efficiency-score-ring" style="--eff-score:${percent}%"><strong>${percent}%</strong><small>Score</small></div>
      </div>
      <div class="efficiency-result-metrics">
        <article><small>Test ID</small><strong>Test #${String(efficiencyState.fileNo || 1).padStart(2, '0')}</strong></article>
        <article><small>Fully Correct Tasks</small><strong style="color:#15803d;">${solvedCount} / 15</strong></article>
        <article><small>Missed / Partial Tasks</small><strong style="color:#b91c1c;">${wrongCount} / 15</strong></article>
        <article><small>Time Taken</small><strong>${efficiencyFormatTime(duration)} / 10:00</strong></article>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:8px;">
        <h3 style="margin:0;">Task-by-Task Verification &amp; Step-by-Step Solution Guide</h3>
        <div class="o19-result-filter-bar">
          <button type="button" class="o19-res-filter-btn active" data-sol-filter="all">All (15)</button>
          <button type="button" class="o19-res-filter-btn" data-sol-filter="wrong">✗ Missed / Incomplete (${wrongCount})</button>
          <button type="button" class="o19-res-filter-btn" data-sol-filter="correct">✓ Correct (${solvedCount})</button>
        </div>
      </div>
      <div class="o19-solution-list" id="o19-solution-list">
        ${questionBreakdown.map((item) => {
          const checksHtml = (item.checks || []).map(chk =>
            `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${chk.passed ? '#dcfce7' : '#fee2e2'};color:${chk.passed ? '#15803d' : '#b91c1c'};">${chk.passed ? '✓' : '✗'} ${efficiencyEscape(chk.label)}</span>`
          ).join(' ')
          return `
            <div class="o19-solution-card ${item.solved ? 'is-correct' : 'is-wrong'}" data-sol-state="${item.solved ? 'correct' : 'wrong'}">
              <div class="o19-sol-head">
                <span class="o19-sol-title">Q${item.qNum}. ${efficiencyEscape(item.title)} <small style="font-weight:700;color:#64748b;">[${item.maxMarks25} Marks]</small></span>
                <span class="o19-sol-status ${item.solved ? 'pass' : 'fail'}">${item.solved ? `✓ ${item.earnedMarks25} / ${item.maxMarks25} Marks` : `✗ 0 / ${item.maxMarks25} Marks`}</span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                ${checksHtml || '<span style="font-size:11px;color:#64748b;">Task verification completed</span>'}
              </div>
              <div class="o19-sol-steps-box">
                <span class="o19-sol-steps-title">💡 ${lang === 'hi' ? 'स्टेप-बाय-स्टेप समाधान (किस Tab -> Group -> Menu/Submenu में जाकर क्या करें):' : 'Step-by-Step Solution (Exact Tab -> Group -> Menu / Submenu Procedure):'}</span>
                <div class="o19-sol-steps-ol">${item.solutionSteps.map(st => `<div style="margin-bottom:4px;">${efficiencyEscape(st)}</div>`).join('')}</div>
              </div>
            </div>
          `
        }).join('')}
      </div>
      <div class="efficiency-result-actions">
        <button type="button" class="secondary-button" id="efficiency-result-print">Print / Save PDF</button>
        <button type="button" class="secondary-button" id="efficiency-result-close-review">Continue Practising in Editor</button>
        <button type="button" class="secondary-button" id="efficiency-result-retry">Reset &amp; Retry Test</button>
        <button type="button" class="primary-button" id="efficiency-result-home">Back to 40 Tests</button>
      </div>
    </section>
  `
  document.body.append(overlay)
  overlay.querySelectorAll('[data-sol-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('[data-sol-filter]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const mode = btn.dataset.solFilter
      overlay.querySelectorAll('.o19-solution-card').forEach(card => {
        card.style.display = (mode === 'all' || card.dataset.solState === mode) ? '' : 'none'
      })
    })
  })
  overlay.querySelector('#efficiency-result-close')?.addEventListener('click', () => overlay.remove())
  overlay.querySelector('#efficiency-result-close-review')?.addEventListener('click', () => overlay.remove())
  overlay.querySelector('#efficiency-result-home')?.addEventListener('click', () => { overlay.remove(); efficiencyShowExerciseList(page, efficiencyState.language) })
  overlay.querySelector('#efficiency-result-retry')?.addEventListener('click', () => { overlay.remove(); efficiencyRender(page, questions[0], efficiencyState.language, 1, false) })
  overlay.querySelector('#efficiency-result-print')?.addEventListener('click', () => window.print())
}

/* ============================================================================
   RSSB LDC PHASE-II EXAM HALL SIMULATOR (80 FULL MOCK EXAMS)
   Strictly aligned with Rajasthan Staff Selection Board (RSSB), Jaipur
   Clerk Grade-II / Junior Assistant Phase-II Official Notification (12-12-2024)
   ============================================================================ */

const RSSB_EXAM_STORAGE_KEY = 'ag-rssb-ldc-exam-records'

const RSSB_DEVLYS_NORMAL_MAP = {
  '`': 'ृ', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९', '0': '०', '-': '.', '=': 'त्र',
  q: 'ु', w: 'ू', e: 'म', r: 'त', t: 'ज', y: 'ल', u: 'न', i: 'प', o: 'व', p: 'च', '[': 'ख्', ']': ',', '\\': '?',
  a: 'ं', s: 'े', d: 'क', f: 'ि', g: 'ह', h: 'ी', j: 'र', k: 'ा', l: 'स', ';': 'य', "'": 'श',
  z: '्र', x: 'ग', c: 'ब', v: 'अ', b: 'इ', n: 'द', m: 'उ', ',': 'ए', '.': 'ण', '/': 'ध्'
}

const RSSB_DEVLYS_SHIFT_MAP = {
  '~': '्', '!': '!', '@': '/', '#': 'रु', '$': '+', '%': ':', '^': "'", '&': '-', '*': '"', '(': ';', ')': 'द्ध', '_': 'ऋ', '+': '.',
  Q: 'फ', W: 'ँ', E: 'म्', R: 'त्', T: 'ज्', Y: 'ल्', U: 'न्', I: 'प्', O: 'व्', P: 'च्', '{': 'क्ष्', '}': 'द्व', '|': 'द्य',
  A: '।', S: 'ै', D: 'क्', F: 'थ्', G: 'ळ', H: 'भ्', J: 'श्र', K: 'ज्ञ', L: 'स्', ':': 'रू', '"': 'ष्',
  Z: 'र्', X: 'ग्', C: 'ठ', V: 'ट', B: 'ठ', N: 'छ', M: 'ड', '<': 'ढ', '>': 'झ', '?': 'घ्'
}

const RSSB_MATRA_KEYS = new Set(['a', 's', 'f', 'h', 'q', 'w', 'k', '`', 'S', 'W'])
const RSSB_HALF_TO_FULL_K_KEYS = new Set(['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'D', 'F', 'H', 'L', '"', 'X', '{', '?'])

const rssbExamState = {
  filter: 'all',
  activeTestNo: null,
  stage: 'hub', // 'hub' | 'login' | 'keyboard-check' | 'typing-hindi' | 'break-1' | 'typing-english' | 'break-2' | 'efficiency-1' | 'break-3' | 'efficiency-2' | 'final-confirm' | 'final-result'
  timer: null,
  secondsLeft: 0,
  stageStartedAt: 0,
  kbCheckLang: 'en',
  hindiKeymapEnabled: true,
  hindiPassage: '',
  englishPassage: '',
  typingBuffer: '',
  typingKeystrokes: 0,
  blockedBackspaces: 0,
  blockedShortcuts: 0,
  duplicateMatraErrors: 0,
  improperCharErrors: 0,
  lastPhysicalKey: '',
  lastKeystrokeAt: null,
  pauseCount: 0,
  longestPauseMs: 0,
  speedSamples: [],
  paperResults: {
    hindiTyping: null,
    englishTyping: null,
    efficiency1: null,
    efficiency2: null
  }
}

function stopRssbExamTimer() {
  if (rssbExamState.timer) {
    clearInterval(rssbExamState.timer)
    rssbExamState.timer = null
  }
}

function getRssbExamRecords() {
  try {
    const raw = localStorage.getItem(RSSB_EXAM_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function saveRssbExamRecord(testNo, record) {
  try {
    const all = getRssbExamRecords()
    const prev = all[String(testNo)]
    const attempts = (Number(prev?.attempts) || 0) + 1
    const bestScore = Math.max(Number(prev?.bestScore) || 0, Number(record.totalMarksOutOf100) || 0)
    all[String(testNo)] = {
      ...record,
      testNo: Number(testNo),
      attempts,
      bestScore
    }
    localStorage.setItem(RSSB_EXAM_STORAGE_KEY, JSON.stringify(all))
  } catch (err) {
    console.warn('Could not save RSSB LDC exam record:', err)
  }
}

/**
 * Maps each of the 80 RSSB LDC Mock Tests in reverse order from the exercise banks:
 * - Typing: 300 down to 221 (301 - testNo) for both Hindi and English.
 * - Efficiency Set A (Tests 1 to 40):
 *     Paper 3: MS Word Hindi #40 down to #1 (41 - testNo)
 *     Paper 4: MS Excel English #40 down to #1 (41 - testNo)
 * - Efficiency Set B (Tests 41 to 80):
 *     Paper 3: MS Word English #40 down to #1 (81 - testNo)
 *     Paper 4: MS Excel Hindi #40 down to #1 (81 - testNo)
 */
function getRssbMockExamSpec(testNo) {
  const n = Math.max(1, Math.min(80, Number(testNo) || 1))
  const typingExNo = 301 - n // 300 down to 221
  const isSetA = n <= 40
  const effFileNo = isSetA ? (41 - n) : (81 - n) // 40 down to 1 in each 40-test set

  const eff1Module = 'word'
  const eff1Lang = isSetA ? 'hi' : 'en'
  const eff1FileId = `WORD_${eff1Lang.toUpperCase()}_${String(effFileNo).padStart(3, '0')}`
  const eff1Title = isSetA
    ? `हिन्दी दक्षता परीक्षण (MS Word Hindi · Ex #${String(effFileNo).padStart(2, '0')})`
    : `अंग्रेजी दक्षता परीक्षण (MS Word English · Ex #${String(effFileNo).padStart(2, '0')})`
  const eff1ShortTitle = isSetA ? `MS Word Hindi #${String(effFileNo).padStart(2, '0')}` : `MS Word English #${String(effFileNo).padStart(2, '0')}`

  const eff2Module = 'excel'
  const eff2Lang = isSetA ? 'en' : 'hi'
  const eff2FileId = `EXCEL_${eff2Lang.toUpperCase()}_${String(effFileNo).padStart(3, '0')}`
  const eff2Title = isSetA
    ? `अंग्रेजी दक्षता परीक्षण (MS Excel English · Ex #${String(effFileNo).padStart(2, '0')})`
    : `हिन्दी दक्षता परीक्षण (MS Excel Hindi · Ex #${String(effFileNo).padStart(2, '0')})`
  const eff2ShortTitle = isSetA ? `MS Excel English #${String(effFileNo).padStart(2, '0')}` : `MS Excel Hindi #${String(effFileNo).padStart(2, '0')}`

  return {
    testNo: n,
    setCode: isSetA ? 'SET-A' : 'SET-B',
    setTitle: isSetA ? 'Set A (Tests 1–40: Word Hindi 40→1 + Excel English 40→1)' : 'Set B (Tests 41–80: Word English 40→1 + Excel Hindi 40→1)',
    typingExNo,
    hindiTypingId: `hi-${String(typingExNo).padStart(3, '0')}`,
    englishTypingId: `en-${String(typingExNo).padStart(3, '0')}`,
    effFileNo,
    eff1Module,
    eff1Lang,
    eff1FileId,
    eff1Title,
    eff1ShortTitle,
    eff2Module,
    eff2Lang,
    eff2FileId,
    eff2Title,
    eff2ShortTitle
  }
}

const RSSB_FALLBACK_HINDI_SENTENCES = [
  "राजस्थान कर्मचारी चयन बोर्ड जयपुर द्वारा आयोजित लिपिक ग्रेड द्वितीय एवं कनिष्ठ सहायक संयुक्त सीधी भर्ती परीक्षा के द्वितीय चरण में हिन्दी एवं अंग्रेजी टंकण गति तथा दक्षता परीक्षण का विशेष महत्व है।",
  "अभ्यर्थियों को निर्धारित दस मिनट की समयावधि में चार सौ शब्दों के हिन्दी परिच्छेद को पूर्ण शुद्धता एवं एकाग्रता के साथ टंकित करना होता है।",
  "प्रत्येक राजकीय कार्यालय में पत्रावली संधारण, आदेश प्रारूपण, दैनिक जावक पंजिका एवं विभागीय प्रतिवेदन तैयार करने हेतु कुशल टंकण कौशल अत्यंत आवश्यक है।",
  "परीक्षा के दौरान किसी भी प्रकार की शॉर्टकट कुंजी, बैकस्पेस अथवा टेक्स्ट हाइलाइट का सहारा लिए बिना निरंतर लय में टाइपिंग करना सफलता की कुंजी है।",
  "रानाडे की पत्नी की मृत्यु को एक महीना भी नहीं हुआ था कि एक ग्यारह वर्ष की कन्या से बत्तीस वर्ष के रानाडे का विवाह पूरी सनातन विधि से हो गया।",
  "इस परीक्षा में जिस आदर्श के लिए रानाडे लड़ रहे थे और जिसके लिए उन्होंने इतनी कठिनाइयों का सामना किया था, उस आदर्श के यह विवाह सर्वथा प्रतिकूल था।",
  "गोविन्द राव रानाडे ने जिस आशा से अपने बेटे को अंग्रेजी स्कूल में पढ़ाया और फिर उच्च शिक्षा के लिए बम्बई भेजा, वह अब अच्छी तरह पूरी हो गई थी।",
  "प्रशासनिक सुधार एवं राजभाषा विभाग के निर्देशानुसार समस्त अधीनस्थ कार्यालयों में हिन्दी पत्राचार एवं यूनिकोड तथा डेवलिस फॉन्ट में कार्य किया जाना अनिवार्य है।",
  "न्यायालयिक अभिलेख कक्ष, स्थापना शाखा तथा लेखा एवं अंकेक्षण प्रकोष्ठ में समयबद्ध रूप से डिजिटल प्रविष्टियाँ पूर्ण करने से कार्यकुशलता में वृद्धि होती है।",
  "प्रत्येक नोडल अधिकारी को यह सुनिश्चित करना चाहिए कि सभी लंबित प्रकरणों का निस्तारण निर्धारित समय-सीमा के भीतर पारदर्शिता के साथ संपन्न किया जाए।",
  "लोकतांत्रिक व्यवस्था में जनकल्याणकारी योजनाओं का लाभ अंतिम व्यक्ति तक पहुँचाने में लिपिकीय संवर्ग की भूमिका अत्यंत महत्वपूर्ण एवं सराहनीय रहती है।",
  "नियमित अभ्यास, सही अंगुली विन्यास और शांत चित्त से परीक्षा हॉल में बैठने पर उच्चतम गति तथा शत-प्रतिशत शुद्धता सहज ही प्राप्त की जा सकती है।"
]

const RSSB_FALLBACK_ENGLISH_SENTENCES = [
  "The Rajasthan Staff Selection Board conducts the Phase-II Typing Speed and Computer Efficiency Examination for the recruitment of Clerk Grade-II and Junior Assistant posts across state departments.",
  "Candidates are required to type an English passage of approximately five hundred words within a strict ten-minute window without relying on text highlighting or backspace corrections.",
  "Every five keystrokes are evaluated as one standard word for speed computation, while official marks are awarded at the rate of zero point zero five marks per accurately typed word.",
  "Administrative efficiency in modern government secretariats depends heavily on accurate documentation, structured tabular reporting, and timely digital correspondence.",
  "All branch officers and section heads must verify their daily dispatch registers and submit compliance certificates to the competent authority before the tenth day of every month.",
  "Strict adherence to prescribed office formatting standards, record indexing, and archival rules is mandatory for all subordinate establishments and district collectorates.",
  "During the peripheral verification window of two minutes prior to the examination, every candidate must thoroughly inspect all alphabet keys, number keys, spacebar, and mouse controls.",
  "Once the timer for any of the four ten-minute papers commences, the clock runs continuously according to the central server time and stops automatically upon completion.",
  "In the Microsoft Word and Excel efficiency modules, fifteen practical tasks are assigned to evaluate paragraph alignment, line spacing, indentation, borders, shading, and spreadsheet formulas.",
  "Consistent touch typing discipline with eyes fixed on the reference passage prevents transposition errors, word omissions, punctuation slips, and capitalization mistakes.",
  "Public service institutions across Jaipur, Jodhpur, Udaipur, Kota, Ajmer, and Bikaner have transitioned to paperless file tracking systems to accelerate citizen service delivery.",
  "Maintaining composure during the two-minute confirmation intervals between consecutive papers allows candidates to transition smoothly from speed typing to office formatting tasks."
]

function buildDeterministicFallbackPassage(lang, typingExNo, targetWords) {
  const bank = lang === 'hi' ? RSSB_FALLBACK_HINDI_SENTENCES : RSSB_FALLBACK_ENGLISH_SENTENCES
  const wordsOut = []
  let idx = Math.max(0, Number(typingExNo || 300)) % bank.length
  let cycle = 0
  while (wordsOut.length < targetWords) {
    const sentence = bank[(idx + cycle) % bank.length]
    const tokens = sentence.trim().split(/\s+/)
    for (const tk of tokens) {
      wordsOut.push(tk)
      if (wordsOut.length >= targetWords) break
    }
    idx = (idx + 5) % bank.length
    cycle += 1
  }
  return wordsOut.join(' ')
}

async function loadRssbTypingPassage(lang, typingExNo) {
  const targetWords = lang === 'hi' ? 405 : 505
  try {
    if (!practiceExerciseData || !practiceExerciseData.length) {
      practiceExerciseData = await loadPracticeExerciseData()
    }
    const langList = practiceExerciseData.filter(item => item.language === lang)
    const targetId = `${lang}-${String(typingExNo).padStart(3, '0')}`
    let startIdx = langList.findIndex(item => String(item.id) === targetId)
    if (startIdx < 0 && langList.length >= typingExNo) startIdx = typingExNo - 1
    if (startIdx < 0) startIdx = Math.max(0, langList.length - 1)

    if (langList.length > 0) {
      const ordered = []
      for (let step = 0; step < langList.length; step++) {
        const i = (startIdx - step + langList.length) % langList.length
        ordered.push(langList[i])
      }
      const parts = []
      let wordCount = 0
      const seen = new Set()
      for (const ex of ordered) {
        if (wordCount >= targetWords) break
        const rawText = await loadPracticeExerciseText(ex)
        const sentences = rawText.split(/(?<=[.!?।])\s+/u)
        for (const s of sentences) {
          if (wordCount >= targetWords) break
          const clean = s.trim()
          const norm = clean.toLowerCase().replace(/\s+/g, ' ')
          if (!clean || seen.has(norm)) continue
          seen.add(norm)
          const sw = clean.split(/\s+/)
          const need = targetWords - wordCount
          parts.push(sw.length > need ? sw.slice(0, need).join(' ') : clean)
          wordCount += Math.min(sw.length, need)
        }
      }
      if (parts.length && wordCount >= 100) {
        return parts.join(' ')
      }
    }
  } catch (err) {
    console.warn(`Falling back to built-in RSSB ${lang} passage for exercise #${typingExNo}:`, err)
  }
  return buildDeterministicFallbackPassage(lang, typingExNo, targetWords)
}

function evaluateRssbTypingPaper({
  lang,
  exerciseId,
  exerciseNo,
  passage,
  typedText,
  elapsedSeconds,
  keystrokes,
  blockedBackspaces,
  blockedShortcuts,
  duplicateMatraErrors,
  improperCharErrors,
  pauseCount,
  longestPauseMs,
  speedSamples
}) {
  const isHi = lang === 'hi'
  const markPerWord = isHi ? 0.0625 : 0.05
  const expectedPassageWords = isHi ? 400 : 500
  const rawTyped = String(typedText || '')
  const rawTarget = String(passage || '')
  const durationSec = Math.max(1, Number(elapsedSeconds) || 600)
  const minutes = durationSec / 60

  const targetTokens = [...rawTarget.matchAll(/\S+/g)].map(m => m[0])
  const typedTokens = [...rawTyped.matchAll(/\S+/g)].map(m => m[0])

  let correctWords = 0
  let wrongWords = 0
  let caseErrors = 0
  let punctuationErrors = 0
  let repeatedWordErrors = 0
  let matraWordErrors = 0

  const stripPunct = (str) => str.replace(/[.,!?;:'"()[\]{}\-–—।]/g, '')
  const hasDevanagariMatraDiff = (a, b) => {
    const stripMatras = (s) => s.replace(/[\u0901-\u0903\u093A-\u094F\u0951-\u0957\u0962\u0963]/g, '')
    return a !== b && stripMatras(a) === stripMatras(b)
  }

  const wordReviewList = targetTokens.map((expectedWord, idx) => {
    const actualWord = typedTokens[idx] ?? ''
    if (!actualWord) {
      return { index: idx + 1, expected: expectedWord, typed: '', status: 'omitted', errorType: 'Omitted Word (छूटा हुआ शब्द)' }
    }
    if (actualWord === expectedWord) {
      correctWords += 1
      return { index: idx + 1, expected: expectedWord, typed: actualWord, status: 'correct', errorType: 'Correct (सही)' }
    }
    wrongWords += 1
    let errorType = isHi ? 'Wrong Word/Char (गलत शब्द/वर्ण)' : 'Wrong Word/Spelling'
    if (idx > 0 && actualWord === typedTokens[idx - 1] && expectedWord !== targetTokens[idx - 1]) {
      repeatedWordErrors += 1
      errorType = 'Repeated Word (शब्द की पुनरावृत्ति)'
    } else if (!isHi && actualWord.toLowerCase() === expectedWord.toLowerCase()) {
      caseErrors += 1
      errorType = 'Capital/Small Case Error (कैपिटल/स्माल त्रुटि)'
    } else if (stripPunct(actualWord) === stripPunct(expectedWord) && stripPunct(expectedWord).length > 0) {
      punctuationErrors += 1
      errorType = 'Punctuation Error (विराम चिह्न त्रुटि)'
    } else if (isHi && hasDevanagariMatraDiff(actualWord, expectedWord)) {
      matraWordErrors += 1
      errorType = 'Matra Error (मात्रा प्रयोग त्रुटि)'
    }
    return { index: idx + 1, expected: expectedWord, typed: actualWord, status: 'wrong', errorType }
  })

  const attemptedWords = typedTokens.length
  const omittedWords = Math.max(0, targetTokens.length - attemptedWords)
  const extraSpaceMatches = rawTyped.match(/  +/g)
  const spacingErrors = extraSpaceMatches ? extraSpaceMatches.length : 0

  let correctChars = 0
  for (let i = 0; i < rawTyped.length; i++) {
    if (rawTyped[i] === rawTarget[i]) correctChars += 1
  }
  const typedChars = rawTyped.length
  const errorChars = Math.max(0, typedChars - correctChars)
  const effectiveKeystrokes = Math.max(typedChars, Number(keystrokes) || typedChars)

  const standardWordsGross = +(effectiveKeystrokes / 5).toFixed(2)
  const standardWordsNet = +(Math.max(0, correctChars) / 5).toFixed(2)
  const grossWpm5Char = +((effectiveKeystrokes / 5) / minutes).toFixed(2)
  const netWpm5Char = +((Math.max(0, correctChars) / 5) / minutes).toFixed(2)
  const grossWpm10Min = +((effectiveKeystrokes / 5) / 10).toFixed(2)
  const netWpm10Min = +((Math.max(0, correctChars) / 5) / 10).toFixed(2)

  const wordBasedGrossWpm = +(attemptedWords / minutes).toFixed(2)
  const wordBasedNetWpm = +(correctWords / minutes).toFixed(2)

  const accuracy = typedChars > 0 ? +((correctChars / typedChars) * 100).toFixed(2) : 0
  const wordAccuracy = attemptedWords > 0 ? +((correctWords / attemptedWords) * 100).toFixed(2) : 0

  const officialWordMarks = Math.min(25, Math.max(0, +(correctWords * markPerWord).toFixed(2)))
  const keystrokeWordMarks = Math.min(25, Math.max(0, +(standardWordsNet * markPerWord).toFixed(2)))
  const marksOutOf25 = Math.max(officialWordMarks, keystrokeWordMarks)

  return {
    lang,
    languageLabel: isHi ? 'Hindi (हिन्दी — DevLys 010)' : 'English (अंग्रेजी — Standard)',
    paperTitle: isHi ? 'प्रश्न पत्र 1: हिन्दी टंकण गति परीक्षण (Hindi Typing Speed Test)' : 'प्रश्न पत्र 2: अंग्रेजी टंकण गति परीक्षण (English Typing Speed Test)',
    exerciseId,
    exerciseNo,
    durationSeconds: durationSec,
    maxMarks25: 25,
    qualifyingMarks: 9.0,
    scStQualifyingMarks: 7.75,
    markPerWord,
    expectedPassageWords,
    marksOutOf25,
    officialWordMarks,
    keystrokeWordMarks,
    qualified: marksOutOf25 >= 9.0,
    scStQualified: marksOutOf25 >= 7.75,
    keystrokes: effectiveKeystrokes,
    typedChars,
    correctChars,
    errorChars,
    standardWordsGross,
    standardWordsNet,
    grossWpm5Char,
    netWpm5Char,
    grossWpm10Min,
    netWpm10Min,
    wordBasedGrossWpm,
    wordBasedNetWpm,
    accuracy,
    wordAccuracy,
    totalPassageWords: targetTokens.length,
    attemptedWords,
    correctWords,
    wrongWords,
    omittedWords,
    caseErrors,
    punctuationErrors,
    spacingErrors,
    repeatedWordErrors,
    matraWordErrors: matraWordErrors + (Number(duplicateMatraErrors) || 0),
    duplicateMatraKeystrokes: Number(duplicateMatraErrors) || 0,
    improperCharKeystrokes: Number(improperCharErrors) || 0,
    blockedBackspaces: Number(blockedBackspaces) || 0,
    blockedShortcuts: Number(blockedShortcuts) || 0,
    pauseCount: Number(pauseCount) || 0,
    longestPauseMs: Number(longestPauseMs) || 0,
    speedSamples: Array.isArray(speedSamples) ? speedSamples : [],
    passage: rawTarget,
    typedText: rawTyped,
    wordReviewList
  }
}

function openRssbLdcEntryPopup() {
  document.querySelector('#rssb-ldc-entry-modal')?.remove()
  const overlay = document.createElement('div')
  overlay.id = 'rssb-ldc-entry-modal'
  overlay.className = 'rssb-modal-overlay'
  overlay.innerHTML = `
    <section class="rssb-entry-dialog" role="dialog" aria-modal="true" aria-labelledby="rssb-entry-title">
      <div class="rssb-entry-top-banner">
        <span class="rssb-crest-icon">🏛️</span>
        <div>
          <small>राजस्थान कर्मचारी चयन बोर्ड, जयपुर · RAJASTHAN STAFF SELECTION BOARD, JAIPUR</small>
          <h2 id="rssb-entry-title">RSSB LDC Phase-II Exam Hall Experience · परीक्षा हॉल सिमुलेशन</h2>
        </div>
        <button type="button" class="rssb-modal-close-x" id="rssb-entry-close-x" aria-label="Close">×</button>
      </div>

      <div class="rssb-entry-body">
        <div class="rssb-bilingual-notice-grid">
          <article class="rssb-notice-box hindi-box">
            <span class="rssb-lang-pill">हिन्दी सूचना · महत्वपूर्ण दिशा-निर्देश</span>
            <h3>यह केवल वास्तविक परीक्षा हॉल (Exam Pattern) के अनुभव हेतु है</h3>
            <p>
              यह सेक्शन <strong>राजस्थान कर्मचारी चयन बोर्ड (RSSB) लिपिक ग्रेड-II / कनिष्ठ सहायक फेज-II</strong> के <strong>वास्तविक परीक्षा हॉल (Exam Hall Experience)</strong> के अभ्यास के लिए बनाया गया है। इसमें बोर्ड की आधिकारिक प्रक्रिया के अनुसार:
            </p>
            <ul>
              <li>सभी जगह <strong>Roll No., Name, User ID व Password = <code>admin</code></strong> स्वतः भरा हुआ (Auto-filled) रहेगा।</li>
              <li>पहले <strong>2 मिनट</strong> की-बोर्ड एवं माउस परीक्षण (Practice Test), फिर <strong>10 मिनट हिन्दी टाइपिंग</strong> → <strong>2 मिनट ब्रेक/कन्फर्मेशन</strong> → <strong>10 मिनट अंग्रेजी टाइपिंग</strong> → <strong>2 मिनट ब्रेक</strong> → <strong>10 मिनट दक्षता-1</strong> → <strong>2 मिनट ब्रेक</strong> → <strong>10 मिनट दक्षता-2</strong> क्रमानुसार चलेंगे।</li>
              <li>परीक्षा नियमों के अनुसार <strong>Backspace पूर्णतः बंद</strong> और <strong>Text Highlight पूर्णतः बंद</strong> रहेगा।</li>
            </ul>
            <p class="rssb-practice-redirect-tip">
              💡 <strong>नोट:</strong> यदि आप सामान्य अभ्यास (Normal Typing या Efficiency Practice) करना चाहते हैं, तो कृपया <strong>होम स्क्रीन (Home Screen)</strong> पर दिए गए <em>Practice Typing / MS Word / MS Excel Efficiency</em> विकल्पों से अभ्यास करें।
            </p>
          </article>

          <article class="rssb-notice-box english-box">
            <span class="rssb-lang-pill">ENGLISH NOTICE · EXAM HALL GUIDELINES</span>
            <h3>Strictly for Real Exam Hall Pattern &amp; Environment Practice</h3>
            <p>
              This module is exclusively designed to simulate the <strong>Official RSSB LDC Phase-II Exam Hall Experience</strong> across <strong>80 Full Mock Tests</strong> (mapped in reverse order from Exercise #300 and Efficiency #40):
            </p>
            <ul>
              <li><strong>Auto-Filled Credentials:</strong> Roll No., Candidate Name, User ID, and Password are set to <strong><code>admin</code></strong> everywhere automatically.</li>
              <li><strong>Sequential 4-Paper Flow:</strong> <strong>2 Min</strong> Keyboard Check → <strong>10 Min</strong> Hindi Speed Test → <strong>2 Min</strong> Break/Confirm → <strong>10 Min</strong> English Speed Test → <strong>2 Min</strong> Break → <strong>10 Min</strong> Efficiency 1 → <strong>2 Min</strong> Break → <strong>10 Min</strong> Final Efficiency 2.</li>
              <li><strong>Strict RSSB Rules:</strong> <strong>Backspace Not Allowed</strong>, <strong>Text Highlight Not Allowed</strong>, <strong>5 Characters = 1 Word</strong> keystroke metric, and separate 25-mark evaluation for all 4 papers.</li>
            </ul>
            <p class="rssb-practice-redirect-tip">
              💡 <strong>Note:</strong> If you wish to do regular topic-wise or flexible practice, please use the <strong>Practice Typing / Efficiency</strong> sections given on the <strong>Home Screen</strong>.
            </p>
          </article>
        </div>

        <div class="rssb-entry-summary-strip">
          <span><strong>80 Full Mock Exams</strong> (Set A: 1–40 · Set B: 41–80)</span>
          <span><strong>Login / Roll No / Password:</strong> <code>admin</code></span>
          <span><strong>4 Papers × 25 Marks = 100 Marks</strong> (Min 9/25 Each)</span>
        </div>

        <div class="rssb-entry-actions">
          <button type="button" class="secondary-button rssb-btn-close" id="rssb-entry-close">
            ← Close &amp; Return to Home Screen (होम स्क्रीन पर वापस जाएँ)
          </button>
          <button type="button" class="primary-button rssb-btn-start" id="rssb-entry-start">
            🏛️ Start Exam Hall Practice (परीक्षा हॉल अभ्यास शुरू करें) →
          </button>
        </div>
      </div>
    </section>
  `
  document.body.appendChild(overlay)

  const closeToHome = () => {
    overlay.remove()
    if (currentSection !== 'home') renderSection('home')
  }
  overlay.querySelector('#rssb-entry-close')?.addEventListener('click', closeToHome)
  overlay.querySelector('#rssb-entry-close-x')?.addEventListener('click', closeToHome)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeToHome() })
  overlay.querySelector('#rssb-entry-start')?.addEventListener('click', () => {
    overlay.remove()
    rssbExamState.stage = 'hub'
    renderSection('rssb-ldc-exam')
  })
}

function renderRssbLdcExamHub() {
  stopRssbExamTimer()
  const records = getRssbExamRecords()
  const allSpecs = Array.from({ length: 80 }, (_, idx) => getRssbMockExamSpec(idx + 1))
  const attemptedCount = allSpecs.filter(s => Boolean(records[String(s.testNo)])).length
  const qualifiedCount = allSpecs.filter(s => Boolean(records[String(s.testNo)]?.overallQualified)).length
  const bestOverall = allSpecs.reduce((mx, s) => Math.max(mx, Number(records[String(s.testNo)]?.totalMarksOutOf100) || 0), 0)

  const filteredSpecs = allSpecs.filter(spec => {
    const rec = records[String(spec.testNo)]
    if (rssbExamState.filter === 'set-a') return spec.testNo <= 40
    if (rssbExamState.filter === 'set-b') return spec.testNo >= 41
    if (rssbExamState.filter === 'attempted') return Boolean(rec)
    if (rssbExamState.filter === 'unattempted') return !rec
    return true
  })

  return `
    <div class="rssb-exam-hub" id="rssb-exam-hub-root">
      <section class="rssb-hub-hero">
        <div class="rssb-hub-hero-left">
          <span class="rssb-official-tag">राजस्थान कर्मचारी चयन बोर्ड, जयपुर · लिपिक ग्रेड-II / कनिष्ठ सहायक फेज-II</span>
          <h2>RSSB LDC Phase-II Full Exam Hall Simulator (80 Mock Tests)</h2>
          <p>
            प्रत्येक मॉक टेस्ट में बोर्ड के आधिकारिक पैटर्न के अनुसार <strong>2 मिनट की-बोर्ड जाँच</strong> + <strong>4 प्रश्न पत्र (10-10 मिनट · 25-25 अंक)</strong> + <strong>2-2 मिनट ब्रेक एवं पासवर्ड पुष्टिकरण</strong> शामिल हैं।
          </p>
          <div class="rssb-admin-cred-banner">
            <span>🔑 <strong>Default Roll No. / User ID / Candidate Name / Password:</strong> <code>admin</code> (सभी स्थानों पर स्वतः भरा हुआ / Auto-filled everywhere in Hindi &amp; English)</span>
          </div>
        </div>
        <div class="rssb-hub-metrics">
          <article><span>Total Mock Tests</span><strong>80</strong><small>Reverse Bank Order</small></article>
          <article><span>Attempted (पूर्ण)</span><strong style="color:#2563eb;">${attemptedCount} / 80</strong><small>${80 - attemptedCount} Remaining</small></article>
          <article><span>Qualified (उत्तीर्ण)</span><strong style="color:#15803d;">${qualifiedCount}</strong><small>≥ 9/25 in all 4</small></article>
          <article><span>Best Score</span><strong style="color:#7c3aed;">${bestOverall ? bestOverall.toFixed(2) : '0.00'} / 100</strong><small>Max 100 Marks</small></article>
        </div>
      </section>

      <section class="rssb-mapping-explainer">
        <div class="rssb-mapping-box">
          <strong>📋 Tests 1 to 40 (Set A — Reverse Order):</strong>
          <span>Hindi Typing <code>#300 → #261</code> · English Typing <code>#300 → #261</code> · <strong>MS Word Hindi <code>#40 → #01</code></strong> · <strong>MS Excel English <code>#40 → #01</code></strong></span>
        </div>
        <div class="rssb-mapping-box">
          <strong>📋 Tests 41 to 80 (Set B — Reverse Order):</strong>
          <span>Hindi Typing <code>#260 → #221</code> · English Typing <code>#260 → #221</code> · <strong>MS Word English <code>#40 → #01</code></strong> · <strong>MS Excel Hindi <code>#40 → #01</code></strong></span>
        </div>
      </section>

      <div class="rssb-hub-filter-bar">
        <button type="button" class="rssb-filter-btn ${rssbExamState.filter === 'all' ? 'active' : ''}" data-rssb-filter="all">All 80 Mock Tests (80)</button>
        <button type="button" class="rssb-filter-btn ${rssbExamState.filter === 'set-a' ? 'active' : ''}" data-rssb-filter="set-a">Set A: Tests 1–40 (Word HI + Excel EN)</button>
        <button type="button" class="rssb-filter-btn ${rssbExamState.filter === 'set-b' ? 'active' : ''}" data-rssb-filter="set-b">Set B: Tests 41–80 (Word EN + Excel HI)</button>
        <button type="button" class="rssb-filter-btn ${rssbExamState.filter === 'attempted' ? 'active' : ''}" data-rssb-filter="attempted">✓ Attempted (${attemptedCount})</button>
        <button type="button" class="rssb-filter-btn ${rssbExamState.filter === 'unattempted' ? 'active' : ''}" data-rssb-filter="unattempted">○ Unattempted (${80 - attemptedCount})</button>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button type="button" class="rssb-filter-btn" id="rssb-force-reload-eff" title="Clear cache and reload new efficiency JSON files">🔄 Reload New Efficiency Files</button>
          <label class="rssb-filter-btn" style="cursor:pointer;background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;">
            📂 Select efficiency-bank Folder (${O19_CUSTOM_UPLOADED_BANK.size} synced)
            <input type="file" id="rssb-eff-folder-input" webkitdirectory directory multiple accept=".json" style="display:none;" />
          </label>
        </div>
      </div>

      <div class="rssb-test-grid">
        ${filteredSpecs.map(spec => {
          const rec = records[String(spec.testNo)]
          const isAttempted = Boolean(rec)
          const isQual = Boolean(rec?.overallQualified)
          return `
            <article class="rssb-test-card ${isAttempted ? 'is-attempted' : ''}">
              <div class="rssb-test-card-head">
                <div>
                  <span class="rssb-test-set-pill ${spec.testNo <= 40 ? 'set-a' : 'set-b'}">${spec.setCode} · TEST #${String(spec.testNo).padStart(2, '0')}</span>
                  <h3>RSSB LDC Full Mock Exam #${String(spec.testNo).padStart(2, '0')}</h3>
                </div>
                <span class="rssb-attempt-badge ${isAttempted ? (isQual ? 'qualified' : 'attempted') : 'unattempted'}">
                  ${isAttempted ? (isQual ? '✓ Attempted · QUALIFIED' : '✓ Attempted · पूर्ण') : '○ Not Attempted'}
                </span>
              </div>

              <div class="rssb-test-papers-list">
                <div><span>1. हिन्दी टंकण गति (10m · 25M):</span><strong>Hindi Exercise #${spec.typingExNo}</strong></div>
                <div><span>2. अंग्रेजी टंकण गति (10m · 25M):</span><strong>English Exercise #${spec.typingExNo}</strong></div>
                <div><span>3. दक्षता प्रथम (10m · 25M):</span><strong>${escapeHtml(spec.eff1ShortTitle)}</strong></div>
                <div><span>4. दक्षता द्वितीय (10m · 25M):</span><strong>${escapeHtml(spec.eff2ShortTitle)}</strong></div>
              </div>

              ${isAttempted ? `
                <div class="rssb-test-score-strip">
                  <div>
                    <small>Last Score (प्राप्तांक)</small>
                    <strong>${Number(rec.totalMarksOutOf100 || 0).toFixed(2)} / 100</strong>
                  </div>
                  <div class="rssb-mini-paper-scores">
                    <span>P1: ${Number(rec.hindiTyping?.marksOutOf25 || 0).toFixed(1)}</span>
                    <span>P2: ${Number(rec.englishTyping?.marksOutOf25 || 0).toFixed(1)}</span>
                    <span>P3: ${Number(rec.efficiency1?.marksOutOf25 || 0).toFixed(1)}</span>
                    <span>P4: ${Number(rec.efficiency2?.marksOutOf25 || 0).toFixed(1)}</span>
                  </div>
                  <small class="rssb-attempt-meta">Attempts: ${rec.attempts || 1} · ${escapeHtml(rec.completedAt || '')}</small>
                </div>
              ` : `
                <div class="rssb-test-unattempted-strip">
                  <small>Duration: 46 Mins Total (2m Check + 4×10m Papers + 3×2m Breaks) · Roll No/Pass: <code>admin</code></small>
                </div>
              `}

              <div class="rssb-test-card-actions">
                ${isAttempted ? `
                  <button type="button" class="secondary-button rssb-view-res-btn" data-rssb-view-result="${spec.testNo}">
                    📊 View Result (परिणाम देखें)
                  </button>
                  <button type="button" class="primary-button rssb-retry-btn" data-rssb-start-test="${spec.testNo}">
                    ↻ Retry Exam (पुनः प्रयास करें)
                  </button>
                ` : `
                  <button type="button" class="primary-button rssb-start-btn" data-rssb-start-test="${spec.testNo}">
                    ▶ Start Exam Hall Test #${String(spec.testNo).padStart(2, '0')} (परीक्षा प्रारंभ करें) →
                  </button>
                `}
              </div>
            </article>
          `
        }).join('')}
      </div>
    </div>
  `
}

function attachRssbLdcExamHub() {
  document.querySelectorAll('[data-rssb-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      rssbExamState.filter = btn.dataset.rssbFilter || 'all'
      renderSection('rssb-ldc-exam')
    })
  })

  document.querySelectorAll('[data-rssb-start-test]').forEach(btn => {
    btn.addEventListener('click', () => {
      const testNo = Number(btn.dataset.rssbStartTest) || 1
      launchRssbExamHallSession(testNo)
    })
  })

  document.querySelectorAll('[data-rssb-view-result]').forEach(btn => {
    btn.addEventListener('click', () => {
      const testNo = Number(btn.dataset.rssbViewResult) || 1
      const rec = getRssbExamRecords()[String(testNo)]
      if (rec) openRssbSavedResultModal(rec)
    })
  })

  document.querySelector('#rssb-force-reload-eff')?.addEventListener('click', () => {
    O19_CACHE_BUST_VERSION = Date.now()
    try {
      localStorage.removeItem('ag-eff-word-draft')
      localStorage.removeItem('ag-eff-excel-draft')
    } catch {}
    renderSection('rssb-ldc-exam')
  })

  document.querySelector('#rssb-eff-folder-input')?.addEventListener('change', async (ev) => {
    const files = Array.from(ev.target.files || []).filter(f => f.name.toLowerCase().endsWith('.json'))
    for (const f of files) {
      try {
        const txt = await f.text()
        const raw = JSON.parse(txt)
        const match = f.name.toUpperCase().match(/(WORD|EXCEL)_(EN|HI)_0*([1-9][0-9]*)/)
        if (match) {
          const mName = match[1].toLowerCase()
          const lName = match[2].toLowerCase()
          const fNo = Number(match[3])
          const fId = efficiencyFileId(mName, lName, fNo)
          const norm = normalizeEfficiencyJsonData(raw, mName, lName, fNo, fId)
          O19_CUSTOM_UPLOADED_BANK.set(fId, norm)
        }
      } catch (e) {
        console.warn('Skipped invalid JSON file:', f.name, e)
      }
    }
    O19_CACHE_BUST_VERSION = Date.now()
    renderSection('rssb-ldc-exam')
  })
}

function ensureRssbExamOverlay() {
  let root = document.querySelector('#rssb-exam-hall-fullscreen')
  if (!root) {
    root = document.createElement('div')
    root.id = 'rssb-exam-hall-fullscreen'
    root.className = 'rssb-exam-hall-fullscreen'
    document.body.appendChild(root)
  }
  return root
}

function closeRssbExamOverlay() {
  stopRssbExamTimer()
  if (efficiencyState.timer) {
    clearInterval(efficiencyState.timer)
    efficiencyState.timer = null
  }
  efficiencyState.examHallMode = false
  efficiencyState.examHallCallback = null
  efficiencyState.examHallAbort = null
  document.querySelector('#rssb-exam-hall-fullscreen')?.remove()
  renderSection('rssb-ldc-exam')
}

function formatRssbClock(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

async function launchRssbExamHallSession(testNo) {
  stopRssbExamTimer()
  const spec = getRssbMockExamSpec(testNo)
  rssbExamState.activeTestNo = spec.testNo
  rssbExamState.stage = 'login'
  rssbExamState.paperResults = {
    hindiTyping: null,
    englishTyping: null,
    efficiency1: null,
    efficiency2: null
  }
  renderRssbLoginScreen(spec)
  loadRssbTypingPassage('hi', spec.typingExNo).then(txt => { rssbExamState.hindiPassage = txt })
  loadRssbTypingPassage('en', spec.typingExNo).then(txt => { rssbExamState.englishPassage = txt })
}

function renderRssbLoginScreen(spec) {
  stopRssbExamTimer()
  const root = ensureRssbExamOverlay()
  root.innerHTML = `
    <header class="rssb-hall-topbar">
      <div class="rssb-hall-brand">
        <span class="rssb-hall-badge">RSSB JAIPUR · PHASE-II</span>
        <div>
          <strong>राजस्थान कर्मचारी चयन बोर्ड, जयपुर — लिपिक ग्रेड-II / कनिष्ठ सहायक परीक्षा</strong>
          <small>Mock Exam #${String(spec.testNo).padStart(2, '0')} · ${escapeHtml(spec.setTitle)}</small>
        </div>
      </div>
      <div class="rssb-hall-candidate-strip">
        <span>Roll No. / रोल नं.: <strong>admin</strong></span>
        <span>Name / नाम: <strong>admin</strong></span>
        <span>User ID: <strong>admin</strong></span>
        <span>Password: <strong>admin</strong></span>
        <button type="button" class="rssb-abort-btn" id="rssb-abort-exam">✕ Exit Exam Hall</button>
      </div>
    </header>

    <div class="rssb-hall-scroll-body">
      <div class="rssb-login-card-wrap">
        <section class="rssb-official-login-box">
          <h2>Login / अभ्यर्थी लॉगिन</h2>
          <p class="rssb-auto-admin-note">
            <strong>सूचना / Note:</strong> रोल नंबर, नाम, User ID तथा Password सभी स्थानों पर <code>admin</code> निर्धारित है एवं स्वतः भरा हुआ (Auto-filled) है।
          </p>
          <div class="rssb-login-form-row">
            <label for="rssb-userid-input">User Id / रोल नं.</label>
            <input id="rssb-userid-input" type="text" value="admin" readonly />
          </div>
          <div class="rssb-login-form-row">
            <label for="rssb-password-input">Password / पासवर्ड</label>
            <input id="rssb-password-input" type="text" value="admin" readonly />
          </div>
          <label class="rssb-guidelines-check">
            <input type="checkbox" id="rssb-guidelines-ack" checked />
            <span>I have read below mentioned guidelines / मैंने नीचे वर्णित सभी दिशा-निर्देश ध्यानपूर्वक पढ़ लिए हैं।</span>
          </label>
          <div class="rssb-login-btn-row">
            <button type="button" class="rssb-win-btn primary" id="rssb-btn-login">Log In (परीक्षा कक्ष में प्रवेश)</button>
            <button type="button" class="rssb-win-btn" id="rssb-btn-peripheral">Peripheral Check (की-बोर्ड एवं माउस जाँच — 02:00 Min)</button>
          </div>
        </section>

        <section class="rssb-guidelines-box">
          <div class="rssb-guidelines-header">
            <strong>Guidelines &amp; Official RSSB LDC Phase-II Instructions (दिशा-निर्देश एवं परीक्षा योजना)</strong>
          </div>
          <div class="rssb-guidelines-content">
            <table class="rssb-scheme-table">
              <thead>
                <tr>
                  <th>प्रश्न पत्र सं.</th>
                  <th>विषय (Paper / Module)</th>
                  <th>अभ्यास संख्या (Exercise)</th>
                  <th>समय (Duration)</th>
                  <th>पूर्णांक (Max Marks)</th>
                  <th>अर्हता हेतु न्यूनतम प्राप्तांक (Min Qualifying)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>हिन्दी टंकण गति परीक्षण (Hindi Typing Speed Test)</td>
                  <td>Hindi Ex #${spec.typingExNo} (~400 Words)</td>
                  <td>10 मिनट</td>
                  <td>25 अंक</td>
                  <td>9 अंक (SC/ST: 7.75)</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>अंग्रेजी टंकण गति परीक्षण (English Typing Speed Test)</td>
                  <td>English Ex #${spec.typingExNo} (~500 Words)</td>
                  <td>10 मिनट</td>
                  <td>25 अंक</td>
                  <td>9 अंक (SC/ST: 7.75)</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>${escapeHtml(spec.eff1Title)}</td>
                  <td>${escapeHtml(spec.eff1FileId)} (15 Questions)</td>
                  <td>10 मिनट</td>
                  <td>25 अंक</td>
                  <td>9 अंक (SC/ST: 7.75)</td>
                </tr>
                <tr>
                  <td>4</td>
                  <td>${escapeHtml(spec.eff2Title)}</td>
                  <td>${escapeHtml(spec.eff2FileId)} (15 Questions)</td>
                  <td>10 मिनट</td>
                  <td>25 अंक</td>
                  <td>9 अंक (SC/ST: 7.75)</td>
                </tr>
              </tbody>
            </table>

            <div class="rssb-rules-two-col">
              <div>
                <h4>क — गति परीक्षण एवं सामान्य नियम (Speed Test Rules)</h4>
                <ul>
                  <li><strong>The Clock has been set to the server time:</strong> पहले 2 मिनट की-बोर्ड परीक्षण (Practice Test) के लिए मिलेंगे, उसके बाद 10-10 मिनट के चारों प्रश्न पत्र 2-2 मिनट के पुष्टिकरण अंतराल (Confirmation Break) के साथ क्रमानुसार चलेंगे।</li>
                  <li><strong>You have to type the content of speed test in given space only:</strong> अंग्रेजी में ~500 शब्दों (0.05 अंक प्रति सही शब्द) एवं हिन्दी में ~400 शब्दों (0.0625 अंक प्रति सही शब्द) का परिच्छेद होगा।</li>
                  <li><strong>5 Keystrokes = 1 Word:</strong> गति की गणना में 5 करैक्टर/की-स्ट्रोक का 1 मानक शब्द माना जाएगा।</li>
                  <li><strong>No Backspace &amp; No Highlight Allowed:</strong> परीक्षा के दौरान <strong>Back-Space पूर्णतः प्रतिबंधित</strong> है और <strong>Text / Word Highlight उपलब्ध नहीं रहेगा</strong>।</li>
                  <li><strong>Notified Font:</strong> अंग्रेजी के लिए Standard एवं हिन्दी के लिए <strong>DevLys 010</strong> फॉन्ट निर्धारित है। मात्राओं की अनावश्यक आवृत्ति (जैसे <code>dsssssoy</code>) एवं अनुचित वर्ण टंकण (जैसे <code>प = Ik</code> के स्थान पर <code>i</code>) को त्रुटि माना जाएगा।</li>
                </ul>
              </div>
              <div>
                <h4>ख — दक्षता परीक्षण नियम (Efficiency Test Rules)</h4>
                <ul>
                  <li>दक्षता परीक्षण MS Word एवं MS Excel में 15-15 प्रश्नों का होगा (प्रत्येक भाग 10 मिनट, 25 अंक, न्यूनतम अर्हता 9 अंक)।</li>
                  <li>दक्षता परीक्षा के दौरान <strong>Cut-Copy-Paste (Ctrl+X/C/V), Right Mouse Click, Select All (Ctrl+A) तथा सभी Function Keys (F1–F12)</strong> बंद रहेंगी।</li>
                  <li><strong>CTRL+Z</strong> कुंजी एवं <strong>Back-Space</strong> का उपयोग दक्षता परीक्षण में सुधार हेतु किया जा सकता है।</li>
                  <li>पहले से उपलब्ध पैराग्राफ व टेबल की सामग्री में पूछे गए टास्क के अलावा बदलाव करने या हटाने (DELETE) पर उस पैराग्राफ के किसी भी कार्य के अंक नहीं दिए जाएंगे।</li>
                  <li>प्रत्येक चरण के पश्चात 2 मिनट के अंतराल में पासवर्ड (<code>admin</code> — स्वतः भरा हुआ) से कार्य को सत्यापित (Confirm/Approve) करना होगा।</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `

  root.querySelector('#rssb-abort-exam')?.addEventListener('click', closeRssbExamOverlay)
  const proceedToKeyboardCheck = () => {
    const ack = root.querySelector('#rssb-guidelines-ack')
    if (ack && !ack.checked) ack.checked = true
    renderRssbKeyboardCheckScreen(spec)
  }
  root.querySelector('#rssb-btn-login')?.addEventListener('click', proceedToKeyboardCheck)
  root.querySelector('#rssb-btn-peripheral')?.addEventListener('click', proceedToKeyboardCheck)
}

function renderRssbKeyboardCheckScreen(spec) {
  stopRssbExamTimer()
  rssbExamState.stage = 'keyboard-check'
  rssbExamState.secondsLeft = 120
  rssbExamState.kbCheckLang = 'en'

  const root = ensureRssbExamOverlay()
  root.innerHTML = `
    <header class="rssb-hall-topbar">
      <div class="rssb-hall-brand">
        <span class="rssb-hall-badge">STEP 1 OF 5 · PERIPHERAL TEST</span>
        <div>
          <strong>Practice Test / अभ्यास परीक्षण (Keyboard &amp; Mouse Accessories Check)</strong>
          <small>Roll No.: admin · Name: admin · User ID: admin · Mock Exam #${String(spec.testNo).padStart(2, '0')}</small>
        </div>
      </div>
      <div class="rssb-hall-candidate-strip">
        <div class="rssb-server-timer-box">
          <span>Remaining Time:</span>
          <strong id="rssb-kb-timer">00:02:00</strong>
        </div>
        <button type="button" class="rssb-abort-btn" id="rssb-abort-exam">✕ Exit</button>
      </div>
    </header>

    <div class="rssb-hall-scroll-body">
      <section class="rssb-classic-exam-frame">
        <div class="rssb-classic-top-row">
          <div class="rssb-classic-title-center">
            <h2>Practice Test / अभ्यास परीक्षण</h2>
            <p class="rssb-classic-rem-time">Remaining Time: <strong id="rssb-kb-timer-inline">00:02:00</strong></p>
          </div>
          <div class="rssb-classic-top-controls">
            <button type="button" class="rssb-win-btn primary" id="rssb-skip-practice-btn">Skip Practice Test / मुख्य परीक्षा शुरू करें →</button>
            <div class="rssb-lang-switch-group">
              <button type="button" class="rssb-win-btn active" data-kb-lang="en">English</button>
              <button type="button" class="rssb-win-btn" data-kb-lang="hi">Hindi (DevLys 010)</button>
            </div>
          </div>
        </div>

        <div class="rssb-kb-instruction-banner">
          <strong>In this page check your English &amp; Hindi keyboard and mouse accessories.</strong>
          <span>इस पेज पर अपने अंग्रेजी एवं हिन्दी (DevLys 010) की-बोर्ड व माउस का परीक्षण कर सुनिश्चित कर लें कि सभी बटन सही कार्य कर रहे हैं। (2:00 मिनट पूर्ण होने पर या Skip दबाने पर प्रथम प्रश्न पत्र स्वतः प्रारंभ होगा)</span>
        </div>

        <div class="rssb-kb-helper-strip" id="rssb-kb-helper-strip">
          <span><strong>Active Mode:</strong> <b id="rssb-kb-mode-label">English Standard Keyboard</b></span>
          <span><strong>Last Key Pressed:</strong> <kbd id="rssb-kb-last-key">None</kbd></span>
          <button type="button" class="rssb-win-btn" id="rssb-mouse-verify-btn">🖱️ Click Here to Test Mouse (<span id="rssb-mouse-clicks">0</span> clicks)</button>
        </div>

        <div class="rssb-kb-sample-hint" id="rssb-kb-sample-hint">
          <strong>Sample Keys to Test:</strong> Type <code>The quick brown fox jumps over the lazy dog 1234567890</code> (Switch to <b>Hindi</b> top-right to test DevLys 010 keys: <code>d=क, j=र, k=ा, l=स, g=ह, e=म, r=त, u=न, i=प, o=व</code>)
        </div>

        <textarea
          id="rssb-kb-test-input"
          class="rssb-classic-textarea"
          rows="10"
          placeholder="In this page check your English & Hindi keyboard... यहाँ टाइप करके अपने की-बोर्ड के सभी बटनों की जाँच करें..."
          spellcheck="false"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
        ></textarea>
      </section>
    </div>
  `

  root.querySelector('#rssb-abort-exam')?.addEventListener('click', closeRssbExamOverlay)
  const kbInput = root.querySelector('#rssb-kb-test-input')
  kbInput?.focus()

  let mouseClicks = 0
  root.querySelector('#rssb-mouse-verify-btn')?.addEventListener('click', () => {
    mouseClicks += 1
    const el = root.querySelector('#rssb-mouse-clicks')
    if (el) el.textContent = String(mouseClicks)
  })

  root.querySelectorAll('[data-kb-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-kb-lang]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      rssbExamState.kbCheckLang = btn.dataset.kbLang || 'en'
      const isHi = rssbExamState.kbCheckLang === 'hi'
      const lbl = root.querySelector('#rssb-kb-mode-label')
      if (lbl) lbl.textContent = isHi ? 'Hindi (DevLys 010 / Remington Keymap Active)' : 'English Standard Keyboard'
      if (kbInput) {
        kbInput.classList.toggle('hindi-devlys-font', isHi)
        kbInput.focus()
      }
    })
  })

  kbInput?.addEventListener('keydown', (event) => {
    const lastKeyEl = root.querySelector('#rssb-kb-last-key')
    if (lastKeyEl) lastKeyEl.textContent = `${event.key} (${event.code})`
    if (rssbExamState.kbCheckLang === 'hi' && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && event.key !== ' ') {
      const mapped = event.shiftKey
        ? (RSSB_DEVLYS_SHIFT_MAP[event.key] || RSSB_DEVLYS_NORMAL_MAP[event.key.toLowerCase()])
        : RSSB_DEVLYS_NORMAL_MAP[event.key.toLowerCase()]
      if (mapped) {
        event.preventDefault()
        kbInput.value += mapped
      }
    }
  })

  const startPaper1 = () => {
    stopRssbExamTimer()
    renderRssbTypingSpeedStage(spec, 'hi')
  }

  root.querySelector('#rssb-skip-practice-btn')?.addEventListener('click', startPaper1)

  rssbExamState.timer = setInterval(() => {
    rssbExamState.secondsLeft = Math.max(0, rssbExamState.secondsLeft - 1)
    const formatted = formatRssbClock(rssbExamState.secondsLeft)
    const t1 = root.querySelector('#rssb-kb-timer')
    const t2 = root.querySelector('#rssb-kb-timer-inline')
    if (t1) t1.textContent = formatted
    if (t2) t2.textContent = formatted
    if (rssbExamState.secondsLeft <= 0) {
      startPaper1()
    }
  }, 1000)
}

async function renderRssbTypingSpeedStage(spec, lang) {
  stopRssbExamTimer()
  const isHi = lang === 'hi'
  rssbExamState.stage = isHi ? 'typing-hindi' : 'typing-english'
  rssbExamState.secondsLeft = 600
  rssbExamState.stageStartedAt = Date.now()
  rssbExamState.typingBuffer = ''
  rssbExamState.typingKeystrokes = 0
  rssbExamState.blockedBackspaces = 0
  rssbExamState.blockedShortcuts = 0
  rssbExamState.duplicateMatraErrors = 0
  rssbExamState.improperCharErrors = 0
  rssbExamState.lastPhysicalKey = ''
  rssbExamState.lastKeystrokeAt = null
  rssbExamState.pauseCount = 0
  rssbExamState.longestPauseMs = 0
  rssbExamState.speedSamples = []

  const root = ensureRssbExamOverlay()
  root.innerHTML = `<div class="rssb-loading-screen"><h3>Loading ${isHi ? 'Hindi' : 'English'} Typing Speed Test (Exercise #${spec.typingExNo})...</h3></div>`

  let passage = isHi ? rssbExamState.hindiPassage : rssbExamState.englishPassage
  if (!passage) {
    passage = await loadRssbTypingPassage(lang, spec.typingExNo)
    if (isHi) rssbExamState.hindiPassage = passage
    else rssbExamState.englishPassage = passage
  }

  rssbExamState.stageStartedAt = Date.now()
  const paperTitle = isHi
    ? 'Hindi Typing Speed Test / हिन्दी टंकण गति परीक्षा'
    : 'English Typing Speed Test / अंग्रेजी टंकण गति परीक्षा'
  const stepBadge = isHi ? 'PAPER 1 OF 4 · HINDI SPEED TEST (25 MARKS)' : 'PAPER 2 OF 4 · ENGLISH SPEED TEST (25 MARKS)'

  root.innerHTML = `
    <header class="rssb-hall-topbar">
      <div class="rssb-hall-brand">
        <span class="rssb-hall-badge">${stepBadge}</span>
        <div>
          <strong>${paperTitle} — Exercise #${spec.typingExNo}</strong>
          <small>Roll No.: admin · Name: admin · User ID: admin · Full Marks: 25 · Qualifying: 9</small>
        </div>
      </div>
      <div class="rssb-hall-candidate-strip">
        ${isHi ? `
          <label class="rssb-keymap-toggle" title="Toggle built-in QWERTY to DevLys 010/Remington Hindi key mapper">
            <input type="checkbox" id="rssb-hi-keymap-chk" ${rssbExamState.hindiKeymapEnabled ? 'checked' : ''} />
            <span>DevLys 010 Keymap (QWERTY → हिन्दी)</span>
          </label>
        ` : ''}
        <div class="rssb-server-timer-box">
          <span>Remaining Time:</span>
          <strong id="rssb-typing-timer">00:10:00</strong>
        </div>
        <button type="button" class="rssb-win-btn primary" id="rssb-submit-typing-paper">Submit Paper &amp; Proceed →</button>
      </div>
    </header>

    <div class="rssb-hall-scroll-body">
      <section class="rssb-classic-exam-frame">
        <div class="rssb-classic-title-center">
          <h2>${paperTitle}</h2>
          <p class="rssb-classic-rem-time">Remaining Time: <strong id="rssb-typing-timer-inline">00:10:00</strong></p>
        </div>

        <div class="rssb-strict-rules-strip">
          <span>🔒 <strong>Roll No. &amp; Name:</strong> <code>admin</code></span>
          <span>🚫 <strong>Backspace:</strong> Strictly Disabled (पूर्णतः बंद)</span>
          <span>🚫 <strong>Text / Word Highlight:</strong> Strictly Disabled (पूर्णतः बंद)</span>
          <span>⌨️ <strong>Font:</strong> ${isHi ? 'DevLys 010 / Kruti-Remington' : 'English Standard'}</span>
          <span id="rssb-typing-live-notice">Status: Exam in Progress</span>
        </div>

        <div
          id="rssb-exam-passage-box"
          class="rssb-classic-passage-box ${isHi ? 'hindi-devlys-font' : ''}"
          aria-label="Exam reference passage"
        >${escapeHtml(passage)}</div>

        <textarea
          id="rssb-exam-typing-input"
          class="rssb-classic-textarea ${isHi ? 'hindi-devlys-font' : ''}"
          rows="8"
          placeholder="${isHi ? 'यहाँ ऊपर दिए गए हिन्दी परिच्छेद को टाइप करें (Backspace एवं Highlight बंद है)...' : 'Type the above English passage here (Backspace and Highlight are disabled)...'}"
          spellcheck="false"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
        ></textarea>

        <div class="rssb-classic-bottom-bar">
          <small>Note: Once the 10:00 timer finishes (or when you click Submit Paper), your typed content will move to the 2-Minute Confirmation &amp; Break screen.</small>
          <button type="button" class="rssb-win-btn primary" id="rssb-submit-typing-bottom">Submit ${isHi ? 'Hindi' : 'English'} Typing Test →</button>
        </div>
      </section>
    </div>
  `

  const inputEl = root.querySelector('#rssb-exam-typing-input')
  const passageBox = root.querySelector('#rssb-exam-passage-box')
  const noticeEl = root.querySelector('#rssb-typing-live-notice')
  inputEl?.focus()

  root.querySelector('#rssb-hi-keymap-chk')?.addEventListener('change', (e) => {
    rssbExamState.hindiKeymapEnabled = e.target.checked
    inputEl?.focus()
  })

  ;['paste', 'cut', 'copy', 'drop', 'contextmenu'].forEach(evtType => {
    inputEl?.addEventListener(evtType, (ev) => {
      ev.preventDefault()
      rssbExamState.blockedShortcuts += 1
      if (noticeEl) noticeEl.textContent = `⚠️ RSSB Rule: ${evtType.toUpperCase()} is prohibited!`
    })
  })
  passageBox?.addEventListener('contextmenu', e => e.preventDefault())
  passageBox?.addEventListener('copy', e => e.preventDefault())

  const lockCursorToEnd = () => {
    if (!inputEl) return
    const len = inputEl.value.length
    if (inputEl.selectionStart !== len || inputEl.selectionEnd !== len) {
      inputEl.setSelectionRange(len, len)
    }
  }
  inputEl?.addEventListener('click', lockCursorToEnd)
  inputEl?.addEventListener('mouseup', lockCursorToEnd)

  inputEl?.addEventListener('keydown', (event) => {
    if (event.repeat) {
      event.preventDefault()
      return
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      rssbExamState.blockedBackspaces += 1
      if (noticeEl) noticeEl.textContent = `🚫 Backspace/Delete is not allowed in RSSB LDC Exam Mode (${rssbExamState.blockedBackspaces} blocked)`
      return
    }
    if (['ArrowLeft', 'ArrowUp', 'Home', 'PageUp'].includes(event.key)) {
      event.preventDefault()
      lockCursorToEnd()
      return
    }
    if (/^F([1-9]|1[0-2])$/i.test(event.key) || event.ctrlKey || event.metaKey || event.altKey) {
      event.preventDefault()
      rssbExamState.blockedShortcuts += 1
      if (noticeEl) noticeEl.textContent = '🚫 Shortcuts (Ctrl / Alt / Function Keys) are prohibited!'
      return
    }

    const now = Date.now()
    if (rssbExamState.lastKeystrokeAt !== null) {
      const gap = now - rssbExamState.lastKeystrokeAt
      if (gap > 2000) {
        rssbExamState.pauseCount += 1
        rssbExamState.longestPauseMs = Math.max(rssbExamState.longestPauseMs, gap)
      }
    }
    rssbExamState.lastKeystrokeAt = now

    if (event.key === 'Shift' || event.key === 'CapsLock') {
      rssbExamState.typingKeystrokes += 1
      return
    }

    if (event.key.length === 1 || event.key === 'Enter') {
      rssbExamState.typingKeystrokes += 1
    }

    if (isHi && rssbExamState.hindiKeymapEnabled && event.key.length === 1 && event.key !== ' ') {
      const rawKey = event.key
      const lowerKey = rawKey.toLowerCase()

      if (RSSB_MATRA_KEYS.has(rawKey) && rssbExamState.lastPhysicalKey === rawKey) {
        rssbExamState.duplicateMatraErrors += 1
        if (noticeEl) noticeEl.textContent = '⚠️ मात्रा की अनावश्यक आवृत्ति (Duplicate Matra Keystroke Detected)'
      }
      if (rawKey === 'k' && RSSB_HALF_TO_FULL_K_KEYS.has(rssbExamState.lastPhysicalKey)) {
        rssbExamState.improperCharErrors += 1
        if (noticeEl) noticeEl.textContent = '⚠️ वर्ण का अनुचित टंकण (Improper half-char + k composition detected)'
      }
      rssbExamState.lastPhysicalKey = rawKey

      const curLen = inputEl.value.length
      const expectedChar = passage[curLen] || ''
      let mapped = event.shiftKey
        ? (RSSB_DEVLYS_SHIFT_MAP[rawKey] || RSSB_DEVLYS_NORMAL_MAP[lowerKey])
        : RSSB_DEVLYS_NORMAL_MAP[lowerKey]

      if (mapped) {
        event.preventDefault()
        if (expectedChar && expectedChar !== ' ' && (mapped === expectedChar || (mapped.length > 1 && mapped.startsWith(expectedChar)))) {
          inputEl.value += expectedChar
        } else {
          inputEl.value += mapped
        }
        rssbExamState.typingBuffer = inputEl.value
        lockCursorToEnd()
        const ratio = Math.min(1, inputEl.value.length / Math.max(1, passage.length))
        if (passageBox) {
          passageBox.scrollTop = Math.max(0, (passageBox.scrollHeight - passageBox.clientHeight) * ratio)
        }
      }
    } else if (event.key === ' ') {
      rssbExamState.lastPhysicalKey = ' '
    }
  })

  inputEl?.addEventListener('input', () => {
    rssbExamState.typingBuffer = inputEl.value
    lockCursorToEnd()
    const ratio = Math.min(1, inputEl.value.length / Math.max(1, passage.length))
    if (passageBox) {
      passageBox.scrollTop = Math.max(0, (passageBox.scrollHeight - passageBox.clientHeight) * ratio)
    }
  })

  const completeTypingStage = () => {
    stopRssbExamTimer()
    const elapsed = Math.max(1, Math.min(600, Math.round((Date.now() - rssbExamState.stageStartedAt) / 1000)))
    const evalResult = evaluateRssbTypingPaper({
      lang,
      exerciseId: isHi ? spec.hindiTypingId : spec.englishTypingId,
      exerciseNo: spec.typingExNo,
      passage,
      typedText: inputEl ? inputEl.value : rssbExamState.typingBuffer,
      elapsedSeconds: elapsed,
      keystrokes: rssbExamState.typingKeystrokes,
      blockedBackspaces: rssbExamState.blockedBackspaces,
      blockedShortcuts: rssbExamState.blockedShortcuts,
      duplicateMatraErrors: rssbExamState.duplicateMatraErrors,
      improperCharErrors: rssbExamState.improperCharErrors,
      pauseCount: rssbExamState.pauseCount,
      longestPauseMs: rssbExamState.longestPauseMs,
      speedSamples: rssbExamState.speedSamples
    })
    if (isHi) {
      rssbExamState.paperResults.hindiTyping = evalResult
      renderRssbTypingBreakConfirmation(spec, 'hi', evalResult)
    } else {
      rssbExamState.paperResults.englishTyping = evalResult
      renderRssbTypingBreakConfirmation(spec, 'en', evalResult)
    }
  }

  root.querySelector('#rssb-submit-typing-paper')?.addEventListener('click', completeTypingStage)
  root.querySelector('#rssb-submit-typing-bottom')?.addEventListener('click', completeTypingStage)

  rssbExamState.timer = setInterval(() => {
    rssbExamState.secondsLeft = Math.max(0, rssbExamState.secondsLeft - 1)
    const formatted = formatRssbClock(rssbExamState.secondsLeft)
    const t1 = root.querySelector('#rssb-typing-timer')
    const t2 = root.querySelector('#rssb-typing-timer-inline')
    if (t1) t1.textContent = formatted
    if (t2) t2.textContent = formatted

    const elapsed = 600 - rssbExamState.secondsLeft
    if (elapsed > 0 && elapsed % 5 === 0) {
      const curTxt = inputEl ? inputEl.value : rssbExamState.typingBuffer
      const wpmNow = Math.round(((curTxt.length / 5) / (elapsed / 60)))
      rssbExamState.speedSamples.push({ second: elapsed, chars: curTxt.length, netWpm: wpmNow })
    }

    if (rssbExamState.secondsLeft <= 0) {
      completeTypingStage()
    }
  }, 1000)
}

function renderRssbTypingBreakConfirmation(spec, lang, evalResult) {
  stopRssbExamTimer()
  const isHi = lang === 'hi'
  rssbExamState.stage = isHi ? 'break-1' : 'break-2'
  rssbExamState.secondsLeft = 120

  const previewHeading = isHi
    ? 'Hindi Typed Content Preview / हिन्दी टंकित सामग्री पूर्वावलोकन'
    : 'English Typed Content Preview / अंग्रेजी टंकित सामग्री पूर्वावलोकन'
  const nextStageLabel = isHi
    ? 'Start Paper 2: English Typing Speed Test (10:00 Min) →'
    : `Start Paper 3: ${spec.eff1ShortTitle} Efficiency Test (10:00 Min) →`

  const root = ensureRssbExamOverlay()
  root.innerHTML = `
    <header class="rssb-hall-topbar">
      <div class="rssb-hall-brand">
        <span class="rssb-hall-badge">${isHi ? '2-MINUTE BREAK & CONFIRMATION (AFTER PAPER 1)' : '2-MINUTE BREAK & CONFIRMATION (AFTER PAPER 2)'}</span>
        <div>
          <strong>${previewHeading}</strong>
          <small>Roll No.: admin · Name: admin · Test Id: ${spec.testNo} · Password: admin (Auto-filled)</small>
        </div>
      </div>
      <div class="rssb-hall-candidate-strip">
        <div class="rssb-server-timer-box">
          <span>Break / Confirm Time:</span>
          <strong id="rssb-break-timer">00:02:00</strong>
        </div>
      </div>
    </header>

    <div class="rssb-hall-scroll-body">
      <section class="rssb-classic-exam-frame">
        <div class="rssb-preview-meta-row">
          <div>
            <p><strong>Roll No. :</strong> <code>admin</code></p>
            <p><strong>Test Id :</strong> <code>${spec.testNo}</code></p>
            <p><strong>Name :</strong> <code>admin</code></p>
          </div>
          <div class="rssb-preview-center-head">
            <h2>${previewHeading}</h2>
            <small>Remaining Break &amp; Confirmation Time: <strong id="rssb-break-timer-inline">00:02:00</strong></small>
          </div>
          <div>
            <span class="rssb-status-tag">✓ Typed Content Locked</span>
          </div>
        </div>

        <div class="rssb-typed-preview-box ${isHi ? 'hindi-devlys-font' : ''}">
          ${escapeHtml(evalResult.typedText || '(No text was typed in this session)')}
        </div>

        <div class="rssb-confirmation-dialog-card">
          <div class="rssb-confirmation-card-header">CONFIRMATION / पुष्टिकरण</div>
          <div class="rssb-confirmation-card-body">
            <p><strong>Please enter your password and confirm your typed content.</strong></p>
            <p class="rssb-note-italic"><em>Note : Here editing is not permitted. (यहाँ संपादन की अनुमति नहीं है। पासवर्ड <code>admin</code> स्वतः भरा हुआ है।)</em></p>
            <div class="rssb-confirm-pass-row">
              <label for="rssb-confirm-pass-input">Enter Password :</label>
              <input id="rssb-confirm-pass-input" type="text" value="admin" readonly />
              <button type="button" class="rssb-win-btn primary" id="rssb-approve-confirm-btn">
                Click to Approve &amp; ${nextStageLabel}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `

  const proceedNext = () => {
    stopRssbExamTimer()
    if (isHi) {
      renderRssbTypingSpeedStage(spec, 'en')
    } else {
      renderRssbEfficiencyStage(spec, 1)
    }
  }

  root.querySelector('#rssb-approve-confirm-btn')?.addEventListener('click', proceedNext)

  rssbExamState.timer = setInterval(() => {
    rssbExamState.secondsLeft = Math.max(0, rssbExamState.secondsLeft - 1)
    const formatted = formatRssbClock(rssbExamState.secondsLeft)
    const t1 = root.querySelector('#rssb-break-timer')
    const t2 = root.querySelector('#rssb-break-timer-inline')
    if (t1) t1.textContent = formatted
    if (t2) t2.textContent = formatted
    if (rssbExamState.secondsLeft <= 0) {
      proceedNext()
    }
  }, 1000)
}

async function renderRssbEfficiencyStage(spec, effStageNumber) {
  stopRssbExamTimer()
  const isFirstEff = effStageNumber === 1
  rssbExamState.stage = isFirstEff ? 'efficiency-1' : 'efficiency-2'

  const moduleName = isFirstEff ? spec.eff1Module : spec.eff2Module
  const lang = isFirstEff ? spec.eff1Lang : spec.eff2Lang
  const fileNo = spec.effFileNo
  const pageId = moduleName === 'word' ? 'word-efficiency' : 'excel-efficiency'
  const paperLabel = isFirstEff
    ? `Paper 3 of 4: ${spec.eff1Title}`
    : `Paper 4 of 4: ${spec.eff2Title}`

  const root = ensureRssbExamOverlay()
  root.innerHTML = `
    <div id="efficiency-simulator" class="efficiency-simulator efficiency-fullscreen" data-module="${moduleName}" style="height:100vh;width:100vw;overflow:hidden;">
      <div class="rssb-loading-screen">
        <h3>Loading ${escapeHtml(paperLabel)}...</h3>
      </div>
    </div>
  `

  const fileData = await efficiencyFetchFile(moduleName, lang, fileNo)
  efficiencyState.module = moduleName
  efficiencyState.language = lang
  efficiencyState.fileNo = fileNo
  efficiencyState.fileData = fileData
  efficiencyState.examHallMode = true
  efficiencyState.examHallMeta = {
    testNo: spec.testNo,
    effStageNumber,
    paperLabel
  }
  efficiencyState.examHallAbort = closeRssbExamOverlay
  efficiencyState.examHallCallback = (effResult) => {
    effResult.paperTitle = isFirstEff
      ? `प्रश्न पत्र 3: ${spec.eff1Title}`
      : `प्रश्न पत्र 4: ${spec.eff2Title}`
    effResult.shortTitle = isFirstEff ? spec.eff1ShortTitle : spec.eff2ShortTitle
    if (isFirstEff) {
      rssbExamState.paperResults.efficiency1 = effResult
      renderRssbEfficiencyConfirmation(spec, 1, effResult)
    } else {
      rssbExamState.paperResults.efficiency2 = effResult
      renderRssbEfficiencyConfirmation(spec, 2, effResult)
    }
  }

  efficiencyRender(pageId, fileData.questions[0], lang, 1, false)
}

function renderRssbEfficiencyConfirmation(spec, effStageNumber, effResult) {
  stopRssbExamTimer()
  const isFirstEff = effStageNumber === 1
  rssbExamState.stage = isFirstEff ? 'break-3' : 'final-confirm'
  rssbExamState.secondsLeft = 120

  const headingHi = effResult.language === 'hi' ? 'हिन्दी दक्षता परीक्षा' : 'अंग्रेजी दक्षता परीक्षा'
  const nextBtnLabel = isFirstEff
    ? `Confirm & Start Final Paper 4 (${spec.eff2ShortTitle} — 10:00 Min) →`
    : 'Confirm & Final Submit All 4 Papers (परिणाम एवं स्कोरकार्ड देखें) →'

  const root = ensureRssbExamOverlay()
  root.innerHTML = `
    <header class="rssb-hall-topbar">
      <div class="rssb-hall-brand">
        <span class="rssb-hall-badge">${isFirstEff ? '2-MINUTE BREAK & EFFICIENCY-1 CONFIRMATION' : 'FINAL EFFICIENCY-2 CONFIRMATION'}</span>
        <div>
          <strong>${headingHi} Confirmation Screen / Efficiency Exam Confirmation Screen</strong>
          <small>Roll No.: admin · Name: admin · User ID: admin · Password: admin (Auto-filled)</small>
        </div>
      </div>
      <div class="rssb-hall-candidate-strip">
        <div class="rssb-server-timer-box">
          <span>Remaining Time:</span>
          <strong id="rssb-eff-confirm-timer">00:02:00</strong>
        </div>
      </div>
    </header>

    <div class="rssb-hall-scroll-body">
      <section class="rssb-classic-exam-frame">
        <div class="rssb-eff-confirm-header">
          <h2>${headingHi} Confirmation Screen</h2>
          <h3>Efficiency Exam Confirmation Screen (${escapeHtml(effResult.shortTitle)} · ${escapeHtml(effResult.fileId)})</h3>
          <p>Please enter your password and confirm your work. &nbsp;|&nbsp; <em>Note: Here editing is not permitted.</em></p>
          <div class="rssb-eff-confirm-bar">
            <span>Remaining Time: <strong id="rssb-eff-confirm-timer-inline">00:02:00</strong></span>
            <span>Roll No.: <strong>admin</strong></span>
            <span>Name: <strong>admin</strong></span>
            <label for="rssb-eff-pass-input">Enter Password:</label>
            <input id="rssb-eff-pass-input" type="text" value="admin" readonly />
            <button type="button" class="rssb-win-btn primary" id="rssb-eff-confirm-btn">${nextBtnLabel}</button>
          </div>
        </div>

        <div class="rssb-eff-snapshot-preview" aria-label="Read-only preview of submitted efficiency work">
          ${effResult.snapshotHtml || '<p>Work snapshot recorded.</p>'}
        </div>
      </section>
    </div>
  `

  root.querySelectorAll('.rssb-eff-snapshot-preview [contenteditable]').forEach(el => {
    el.setAttribute('contenteditable', 'false')
  })
  root.querySelectorAll('.rssb-eff-snapshot-preview input').forEach(el => {
    el.setAttribute('readonly', 'readonly')
    el.setAttribute('disabled', 'disabled')
  })

  const proceed = () => {
    stopRssbExamTimer()
    if (isFirstEff) {
      renderRssbEfficiencyStage(spec, 2)
    } else {
      finalizeAndRenderRssbCompleteExamResult(spec)
    }
  }

  root.querySelector('#rssb-eff-confirm-btn')?.addEventListener('click', proceed)

  rssbExamState.timer = setInterval(() => {
    rssbExamState.secondsLeft = Math.max(0, rssbExamState.secondsLeft - 1)
    const formatted = formatRssbClock(rssbExamState.secondsLeft)
    const t1 = root.querySelector('#rssb-eff-confirm-timer')
    const t2 = root.querySelector('#rssb-eff-confirm-timer-inline')
    if (t1) t1.textContent = formatted
    if (t2) t2.textContent = formatted
    if (rssbExamState.secondsLeft <= 0) {
      proceed()
    }
  }, 1000)
}

function finalizeAndRenderRssbCompleteExamResult(spec) {
  stopRssbExamTimer()
  rssbExamState.stage = 'final-result'

  const p1 = rssbExamState.paperResults.hindiTyping || evaluateRssbTypingPaper({
    lang: 'hi', exerciseId: spec.hindiTypingId, exerciseNo: spec.typingExNo,
    passage: rssbExamState.hindiPassage || '', typedText: '', elapsedSeconds: 600,
    keystrokes: 0, blockedBackspaces: 0, blockedShortcuts: 0, duplicateMatraErrors: 0,
    improperCharErrors: 0, pauseCount: 0, longestPauseMs: 0, speedSamples: []
  })
  const p2 = rssbExamState.paperResults.englishTyping || evaluateRssbTypingPaper({
    lang: 'en', exerciseId: spec.englishTypingId, exerciseNo: spec.typingExNo,
    passage: rssbExamState.englishPassage || '', typedText: '', elapsedSeconds: 600,
    keystrokes: 0, blockedBackspaces: 0, blockedShortcuts: 0, duplicateMatraErrors: 0,
    improperCharErrors: 0, pauseCount: 0, longestPauseMs: 0, speedSamples: []
  })
  const p3 = rssbExamState.paperResults.efficiency1 || {
    paperTitle: `प्रश्न पत्र 3: ${spec.eff1Title}`,
    shortTitle: spec.eff1ShortTitle,
    module: spec.eff1Module,
    language: spec.eff1Lang,
    fileNo: spec.effFileNo,
    fileId: spec.eff1FileId,
    rawEarned50: 0,
    marksOutOf25: 0,
    maxMarks25: 25,
    qualifyingMarks: 9.0,
    scStQualifyingMarks: 7.75,
    qualified: false,
    scStQualified: false,
    solvedCount: 0,
    wrongCount: 15,
    totalQuestions: 15,
    durationSeconds: 600,
    blockedShortcutAttempts: 0,
    corruptedPartsCount: 0,
    questionBreakdown: []
  }
  const p4 = rssbExamState.paperResults.efficiency2 || {
    paperTitle: `प्रश्न पत्र 4: ${spec.eff2Title}`,
    shortTitle: spec.eff2ShortTitle,
    module: spec.eff2Module,
    language: spec.eff2Lang,
    fileNo: spec.effFileNo,
    fileId: spec.eff2FileId,
    rawEarned50: 0,
    marksOutOf25: 0,
    maxMarks25: 25,
    qualifyingMarks: 9.0,
    scStQualifyingMarks: 7.75,
    qualified: false,
    scStQualified: false,
    solvedCount: 0,
    wrongCount: 15,
    totalQuestions: 15,
    durationSeconds: 600,
    blockedShortcutAttempts: 0,
    corruptedPartsCount: 0,
    questionBreakdown: []
  }

  const totalMarksOutOf100 = +(p1.marksOutOf25 + p2.marksOutOf25 + p3.marksOutOf25 + p4.marksOutOf25).toFixed(2)
  const overallQualified = Boolean(p1.qualified && p2.qualified && p3.qualified && p4.qualified)
  const overallScStQualified = Boolean(p1.scStQualified && p2.scStQualified && p3.scStQualified && p4.scStQualified)

  const fullRecord = {
    id: `rssb-ldc-exam-${spec.testNo}-${Date.now()}`,
    testNo: spec.testNo,
    setCode: spec.setCode,
    setTitle: spec.setTitle,
    rollNumber: 'admin',
    candidateName: 'admin',
    userId: 'admin',
    password: 'admin',
    completedAt: new Date().toLocaleString(),
    totalMarksOutOf100,
    overallQualified,
    overallScStQualified,
    hindiTyping: { ...p1, snapshotHtml: undefined },
    englishTyping: { ...p2, snapshotHtml: undefined },
    efficiency1: { ...p3, snapshotHtml: undefined },
    efficiency2: { ...p4, snapshotHtml: undefined }
  }

  saveRssbExamRecord(spec.testNo, fullRecord)
  const root = ensureRssbExamOverlay()
  root.innerHTML = buildRssbCompleteReportMarkup(fullRecord)
  bindRssbCompleteReportEvents(root, fullRecord, true)
}

function openRssbSavedResultModal(record) {
  const root = ensureRssbExamOverlay()
  root.innerHTML = buildRssbCompleteReportMarkup(record)
  bindRssbCompleteReportEvents(root, record, false)
}

function buildRssbTypingPaperDetailHTML(paper, paperNumber) {
  const isHi = paper.lang === 'hi'
  const words = Array.isArray(paper.wordReviewList) ? paper.wordReviewList : []
  const wrongWordItems = words.filter(w => w.status === 'wrong').slice(0, 40)

  return `
    <section class="rssb-paper-detail-card" id="rssb-report-paper-${paperNumber}">
      <div class="rssb-paper-detail-head">
        <div>
          <span class="rssb-paper-tag">PAPER ${paperNumber} OF 4 · TYPING SPEED TEST (10 MINUTES · 25 MARKS)</span>
          <h3>${escapeHtml(paper.paperTitle)}</h3>
          <p>Exercise ID: <code>${escapeHtml(paper.exerciseId)}</code> (#${paper.exerciseNo}) · Roll No.: <code>admin</code> · Candidate: <code>admin</code></p>
        </div>
        <div class="rssb-paper-score-box ${paper.qualified ? 'pass' : 'fail'}">
          <small>Official Marks (प्राप्तांक)</small>
          <strong>${Number(paper.marksOutOf25).toFixed(2)} / 25.00</strong>
          <span>${paper.qualified ? '✓ QUALIFIED (उत्तीर्ण ≥ 9.00)' : (paper.scStQualified ? '◐ SC/ST RELAXATION QUALIFIED (≥ 7.75)' : '✗ NOT QUALIFIED (< 9.00)')}</span>
        </div>
      </div>

      <div class="rssb-metrics-grid-8">
        <article><span>Official RSSB Score</span><strong>${Number(paper.marksOutOf25).toFixed(2)} / 25</strong><small>${paper.markPerWord} mark / correct word</small></article>
        <article><span>Word-Based Marks</span><strong>${Number(paper.officialWordMarks).toFixed(2)} / 25</strong><small>${paper.correctWords} × ${paper.markPerWord}</small></article>
        <article><span>5-Char Keystroke Marks</span><strong>${Number(paper.keystrokeWordMarks).toFixed(2)} / 25</strong><small>${paper.standardWordsNet} net std words</small></article>
        <article><span>Total Keystrokes</span><strong>${paper.keystrokes}</strong><small>${paper.typedChars} chars typed</small></article>
        <article><span>5-Char Standard Words</span><strong>${paper.standardWordsGross}</strong><small>Net: ${paper.standardWordsNet} (5 chars = 1 word)</small></article>
        <article><span>Net WPM (5-Char Method)</span><strong>${paper.netWpm5Char} WPM</strong><small>Gross: ${paper.grossWpm5Char} WPM</small></article>
        <article><span>Net WPM (Word Method)</span><strong>${paper.wordBasedNetWpm} WPM</strong><small>Gross: ${paper.wordBasedGrossWpm} WPM</small></article>
        <article><span>Accuracy (शुद्धता)</span><strong>${paper.accuracy}%</strong><small>Word Acc: ${paper.wordAccuracy}%</small></article>
      </div>

      <div class="rssb-rule-audit-table-wrap">
        <h4>📋 RSSB LDC Official Typing Rule &amp; Error Audit (टंकण त्रुटि एवं नियम सत्यापन तालिका)</h4>
        <table class="rssb-audit-table">
          <thead>
            <tr>
              <th>RSSB LDC Rule / Parameter (मूल्यांकन मानदंड)</th>
              <th>Rule Requirement (बोर्ड का नियम)</th>
              <th>Candidate Recorded Value (आपका विवरण)</th>
              <th>Compliance / Impact</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Reference Passage &amp; Correct Words (सही शब्द)</strong></td>
              <td>${isHi ? '400 Words · 0.0625 Marks/Word' : '500 Words · 0.05 Marks/Word'}</td>
              <td>Passage: <b>${paper.totalPassageWords}</b> · Attempted: <b>${paper.attemptedWords}</b> · Correct: <b style="color:#15803d;">${paper.correctWords}</b></td>
              <td><span class="rssb-badge-ok">+${Number(paper.officialWordMarks).toFixed(2)} Marks</span></td>
            </tr>
            <tr>
              <td><strong>2. 5-Character Keystroke Standard (5 करैक्टर = 1 शब्द)</strong></td>
              <td>Total Keystrokes ÷ 5 = Standard Words</td>
              <td>Keystrokes: <b>${paper.keystrokes}</b> · Gross Std Words: <b>${paper.standardWordsGross}</b> · Net Std Words: <b>${paper.standardWordsNet}</b></td>
              <td><span class="rssb-badge-ok">${paper.netWpm5Char} Net WPM</span></td>
            </tr>
            <tr>
              <td><strong>3. Backspace Restriction (बैकस्पेस प्रतिबंध)</strong></td>
              <td>Backspace Not Allowed in Exam Mode</td>
              <td>Effective Backspaces: <b>0</b> (Blocked Attempts: <b>${paper.blockedBackspaces}</b>)</td>
              <td><span class="rssb-badge-ok">✓ Strictly Enforced</span></td>
            </tr>
            <tr>
              <td><strong>4. Text &amp; Word Highlight (हाईलाइट प्रतिबंध)</strong></td>
              <td>Text / Word Highlight Not Allowed</td>
              <td>Plain Unhighlighted Passage Display</td>
              <td><span class="rssb-badge-ok">✓ Strictly Enforced</span></td>
            </tr>
            <tr>
              <td><strong>5. Wrong Words / Characters / Numbers (गलत वर्ण, शब्द या अंक)</strong></td>
              <td>0 Marks for wrong words/characters</td>
              <td>Wrong Words: <b style="color:#b91c1c;">${paper.wrongWords}</b> · Wrong Characters: <b style="color:#b91c1c;">${paper.errorChars}</b></td>
              <td><span class="${paper.wrongWords ? 'rssb-badge-warn' : 'rssb-badge-ok'}">${paper.wrongWords} Errors</span></td>
            </tr>
            <tr>
              <td><strong>6. Omission of Words / Characters (वर्णों या शब्दों का छूटना)</strong></td>
              <td>0 Marks for omitted words</td>
              <td>Untyped / Omitted Words: <b>${paper.omittedWords}</b></td>
              <td><span>${paper.omittedWords} Untyped</span></td>
            </tr>
            <tr>
              <td><strong>7. Repetition &amp; Spacing Errors (पुनरावृत्ति एवं शब्द-अंतराल त्रुटि)</strong></td>
              <td>No extra spaces or repeated words</td>
              <td>Repeated Words: <b>${paper.repeatedWordErrors}</b> · Extra Space Errors: <b>${paper.spacingErrors}</b></td>
              <td><span class="${paper.repeatedWordErrors + paper.spacingErrors ? 'rssb-badge-warn' : 'rssb-badge-ok'}">${paper.repeatedWordErrors + paper.spacingErrors} Issues</span></td>
            </tr>
            <tr>
              <td><strong>8. Punctuation &amp; ${isHi ? 'Matra / DevLys Composition (मात्रा आवृत्ति dsssssoy / Ik)' : 'Capital-Small Case (कैपिटल एवं स्माल लेटर)'}</strong></td>
              <td>${isHi ? 'No duplicate matras (dsssssoy) or improper half-char+k (Ik for प)' : 'Exact Capital & Small letter usage required'}</td>
              <td>${isHi
                ? `Punctuation: <b>${paper.punctuationErrors}</b> · Matra Mismatch: <b>${paper.matraWordErrors}</b> · Duplicate Matra Keys: <b>${paper.duplicateMatraKeystrokes}</b> · Improper 'Ik' Keys: <b>${paper.improperCharKeystrokes}</b>`
                : `Punctuation Errors: <b>${paper.punctuationErrors}</b> · Capital/Small Case Errors: <b>${paper.caseErrors}</b>`
              }</td>
              <td><span class="${(isHi ? paper.matraWordErrors + paper.improperCharKeystrokes : paper.caseErrors) + paper.punctuationErrors ? 'rssb-badge-warn' : 'rssb-badge-ok'}">Audited</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="rssb-mistake-words-box">
        <h4>🔍 Word-by-Word Error Analysis (गलत टंकित शब्दों का विवरण — Top ${wrongWordItems.length})</h4>
        ${wrongWordItems.length ? `
          <div class="rssb-mistake-chips">
            ${wrongWordItems.map(w => `
              <span class="rssb-mistake-chip">
                <small>#${w.index}</small>
                <strong>${escapeHtml(w.expected)}</strong>
                <span>typed as</span>
                <em>${escapeHtml(w.typed)}</em>
                <i>[${escapeHtml(w.errorType)}]</i>
              </span>
            `).join('')}
          </div>
        ` : `<p class="helper-text">No incorrect words among the attempted words.</p>`}
      </div>

      <div class="rssb-passage-comparison-grid">
        <div>
          <h5>Reference Passage (${paper.totalPassageWords} Words)</h5>
          <div class="rssb-comp-box ${isHi ? 'hindi-devlys-font' : ''}">${escapeHtml(paper.passage)}</div>
        </div>
        <div>
          <h5>Candidate Typed Content (${paper.attemptedWords} Words · ${paper.typedChars} Chars)</h5>
          <div class="rssb-comp-box ${isHi ? 'hindi-devlys-font' : ''}">${escapeHtml(paper.typedText || '(No text entered)')}</div>
        </div>
      </div>
    </section>
  `
}

function buildRssbEfficiencyPaperDetailHTML(eff, paperNumber) {
  const breakdown = Array.isArray(eff.questionBreakdown) ? eff.questionBreakdown : []
  return `
    <section class="rssb-paper-detail-card" id="rssb-report-paper-${paperNumber}">
      <div class="rssb-paper-detail-head">
        <div>
          <span class="rssb-paper-tag">PAPER ${paperNumber} OF 4 · EFFICIENCY TEST (10 MINUTES · 15 QUESTIONS · 25 MARKS)</span>
          <h3>${escapeHtml(eff.paperTitle)}</h3>
          <p>Module: <code>${escapeHtml((eff.module || '').toUpperCase())}</code> · File ID: <code>${escapeHtml(eff.fileId)}</code> (#${eff.fileNo}) · Roll No.: <code>admin</code> · Candidate: <code>admin</code></p>
        </div>
        <div class="rssb-paper-score-box ${eff.qualified ? 'pass' : 'fail'}">
          <small>Official Marks (प्राप्तांक)</small>
          <strong>${Number(eff.marksOutOf25).toFixed(2)} / 25.00</strong>
          <span>${eff.qualified ? '✓ QUALIFIED (उत्तीर्ण ≥ 9.00)' : (eff.scStQualified ? '◐ SC/ST RELAXATION QUALIFIED (≥ 7.75)' : '✗ NOT QUALIFIED (< 9.00)')}</span>
        </div>
      </div>

      <div class="rssb-metrics-grid-8">
        <article><span>Official RSSB Score</span><strong>${Number(eff.marksOutOf25).toFixed(2)} / 25.00</strong><small>Scaled from ${eff.rawEarned50} / 50</small></article>
        <article><span>Qualifying Marks</span><strong>9.00 / 25.00</strong><small>SC/ST Relax: 7.75</small></article>
        <article><span>Tasks Solved</span><strong style="color:#15803d;">${eff.solvedCount} / ${eff.totalQuestions || 15}</strong><small>Correct Formatting/Formulas</small></article>
        <article><span>Tasks Missed</span><strong style="color:#b91c1c;">${eff.wrongCount} / ${eff.totalQuestions || 15}</strong><small>Unattempted / Incomplete</small></article>
        <article><span>Time Used</span><strong>${formatDuration(eff.durationSeconds || 0)}</strong><small>Out of 10:00 Mins</small></article>
        <article><span>Cut/Copy/Paste/R-Click</span><strong>Blocked (${eff.blockedShortcutAttempts || 0})</strong><small>Ctrl+Z &amp; Backspace Allowed</small></article>
        <article><span>Text Deletion Penalty</span><strong>${eff.corruptedPartsCount || 0} Parts</strong><small>RSSB Page-2 Rule Checked</small></article>
        <article><span>Accuracy Percentage</span><strong>${Math.round(((Number(eff.marksOutOf25) || 0) / 25) * 100)}%</strong><small>${eff.qualified ? 'Qualified' : 'Below Cutoff'}</small></article>
      </div>

      <div class="rssb-eff-solutions-wrap">
        <h4>📋 All 15 Questions — Task-Wise Evaluation &amp; Official Step-by-Step Solutions</h4>
        <div class="rssb-eff-q-table-list">
          ${breakdown.map(item => `
            <div class="o19-solution-card ${item.solved ? 'is-correct' : 'is-wrong'}">
              <div class="o19-sol-head">
                <span class="o19-sol-title">
                  Q${item.qNum}. ${escapeHtml(item.title)}
                  <small style="font-weight:700;color:#64748b;">[${escapeHtml(item.difficulty)} · ${item.maxMarks25} Marks (25-Scale)]</small>
                </span>
                <span class="o19-sol-status ${item.solved ? 'pass' : 'fail'}">
                  ${item.solved ? `✓ ${item.earnedMarks25} / ${item.maxMarks25} Marks` : (item.partDeletedPenalty ? `✗ 0 / ${item.maxMarks25} (Text Deleted Penalty)` : `✗ 0 / ${item.maxMarks25} Missed`)}
                </span>
              </div>
              ${Array.isArray(item.checks) && item.checks.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">${item.checks.map(chk => `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${chk.passed ? "#dcfce7" : "#fee2e2"};color:${chk.passed ? "#15803d" : "#b91c1c"};">${chk.passed ? "✓" : "✗"} ${escapeHtml(chk.label)}</span>`).join(" ")}</div>` : ""}
              <div class="o19-sol-steps-box">
                <span class="o19-sol-steps-title">💡 Step-by-Step Ribbon Path &amp; Solution:</span>
                <div class="o19-sol-steps-ol">
                  ${(item.solutionSteps || []).map(st => `<div style="margin-bottom:3px;">${escapeHtml(st)}</div>`).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `
}

function buildRssbCompleteReportMarkup(record) {
  const p1 = record.hindiTyping || {}
  const p2 = record.englishTyping || {}
  const p3 = record.efficiency1 || {}
  const p4 = record.efficiency2 || {}

  return `
    <header class="rssb-hall-topbar screen-only">
      <div class="rssb-hall-brand">
        <span class="rssb-hall-badge">FINAL EXAM HALL SCORECARD · 4 PAPERS</span>
        <div>
          <strong>RSSB LDC Phase-II Complete Exam Result — Mock Exam #${String(record.testNo).padStart(2, '0')}</strong>
          <small>Roll No.: admin · Candidate Name: admin · User ID: admin · Completed: ${escapeHtml(record.completedAt || '')}</small>
        </div>
      </div>
      <div class="rssb-hall-candidate-strip">
        <button type="button" class="rssb-win-btn primary" id="rssb-print-full-report">🖨️ Print / Save PDF</button>
        <button type="button" class="rssb-win-btn" id="rssb-retry-this-exam">↻ Retry Test #${String(record.testNo).padStart(2, '0')}</button>
        <button type="button" class="rssb-win-btn" id="rssb-back-to-80">📋 Back to 80 Tests</button>
        <button type="button" class="rssb-abort-btn" id="rssb-close-to-home">⌂ Home</button>
      </div>
    </header>

    <div class="rssb-hall-scroll-body" id="rssb-printable-report-area">
      <div class="rssb-final-report-container">
        <section class="rssb-final-uploading-banner">
          <div class="rssb-upload-left">
            <span class="rssb-upload-tag">FINAL UPLOADING SCREEN · राजस्थान कर्मचारी चयन बोर्ड, जयपुर</span>
            <h2>Your Files Uploaded Successfully · चारों प्रश्न पत्र सफलतापूर्वक सबमिट हो गए हैं</h2>
            <div class="rssb-upload-ident">
              <span><strong>Name :</strong> <code>admin</code></span>
              <span><strong>Roll No. :</strong> <code>admin</code></span>
              <span><strong>User ID :</strong> <code>admin</code></span>
              <span><strong>Password :</strong> <code>admin</code></span>
              <span><strong>Mock Exam :</strong> <code>#${String(record.testNo).padStart(2, '0')} (${escapeHtml(record.setCode || '')})</code></span>
            </div>
          </div>
          <ul class="rssb-upload-checklist">
            <li><span>✓</span> <strong>Hindi Typing Speed Test</strong> (हिन्दी टंकण गति परीक्षण — Ex #${p1.exerciseNo || (301 - record.testNo)})</li>
            <li><span>✓</span> <strong>English Typing Speed Test</strong> (अंग्रेजी टंकण गति परीक्षण — Ex #${p2.exerciseNo || (301 - record.testNo)})</li>
            <li><span>✓</span> <strong>${escapeHtml(p3.shortTitle || 'Efficiency Test 1')}</strong> (${escapeHtml(p3.fileId || '')})</li>
            <li><span>✓</span> <strong>${escapeHtml(p4.shortTitle || 'Efficiency Test 2')}</strong> (${escapeHtml(p4.fileId || '')})</li>
          </ul>
        </section>

        <section class="rssb-master-scorecard">
          <div class="rssb-master-head">
            <div>
              <span class="eyebrow">RAJASTHAN STAFF SELECTION BOARD (RSSB), JAIPUR · PHASE-II CONSOLIDATED SCORECARD</span>
              <h3>लिपिक ग्रेड-II / कनिष्ठ सहायक फेज-II — चारों प्रश्न पत्रों का समेकित परीक्षा परिणाम</h3>
              <p>नोट: उत्तीर्ण होने हेतु चारों प्रश्न पत्रों में अलग-अलग न्यूनतम 9.00 अंक (SC/ST प्रवर्ग हेतु 5% शिथिलीकरण सहित 7.75 अंक) प्राप्त करना अनिवार्य है।</p>
            </div>
            <div class="rssb-grand-total-badge ${record.overallQualified ? 'pass' : 'fail'}">
              <small>GRAND TOTAL (कुल प्राप्तांक)</small>
              <strong>${Number(record.totalMarksOutOf100 || 0).toFixed(2)} / 100.00</strong>
              <span>${record.overallQualified
                ? '🏆 OVERALL QUALIFIED (उत्तीर्ण)'
                : (record.overallScStQualified ? '◐ QUALIFIED UNDER SC/ST 5% RELAXATION' : '✗ NOT QUALIFIED (अनुत्तीर्ण — किसी भाग में < 9 अंक)')}</span>
            </div>
          </div>

          <table class="rssb-scheme-table rssb-scorecard-table">
            <thead>
              <tr>
                <th>प्रश्न पत्र सं.</th>
                <th>विषय (Paper Subject &amp; Exercise)</th>
                <th>समय (Time)</th>
                <th>पूर्णांक (Max Marks)</th>
                <th>अर्हता अंक (Min Qualifying)</th>
                <th>प्रदर्शन सारांश (Speed / Tasks Solved)</th>
                <th>प्राप्तांक (Marks Obtained)</th>
                <th>परिणाम (Status)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1</strong></td>
                <td><strong>हिन्दी टंकण गति परीक्षण (Hindi Speed Test)</strong><br><small>Exercise #${p1.exerciseNo || ''} (${escapeHtml(p1.exerciseId || '')})</small></td>
                <td>${formatDuration(p1.durationSeconds || 0)} / 10m</td>
                <td>25.00</td>
                <td>9.00 <small>(SC/ST: 7.75)</small></td>
                <td><strong>${p1.netWpm5Char || 0} Net WPM</strong> (5-Char) · ${p1.correctWords || 0}/${p1.totalPassageWords || 400} Words · ${p1.keystrokes || 0} Keys</td>
                <td><strong style="font-size:16px;color:#1e40af;">${Number(p1.marksOutOf25 || 0).toFixed(2)} / 25.00</strong></td>
                <td><span class="rssb-status-pill ${p1.qualified ? 'pass' : 'fail'}">${p1.qualified ? '✓ उत्तीर्ण (Pass)' : '✗ अनुत्तीर्ण (< 9)'}</span></td>
              </tr>
              <tr>
                <td><strong>2</strong></td>
                <td><strong>अंग्रेजी टंकण गति परीक्षण (English Speed Test)</strong><br><small>Exercise #${p2.exerciseNo || ''} (${escapeHtml(p2.exerciseId || '')})</small></td>
                <td>${formatDuration(p2.durationSeconds || 0)} / 10m</td>
                <td>25.00</td>
                <td>9.00 <small>(SC/ST: 7.75)</small></td>
                <td><strong>${p2.netWpm5Char || 0} Net WPM</strong> (5-Char) · ${p2.correctWords || 0}/${p2.totalPassageWords || 500} Words · ${p2.keystrokes || 0} Keys</td>
                <td><strong style="font-size:16px;color:#1e40af;">${Number(p2.marksOutOf25 || 0).toFixed(2)} / 25.00</strong></td>
                <td><span class="rssb-status-pill ${p2.qualified ? 'pass' : 'fail'}">${p2.qualified ? '✓ उत्तीर्ण (Pass)' : '✗ अनुत्तीर्ण (< 9)'}</span></td>
              </tr>
              <tr>
                <td><strong>3</strong></td>
                <td><strong>${escapeHtml(p3.paperTitle || 'Paper 3: Efficiency Test 1')}</strong><br><small>File: ${escapeHtml(p3.fileId || '')}</small></td>
                <td>${formatDuration(p3.durationSeconds || 0)} / 10m</td>
                <td>25.00</td>
                <td>9.00 <small>(SC/ST: 7.75)</small></td>
                <td><strong>${p3.solvedCount || 0} / 15 Tasks Solved</strong> · Raw: ${p3.rawEarned50 || 0}/50</td>
                <td><strong style="font-size:16px;color:#1e40af;">${Number(p3.marksOutOf25 || 0).toFixed(2)} / 25.00</strong></td>
                <td><span class="rssb-status-pill ${p3.qualified ? 'pass' : 'fail'}">${p3.qualified ? '✓ उत्तीर्ण (Pass)' : '✗ अनुत्तीर्ण (< 9)'}</span></td>
              </tr>
              <tr>
                <td><strong>4</strong></td>
                <td><strong>${escapeHtml(p4.paperTitle || 'Paper 4: Efficiency Test 2')}</strong><br><small>File: ${escapeHtml(p4.fileId || '')}</small></td>
                <td>${formatDuration(p4.durationSeconds || 0)} / 10m</td>
                <td>25.00</td>
                <td>9.00 <small>(SC/ST: 7.75)</small></td>
                <td><strong>${p4.solvedCount || 0} / 15 Tasks Solved</strong> · Raw: ${p4.rawEarned50 || 0}/50</td>
                <td><strong style="font-size:16px;color:#1e40af;">${Number(p4.marksOutOf25 || 0).toFixed(2)} / 25.00</strong></td>
                <td><span class="rssb-status-pill ${p4.qualified ? 'pass' : 'fail'}">${p4.qualified ? '✓ उत्तीर्ण (Pass)' : '✗ अनुत्तीर्ण (< 9)'}</span></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"><strong>कुल योग (GRAND TOTAL — ALL 4 PAPERS)</strong></td>
                <td><strong>100.00</strong></td>
                <td><strong>36.00 (9×4)</strong></td>
                <td><strong>Roll No.: admin · Candidate: admin</strong></td>
                <td><strong style="font-size:18px;color:#0f172a;">${Number(record.totalMarksOutOf100 || 0).toFixed(2)} / 100.00</strong></td>
                <td><span class="rssb-status-pill ${record.overallQualified ? 'pass' : 'fail'}">${record.overallQualified ? '✓ QUALIFIED' : '✗ NOT QUALIFIED'}</span></td>
              </tr>
            </tfoot>
          </table>
        </section>

        <div class="rssb-detail-tabs-bar screen-only">
          <span>Jump to Separate Paper Report:</span>
          <button type="button" class="rssb-jump-btn active" data-rssb-jump="all">Show All 4 Papers</button>
          <button type="button" class="rssb-jump-btn" data-rssb-jump="1">1. Hindi Typing (${Number(p1.marksOutOf25 || 0).toFixed(2)}/25)</button>
          <button type="button" class="rssb-jump-btn" data-rssb-jump="2">2. English Typing (${Number(p2.marksOutOf25 || 0).toFixed(2)}/25)</button>
          <button type="button" class="rssb-jump-btn" data-rssb-jump="3">3. ${escapeHtml(p3.shortTitle || 'Efficiency 1')} (${Number(p3.marksOutOf25 || 0).toFixed(2)}/25)</button>
          <button type="button" class="rssb-jump-btn" data-rssb-jump="4">4. ${escapeHtml(p4.shortTitle || 'Efficiency 2')} (${Number(p4.marksOutOf25 || 0).toFixed(2)}/25)</button>
        </div>

        ${buildRssbTypingPaperDetailHTML(p1, 1)}
        ${buildRssbTypingPaperDetailHTML(p2, 2)}
        ${buildRssbEfficiencyPaperDetailHTML(p3, 3)}
        ${buildRssbEfficiencyPaperDetailHTML(p4, 4)}
      </div>
    </div>
  `
}

function bindRssbCompleteReportEvents(root, record, isFreshSubmission) {
  root.querySelector('#rssb-print-full-report')?.addEventListener('click', () => {
    document.body.classList.add('printing-rssb-report')
    window.print()
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-rssb-report'), { once: true })
  })
  root.querySelector('#rssb-retry-this-exam')?.addEventListener('click', () => {
    launchRssbExamHallSession(record.testNo)
  })
  root.querySelector('#rssb-back-to-80')?.addEventListener('click', () => {
    closeRssbExamOverlay()
  })
  root.querySelector('#rssb-close-to-home')?.addEventListener('click', () => {
    stopRssbExamTimer()
    document.querySelector('#rssb-exam-hall-fullscreen')?.remove()
    renderSection('home')
  })

  root.querySelectorAll('[data-rssb-jump]').forEach(btn => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-rssb-jump]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const target = btn.dataset.rssbJump
      ;[1, 2, 3, 4].forEach(num => {
        const el = root.querySelector(`#rssb-report-paper-${num}`)
        if (el) {
          el.style.display = (target === 'all' || String(num) === target) ? '' : 'none'
        }
      })
    })
  })
}

renderHome()
loadPracticeExerciseData().then((exercises) => {
  practiceExerciseData = exercises
  selectedExerciseId = exercises.find((item) => item.language === 'en')?.id || 'en-001'
  if (currentSection === 'practice') renderSection('practice')
}).catch((error) => {
  console.error('Failed to load typing exercises:', error)
  if (currentSection === 'practice') {
    const status = document.querySelector('#typing-status')
    if (status) status.textContent = `Exercise list could not be loaded: ${error.message || error}`
  }
})