const KW_STATE = {
  INIT: '10', // 初始狀態
  START_CC: '12', // 開始記錄配方奶
  START_MILK: '13', // 開始記錄母奶
};
const spreadSheet = SpreadsheetApp.openById('GOOGLE_SHEET_ID');
const sheet = spreadSheet.getSheets()[0];
const channelAccessToken = 'CHANNEL_ACCESS_TOKEN';

function doPost(e) {
  const numberPattern = /\d+/g;
  const replyToken = JSON.parse(e.postData.contents).events[0].replyToken;
  const message = JSON.parse(e.postData.contents).events[0].message.text;
  let replyText = '';
  const welcomeMessage = '歡迎使用母奶配方奶記錄器🫠';

  if (message === '!reset') {
    setState(KW_STATE.INIT);
    replyText = welcomeMessage;
    clearTmp();
    doReply(replyText, replyToken);
    return;
  }

  const state = getState();
  switch (state) {
    case KW_STATE.START_MILK:
      if (!numberPattern.test(message)) {
        replyText = '請輸入數字';
        doReply(replyText, replyToken);
        break;
      }
      setTmp('tmp_last', message);
      replyText = '已存入';
      setState(KW_STATE.INIT);
      saveRow();
      doReply(replyText, replyToken);
      break;
    case KW_STATE.START_CC:
      if (!numberPattern.test(message)) {
        replyText = '請輸入數字';
        doReply(replyText, replyToken);
        break;
      }
      replyText = '已存入';
      setTmp('tmp_last', message);
      setState(KW_STATE.INIT);
      saveRow();
      doReply(replyText, replyToken);
      break;
    default:
      switch (message) {
        case '!母奶':
          if (state !== KW_STATE.INIT) {
            replyText = '請完成上一筆「母奶」記錄';
            doReply(replyText, replyToken);
            break;
          }
          replyText = '請輸入母奶分鐘數';
          setState(KW_STATE.START_MILK);
          setTmp('tmp_type', '母奶');
          doReply(replyText, replyToken);
          break;
        case '!配方奶':
          if (state !== KW_STATE.INIT) {
            replyText = '請完成上一筆「配方奶」記錄';
            doReply(replyText, replyToken);
            break;
          }
          replyText = '請輸入配方奶 cc 數';
          setState(KW_STATE.START_CC);
          setTmp('tmp_type', '配方奶');
          doReply(replyText, replyToken);
          break;
      }
      replyText = welcomeMessage;
      doReply(replyText, replyToken);
      break;
  }
}

function getState() {
  const rows = sheet.getRange('H2:H2').getValues();
  return rows[0][0];
}

function setState(state) {
  const cell = sheet.getRange('H2:H2');
  cell.setValue(state);
}

function getTmp() {
  const rows = sheet.getRange('J2:K2').getValues();
  return rows ? rows[0] : null;
}

function setTmp(column, value) {
  switch (column) {
    case 'tmp_type':
      sheet.getRange('J2:J2').setValue(value);
      break;
    case 'tmp_last':
      sheet.getRange('K2:K2').setValue(value);
      break;
  }
}

function clearTmp() {
  const cell = sheet.getRange('J2:K2');
  cell.setValue('');
}

function saveRow() {
  const data = getTmp();
  sheet.appendRow([new Date().toUTCString(), data[0], data[1]]);
  clearTmp();
}

function doReply(message, replyToken) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + channelAccessToken,
  };

  const payload = {
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: message,
      },
    ],
  };

  const options = {
    method: 'post',
    headers: headers,
    payload: JSON.stringify(payload),
  };

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', options);
}
