import https from 'https';

const KAKAO_ENABLED = process.env.KAKAO_TALK_ENABLED === 'true';
const KAKAO_ACCESS_TOKEN = process.env.KAKAO_TALK_ACCESS_TOKEN;
const KAKAO_LINK_URL =
  process.env.KAKAO_TALK_LINK_URL || 'https://chance-hr-production.up.railway.app/';

const buildMessageText = ({ type, userName, timestamp, workplaceName }) => {
  const timeText = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul'
  }).format(new Date(timestamp));

  const actionText = type === 'check-in' ? '출근완료' : '퇴근완료';
  const workplacePrefix = workplaceName ? `[${workplaceName}] ` : '';
  return `${workplacePrefix}${userName} ${timeText} ${actionText}`;
};

const sendKakaoTalkMessage = (text) => {
  if (!KAKAO_ENABLED) {
    return Promise.resolve({ skipped: true, reason: 'disabled' });
  }

  if (!KAKAO_ACCESS_TOKEN) {
    return Promise.resolve({ skipped: true, reason: 'missing_token' });
  }

  const templateObject = {
    object_type: 'text',
    text,
    link: {
      web_url: KAKAO_LINK_URL,
      mobile_web_url: KAKAO_LINK_URL
    },
    button_title: '시스템 열기'
  };

  const data = new URLSearchParams({
    template_object: JSON.stringify(templateObject)
  }).toString();

  const options = {
    method: 'POST',
    hostname: 'kapi.kakao.com',
    path: '/v2/api/talk/memo/default/send',
    headers: {
      Authorization: `Bearer ${KAKAO_ACCESS_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true });
        } else {
          reject(
            new Error(
              `KakaoTalk API error (${res.statusCode}): ${body || 'no response'}`
            )
          );
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

export const notifyAttendance = ({ type, userName, timestamp, workplaceName }) =>
  sendKakaoTalkMessage(
    buildMessageText({ type, userName, timestamp, workplaceName })
  );
