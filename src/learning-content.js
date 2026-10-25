import handsGuideUrl from './hands-guide.png'
import typeGuideUrl from './type.png'
import { escapeHtml } from './text-utils.js'
import { renderKeyboard } from './keyboard-visual.js'
import { readLessonProgress, saveLessonResult, lessonCompletion } from './lesson-progress.js'
import { englishLearningData } from './learning-english.js'
import { hindiLearningData } from './learning-hindi.js'

function banksForLanguage(language = 'en') {
  const data = language === 'hi' ? hindiLearningData : englishLearningData
  const result = {}
  for (const [key, item] of Object.entries(data)) {
    result[key] = {
      keys: item.keys || [],
      patterns: item.patterns || item.keys || [],
      words: item.words || [],
      sentences: item.sentences || [],
      paragraphs: item.paragraphs || []
    }
  }
  result.punctuation = result.shift || result.bottom || result.mixed
  result.shift = result.shift || result.mixed
  return result
}

// 6 Systematic Sidebar Categories
const lessonSpecs = [
  [
    'home-row',
    'Home Row Practice',
    'Beginner',
    'asdf · jkl;',
    'a s d f g · h j k l ;',
    'Master the home row keys, word formations, and fluent sentences.',
    'Keep fingers curved on home keys and return immediately after reaches.',
    'home',
    'keys',
    {
      titleEn: 'Home Row Finger Placement',
      titleHi: 'होम रो पर उँगलियाँ रखने का सही तरीका (No Shift)',
      en: 'Place your Left Hand fingers on A (Pinky), S (Ring), D (Middle), F (Index) and Right Hand fingers on J (Index), K (Middle), L (Ring), ; (Pinky). Feel the small raised bumps on F and J. Your index fingers also reach G and H in the center. Both thumbs rest lightly on the Spacebar.',
      hi: 'कृति देव / डेवलिस / मंगल रेमिंगटन में बाएँ हाथ की उँगलियाँ A(ं), S(े), D(क), F(ि) पर और बीच में G(ह) पर जाएँगी। दाएँ हाथ की उँगलियाँ H(ी), J(र), K(ा), L(स), ;(य), \'(श) पर रहेंगी। F और J के उभार को महसूस करें और दोनों अंगूठे Spacebar पर रखें।',
      mapEn: 'Left: A S D F (G)  |  Right: (H) J K L ; \'  |  Thumbs: Spacebar',
      mapHi: 'बायाँ हाथ: A(ं) S(े) D(क) F(ि) G(ह)  |  दायाँ हाथ: H(ी) J(र) K(ा) L(स) ;(य) \'(श)'
    }
  ],
  [
    'top-row',
    'Top Row Practice',
    'Beginner',
    'qwerty · uiop',
    'q w e r t · y u i o p',
    'Expand reach to the top row for extended vocabulary.',
    'Keep palms steady and move only the required finger upward.',
    'top',
    'keys',
    {
      titleEn: 'Top Row Finger Movement',
      titleHi: 'टॉप रो पर उँगलियाँ चलाने का नियम (No Shift)',
      en: 'Keep all 8 fingers resting on the Home Row (A S D F - J K L ;). To press any Top Row key (Q W E R T - Y U I O P), lift ONLY that specific finger one step up, press the key lightly, and immediately bring the finger back to its Home Row key.',
      hi: 'अपनी उँगलियाँ होम रो पर ही टिकाए रखें। टॉप रो के अक्षर Q(ु), W(ू), E(म), R(त), T(ज) और Y(ल), U(न), I(प), O(व), P(च), [(ख्), ](,) दबाने के लिए केवल संबंधित उँगली को एक कदम ऊपर ले जाएँ और बटन दबाकर तुरंत वापस होम रो पर लाएँ।',
      mapEn: 'A→Q, S→W, D→E, F→R/T  |  J→Y/U, K→I, L→O, ;→P',
      mapHi: 'बायाँ: Q(ु) W(ू) E(म) R(त) T(ज)  |  दायाँ: Y(ल) U(न) I(प) O(व) P(च) [(ख्) ](,)'
    }
  ],
  [
    'bottom-row',
    'Bottom Row Practice',
    'Beginner',
    'zxcv · bnm , . /',
    'z x c v b · n m , . /',
    'Practice bottom row keys and punctuation smoothly.',
    'Control downward movement with precision and light pressure.',
    'bottom',
    'keys',
    {
      titleEn: 'Bottom Row Finger Movement',
      titleHi: 'बॉटम रो पर उँगलियाँ चलाने का नियम (No Shift)',
      en: 'Keep your hands anchored on the Home Row. To press a Bottom Row key (Z X C V B - N M , . /), curl the assigned finger slightly downward, tap the key, and return immediately to the Home Row position.',
      hi: 'अपने हाथों को होम रो पर स्थिर रखें। बॉटम रो के अक्षर Z(्र), X(ग), C(ब), V(अ), B(इ) और N(द), M(उ), ,(ए), .(ण), /(ध्) टाइप करने के लिए संबंधित उँगली को नीचे लाएँ और दबाकर तुरंत वापस होम रो पर लौट आएँ।',
      mapEn: 'A→Z, S→X, D→C, F→V/B  |  J→N/M, K→Comma(,), L→Dot(.), ;→Slash(/)',
      mapHi: 'बायाँ: Z(्र) X(ग) C(ब) V(अ) B(इ)  |  दायाँ: N(द) M(उ) ,(ए) .(ण) /(ध्)'
    }
  ],
  [
    'number-row',
    'Number Row & Data',
    'Intermediate',
    'Numbers 1 to 0',
    '1 2 3 4 5 6 7 8 9 0',
    'Build data entry speed with digits and numeric tokens.',
    'Reach cleanly to the number row without looking down.',
    'numbers',
    'keys',
    {
      titleEn: 'Number Row Reach Guide',
      titleHi: 'नंबर रो (1 से 0 तथा - =) पर उँगलियाँ चलाने का नियम',
      en: 'Start from the Home Row. Stretch your finger two rows upward to hit the number keys: Left Pinky→1, Ring→2, Middle→3, Index→4 & 5. Right Index→6 & 7, Middle→8, Ring→9, Pinky→0, -, =. Return to the Home Row after each number.',
      hi: 'होम रो से दो कदम ऊपर उँगली ले जाकर नंबर दबाएँ: 1 से 0 तक अंक और -(.) तथा =(त्र) आते हैं। Shift के साथ दबाने पर !(1), /(2), रु(3), +(4), :(5), \'(6), -(7), "(8), ;(9), द्ध(0), ऋ(-), .(+) बनते हैं।',
      mapEn: 'A→1, S→2, D→3, F→4/5  |  J→6/7, K→8, L→9, ;→0',
      mapHi: 'No Shift: १ २ ३ ४ ५ ६ ७ ८ ९ ० . त्र  |  +Shift: ! / रु + : \' - " ; द्ध ऋ'
    }
  ],
  [
    'shift-special',
    'Shift & Special (Alt Codes)',
    'Intermediate+',
    'Shift keys · Half letters · Alt Codes',
    'Shift + Keys · Alt+0124 to Alt+0247',
    'Master half-letters (आधे अक्षर), Shift characters, and Alt-code special words.',
    'Use the opposite hand pinky finger to hold Shift while pressing the target key.',
    'shift',
    'keys',
    {
      titleEn: 'Shift Keys & Alt-Code Special Characters',
      titleHi: 'शिफ्ट (आधे अक्षर) और Alt+Code विशेष शब्द नियम',
      en: 'Hold Shift with the opposite hand pinky to type uppercase/half-letters. To type "श्र" (Shr), press Shift + j (since j produces र and Shift+j produces श्र). Use the top chart button to see all Alt-Codes (like Alt+0193 for प्र).',
      hi: '"श्र" (Shr) लिखने के लिए **Shift + j** दबाएँ (क्योंकि j से र बनता है और Shift+j से श्र बनता है). अन्य आधे अक्षर जैसे क् (Shift+d), थ् (Shift+f) और Alt Codes (जैसे Alt+0193 से प्र) का अभ्यास करें।',
      mapEn: 'Shr = Shift + j  |  Pra = Alt + 0193  |  Kra = Alt + 0216',
      mapHi: 'श्र = Shift + j  |  प्र = Alt + 0193  |  क्र = Alt + 0216'
    }
  ],
  [
    'mixed-row',
    'Pro Mixed Practice',
    'Advanced',
    'Full Keyboard',
    'Full keyboard access',
    'Ultimate multi-row speed and endurance flow.',
    'Maintain steady rhythm, perfect accuracy, and relaxed wrists.',
    'mixed',
    'keys',
    {
      titleEn: 'Pro Full Keyboard Mastery',
      titleHi: 'प्रो संपूर्ण कीबोर्ड अभ्यास नियम',
      en: 'Now all rows are combined! Keep your wrists floating slightly, eyes strictly on the screen, and fingers always returning to A S D F and J K L ;. Focus on smooth rhythm and 95%+ accuracy.',
      hi: 'अब सभी रो और मात्राओं का एक साथ अभ्यास करें! अपनी नज़र केवल स्क्रीन पर रखें, कलाई को टेबल पर न टिकाएँ और हर अक्षर को दबाने के बाद उँगलियाँ वापस होम रो पर लाएँ।',
      mapEn: 'All 10 Fingers Active  |  Eyes on Screen  |  Steady Rhythm',
      mapHi: 'सभी 10 उँगलियाँ सक्रिय  |  नज़र स्क्रीन पर  |  निरंतर लय'
    }
  ]
]

