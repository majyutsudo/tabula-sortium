/* Sidebar notice rotation. Add entries here without changing TABULA's core. */
(() => {
  'use strict';
  const notices = [
    {
      id: 'astral',
      title: '魔術堂 astral',
      subtitle: 'ASTRAL',
      heading: 'MAJYUTSUDO / THE OTHER ENTRANCE',
      description: 'もう一つの、魔術堂',
      href: 'https://majyutsudo.wpcomstaging.com/',
      appearance: 'astral',
      weight: 1,
      enabled: true
    },
    {
      id: 'emporium',
      title: '魔術堂',
      subtitle: 'emporium',
      heading: 'MAJYUTSUDO / THE MAGICAL STORE',
      description: 'オンライン・ショップ',
      href: 'https://majyutsudo.base.shop/',
      appearance: 'emporium',
      weight: 1,
      enabled: true
    },
    {
      id: 'books',
      title: '魔術への招待状',
      subtitle: 'INVITATION',
      heading: 'MAJYUTSUDO / ARCHIVES',
      stamp: '未処理  UNPROCESSED',
      description: 'Amazon（ペーパーバック／Kindle）',
      href: 'https://www.amazon.co.jp/dp/B0G6Y6ZQ96?th=1',
      appearance: 'books',
      weight: 1,
      enabled: true
    },
    {
      id: 'story',
      title: '魔術子の物語',
      subtitle: 'STORY',
      detail: '―屋根裏の魔術師―',
      heading: 'MAJYUTSUDO / BETWEEN WORLDS',
      stamp: 'KINDLE EDITION',
      description: 'Amazon（Kindle版）',
      href: 'https://www.amazon.co.jp/dp/B0FYK5M82F?th=1',
      appearance: 'story',
      weight: 1,
      enabled: true
    }
  ];

  const container = document.getElementById('sidebarNotice');
  if (!container) return;
  const available = notices.filter(notice =>
    notice.enabled && notice.weight > 0 && /^https:\/\//.test(notice.href)
  );
  if (!available.length) {
    container.hidden = true;
    return;
  }
  // One weighted choice per page load; never auto-rotate during a reading.
  const total = available.reduce((sum, notice) => sum + notice.weight, 0);
  let draw = Math.random() * total;
  const selected = available.find(notice => (draw -= notice.weight) < 0)
    || available[available.length - 1];
  const link = document.createElement('a');
  link.className = 'sidebar-notice-link sidebar-notice-' + selected.appearance;
  link.href = selected.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', (selected.id === 'emporium' ? '魔術堂 emporium' : selected.title + (selected.detail || '')) + ' を別タブで開く');
  // Keep each notice as a self-contained, accessible framed advertisement.
  const fields = [
    ['ornament', selected.heading],
    ['subtitle', selected.subtitle],
    ['title', selected.title],
    ...(selected.detail ? [['detail', selected.detail]] : []),
    ...(selected.stamp ? [['stamp', selected.stamp]] : []),
    ['description', selected.description]
  ];
  for (const [kind, content] of fields) {
    const element = document.createElement(kind === 'title' ? 'strong' : 'span');
    element.className = 'sidebar-notice-' + kind;
    element.textContent = content;
    if (kind === 'stamp') element.setAttribute('aria-hidden', 'true');
    link.append(element);
  }
  container.replaceChildren(link);
  container.hidden = false;
})();
