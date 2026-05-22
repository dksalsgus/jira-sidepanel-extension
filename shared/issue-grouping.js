/**
 * 이슈를 부모 키 기준으로 그룹화
 * @param {Array<{parent: {key: string, summary: string} | null}>} issues
 * @returns {{groups: Map<string, {parent: object, children: Array}>, independent: Array}}
 */
export function groupIssues(issues) {
  const groups = new Map();
  const independent = [];
  const parentKeys = new Set();

  issues.forEach(issue => {
    if (issue.parent) {
      parentKeys.add(issue.parent.key);
      if (!groups.has(issue.parent.key)) {
        groups.set(issue.parent.key, { parent: issue.parent, children: [] });
      }
      groups.get(issue.parent.key).children.push(issue);
    } else {
      independent.push(issue);
    }
  });

  return {
    groups,
    independent: independent.filter(issue => !parentKeys.has(issue.key)),
  };
}