const krutiDevLysNormalMap = {
  '`': 'ृ', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९', '0': '०', '-': '.', '=': 'त्र',
  q: 'ु', w: 'ू', e: 'म', r: 'त', t: 'ज', y: 'ल', u: 'न', i: 'प', o: 'व', p: 'च', '[': 'ख्', ']': ',', '\\': '?',
  a: 'ं', s: 'े', d: 'क', f: 'ि', g: 'ह', h: 'ी', j: 'र', k: 'ा', l: 'स', ';': 'य', "'": 'श',
  z: '्र', x: 'ग', c: 'ब', v: 'अ', b: 'इ', n: 'द', m: 'उ', ',': 'ए', '.': 'ण', '/': 'ध्'
}

const krutiDevLysShiftMap = {
  '~': '्', '!': '!', '@': '/', '#': 'रु', '$': '+', '%': ':', '^': "'", '&': '-', '*': '"', '(': ';', ')': 'द्ध', '_': 'ऋ', '+': '.',
  Q: 'फ', W: 'ँ', E: 'म्', R: 'त्', T: 'ज्', Y: 'ल्', U: 'न्', I: 'प्', O: 'व्', P: 'च्', '{': 'क्ष्', '}': 'द्व', '|': 'द्य',
  A: '।', S: 'ै', D: 'क्', F: 'थ्', G: 'ळ', H: 'भ्', J: 'श्र', K: 'ज्ञ', L: 'स्', ':': 'रू', '"': 'ष्',
  Z: 'र्', X: 'ग्', C: 'ठ', V: 'ट', B: 'ठ', N: 'छ', M: 'ड', '<': 'ढ', '>': 'झ', '?': 'घ्'
}

const inscriptNormalMap = {
  '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९', '0': '०', '-': '-', '=': 'ृ',
  q: 'ौ', w: 'ै', e: 'ा', r: 'ी', t: 'ू', y: 'ब', u: 'ह', i: 'ग', o: 'द', p: 'ज', '[': 'ड', ']': '़',
  a: 'ो', s: 'े', d: '्', f: 'ि', g: 'ु', h: 'प', j: 'र', k: 'क', l: 'त', ';': 'च', "'": 'ट',
  z: 'े', x: 'ं', c: 'म', v: 'न', b: 'व', n: 'ल', m: 'स', ',': ',', '.': '.', '/': 'य'
}

const inscriptShiftMap = {
  Q: 'औ', W: 'ऐ', E: 'आ', R: 'ई', T: 'ऊ', Y: 'भ', U: 'ङ', I: 'घ', O: 'ध', P: 'झ', '{': 'ढ', '}': 'ञ',
  A: 'ओ', S: 'ए', D: 'अ', F: 'इ', G: 'उ', H: 'फ', J: 'ऱ', K: 'ख', L: 'थ', ':': 'छ', '"': 'ठ',
  X: 'ँ', C: 'ण', N: 'ळ', M: 'श', '<': 'ष', '>': '।', '?': 'य़'
}

const hindiAltCodesList = [
  { code: 'Alt + 0124', glyph: 'द्य', word: 'विद्या / विद्यालय' },
  { code: 'Alt + 0125', glyph: 'द्व', word: 'द्वार / विद्वान' },
  { code: 'Alt + 0152', glyph: 'ह्', word: 'चिह्न' },
  { code: 'Alt + 0161', glyph: 'ँ', word: 'चाँद / आँख (चंद्रबिंदु)' },
  { code: 'Alt + 0165', glyph: 'ञ', word: 'चञ्चल / पञ्च' },
  { code: 'Alt + 0170', glyph: 'ट्र', word: 'ट्रक / ट्रेन / राष्ट्र' },
  { code: 'Alt + 0193', glyph: 'प्र', word: 'प्रणाम / प्रकार' },
  { code: 'Alt + 0197', glyph: 'ऊ', word: 'ऊपर / ऊर्जा' },
  { code: 'Alt + 0204', glyph: 'द्म', word: 'पद्म' },
  { code: 'Alt + 0205', glyph: 'ट्ट', word: 'छुट्टी / मिट्टी' },
  { code: 'Alt + 0206', glyph: 'द्ध', word: 'युद्ध / शुद्ध / बुद्ध' },
  { code: 'Alt + 0207', glyph: 'ड्ड', word: 'गड्ढा / लड्डू' },
  { code: 'Alt + 0216', glyph: 'क्र', word: 'चक्र / क्रांति / क्रम' },
  { code: 'Alt + 0221', glyph: 'फ्र', word: 'फ्रांस / फ्री' },
  { code: 'Alt + 0224', glyph: 'ह्न', word: 'चिह्न / मध्याह्न' },
  { code: 'Alt + 0225', glyph: 'ह्य', word: 'बाह्य / सह्य' },
  { code: 'Alt + 0226', glyph: 'ह्र', word: 'हृदय / ह्रास' },
  { code: 'Alt + 0227', glyph: 'ह्म', word: 'ब्रह्मा / ब्राह्मण' },
  { code: 'Alt + 0228', glyph: 'क्त', word: 'भक्त / शक्ति / रक्त' },
  { code: 'Alt + 0233', glyph: 'त्र', word: 'पत्र / मित्र / चरित्र' },
  { code: 'Alt + 0243', glyph: 'स्त्र', word: 'शस्त्र / अस्त्र / वस्त्र' }
]

