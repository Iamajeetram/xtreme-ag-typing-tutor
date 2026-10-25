/**
 * AG Typing Tutor — RSSB LDC Daily Live Leaderboard Backend (Google Apps Script)
 * ------------------------------------------------------------------------------
 * कैसे सेटअप करें (How to Setup in 2 Minutes for Free):
 * 1. https://sheets.new पर जाकर एक नई Google Sheet बनाएँ।
 * 2. ऊपर मेनू में Extensions -> Apps Script पर क्लिक करें।
 * 3. यह पूरा कोड वहाँ पेस्ट करें और Save करें।
 * 4. ऊपर नीले 'Deploy' बटन -> 'New deployment' पर क्लिक करें:
 *    - Select type: 'Web app'
 *    - Execute as: 'Me'
 *    - Who has access: 'Anyone'
 * 5. मिलने वाले Web App URL (https://script.google.com/macros/s/.../exec) को कॉपी करें
 *    और अपनी GitHub repo की `public/daily-live/daily-exam.json` के `leaderboardWebhookUrl` में पेस्ट कर दें!
 */

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var testId = (e && e.parameter && e.parameter.testId) ? String(e.parameter.testId) : '';
  var rows = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    if (testId && String(r[0]) !== testId) continue;
    list.push({
      testId: String(r[0]),
      candidateName: String(r[1]),
      rollNumber: String(r[2]),
      hindiMarks: Number(r[3]) || 0,
      hindiWpm: Number(r[4]) || 0,
      englishMarks: Number(r[5]) || 0,
      englishWpm: Number(r[6]) || 0,
      wordMarks: Number(r[7]) || 0,
      excelMarks: Number(r[8]) || 0,
      totalMarks: Number(r[9]) || 0,
      submittedAt: String(r[10] || '')
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ entries: list }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'TestID', 'CandidateName', 'RollNumber',
      'HindiMarks', 'HindiWPM', 'EnglishMarks', 'EnglishWPM',
      'Word2013Marks', 'Excel2013Marks', 'TotalMarks', 'SubmittedAt'
    ]);
  }
  var body = JSON.parse(e.postData.contents || '{}');
  sheet.appendRow([
    body.testId || '',
    body.candidateName || '',
    body.rollNumber || '',
    Number(body.hindiMarks) || 0,
    Number(body.hindiWpm) || 0,
    Number(body.englishMarks) || 0,
    Number(body.englishWpm) || 0,
    Number(body.wordMarks) || 0,
    Number(body.excelMarks) || 0,
    Number(body.totalMarks) || 0,
    body.submittedAt || new Date().toISOString()
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
