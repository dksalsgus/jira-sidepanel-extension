#!/bin/bash

# 배포용 ZIP 패키징 스크립트

set -e

# 색상 출력
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 버전 읽기
VERSION=$(grep '"version"' manifest.json | head -1 | awk -F'"' '{print $4}')

echo -e "${BLUE}=== Please Be Done 패키징 ===${NC}"
echo "버전: $VERSION"

# ZIP 파일명
ZIP_FILE="please-be-done-v${VERSION}.zip"

# 제외할 파일/디렉토리
EXCLUDE=(
  ".git"
  ".gitignore"
  "*.DS_Store"
  "screenshots"
  "promotional"
  "scripts"
  "DEPLOY.md"
  "CLAUDE.md"
)

# zip exclude 옵션 생성
EXCLUDE_OPTS=""
for item in "${EXCLUDE[@]}"; do
  EXCLUDE_OPTS="$EXCLUDE_OPTS -x '$item/*' -x '$item'"
done

# ZIP 생성
echo "패키징 중..."
zip -r "$ZIP_FILE" . -x ".git/*" ".git/*/*" ".git/*/*/*" "*.DS_Store" "screenshots/*" "promotional/*" "scripts/*" "DEPLOY.md" "CLAUDE.md"

# 결과 확인
if [ -f "$ZIP_FILE" ]; then
  SIZE=$(du -h "$ZIP_FILE" | cut -f1)
  echo -e "${GREEN}✓ 완료: $ZIP_FILE ($SIZE)${NC}"
  echo ""
  echo "다음 단계:"
  echo "1. 스크린샷 추가: screenshots/ 디렉토리에 이미지 배치"
  echo "2. 홍보 이미지 추가: promotional/ 디렉토리에 이미지 배치"
  echo "3. Chrome Web Store Developer Dashboard에 업로드"
else
  echo -e "${RED}✗ 패키징 실패${NC}"
  exit 1
fi
