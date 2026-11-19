/* Sidebar notice rotation. Add entries here without changing TABULA's core. */
(() => {
  'use strict';
  const notices = [
    {
      id: 'astral',
      title: '魔術堂 astral',
      subtitle: 'THE ASTRAL ARCHIVE',
      description: 'もう一つの、魔術堂',
      href: 'https://majyutsudo.wpcomstaging.com/',
      appearance: 'astral',
      weight: 1,
      enabled: true
    },
    {
      id: 'emporium',
      title: '魔術堂 emporium',
      subtitle: 'THE HOUSE OF COMMERCE AND CONJURATION',
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
      description: 'Amazon（ペーパーバック／Kindle）',
      href: 'https://www.amazon.co.jp/dp/B0G6Y6ZQ96?th=1',
      appearance: 'books',
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
  link.setAttribute('aria-label', selected.title + ' を別タブで開く');
  for (const [kind, content] of [
    ['ornament', selected.id === 'books' ? 'MAJYUTSUDO / ARCHIVES' : '✧  MAJYUTSUDO  ✧'],
    ['title', selected.title],
    ['subtitle', selected.subtitle],
    ['description', selected.description]
  ]) {
    const element = document.createElement(kind === 'title' ? 'strong' : 'span');
    element.className = 'sidebar-notice-' + kind;
    element.textContent = content;
    link.append(element);
  }
  if (selected.id === 'books') {
    const stamp = document.createElement('span');
    stamp.className = 'sidebar-notice-stamp';
    stamp.textContent = '未処理  UNPROCESSED';
    stamp.setAttribute('aria-hidden', 'true');
    link.append(stamp);
  }
  container.replaceChildren(link);
  container.hidden = false;
})();
