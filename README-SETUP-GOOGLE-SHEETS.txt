AG TYPING TUTOR — HOME + DROPDOWN + GOOGLE SHEETS REGISTRATION PATCH

This is a PATCH ZIP, not a full project. It includes the latest Home/sidebar/dropdown/profile files plus a Google Apps Script collector instead of Gmail SMTP.

FILES
- src/main.js       Replace in your existing project
- src/style.css     Replace in your existing project
- google-apps-script/Code.gs   Paste into script.google.com linked to your Google Sheet
- .env.example      Vite endpoint setting template

IMPORTANT: Back up your project folder first. Do NOT replace the entire project with this ZIP.

SET UP GOOGLE SHEETS
1. Sign in to the Google account that should own the data: ajeetram3@gmail.com.
2. Create a new Google Sheet named AG Typing Tutor Registrations.
3. Copy the Sheet ID from its URL: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
4. Open https://script.google.com, create a project, and paste google-apps-script/Code.gs into Code.gs.
5. Replace PASTE_GOOGLE_SHEET_ID_HERE with the Sheet ID. Save.
6. Deploy > New deployment > Select type: Web app. Execute as: Me. Who has access: Anyone. Deploy and authorize it. Copy the Web app URL ending /exec.
7. In the existing project root create/edit .env.local (not commit to Git) and add:
   VITE_REGISTRATION_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
8. Restart Vite after changing env: stop with Ctrl+C, then npm run dev.
9. Test with a dummy registration and confirm it appears in the Sheet before distributing the app.

DATA / PRIVACY NOTES
- The app stores profile data locally and queues it when offline. When online it submits the queued profile to the endpoint.
- Google Apps Script requests use no-cors to avoid browser preflight limitations. A no-cors response is opaque, so the app cannot verify that a row was actually written. Confirm delivery in the Sheet. If fetch fails, the profile remains queued; once fetch is handed off, the queue item is removed, even though server-side success cannot be read.
- The web app endpoint URL is embedded in the app and is not a secret. Anyone who obtains it may submit fake rows. Keep the spreadsheet private, monitor submissions, and redeploy/rotate the URL if abused. For stronger protection, use a hosted backend with rate limiting/authentication.
- Tell users clearly what data is collected and get their consent. Mobile numbers are personal data. Collect only what is necessary.
- This endpoint sends data to Google Sheets, not email. Open the Sheet from your Google account to see records.

TEST
After adding files, run in Terminal:
  cd ~/TypingExamSoftware/web
  npm run dev
Then register a test profile online and check the Sheet. Test offline queue behavior separately. Browser delivery has not been verified in this build environment.
