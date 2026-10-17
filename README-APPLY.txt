AG TYPING TUTOR — FIRST-RUN ONBOARDING UPDATE

FILES IN THIS PATCH
- src/main.js
- src/style.css

APPLY SAFELY
1. Keep a backup of your current project folder.
2. Copy the two files above into your existing project's src/ folder and replace only those two files.
3. Do NOT replace your whole project with this patch ZIP.
4. Run:
   cd ~/TypingExamSoftware/web
   npm run dev

FEATURES ADDED
- First-run profile screen for name, mobile number and exam.
- Exam dropdown including RSSB LDC, Rajasthan High Court LDC, RRB, SSC, DSSSB, KVS/NVS, EMRS, Banking and Other.
- Other exam name field.
- English/Hindi selection on the onboarding screen and language buttons on Home.
- Profile saved locally, with a pending sync queue for offline use.
- Permanent exam tiles on Home, WhatsApp Support link/number 7878025556.
- Profile name appears in the Home welcome message.

IMPORTANT LIMITATION
Profile data is saved on the current device and queued locally. Automatic delivery to ajeetram3@gmail.com is NOT active yet because a secure server/API endpoint and email delivery credentials must be configured separately. Do not place email passwords or API secrets in the desktop app. This patch does not send any profile data over the internet.

LANGUAGE SCOPE
This update provides the first-run language choice and bilingual Home shell. It does not yet translate every existing Learn/Practice/Settings screen or implement a full Hindi legacy DevLys keyboard mapping.
