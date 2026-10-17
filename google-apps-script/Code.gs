/** AG Typing Tutor registration collector.
 * Deploy as Web app: Execute as Me; access Anyone.
 * This endpoint stores only registration fields explicitly consented to by the user.
 */
const SPREADSHEET_ID = "1SJ_g1ev52GFQn-cznx2gjzkGAVn8XW7FZ-61cVQ4jY4";
const SHEET_NAME = "Users";
const HEADERS = [
  "Registration ID",
  "Registration Date",
  "Name",
  "Mobile",
  "Exam",
  "Other Exam",
  "App Version"
];

function doGet() {
  return jsonResponse({
    success: true,
    service: "AG Typing Tutor Registration API",
    message: "Service is running"
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    const body = e && e.postData && e.postData.contents;
    if (!body) return jsonResponse({ success: false, message: "Registration data is missing" });

    const data = JSON.parse(body);
    const registrationId = clean(data.registrationId, 100);
    const name = clean(data.name, 100);
    const mobile = clean(data.mobile, 15).replace(/\D/g, "");
    const exam = clean(data.exam, 100);
    const otherExam = clean(data.otherExam, 100);
    const appVersion = clean(data.appVersion || "1.0", 30);

    if (data.consent !== true) {
      return jsonResponse({ success: false, message: "User consent is required" });
    }
    if (!registrationId || !name || !/^[6-9]\d{9}$/.test(mobile) || !exam) {
      return jsonResponse({ success: false, message: "Please provide a valid registration ID, name, Indian mobile number and exam" });
    }
    if (exam === "Other" && !otherExam) {
      return jsonResponse({ success: false, message: "Please enter the exam name" });
    }

    lock.waitLock(10000);
    hasLock = true;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
      if (ids.includes(registrationId)) {
        return jsonResponse({ success: true, duplicate: true, message: "Registration already received" });
      }
    }

    sheet.appendRow([
      safeCell(registrationId),
      new Date(),
      safeCell(name),
      safeCell(mobile),
      safeCell(exam),
      safeCell(otherExam),
      safeCell(appVersion)
    ]);

    return jsonResponse({ success: true, message: "Registration saved" });
  } catch (err) {
    return jsonResponse({
      success: false,
      message: "Unable to save registration",
      error: String(err && err.message ? err.message : err)
    });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

function clean(value, maxLength) {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

function safeCell(value) {
  const text = String(value == null ? "" : value).trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
