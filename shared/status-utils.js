/**
 * 상태 카테고리 색상명을 CSS 클래스 접미사로 변환
 * @param {string} colorName
 * @returns {string}
 */
export function getStatusBadgeClass(colorName) {
  const map = {
    'blue-gray': 'blue-grey',
    'blue-grey': 'blue-grey',
    yellow: 'yellow',
    green: 'green',
  };
  return map[colorName] ?? 'default';
}

/**
 * 상태 카테고리를 필터 키로 변환
 * @param {string} colorName
 * @returns {'todo' | 'inprogress' | 'done'}
 */
export function getCategoryKey(colorName) {
  if (colorName === 'yellow') return 'inprogress';
  if (colorName === 'green') return 'done';
  return 'todo';
}
