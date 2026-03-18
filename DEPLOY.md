# 배포 가이드

## 1. Jira API Token 발급 가이드

확장 프로그램 사용을 위해 Jira API Token이 필요합니다.

### 1.1 API Token 생성 단계

1. **Atlassian 계정 로그인**
   - [Atlassian](https://id.atlassian.com/manage-profile/security/api-tokens) 접속
   - Atlassian 계정으로 로그인

2. **API Token 생성**
   - "Create API token" 클릭
   - 라벨 입력 (예: `Please Be Done Chrome Extension`)
   - "Create" 클릭

3. **토큰 저장**
   - 생성된 토큰을 복사 (예: `ATCTT3xFfGN0Jx...`)
   - ⚠️ **토큰은 다시 표시되지 않으므로 반드시 복사해서 저장하세요**

### 1.2 Jira 정보 확인

| 항목 | 설명 | 예시 |
|------|------|------|
| **Domain** | Jira 인스턴스 URL의 서브도메인 | `mycompany` (mycompany.atlassian.net) |
| **Email** | Jira 로그인 이메일 | `user@example.com` |
| **API Token** | 위에서 생성한 토큰 | `ATCTT3xFfGN0Jx...` |

### 1.3 확장 프로그램 설정

1. Chrome 확장 프로그램 아이콘 클릭
2. "설정" 열기
3. 다음 정보 입력:
   - **Domain**: Jira 도메인 (예: `mycompany`)
   - **Email**: Jira 이메일
   - **API Token**: 생성한 토큰

4. 저장 후 티켓 로드 확인

### 1.4 문제 해결

| 문제 | 해결 방법 |
|------|-----------|
| "인증 실패" | 이메일과 API Token이 정확한지 확인 |
| "네트워크 오류" | 인터넷 연결 확인, 방화벽 확인 |
| 티켓이 안 보임 | `current` 필터 대신 `all` 필터 확인 |

## 2. 배포 전 체크리스트

- [x] `manifest.json` 검토 완료
- [x] `privacy.html` 생성 완료
- [ ] 스크린샷 준비 (최소 1장, 최대 5장)
- [ ] 홍보 이미지 준비 (1280x800 또는 640x400)
- [ ] 소개글 작성 (한국어, 영어)

## 2. 스크린샷 요구사항

### 필수 스크린샷 (1~5장)

| 해상도 | 최소 | 추천 |
|--------|------|------|
| 1280x800 | 최소 1280x800 | 1280x800 |
| 640x400 | 최소 640x400 | 640x400 |

**내용**:
- 사이드 패널이 열린 상태
- 티켓 목록 표시
- 플로팅 패널 토글 버튼

**패키징 스크립트 실행**:

```bash
# 배포용 ZIP 생성
bash scripts/package.sh
```

## 3. Chrome Web Store 배포 절차

### 3.1 개발자 계정 등록

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devdashboard) 접속
2. `$5` 1회 결제로 개발자 계정 등록

### 3.2 항목 생성

1. "새 항목" 클릭
2. ZIP 파일 업로드
3. 스토어 정보 입력

#### 스토어 리스트 정보

| 항목 | 내용 |
|------|------|
| 이름 | Please Be Done |
| 간단한 설명 | 내게 할당된 Jira 티켓을 빠르게 확인하세요 |
| 상세 설명 | (아래 샘플 참조) |
| 카테고리 | 생산성 (Productivity) |
| 언어 | 한국어, 영어 |

#### 상세 설명 (한국어)

```
내게 할당된 Jira 티켓을 한눈에 확인하세요.

🎯 주요 기능
• Chrome 사이드 패널에서 티켓 목록 확인
• 플로팅 패널로 빠른 접근
• 현재 스프린트 / 전체 티켓 필터
• 원클릭으로 티켓 상세 페이지 이동

⚙️ 지원 기능
• Atlassian REST API v3 호환
• Basic Auth 지원 (API Token)
• Jira Cloud (*atlassian.net)

🔒 보안
• 모든 데이터 브라우저 로컬 저장소에만 저장
• 서버로 데이터 전송 없음
• 개인정보 수집 없음
```

#### 상세 설명 (영어)

```
View your assigned Jira tickets at a glance.

🎯 Key Features
• View ticket list in Chrome Side Panel
• Quick access with floating panel
• Filter by current sprint / all tickets
• One-click navigation to ticket details

⚙️ Supported
• Atlassian REST API v3 compatible
• Basic Auth support (API Token)
• Jira Cloud (*atlassian.net)

🔒 Security
• All data stored only in browser local storage
• No data transmission to external servers
• No personal data collection
```

### 3.3 자산 업로드

1. **스크린샷** (1~5장): `screenshots/`
2. **홍보 이미지** (선택): `promotional/`
3. **아이콘**: manifest.json에 이미 정의됨

### 3.4 개인정보처리방침

`privacy.html` 링크 입력 또는 파일 업로드

### 3.5 게시

1. "게시" 클릭
2. 검수 대기 (1~3일)
3. 승인 후 자동 게시

## 4. 패키징 명령어

### 수동 패키징

```bash
# 프로젝트 루트에서
cd /Users/minhyunahn/Desktop/ETC/jira-sidepanel-extension

# ZIP 생성 (git, 불필요 파일 제외)
zip -r jira-sidepanel-extension.zip . -x ".git/*" "*.DS_Store" "screenshots/*" "promotional/*"
```

### 자동 패키징 (scripts/package.sh)

```bash
chmod +x scripts/package.sh
./scripts/package.sh
```

## 5. 버전 관리

버전을 올릴 때는 `manifest.json`의 `version` 필드 수정:

```json
{
  "version": "1.2.0"
}
```

버전 형식: `MAJOR.MINOR.PATCH` (예: 1.0.0, 1.1.0, 2.0.0)

## 6. 업데이트 배포

1. 버전 수정
2. ZIP 재생성
3. Developer Dashboard 업로드
4. 검수 대기
5. 자동 업데이트 (사용자)