function getActiveHindiMaps() {
  const layout = localStorage.getItem('ag-hindi-layout') || 'kruti-dev-010'
  if (layout === 'inscript') {
    return { normal: inscriptNormalMap, shift: inscriptShiftMap }
  }
  return { normal: krutiDevLysNormalMap, shift: krutiDevLysShiftMap }
}

const DEVANAGARI_COMBINING_MARKS = new Set([
  '\u0901', '\u0902', '\u0903', '\u093A', '\u093B', '\u093C',
  '\u093E', '\u093F', '\u0940', '\u0941', '\u0942', '\u0943', '\u0944',
  '\u0945', '\u0946', '\u0947', '\u0948', '\u0949', '\u094A', '\u094B', '\u094C',
  '\u094D', '\u0951', '\u0952', '\u0962', '\u0963'
])

function splitIntoVisualSyllables(str) {
  const units = []
  let i = 0
  while (i < str.length) {
    let start = i
    let text = str[i]
    i++
    while (i < str.length) {
      const ch = str[i]
      const prev = str[i - 1]
      if (DEVANAGARI_COMBINING_MARKS.has(ch)) {
        text += ch
        i++
      } else if (prev === '\u094D' && ch !== ' ' && ch !== '\n') {
        text += ch
        i++
      } else {
        break
      }
    }
    units.push({ text, start, end: i })
  }
  return units
}

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function buildExerciseSet(bankName, stageId, source) {
  const bank = banksForLanguage(activeLanguage)[bankName] || banksForLanguage(activeLanguage).mixed
  const cleanSingleSpace = str => String(str || '').replace(/\s+/g, ' ').trim()

  if (stageId === 'keys') {
    if (activeLanguage === 'hi') {
      const hindiRowKeyDrills = {
        home: [
          'क र क र k r क क र र क र क र',
          'ह स H s ह ह स स क ह र स',
          'य श य श क ह र s य श क ह र s',
          'का हा रा सा या शा का हा रा सा',
          'कि हि रि सि की ही री सी के हे रे से'
        ],
        top: [
          'म त म T m म त त म त म त',
          'ज ल ज ल ज ज L l म त ज ल',
          'न प व च म त ज ल न प व च',
          'कु कू मु मू तु तू जु जू लु लू',
          'मन तन जन वन कमल कलम नमन चमन'
        ],
        bottom: [
          'ग ब g b ग ग ब ब ग ब ग ब',
          'अ इ द उ अ अ इ इ द द उ उ',
          'ए ण g b अ इ द उ ए ण',
          'अब जब कब तब सब अगर मगर डगर नगर',
          'प्रणाम प्रमाण परिणाम ग्राम क्रम भ्रम श्रम'
        ],
        numbers: [
          '१ २ ३ ४ ५ ६ ७ ८ ९ ०',
          '१ १ २ ² ३ ३ ४ ४ ५ ५ ६ ६ ७ ७ ८ ८ ९ ९ ० ०',
          '१० २० ३० ४० ५० ६० ७० ८० ९० १००',
          '1 2 3 4 5 6 7 8 9 0 10 20 50 100'
        ],
        shift: [
          'फ ळ श्र ज्ञ रू फ ळ श्र ज्ञ रू',
          'ठ ट छ ड ढ झ घ ठ ट छ ड ढ झ घ',
          'क्ष त्र ज्ञ श्र द्य द्व द्ध क्त प्र क्र ट्र',
          'फल फूल श्रीमान ज्ञान रूप ठंड टमाटर छत',
          'विद्या विद्यालय शुद्ध बुद्ध भक्त शक्ति राष्ट्र चक्र'
        ],
        mixed: [
          'क ह र s य श म t ज ल न p v च',
          'ग ब अ इ द उ ए ण फ श्र ज्ञ रू क्ष त्र',
          'कर पर जब तब मन वन कमल कलम सफल सरल'
        ]
      }
      return (hindiRowKeyDrills[bankName] || hindiRowKeyDrills.home).map(cleanSingleSpace)
    }

    const rawKeys = (bank.keys || []).flatMap(x => String(x).trim().split(/\s+/)).filter(Boolean)
    const k = rawKeys.map(x => x.toLowerCase())
    if (k.length >= 10) {
      const drill1 = `${k[3]}${k[6]} ${k[3]}${k[6]} ${k[3]}${k[3]} ${k[6]}${k[6]} ${k[3]}${k[6]} ${k[3]}${k[6]}`
      const drill2 = `${k[2]}${k[7]} ${k[2]}${k[7]} ${k[2]}${k[2]} ${k[7]}${k[7]} ${k[3]}${k[2]} ${k[6]}${k[7]}`
      const drill3 = `${k[1]}${k[8]} ${k[1]}${k[8]} ${k[1]}${k[1]} ${k[8]}${k[8]} ${k[2]}${k[1]} ${k[7]}${k[8]}`
      const drill4 = `${k[0]}${k[9]} ${k[0]}${k[9]} ${k[4]}${k[5]} ${k[3]}${k[4]} ${k[6]}${k[5]} ${k[0]}${k[9]}`
      const drill5 = `${k.slice(0, 5).join(' ')}${k.slice(5, 10).join(' ')} ${k.slice(0, 5).join(' ')}${k.slice(5, 10).join(' ')}`
      return [drill1, drill2, drill3, drill4, drill5].map(cleanSingleSpace)
    }
    return [cleanSingleSpace(k.join(' '))]
  }

  let base = stageId === 'patterns' ? (bank.patterns || bank.keys) : stageId === 'words' ? bank.words : (bank.sentences || bank.paragraphs)
  if (!Array.isArray(base) || !base.length) base = source || ['practice slowly']
  base = [...new Set(base.map(item => cleanSingleSpace(activeLanguage === 'en' ? String(item).toLowerCase() : String(item))).filter(Boolean))]

  if (activeLanguage === 'hi' && stageId === 'patterns') {
    const standaloneMatras = new Set(['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', '्', 'ं', '्र', '़'])
    base = base.map(line => line.split(/\s+/).filter(tok => !standaloneMatras.has(tok)).join(' ')).filter(Boolean)
    if (!base.length) base = (bank.words || []).slice(0, 24)
  }

  if (activeLanguage === 'hi' && stageId === 'words') {
    base = base.filter(text => !text.includes(' '))
  }

  if (!base.length) base = [cleanSingleSpace((bank.words || bank.keys || []).slice(0, 15).join(' ')) || 'practice accurately']

  if (stageId === 'patterns') {
    const chunks = chunkArray(base, 3)
    return chunks.map(chunk => cleanSingleSpace(chunk.join(' ')))
  }

  if (stageId === 'words') {
    const chunks = chunkArray(base, 20)
    return chunks.map(chunk => cleanSingleSpace(chunk.join(' ')))
  }

  const sentenceChunks = chunkArray(base, 4)
  return sentenceChunks.map(chunk => cleanSingleSpace(chunk.join(' ')))
}

