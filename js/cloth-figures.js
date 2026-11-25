(() => {
  const cloth = document.getElementById('cloth');
  const menu = document.getElementById('clothFigures');
  const summary = menu.querySelector('summary');
  const options = document.getElementById('clothFigureOptions');
  const name = document.getElementById('clothFigureName');
  const sizeField = document.getElementById('clothFigureSizeField');
  const size = document.getElementById('clothFigureSize');
  const sizeValue = document.getElementById('clothFigureSizeValue');

  const circle = '<circle cx="100" cy="100" r="98"/>';
  const star = '<path d="M100 2 157.60 179.28 6.80 69.72 193.20 69.72 42.40 179.28Z"/>';
  const diameters = Array.from({length: 6}, (_, i) =>
    '<path d="M2 100H198" transform="rotate(' + i * 30 + ' 100 100)"/>').join('');
  const figures = [
    ['none', 'なし', ''],
    ['circle', '円', circle],
    ['double-circle', '二重円', circle + '<circle cx="100" cy="100" r="49"/>'],
    ['quarters', '四分円', circle + '<path d="M2 100H198M100 2V198"/>'],
    ['twelve', '十二分円', circle + diameters],
    ['pentagram', '五芒星', star],
    ['circle-pentagram', '円と五芒星', circle + star],
    ['circle-triangle', '円と外三角', '<circle cx="80" cy="100" r="76"/><path d="M180 80 198 111.18H162Z"/>'],
  ];

  const drawing = (shape, tone, width) =>
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" aria-hidden="true">' +
    '<g fill="none" stroke="' + tone + '" stroke-width="' + width + '" stroke-linejoin="round">' +
    shape + '</g></svg>';

  function selectFigure(id, label, shape) {
    cloth.classList.toggle('has-figure', Boolean(shape));
    if (shape) {
      const mask = encodeURIComponent(drawing(shape, 'white', .84));
      cloth.style.setProperty('--cloth-figure-mask', 'url("data:image/svg+xml,' + mask + '")');
    } else {
      cloth.style.removeProperty('--cloth-figure-mask');
    }
    name.textContent = label;
    sizeField.hidden = !shape;
    for (const button of options.children) {
      button.setAttribute('aria-pressed', String(button.dataset.figure === id));
    }
  }

  for (const [id, label, shape] of figures) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.figure = id;
    button.innerHTML = drawing(shape || '<path d="M45 100H155"/>', 'currentColor', 8);
    button.append(label);
    button.addEventListener('click', () => {
      selectFigure(id, label, shape);
      menu.open = false;
      summary.focus();
    });
    options.append(button);
  }

  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      event.preventDefault();
      menu.open = false;
      summary.focus();
    }
  });
  size.addEventListener('input', () => {
    cloth.style.setProperty('--cloth-figure-size', size.value + 'cqmin');
    sizeValue.value = size.value + '%';
  });

  const initial = new URLSearchParams(location.search).get('cloth') === 'velour' ? 1 : 0;
  selectFigure(...figures[initial]);
})();
