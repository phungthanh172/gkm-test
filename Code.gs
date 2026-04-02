// ============================================================
// CẤU HÌNH - THAY ĐỔI CÁC GIÁ TRỊ NÀY CHO PHÙ HỢP
// ============================================================

// ID của Google Spreadsheet (lấy từ URL của Sheet)
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID'; // VD: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'

// Tên của Sheet chứa dữ liệu Lead
const SHEET_NAME = 'Leads';

// Email của Sales Team nhận cảnh báo khách "nóng"
const SALES_TEAM_EMAIL = 'phungthanh172@gmail.com'; // Thay bằng email thật

// ============================================================
// HÀM CHÍNH: XỬ LÝ REQUEST TỪ FRONTEND (POST)
// ============================================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const name        = data.name        || '';
    const phone       = data.phone       || '';
    const email       = data.email       || '';
    const interest    = data.interest    || '';
    const intentLevel = data.intent_level || '';
    const source      = data.source      || '';
    const sessionId   = data.sessionId   || '';
    const chatHistory = data.chatHistory || '';
    const timestamp   = data.timestamp   || new Date().toLocaleString('vi-VN');

    // Ghi vào Google Sheets (cập nhật gộp theo Session ID)
    saveLeadToSheet(name, phone, email, interest, intentLevel, source, sessionId, chatHistory, timestamp);

    // Gửi email cảnh báo nếu khách là "hot"
    if (intentLevel.toLowerCase() === 'hot') {
      sendHotLeadAlert(name, phone, email, interest, timestamp);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('doPost Error:', err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// HÀM CHÍNH: XỬ LÝ REQUEST GET (kiểm tra health)
// ============================================================

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Chatbot Lead API đang hoạt động!' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// HÀM GHI LEAD VÀO GOOGLE SHEETS
// Cột thứ tự: Thời gian | Tên | SĐT | Email | Nguồn | Session ID | Lịch sử Chat | Quan tâm | Mức độ
// ============================================================

function saveLeadToSheet(name, phone, email, interest, intentLevel, source, sessionId, chatHistory, timestamp) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_NAME);

  // Tạo sheet nếu chưa tồn tại
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Tạo header nếu sheet mới/trống
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Thời gian',
      'Tên',
      'SĐT',
      'Email',
      'Nguồn',
      'Session ID',
      'Lịch sử Chat',
      'Quan tâm',
      'Mức độ'
    ]);
    // Định dạng header
    const headerRange = sheet.getRange(1, 1, 1, 9);
    headerRange.setBackground('#4a86e8');
    headerRange.setFontColor('white');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Tìm dòng đã có Session ID này (để cập nhật gộp)
  const lastRow     = sheet.getLastRow();
  const sessionColIndex = 6; // Cột F = Session ID
  let   existingRow = -1;

  if (lastRow > 1) {
    const sessionIds = sheet.getRange(2, sessionColIndex, lastRow - 1, 1).getValues();
    for (let i = 0; i < sessionIds.length; i++) {
      if (sessionIds[i][0] === sessionId) {
        existingRow = i + 2; // +2 vì bắt đầu từ dòng 2 (dòng 1 là header)
        break;
      }
    }
  }

  if (existingRow !== -1) {
    // ✅ CẬP NHẬT dòng cũ (cùng Session ID)
    const rowRange = sheet.getRange(existingRow, 1, 1, 9);
    const currentValues = rowRange.getValues()[0];

    // Cập nhật ưu tiên: giữ giá trị cũ nếu giá trị mới rỗng
    rowRange.setValues([[
      timestamp,
      name       || currentValues[1],
      phone      || currentValues[2],
      email      || currentValues[3],
      source     || currentValues[4],
      sessionId,
      chatHistory || currentValues[6],
      interest   || currentValues[7],
      intentLevel || currentValues[8]
    ]]);

    console.log('♻️ Cập nhật dòng hiện có cho Session:', sessionId);
  } else {
    // ✅ THÊM dòng mới (Session ID mới)
    sheet.appendRow([
      timestamp,
      name,
      phone,
      email,
      source,
      sessionId,
      chatHistory,
      interest,
      intentLevel
    ]);

    // Định dạng màu dựa trên intent_level
    const newRow = sheet.getLastRow();
    applyIntentLevelColor(sheet, newRow, intentLevel);

    console.log('➕ Tạo dòng mới cho Session:', sessionId);
  }

  // Cập nhật màu cho dòng hiện tại (kể cả khi update)
  if (existingRow !== -1) {
    applyIntentLevelColor(sheet, existingRow, intentLevel);
  }
}

