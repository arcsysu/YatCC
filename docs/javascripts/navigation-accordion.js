function getDirectNestedItems(nav) {
  return Array.from(nav.querySelectorAll(':scope > .md-nav__list > .md-nav__item--nested'));
}

function getItemToggle(item) {
  return item.querySelector(':scope > input.md-nav__toggle');
}

function normalizeAccordion(nav) {
  const items = getDirectNestedItems(nav);
  if (items.length < 2) {
    return;
  }

  const activeItem = items.find((item) => item.classList.contains('md-nav__item--active') || item.querySelector('.md-nav__item--active, .md-nav__link--active'));
  const checkedItems = items.filter((item) => getItemToggle(item)?.checked);
  const keepOpen = activeItem ?? checkedItems[0] ?? null;

  for (const item of items) {
    const toggle = getItemToggle(item);
    if (!toggle) {
      continue;
    }
    toggle.checked = keepOpen ? item === keepOpen : false;
  }
}

function bindAccordion(nav) {
  if (!nav || nav.dataset.yatAccordionBound === 'true') {
    return;
  }

  nav.dataset.yatAccordionBound = 'true';
  normalizeAccordion(nav);

  for (const item of getDirectNestedItems(nav)) {
    const toggle = getItemToggle(item);
    if (!toggle) {
      continue;
    }

    toggle.addEventListener('change', () => {
      if (!toggle.checked) {
        if (item.querySelector('.md-nav__link--active, .md-nav__item--active')) {
          toggle.checked = true;
        }
        return;
      }

      for (const sibling of getDirectNestedItems(nav)) {
        if (sibling === item) {
          continue;
        }
        const siblingToggle = getItemToggle(sibling);
        if (siblingToggle) {
          siblingToggle.checked = false;
        }
      }
    });
  }
}

function initSidebarAccordion() {
  const sidebar = document.querySelector('.md-sidebar--primary');
  if (!sidebar) {
    return;
  }

  const navs = Array.from(sidebar.querySelectorAll('nav.md-nav'));
  for (const nav of navs) {
    if (getDirectNestedItems(nav).length > 1) {
      bindAccordion(nav);
    }
  }
}

function applySeriesPageClass() {
  const path = window.location.pathname.replace(/\/+$/, '/');
  const isGuidePage = /\/introduction\//.test(path);
  const isTaskPage = /\/task\d+_doc\//.test(path);

  document.body.classList.toggle('yat-page--guides', isGuidePage);
  document.body.classList.toggle('yat-page--tasks', isTaskPage);
  document.body.classList.toggle('yat-page--series', isGuidePage || isTaskPage);
}

function initNavigationEnhancements() {
  initSidebarAccordion();
  applySeriesPageClass();
}

document.addEventListener('DOMContentLoaded', initNavigationEnhancements, { once: true });

if (typeof window.document$?.subscribe === 'function') {
  window.document$.subscribe(initNavigationEnhancements);
}