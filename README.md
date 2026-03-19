# Please Be Done (Jira Sidepanel Extension)

내게 할당된 Jira 티켓을 브라우저 어디서나 한눈에 확인하고 관리하세요. Chrome 사이드 패널과 웹페이지 내 플로팅 패널을 통해 Jira 탭을 따로 열지 않고도 업무 현황을 파악할 수 있습니다.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-orange)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)

---

## 🎯 주요 기능

### 1. 효율적인 티켓 관리
- **부모 티켓 기준 그룹핑**: 하위 티켓들을 부모 티켓별로 묶어서 표시하여 업무 맥락을 쉽게 파악할 수 있습니다.
- **접기/펼치기 UI**: 그룹별로 리스트를 접거나 펼칠 수 있으며, 상단의 '전체 접기/펼치기' 버튼으로 리스트를 빠르게 정리할 수 있습니다.
- **원클릭 이동**: 티켓 번호나 제목을 클릭하면 즉시 해당 Jira 티켓 페이지가 새 탭으로 열립니다.

### 2. 다양한 뷰 모드 지원
- **사이드 패널 (Side Panel)**: Chrome 브라우저의 전용 사이드 패널 영역에서 안정적으로 티켓을 확인합니다.
- **플로팅 패널 (Floating Panel)**: 현재 보고 있는 웹페이지 위에 떠 있는 패널을 통해 더욱 빠르게 접근할 수 있습니다. (Jira 사이트 및 설정 시 모든 사이트에서 표시 가능)

### 3. 스마트 필터링
- **현재 스프린트**: 현재 진행 중인 스프린트에 할당된 티켓만 모아봅니다.
- **전체 할당 티켓**: 내게 할당된 모든 티켓을 최근 업데이트 순으로 확인합니다.
- **상태별 필터 (플로팅 패널)**: 할 일, 진행 중, 완료 상태별로 실시간 필터링이 가능합니다.

---

## ⚙️ 설치 및 설정 방법

### 1. 확장 프로그램 설치 (개발자 모드)
1. 이 저장소를 클론하거나 ZIP으로 다운로드합니다.
2. Chrome 브라우저에서 `chrome://extensions`에 접속합니다.
3. 우측 상단의 **개발자 모드**를 활성화합니다.
4. **압축해제된 확장 프로그램을 로드** 버튼을 클릭하고 프로젝트 루트 디렉토리를 선택합니다.

### 2. Jira 연결 설정
확장 프로그램을 사용하려면 Jira API Token이 필요합니다.
1. [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)에서 토큰을 생성합니다.
2. 확장 프로그램 설정(Options) 페이지를 엽니다.
3. 다음 정보를 입력하고 저장합니다:
   - **Domain**: Jira 인스턴스 도메인 (예: `mycompany`.atlassian.net)
   - **Email**: Jira 계정 이메일
   - **API Token**: 생성한 API 토큰

---

## 🏗️ 프로젝트 구조

```text
jira-sidepanel-extension/
├── manifest.json          # Manifest V3 설정
├── background.js          # 백그라운드 서비스 워커 (API 통신 중계)
├── content/               # 플로팅 패널 관련 (Content Script)
├── sidepanel/             # 사이드 패널 관련
├── options/               # 설정 페이지
├── utils/                 # 공통 유틸리티 (API, Storage, Auth)
├── icons/                 # 확장 프로그램 아이콘
└── scripts/               # 빌드/패키징 스크립트
```

- **기술 스택**: Vanilla JavaScript (ES6 Modules), CSS3, HTML5
- **API**: Jira Cloud REST API v3

---

## 🔒 보안 및 개인정보

- **로컬 저장**: 입력한 Jira 도메인, 이메일, API 토큰은 브라우저의 안전한 로컬 저장소(`chrome.storage.sync`)에만 저장됩니다.
- **직접 통신**: 모든 API 요청은 사용자의 브라우저에서 Jira 서버로 직접 이루어지며, 어떠한 외부 서버로도 데이터를 전송하지 않습니다.
- **XSS 방지**: 모든 동적 콘텐츠는 `escapeHtml` 처리를 거쳐 안전하게 렌더링됩니다.

---

## 📄 라이선스

이 프로젝트는 개인적인 용도 또는 사내용으로 자유롭게 수정 및 배포가 가능합니다.