// ============================================================
// HÀM TÔ MÀU DÒNG THEO MỨC ĐỘ INTENT
// ============================================================

function applyIntentLevelColor(sheet, rowNumber, intentLevel) {
  const range = sheet.getRange(rowNumber, 1, 1, 9);
  switch ((intentLevel || '').toLowerCase()) {
    case 'hot':
      range.setBackground('#fce8e6'); // Đỏ nhạt
      sheet.getRange(rowNumber, 9).setFontColor('#c5221f').setFontWeight('bold'); // Cột Mức độ đỏ đậm
      break;
    case 'warm':
      range.setBackground('#fef9e7'); // Vàng nhạt
      sheet.getRange(rowNumber, 9).setFontColor('#f57c00').setFontWeight('bold'); // Cam
      break;
    case 'cold':
      range.setBackground('#f8f9fa'); // Xám rất nhạt
      sheet.getRange(rowNumber, 9).setFontColor('#5f6368').setFontWeight('normal');
      break;
    default:
      break;
  }
}

// ============================================================
// HÀM GỬI EMAIL CẢNH BÁO KHÁCH "NÓNG"
// ============================================================

function sendHotLeadAlert(name, phone, email, interest, timestamp) {
  const subject = '🔥 KHÁCH HÀNG NÓNG - CẦN LIÊN HỆ NGAY! | Tinh Hoa Tri Thức';

  const body = `📢 KHÁCH HÀNG NÓNG - CẦN LIÊN HỆ NGAY!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tên: ${name || '(chưa có)'}
SĐT: ${phone || '(chưa có)'}
Email: ${email || '(chưa có)'}
Quan tâm: ${interest || '(chưa xác định)'}
Thời gian: ${timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ Vui lòng liên hệ khách hàng này trong vòng 30 phút!

Hệ thống phân loại AI đánh giá khách này ở mức ĐỘ NÓNG — 
họ có nhu cầu rõ ràng và sẵn sàng mua hàng.

Đây là email tự động từ hệ thống Chatbot Lead Capture.
`;

  const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
  <div style="background: linear-gradient(135deg, #d32f2f, #b71c1c); padding: 24px 30px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">🔥 KHÁCH HÀNG NÓNG - CẦN LIÊN HỆ NGAY!</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Chatbot Lead Capture | Tinh Hoa Tri Thức</p>
  </div>
  
  <div style="background: #fce8e6; padding: 16px 30px; border-left: 4px solid #d32f2f;">
    <p style="margin: 0; color: #c62828; font-weight: bold;">⚡ Vui lòng liên hệ trong vòng 30 phút!</p>
  </div>
  
  <div style="padding: 24px 30px; border: 1px solid #e0e0e0; border-top: none;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; color: #666; font-size: 14px; width: 120px;">👤 Tên</td>
        <td style="padding: 10px 0; font-weight: bold; font-size: 15px;">${name || '<em style="color:#999">Chưa có</em>'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; color: #666; font-size: 14px;">📱 SĐT</td>
        <td style="padding: 10px 0; font-weight: bold; font-size: 15px; color: #1565c0;">${phone || '<em style="color:#999">Chưa có</em>'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; color: #666; font-size: 14px;">✉️ Email</td>
        <td style="padding: 10px 0; font-size: 14px;">${email || '<em style="color:#999">Chưa có</em>'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; color: #666; font-size: 14px;">🎯 Quan tâm</td>
        <td style="padding: 10px 0; font-size: 14px;">${interest || '<em style="color:#999">Chưa xác định</em>'}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #666; font-size: 14px;">⏰ Thời gian</td>
        <td style="padding: 10px 0; font-size: 14px;">${timestamp}</td>
      </tr>
    </table>
  </div>
  
  <div style="background: #e8f5e9; padding: 16px 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="margin: 0; color: #2e7d32; font-size: 13px;">
      🤖 Hệ thống AI phân loại tự động đánh giá khách này ở mức <strong>ĐỘ NÓNG</strong> — họ có nhu cầu rõ ràng và sẵn sàng mua hàng.<br>
      <span style="color: #999; font-size: 12px; margin-top: 8px; display: block;">Email tự động từ hệ thống Chatbot Lead Capture của Tinh Hoa Tri Thức</span>
    </p>
  </div>
</div>
`;

  GmailApp.sendEmail(SALES_TEAM_EMAIL, subject, body, {
    htmlBody: htmlBody,
    name: 'Hệ thống Lead Chatbot - Tinh Hoa Tri Thức'
  });

  console.log('📧 Đã gửi email cảnh báo HOT LEAD cho:', SALES_TEAM_EMAIL);
}
