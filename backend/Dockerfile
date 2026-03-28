FROM node:22-slim

WORKDIR /app

# 의존성 설치
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 앱 코드 복사
COPY . .

# 포트 설정
EXPOSE 5000

# 서버 시작
CMD ["node", "server.js"]
