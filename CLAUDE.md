# Jira Sidepanel Extension

## 프로젝트 개요

Chrome Extension Manifest V3 기반 확장 프로그램으로, 할당된 Jira 티켓을 플로팅 패널/사이드 패널로 표시합니다.

- **기술 스택**: 순수 JavaScript (ES6 Modules), Chrome Extension API, Atlassian REST API v3
- **최소 Chrome 버전**: 114

## 개발 명령어

### Chrome에 로드 (개발 모드)

```bash
# Chrome에서 직접 로드:
# 1. chrome://extensions 이동
# 2. 개발자 모드 활성화
# 3. "압축 해제된 확장 프로그램 로드" 클릭
# 4. 프로젝트 루트 디렉토리 선택
```

**참고**: 빌드 시스템 없음, 테스트 프레임워크 없음, 린트/포맷 도구 없음

## 아키텍처

### 디렉토리 구조

```
jira-sidepanel-extension/
├── background.js          # Service Worker (API 프록시, 메시지 핸들링)
├── content/
│   ├── content.css        # 플로팅 패널 스타일
│   └── content.js         # Content Script
├── sidepanel/
│   ├── sidepanel.html     # 사이드 패널 구조
│   ├── sidepanel.css      # 사이드 패널 스타일
│   └── sidepanel.js       # 사이드 패널 로직
├── options/
│   ├── options.html       # 설정 페이지
│   └── options.js         # 설정 로직
├── utils/
│   ├── api.js             # Jira API 클라이언트
│   ├── auth.js            # 인증 유틸리티
│   └── storage.js         # 스토리지 유틸리티
├── icons/                 # 확장 프로그램 아이콘
└── manifest.json          # Manifest V3 설정
```

### 데이터 흐름

```
1. Content/Sidepanel → Background (API 요청)
2. Background → Atlassian API (Basic Auth)
3. Background → Content/Sidepanel (응답)
```

### 메시지 유형

| 타입 | 설명 |
|------|------|
| `TOGGLE_PANEL` | 플로팅 패널 토글 |
| `FETCH_JIRA` | Jira API 요청 |
| `OPEN_OPTIONS` | 옵션 페이지 열기 |

### 상태 관리

- **설정**: `chrome.storage.sync`에 저장
- **로컬 상태**: JS 변수로 관리

## 중요 패턴

### CSS 네이밍

모든 CSS 클래스에 `jmt-` 접두사 사용 (Jira My Tickets)

```css
.jmt-panel { /* 플로팅 패널 */ }
.jmt-ticket { /* 티켓 아이템 */ }
```

### 보안

**XSS 방지**: 모든 DOM 생성 시 `escapeHtml()` 유틸리티 사용

```javascript
import { escapeHtml } from './utils/escapeHtml.js'
```

**API 토큰**: `chrome.storage.sync`에 저장

### JQL 필터

| 타입 | JQL |
|------|-----|
| `current` | `assignee = currentUser() AND sprint in openSprints() ORDER BY priority DESC` |
| `all` | `assignee = currentUser() ORDER BY updated DESC` |

## 구현 시 참고사항

1. **DOM 생성**: 항상 `escapeHtml()` 사용하여 XSS 방지
2. **모듈 시스템**: ES6 모듈 사용 (`type="module"`)
3. **Content Script**: 모든 URL에서 실행 (`<all_urls>`)
4. **최소 Chrome 버전**: 114

## 인증 설정

### API Token 발급

1. [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens) 접속
2. "Create API token" 클릭
3. 라벨 입력 후 생성
4. 토큰 복사 (다시 표시되지 않음)

### 필요 정보

| 항목 | 예시 |
|------|------|
| Domain | `mycompany` (mycompany.atlassian.net) |
| Email | `user@example.com` |
| API Token | `ATCTT3xFfGN0Jx...` |

### 설정 저장

```javascript
// chrome.storage.sync에 저장
await chrome.storage.sync.set({
  domain: 'mycompany',
  email: 'user@example.com',
  apiToken: 'ATCTT3xFfGN0Jx...'
})
```
