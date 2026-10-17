const REPORT_HISTORY_KEY = 'ag-typing-reports'

export function readReportHistory() {
  try {
    const stored = localStorage.getItem(REPORT_HISTORY_KEY)
    if (!stored) return []
    const history = JSON.parse(stored)
    if (Array.isArray(history)) return history
    console.warn('Ignoring invalid typing report history: expected an array.')
  } catch (error) {
    console.warn('Failed to read typing report history:', error)
  }
  return []
}

export function saveReportRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new TypeError('A report record must be a non-null object.')
  }

  try {
    const history = readReportHistory()
    history.unshift(record)
    localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('Failed to save report:', error)
    throw error
  }
}

export function calculateDetailedMetrics(typed, target, elapsedMs) {
  const input = String(typed ?? '')
  const passage = String(target ?? '')
  const durationMs = Number.isFinite(Number(elapsedMs)) ? Math.max(0, Number(elapsedMs)) : 0
  const minutes = Math.max(durationMs / 60000, 1 / 60)

  let correct = 0
  for (let index = 0; index < input.length; index++) {
    if (input[index] === passage[index]) correct++
  }

  const errors = input.length - correct
  const words = input.trim() ? input.trim().split(/\s+/).length : 0
  const grossWpm = Math.round((input.length / 5) / minutes)
  const netWpm = Math.max(0, Math.round((correct / 5) / minutes))

  return {
    correct,
    errors,
    wpm: netWpm,
    grossWpm,
    netWpm,
    accuracy: input.length ? Math.round((correct / input.length) * 100) : 100,
    words,
    typed: input.length,
    completion: passage.length ? Math.min(100, Math.round((input.length / passage.length) * 100)) : 0,
    errorRate: input.length ? Math.round((errors / input.length) * 100) : 0,
  }
}

export function getPerformanceBand(wpm) {
  const speed = Number.isFinite(Number(wpm)) ? Number(wpm) : 0
  if (speed >= 60) return { label: 'Professional', color: '#16a34a' }
  if (speed >= 40) return { label: 'Advanced', color: '#2563eb' }
  if (speed >= 25) return { label: 'Intermediate', color: '#d97706' }
  return { label: 'Beginner', color: '#dc2626' }
}

export function formatDuration(seconds) {
  const duration = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0
  const wholeSeconds = Math.floor(duration)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainder = wholeSeconds % 60
  return `${minutes}m ${remainder}s`
}

export function analyzeWords(typed, target) {
  const inputWords = [...String(typed ?? '').matchAll(/\S+/g)]
  const targetWords = [...String(target ?? '').matchAll(/\S+/g)]
  const words = targetWords.map((match, index) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
    typed: inputWords[index]?.[0] ?? '',
    correct: inputWords[index]?.[0] === match[0],
  }))
  const attemptedWords = inputWords.length
  const correctWords = words.slice(0, attemptedWords).filter((word) => word.correct).length
  const incorrectWords = Math.max(0, attemptedWords - correctWords)
  const untypedWords = Math.max(0, targetWords.length - Math.min(attemptedWords, targetWords.length))

  return {
    words,
    correctWords,
    incorrectWords,
    attemptedWords,
    untypedWords,
    totalWords: targetWords.length,
  }
}