const stageNames = [['keys', '1 Key'], ['patterns', 'Patterns'], ['words', 'Words'], ['sentences', 'Sentences']]
let activeLanguage = localStorage.getItem('ag-language') === 'hi' ? 'hi' : 'en'

function buildLessons(language = 'en') {
  activeLanguage = language === 'hi' ? 'hi' : 'en'
  const banks = banksForLanguage(activeLanguage)
  const rowBankMapping = {
    'home-row': 'home',
    'top-row': 'top',
    'bottom-row': 'bottom',
    'number-row': 'numbers',
    'shift-special': 'shift',
    'mixed-row': 'mixed'
  }

  return lessonSpecs.map(([id, title, level, row, keys, goal, tip, bankName, defaultStage, guide]) => {
    const resolvedBankName = rowBankMapping[id] || bankName || 'mixed'
    const bank = banks[resolvedBankName] || banks.mixed
    const stages = stageNames.map(([sid, label], stageIdx) => {
      const source = bank[sid] || bank.sentences
      const exercises = buildExerciseSet(resolvedBankName, sid, source)
      return { id: sid, label: `${stageIdx + 1}.${label}`, type: label, exercises, target: exercises[0] }
    })
    const translatedTitle = activeLanguage === 'hi' ? ({
      'Home Row Practice': 'होम रो अभ्यास (क ह र स य)',
      'Top Row Practice': 'टॉप रो अभ्यास (म त ज ल न प)',
      'Bottom Row Practice': 'बॉटम रो अभ्यास (ग b अ इ द उ)',
      'Number Row & Data': 'नंबर रो और डेटा (१ से ०)',
      'Shift & Special (Alt Codes)': 'शिफ्ट और विशेष अक्षर (Alt Codes)',
      'Pro Mixed Practice': 'प्रो संपूर्ण कीबोर्ड अभ्यास'
    }[title] || title) : title
    return { id, title: translatedTitle, level, row, keys, goal, tip, defaultStage: defaultStage || 'keys', guide, stages }
  })
}

export let lessons = buildLessons(activeLanguage)
export const totalExercises = lessons.reduce((sum, l) => sum + l.stages.reduce((n, s) => n + s.exercises.length, 0), 0)
let activeLesson = lessons[0].id
let activeStage = lessons[0].defaultStage || 'keys'
let exerciseIndex = 0
let soundEnabled = localStorage.getItem('ag-learn-sound') !== 'off'
let tickHandle = null
let audioCtx = null

const sessionTotals = {
  started: false,
  startedAt: 0,
  pausedAt: 0,
  timerPaused: false,
  completedChars: 0,
  completedCorrect: 0,
  completedErrors: 0,
  completedWords: 0
}

function resetCumulativeSession() {
  sessionTotals.started = false
  sessionTotals.startedAt = 0
  sessionTotals.pausedAt = 0
  sessionTotals.timerPaused = false
  sessionTotals.completedChars = 0
  sessionTotals.completedCorrect = 0
  sessionTotals.completedErrors = 0
  sessionTotals.completedWords = 0
}

function currentLesson() { return lessons.find(l => l.id === activeLesson) || lessons[0] }
function currentStage(lesson = currentLesson()) { return lesson.stages.find(s => s.id === activeStage) || lesson.stages[0] }
function currentDrill() { const s = currentStage(); return s.exercises[exerciseIndex % s.exercises.length] }
function currentTarget() { return currentDrill() }

function sound(kind = 'key') {
  if (!soundEnabled) return
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain()
    const now = audioCtx.currentTime
    osc.type = 'sine'
    osc.frequency.value = kind === 'error' ? 180 : kind === 'complete' ? 880 : kind === 'correct' ? 620 : 340
    gain.gain.setValueAtTime(.0001, now)
    gain.gain.exponentialRampToValueAtTime(kind === 'key' ? .025 : .06, now + .008)
    gain.gain.exponentialRampToValueAtTime(.0001, now + (kind === 'error' ? .12 : .075))
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + .14)
  } catch {}
}

function countLineStats(target, typed) {
  let correct = 0, errors = 0
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === target[i]) correct++
    else errors++
  }
  const words = typed.trim() ? typed.trim().split(/\s+/).length : 0
  return { correct, errors, words, chars: typed.length }
}

function showFingerGuideModal(lesson) {
  if (!lesson?.guide) return
  let modal = document.querySelector('#learn-guide-modal')
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'learn-guide-modal'
    modal.className = 'learn-completion-modal'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    document.body.appendChild(modal)
  }
  const g = lesson.guide
  modal.innerHTML = `
    <div class="learn-completion-card" style="max-width:660px; text-align:left; padding:24px;">
      <h2 style="text-align:center; margin:0 0 4px 0; font-size:20px;">✋ ${escapeHtml(g.titleEn)} /${escapeHtml(g.titleHi)}</h2>
      <p style="text-align:center; color:#64748b; font-size:13px; margin:0 0 14px 0;">${escapeHtml(lesson.title)} (${escapeHtml(lesson.row)})</p>
      <div style="text-align:center; background:#f8fafc; border-radius:12px; padding:12px; margin-bottom:14px; border:1px solid #e2e8f0;">
        <img src="${typeGuideUrl}" alt="Keyboard Finger Placement Guide" style="max-height:210px; max-width:100%; width:auto; object-fit:contain; display:block; margin:0 auto 10px auto; border-radius:8px;" />
        <div style="font-weight:700; font-size:13px; color:#1e40af; background:#dbeafe; padding:6px 10px; border-radius:6px; display:inline-block;">
          ${escapeHtml(activeLanguage === 'hi' ? g.mapHi : g.mapEn)}
        </div>
      </div>
      <div style="background:#ffffff; padding:12px 14px; border-radius:8px; border-left:4px solid #2563eb; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <strong style="font-size:13px; color:#1e3a8a; display:block; margin-bottom:4px;">🇬🇧 English Instruction:</strong>
        <p style="font-size:13.5px; line-height:1.5; color:#334155; margin:0;">${escapeHtml(g.en)}</p>
      </div>
      <div style="background:#ffffff; padding:12px 14px; border-radius:8px; border-left:4px solid #16a34a; margin-bottom:18px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <strong style="font-size:13px; color:#14532d; display:block; margin-bottom:4px;">🇮🇳 हिंदी निर्देश:</strong>
        <p style="font-size:14px; line-height:1.6; color:#334155; margin:0;">${escapeHtml(g.hi)}</p>
      </div>
      <div style="text-align:center;">
        <button type="button" class="primary-button" id="learn-guide-start" style="width:100%; padding:12px; font-size:15px; font-weight:600;">
          Start Typing / अभ्यास शुरू करें →
        </button>
      </div>
    </div>`
  modal.hidden = false
  document.body.classList.add('learn-modal-open')
  modal.querySelector('#learn-guide-start')?.addEventListener('click', () => {
    modal.hidden = true
    document.body.classList.remove('learn-modal-open')
    document.querySelector('#learn-typing-input')?.focus({ preventScroll: true })
  }, { once: true })
}

