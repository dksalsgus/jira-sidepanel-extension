const COLLAPSED_CLASS = 'is-collapsed';

export function setGroupCollapsed(headerEl, collapsed) {
  if (collapsed) {
    headerEl.parentElement.classList.add(COLLAPSED_CLASS);
  } else {
    headerEl.parentElement.classList.remove(COLLAPSED_CLASS);
  }
  headerEl.setAttribute('aria-expanded', String(!collapsed));
}

export function toggleGroupFromEvent(headerEl, event, groupKeyClass) {
  if (event.target.classList.contains(groupKeyClass)) return false;
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return false;

  event.preventDefault();
  const isCollapsed = headerEl.parentElement.classList.toggle(COLLAPSED_CLASS);
  headerEl.setAttribute('aria-expanded', String(!isCollapsed));
  return true;
}
