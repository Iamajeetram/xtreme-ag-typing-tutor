AG Typing Tutor — English + Hindi Exercise Integration

Included:
- 300 original English exercise TXT files in public/exercises/english/
- 300 original Hindi exercise TXT files in public/exercises/hindi/
- Combined exercise manifest: public/exercises/exercise-manifest.json
- Language-specific manifests in each language folder
- src/practice-exercises.js embeds both original text sets for the current synchronous practice UI
- src/main.js adds an English/Hindi selector to the Practice Typing sidebar and filters the exercise list/test bank by language
- src/style.css styles the language selector

IDs are language-prefixed (en-001..en-300 and hi-001..hi-300) so attempt/completion history cannot collide across languages.

Local run:
  cd ~/TypingExamSoftware/web
  npm install
  npm run dev

Important scope note:
This package integrates the Unicode Hindi passages and a language selector. It does not yet implement true DevLys 010 legacy-keyboard transliteration/input conversion; that requires a separate mapping/input-handling step. The Hindi content is intended for Unicode typing (e.g. Mangal-compatible input).