function showAltCodesModal() {
  let modal = document.querySelector('#learn-altcodes-modal')
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'learn-altcodes-modal'
    modal.className = 'learn-completion-modal'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    document.body.appendChild(modal)
  }
  modal.innerHTML = `
    <div class="learn-completion-card" style="max-width:720px; text-align:left; padding:22px; max-height:88vh; overflow-y:auto;">
      <h2 style="text-align:center; margin:0 0 6px 0; font-size:19px;">⌨️ Kruti Dev 010 / DevLys 010 / Remington Special & Alt+Code Chart</h2>
      <p style="text-align:center; color:#475569; font-size:13px; margin:0 0 14px 0;">
        नीचे दिए गए विशेष अक्षर Shift या Alt + Numpad Code से बनते हैं (आपकी सुविधा के लिए प्रैक्टिस में संबंधित मुख्य बटन दबाने पर भी ये अपने आप टाइप हो जाएँगे):
      </p>
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:16px;">
        ${hindiAltCodesList.map(item => `
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:8px 10px; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <strong style="font-size:18px; color:#1d4ed8;">${escapeHtml(item.glyph)}</strong>
              <small style="display:block; color:#64748b; font-size:11px;">${escapeHtml(item.word)}</small>
            </div>
            <span style="background:#e0e7ff; color:#1e3a8a; font-weight:700; font-size:11.5px; padding:3px 7px; border-radius:5px;">
              ${escapeHtml(item.code)}
            </span>
          </div>
        `).join('')}
      </div>
      <div style="text-align:center;">
        <button type="button" class="primary-button" id="learn-altcodes-close" style="width:100%; padding:10px; font-size:14px;">
          Close Chart / बंद करें
        </button>
      </div>
    </div>`
  modal.hidden = false
  document.body.classList.add('learn-modal-open')
  modal.querySelector('#learn-altcodes-close')?.addEventListener('click', () => {
    modal.hidden = true
    document.body.classList.remove('learn-modal-open')
    document.querySelector('#learn-typing-input')?.focus({ preventScroll: true })
  }, { once: true })
}

function resolvePhysicalKey(char) {
  const ch = String(char || ' ')
  if (activeLanguage !== 'hi') return ch
  const { normal, shift } = getActiveHindiMaps()

  for (const [engKey, hindiGlyph] of Object.entries(normal)) {
    if (hindiGlyph === ch || hindiGlyph.replace('्', '') === ch) return engKey
  }
  for (const [engKey, hindiGlyph] of Object.entries(shift)) {
    if (hindiGlyph === ch || hindiGlyph.replace('्', '') === ch) return engKey.toLowerCase()
  }

  const krutiExactKeyMap = {
    'क': 'd', 'ख': '[', 'ग': 'x', 'घ': '/', 'ङ': 'u',
    'च': 'p', 'छ': 'n', 'ज': 't', 'झ': '.', 'ञ': 'p',
    'ट': 'v', 'ठ': 'c', 'ड': 'm', 'ढ': ',', 'ण': '.',
    'त': 'r', 'थ': 'f', 'द': 'n', 'ध': '/', 'न': 'u',
    'प': 'i', 'फ': 'q', 'ब': 'c', 'भ': 'h', 'म': 'e',
    'य': ';', 'र': 'j', 'ल': 'y', 'ळ': 'g', 'व': 'o',
    'श': "'", 'ष': "'", 'स': 'l', 'ह': 'g',
    'अ': 'v', 'आ': 'k', 'इ': 'b', 'ई': 'h', 'उ': 'm', 'ऊ': 'w',
    'ऋ': '-', 'ए': ',', 'ऐ': 's', 'ओ': 'k', 'औ': 's',
    'ा': 'k', 'ि': 'f', 'ी': 'h', 'ु': 'q', 'ू': 'w', 'ृ': '`',
    'े': 's', 'ै': 's', 'ो': 'k', 'ौ': 's', 'ं': 'a', 'ँ': 'w',
    '्': 'd', '्र': 'z', 'र्': 'z', '़': ']', '।': 'a',
    'श्र': 'j', 'ज्ञ': 'k', 'त्र': '=', 'क्ष': '['
  }
  return krutiExactKeyMap[ch] || ch
}

function applyHindiKeyboardLabels() {
  if (activeLanguage !== 'hi') return
  const { normal, shift } = getActiveHindiMaps()
  const shiftPairForKey = {
    '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')', '-': '_', '=': '+',
    q: 'Q', w: 'W', e: 'E', r: 'R', t: 'T', y: 'Y', u: 'U', i: 'I', o: 'O', p: 'P', '[': '{', ']': '}', '\\': '|',
    a: 'A', s: 'S', d: 'D', f: 'F', g: 'G', h: 'H', j: 'J', k: 'K', l: 'L', ';': ':', "'": '"',
    z: 'Z', x: 'X', c: 'C', v: 'V', b: 'B', n: 'N', m: 'M', ',': '<', '.': '>', '/': '?'
  }

  document.querySelectorAll('#learn-keyboard .virtual-key').forEach(key => {
    const code = String(key.dataset.key || key.textContent || '').trim().toLowerCase()
    const normalGlyph = normal[code]
    const shiftKey = shiftPairForKey[code]
    const shiftGlyph = shiftKey ? shift[shiftKey] : ''

    key.querySelector('.hindi-key-glyph')?.remove()
    if (normalGlyph || shiftGlyph) {
      const label = document.createElement('span')
      label.className = 'hindi-key-glyph'
      label.style.cssText = 'display:inline-flex; flex-direction:column; align-items:center; margin-left:4px; line-height:1.05;'
      label.innerHTML = `
        ${shiftGlyph ? `<small style="font-size:10px; font-weight:700; color:#d97706;">${escapeHtml(shiftGlyph)}</small>` : ''}
        ${normalGlyph ? `<strong style="font-size:14.5px; font-weight:800; color:#1d4ed8;">${escapeHtml(normalGlyph)}</strong>` : ''}
      `
      label.setAttribute('aria-hidden', 'true')
      key.appendChild(label)
    }
  })
}

export function renderLessons(language = (localStorage.getItem('ag-language') === 'hi' ? 'hi' : 'en')) {
  const nextLanguage = language === 'hi' ? 'hi' : 'en'
  if (nextLanguage !== activeLanguage) {
    lessons = buildLessons(nextLanguage)
    if (!lessons.some(l => l.id === activeLesson)) {
      activeLesson = lessons[0].id
      activeStage = lessons[0].defaultStage || 'keys'
    }
    exerciseIndex = 0
    resetCumulativeSession()
  }
  const progress = readLessonProgress()
  const overallDone = lessons.reduce((n, l) => n + lessonCompletion(l, progress).done, 0)
  const totalStages = lessons.reduce((n, l) => n + l.stages.length, 0)
  const lesson = currentLesson()
  const stage = currentStage(lesson)
  const unlocked = true
  const target = currentTarget()
  const completion = progress[lesson.id]?.stages?.[stage.id]
  const stageLabels = ['1 Key', 'Patterns', 'Words', 'Sentences']
  const firstPhysicalKey = resolvePhysicalKey(target[0] || '')

  return `<div class="learn-hub learn-focus-mode learn-reference-layout">
 <aside class="learn-curriculum"><div class="learn-brand"><strong>AG Typing Tutor</strong></div><button class="learn-home-link" id="learn-home-button">⌂ <span>Home</span></button><h2>Learn</h2><div class="learn-course-list">${lessons.map(l => { const c = lessonCompletion(l, progress); return `<button class="learn-course-item ${l.id === lesson.id ? 'selected' : ''}" data-course-lesson="${l.id}"><span class="learn-course-number">${c.percent === 100 ? '✓' : '○'}</span><span class="learn-course-copy"><strong>${escapeHtml(l.title)}</strong><small>${escapeHtml(l.row)}</small></span><span class="learn-course-chevron">${c.done}/${c.total}</span></button>` }).join('')}</div><div class="learn-overall-progress"><div class="learn-progress-label"><span>Course Progress</span><strong>${Math.round(overallDone / totalStages * 100)}%</strong></div><div class="learn-progress-track"><span style="width:${Math.round(overallDone / totalStages * 100)}%"></span></div><small>${overallDone} of${totalStages} stages completed</small></div></aside>
 <main class="learn-reference-main"><header class="learn-reference-topbar"><div class="learn-breadcrumb" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;"><strong>${escapeHtml(lesson.title)}</strong><span>›</span><button type="button" id="learn-open-guide" class="secondary-button" style="padding:4px 10px; font-size:12px;">✋ Finger Guide</button>${activeLanguage === 'hi' ? `<button type="button" id="learn-open-altcodes" class="secondary-button" style="padding:4px 10px; font-size:12px; background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;">⌨️ Alt Codes & Shift Chart</button>` : ''}</div>${activeLanguage === 'hi' ? `<label class="learn-font-selector">Hindi layout <select id="learn-hindi-layout"><option value="kruti-dev-010">Kruti Dev 010</option><option value="devlys-010">DevLys 010</option><option value="mangal">Mangal (Remington-Gail)</option><option value="remington">Remington CBI</option><option value="inscript">Inscript</option></select></label>` : ''}<div class="learn-stage-tabs">${lesson.stages.map((s, i) => { const done = Boolean(progress[lesson.id]?.stages?.[s.id]?.completed); return `<button class="learn-stage-tab ${s.id === stage.id ? 'active' : ''} ${done ? 'passed' : ''}" data-course-stage="${s.id}"><span>${done ? '✓' : i + 1}</span><strong>${escapeHtml(stageLabels[i] || s.type)}</strong></button>` }).join('')}</div></header>
 <div class="learn-reference-body"><section class="learn-reference-practice"><div class="learn-passage learn-direct-typing" id="learn-passage" style="font-size:28px; line-height:1.8; letter-spacing:0.5px; font-weight:600;" role="textbox" tabindex="0" aria-label="Typing practice line">${escapeHtml(target)}</div><textarea class="learn-typing-input learn-typing-input-proxy" id="learn-typing-input" maxlength="${target.length}" rows="1" aria-label="Typing input proxy" spellcheck="false" autocapitalize="off" autocomplete="off" ${unlocked ? '' : 'disabled'}></textarea><div class="learn-header-keyboard"><div id="learn-keyboard">${renderKeyboard(firstPhysicalKey)}</div></div><div class="learn-finger-illustration" aria-label="Hands and finger guide"><div class="learn-hand-image-wrap"><img class="learn-real-hands" src="${handsGuideUrl}" alt="Hands for touch typing"><span class="learn-finger-marker" id="learn-finger-marker" aria-label="Next finger"></span></div></div><div class="learn-result-message" id="learn-result-message" aria-live="polite"></div><div class="learn-stage-history" id="learn-stage-history">${completion?.completed ? `Best result: ${completion.bestWpm} WPM · ${completion.bestAccuracy}% accuracy` : `Tip: ${escapeHtml(lesson.tip)}`}</div></section>
 <aside class="learn-reference-stats"><section class="learn-stat-card learn-time-card"><div class="learn-stat-title">◷ <span>Time</span></div><strong id="learn-time">00:00</strong><button id="learn-pause" title="Pause timer" aria-label="Pause timer">Ⅱ</button></section><div class="learn-stat-pair"><section class="learn-stat-card"><div class="learn-stat-title green">◉ <span>WPM</span></div><strong id="learn-wpm">0</strong></section><section class="learn-stat-card"><div class="learn-stat-title red">◎ <span>Accuracy</span></div><strong id="learn-accuracy">100%</strong></section></div><section class="learn-stat-card"><div class="learn-stat-title blue">▤ <span>Words</span></div><strong id="learn-word-count">0</strong></section><section class="learn-stat-card"><div class="learn-stat-title blue">⌨ <span>Characters</span></div><strong id="learn-progress-count">0</strong></section><section class="learn-stat-card learn-errors-card"><div class="learn-stat-title red">Errors</div><strong id="learn-errors">0</strong></section></aside></div></main></div>`
}

export function bindLessonActions(onRerender = () => {}) {
  const input = document.querySelector('#learn-typing-input')
  if (!input) return

  const lesson = currentLesson()
  const stage = currentStage(lesson)
  let target = currentTarget()

  if (!window._lastGuidedLesson || window._lastGuidedLesson !== lesson.id) {
    window._lastGuidedLesson = lesson.id
    setTimeout(() => showFingerGuideModal(lesson), 80)
  }

  document.querySelector('#learn-open-guide')?.addEventListener('click', () => showFingerGuideModal(lesson))
  document.querySelector('#learn-open-altcodes')?.addEventListener('click', () => showAltCodesModal())
  document.querySelector('#learn-home-button')?.addEventListener('click', () => { document.querySelector('[data-page="home"]')?.click() })

  const osToggle = document.querySelector('#ag-os-toggle')
  if (osToggle) {
    osToggle.value = localStorage.getItem('ag-keyboard-os') || 'win'
    osToggle.addEventListener('change', () => {
      localStorage.setItem('ag-keyboard-os', osToggle.value)
      onRerender()
    })
  }

  const hindiLayout = document.querySelector('#learn-hindi-layout')
  if (hindiLayout) {
    hindiLayout.value = localStorage.getItem('ag-hindi-layout') || 'kruti-dev-010'
    hindiLayout.addEventListener('change', () => {
      localStorage.setItem('ag-hindi-layout', hindiLayout.value)
      const kbEl = document.querySelector('#learn-keyboard'); if (kbEl) delete kbEl.dataset.initializedKeys;
      lastKeyboardKey = null
      update()
      input.focus({ preventScroll: true })
    })
  }
  applyHindiKeyboardLabels()

  input.setAttribute('maxlength', String(target.length))
  input.setAttribute('rows', '1')
  input.placeholder = ''

  const passageSurface = document.querySelector('#learn-passage')
  passageSurface?.addEventListener('click', () => input.focus({ preventScroll: true }))
  passageSurface?.addEventListener('keydown', event => {
    if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
      input.focus({ preventScroll: true })
    }
  })
  input.setAttribute('aria-hidden', 'true')
  input.setAttribute('tabindex', '-1')

  input.addEventListener('keydown', event => {
    if (activeLanguage !== 'hi' || sessionTotals.timerPaused || input.disabled) return
    if (event.ctrlKey || event.metaKey) return

    const key = event.key
    if (!key || key.length !== 1 || key === ' ') return

    const lowerKey = key.toLowerCase()
    const { normal, shift } = getActiveHindiMaps()
    const expectedChar = target[input.value.length] || ''
    const expectedPhysicalKey = resolvePhysicalKey(expectedChar).toLowerCase()

    let mappedHindiChar = event.shiftKey ? (shift[key] || normal[lowerKey]) : normal[lowerKey]

    if (lowerKey === expectedPhysicalKey && expectedChar && expectedChar !== ' ') {
      mappedHindiChar = expectedChar
    }

    if (mappedHindiChar) {
      event.preventDefault()
      if (input.value.length < target.length) {
        input.value += mappedHindiChar
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
  })

  document.querySelector('#learn-keyboard')?.addEventListener('click', event => {
    const keyEl = event.target.closest('.virtual-key')
    if (!keyEl || input.disabled || sessionTotals.timerPaused) return
    const key = keyEl.dataset.key
    if (key === 'BACKSPACE') {
      input.value = input.value.slice(0, -1)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      return
    }
    if (key === ' ' || (typeof key === 'string' && key.length === 1 && !['TAB', 'CAPS', 'ENTER', 'SHIFT', 'CTRL', 'OPTION', 'COMMAND'].includes(key.toUpperCase()))) {
      if (input.value.length < target.length) {
        const expectedChar = target[input.value.length] || ''
        const expectedPhys = resolvePhysicalKey(expectedChar).toLowerCase()
        const { normal } = getActiveHindiMaps()
        let charToInsert = key.toLowerCase()
        if (activeLanguage === 'hi') {
          if (key.toLowerCase() === expectedPhys && expectedChar && expectedChar !== ' ') {
            charToInsert = expectedChar
          } else if (normal[key.toLowerCase()]) {
            charToInsert = normal[key.toLowerCase()]
          }
        }
        input.value += charToInsert
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    input.focus({ preventScroll: true })
  })

  const fingerFor = rawKey => {
    const key = resolvePhysicalKey(rawKey)
    const map = {
      '`': 'Left pinky', '1': 'Left pinky', q: 'Left pinky', a: 'Left pinky', z: 'Left pinky',
      '2': 'Left ring', w: 'Left ring', s: 'Left ring', x: 'Left ring',
      '3': 'Left middle', e: 'Left middle', d: 'Left middle', c: 'Left middle',
      '4': 'Left index', '5': 'Left index', r: 'Left index', f: 'Left index', v: 'Left index', t: 'Left index', g: 'Left index', b: 'Left index',
      '6': 'Right index', '7': 'Right index', y: 'Right index', h: 'Right index', n: 'Right index', u: 'Right index', j: 'Right index', m: 'Right index',
      '8': 'Right middle', i: 'Right middle', k: 'Right middle', ',': 'Right middle',
      '9': 'Right ring', o: 'Right ring', l: 'Right ring', '.': 'Right ring',
      '0': 'Right pinky', '-': 'Right pinky', '=': 'Right pinky', p: 'Right pinky', ';': 'Right pinky', '/': 'Right pinky', '[': 'Right pinky', ']': 'Right pinky', "'": 'Right pinky', '\\': 'Right pinky',
      ' ': 'Thumb / अंगूठा'
    }
    return map[String(key || ' ').toLowerCase()] || 'Assigned finger / सही उँगली'
  }

  let passageUnits = null
  let passageNodes = null
  let lastRenderedLen = -1
  let learnScrollRaf = null
  const renderPassage = typed => {
    const el = document.querySelector('#learn-passage')
    if (!el) return
    const curLen = typed.length
    const isFullInit = (!passageUnits || !passageNodes || el.dataset.renderedTarget !== target || lastRenderedLen < 0)
    if (isFullInit) {
      passageUnits = splitIntoVisualSyllables(target)
      el.innerHTML = passageUnits.map(u => `<span>${escapeHtml(u.text === '\n' ? '↵' : u.text)}</span>`).join('')
      passageNodes = Array.from(el.children)
      el.dataset.renderedTarget = target
      el.scrollLeft = 0
      lastRenderedLen = 0
    }

    const minCharPos = isFullInit ? 0 : Math.max(0, Math.min(lastRenderedLen, curLen) - 2)
    const maxCharPos = isFullInit ? target.length : Math.min(target.length, Math.max(lastRenderedLen, curLen) + 2)

    let currentNode = null
    for (let uIdx = 0; uIdx < passageUnits.length; uIdx++) {
      const unit = passageUnits[uIdx]
      if (!isFullInit && (unit.end < minCharPos || unit.start > maxCharPos)) continue
      const node = passageNodes[uIdx]
      if (!node) continue

      let nextCls = ''
      if (curLen >= unit.end) {
        let allCorrect = true
        for (let k = unit.start; k < unit.end; k++) {
          if (typed[k] !== target[k]) {
            allCorrect = false
            break
          }
        }
        nextCls = allCorrect ? 'char-correct' : 'char-incorrect'
      } else if (curLen >= unit.start && curLen < unit.end) {
        let partialError = false
        for (let k = unit.start; k < curLen; k++) {
          if (typed[k] !== target[k]) {
            partialError = true
            break
          }
        }
        nextCls = partialError ? 'char-incorrect char-current' : 'char-current'
        currentNode = node
      }
      if (node.className !== nextCls) {
        node.className = nextCls
      }
    }
    lastRenderedLen = curLen

    if (currentNode && !learnScrollRaf) {
      const nodeToScroll = currentNode
      learnScrollRaf = requestAnimationFrame(() => {
        learnScrollRaf = null
        const desired = nodeToScroll.offsetLeft + nodeToScroll.offsetWidth / 2 - el.clientWidth / 2
        if (Math.abs(el.scrollLeft - Math.max(0, desired)) > 24) {
          el.scrollLeft = Math.max(0, desired)
        }
      })
    }
  }

  let lastKeyboardKey = null
  let learnStatsRaf = null
  const update = () => {
    const typed = input.value
    // 1. Render character highlight in 0ms immediately!
    renderPassage(typed)
    if (learnStatsRaf) return
    learnStatsRaf = requestAnimationFrame(() => {
      learnStatsRaf = null
      const typedNow = input.value
      const elapsed = sessionTotals.started
        ? (sessionTotals.timerPaused ? sessionTotals.pausedAt - sessionTotals.startedAt : Date.now() - sessionTotals.startedAt)
        : 0

    const currentLine = countLineStats(target, typedNow)
    const totalChars = sessionTotals.completedChars + currentLine.chars
    const totalCorrect = sessionTotals.completedCorrect + currentLine.correct
    const totalErrors = sessionTotals.completedErrors + currentLine.errors
    const totalWords = sessionTotals.completedWords + currentLine.words

    const minutes = Math.max(elapsed / 60000, 1 / 60)
    const grossWpm = sessionTotals.started && totalChars > 0 ? Math.round((totalChars / 5) / minutes) : 0
    const accuracy = totalChars > 0 ? Math.round((totalCorrect / totalChars) * 100) : 100

    const wpmEl = document.querySelector('#learn-wpm'); if (wpmEl) wpmEl.textContent = grossWpm
    const accEl = document.querySelector('#learn-accuracy'); if (accEl) accEl.textContent = `${accuracy}%`
    const errEl = document.querySelector('#learn-errors'); if (errEl) errEl.textContent = totalErrors
    const charEl = document.querySelector('#learn-progress-count'); if (charEl) charEl.textContent = totalChars
    const wordEl = document.querySelector('#learn-word-count'); if (wordEl) wordEl.textContent = totalWords

    const timeEl = document.querySelector('#learn-time')
    if (timeEl) {
      const seconds = Math.floor(Math.max(elapsed, 0) / 1000)
      timeEl.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    }

    const nextChar = target[typedNow.length] || ' '
    const physicalKey = resolvePhysicalKey(nextChar)
    const finger = fingerFor(nextChar)
    const marker = document.querySelector('#learn-finger-marker')
    const fingerPositions = {
      'Left pinky': [9.5, 25], 'Left ring': [18.5, 12], 'Left middle': [26.5, 4], 'Left index': [35.5, 11],
      'Thumb / अंगूठा': [54, 56], 'Right index': [64.5, 11], 'Right middle': [73.5, 4], 'Right ring': [82, 12], 'Right pinky': [91, 25]
    }
    const markerPosition = fingerPositions[finger] || fingerPositions['Left index']
    if (marker) {
      marker.style.left = `${markerPosition[0]}%`
      marker.style.top = `${markerPosition[1]}%`
      marker.title = `Next finger: ${finger}`
      marker.setAttribute('aria-label', `Next finger: ${finger}`)
    }
    const keyToHighlight = nextChar === '\n' ? 'ENTER' : nextChar === ' ' ? ' ' : physicalKey
    const keyboard = document.querySelector('#learn-keyboard')
    if (keyboard && keyToHighlight !== lastKeyboardKey) {
      if (!keyboard.dataset.initializedKeys) {
        keyboard.innerHTML = renderKeyboard(keyToHighlight)
        applyHindiKeyboardLabels()
        keyboard.dataset.initializedKeys = 'true'
      } else {
        const rawTargetKey = String(keyToHighlight ?? '')
        const upperKey = rawTargetKey === ' ' ? 'SPACE' : rawTargetKey.toUpperCase()
        const needShift = /^[A-Z~!@#$%^&*()_+{}|:"<>?]$/.test(rawTargetKey)
        keyboard.querySelectorAll('.virtual-key.active').forEach(k => k.classList.remove('active'))
        keyboard.querySelectorAll('.virtual-key').forEach(k => {
          const dk = String(k.dataset.key || '')
          const dkUpper = dk === ' ' ? 'SPACE' : dk.toUpperCase()
          if (dkUpper === upperKey || (needShift && dkUpper === 'SHIFT')) {
            k.classList.add('active')
          }
        })
      }
      lastKeyboardKey = keyToHighlight
    }
    })
  }

  document.querySelector('#learn-pause')?.addEventListener('click', () => {
    if (!sessionTotals.started) return
    sessionTotals.timerPaused = !sessionTotals.timerPaused
    const btn = document.querySelector('#learn-pause')
    if (sessionTotals.timerPaused) {
      sessionTotals.pausedAt = Date.now()
      input.readOnly = true
      if (btn) { btn.textContent = '▶'; btn.title = 'Resume timer' }
    } else {
      if (sessionTotals.pausedAt) sessionTotals.startedAt += Date.now() - sessionTotals.pausedAt
      sessionTotals.pausedAt = 0
      input.readOnly = false
      if (btn) { btn.textContent = 'Ⅱ'; btn.title = 'Pause timer' }
      input.focus({ preventScroll: true })
    }
  })

  input.addEventListener('input', () => {
    if (sessionTotals.timerPaused) return

    if (!sessionTotals.started && input.value.length > 0) {
      sessionTotals.started = true
      sessionTotals.startedAt = Date.now()
    }

    const pos = input.value.length - 1
    if (pos >= 0) {
      sound(input.value[pos] === target[pos] ? 'correct' : 'error')
    }

    if (input.value.length >= target.length) {
      const finishedLine = countLineStats(target, input.value)
      sessionTotals.completedChars += finishedLine.chars
      sessionTotals.completedCorrect += finishedLine.correct
      sessionTotals.completedErrors += finishedLine.errors
      sessionTotals.completedWords += finishedLine.words

      const elapsed = Date.now() - sessionTotals.startedAt
      const minutes = Math.max(elapsed / 60000, 1 / 60)
      const wpm = Math.round((sessionTotals.completedChars / 5) / minutes)
      const accuracy = Math.round((sessionTotals.completedCorrect / Math.max(sessionTotals.completedChars, 1)) * 100)

      if (accuracy >= 90) {
        saveLessonResult(lesson.id, stage.id, {
          correct: sessionTotals.completedCorrect,
          errors: sessionTotals.completedErrors,
          wpm,
          accuracy,
          completed: true,
          elapsedMs: elapsed,
          words: sessionTotals.completedWords,
          passed: true,
          repetitions: 40
        })
      }

      exerciseIndex = (exerciseIndex + 1) % stage.exercises.length
      target = currentTarget()
      input.value = ''
      input.setAttribute('maxlength', String(target.length))
      passageUnits = null
      passageNodes = null
      lastRenderedLen = -1
      lastKeyboardKey = null
      sound('complete')
    }

    update()
  })

  document.querySelector('#learn-sound-toggle')?.addEventListener('click', e => {
    soundEnabled = !soundEnabled
    localStorage.setItem('ag-learn-sound', soundEnabled ? 'on' : 'off')
    e.currentTarget.textContent = soundEnabled ? '🔊 Sound on' : '🔇 Sound off'
    e.currentTarget.setAttribute('aria-pressed', String(soundEnabled))
    if (soundEnabled) sound('correct')
  })

  document.querySelectorAll('[data-course-lesson]').forEach(button => button.addEventListener('click', () => {
    const selectedId = button.dataset.courseLesson
    const targetLesson = lessons.find(l => l.id === selectedId) || lessons[0]
    activeLesson = targetLesson.id
    activeStage = targetLesson.defaultStage || 'keys'
    exerciseIndex = 0
    resetCumulativeSession()
    window._lastGuidedLesson = null
    onRerender()
  }))

  document.querySelectorAll('[data-course-stage]').forEach(button => button.addEventListener('click', () => {
    if (button.disabled) return
    activeStage = button.dataset.courseStage
    exerciseIndex = 0
    resetCumulativeSession()
    onRerender()
  }))

  update()
  if (!input.disabled) input.focus({ preventScroll: true })
  if (tickHandle) clearInterval(tickHandle)
  tickHandle = setInterval(() => {
    if (sessionTotals.started && !sessionTotals.timerPaused) update()
  }, 500)
}