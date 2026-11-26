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
  const square = '<rect x="2" y="2" width="196" height="196"/>';
  const horizontal = '<path d="M2 100H198"/>';
  const vertical = '<path d="M100 2V198"/>';
  const gridLines = [41.2, 80.4, 119.6, 158.8].map(position =>
    '<path d="M2 ' + position + 'H198M' + position + ' 2V198"/>').join('');
  const figures = [
    ['none', 'なし', ''],
    ['circle', '円', circle],
    ['double-circle', '二重円', circle + '<circle cx="100" cy="100" r="49"/>'],
    ['quarters', '四分円', circle + '<path d="M2 100H198M100 2V198"/>'],
    ['twelve', '十二分円', circle + diameters],
    ['horizontal-line', '横線（上下二分）', horizontal],
    ['vertical-line', '縦線（左右二分）', vertical],
    ['square-quarters', '四分割の正方形', square + horizontal + vertical],
    ['square-grid', '5×5の方陣', square + gridLines],
    ['pentagram', '五芒星', star],
    ['circle-pentagram', '円と五芒星', circle + star],
    ['hexagram', '六芒星', '<path d="M100 2 184.87 149H15.13ZM100 198 15.13 51H184.87Z"/>'],
    ['circle-triangle', '円と外三角', '<circle cx="100" cy="127" r="71"/><path d="M100 -5 123 34.84H77Z"/>', '0 -10 200 210'],
  ];

  const drawing = (shape, tone, width, viewBox = '0 0 200 200') =>
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '" aria-hidden="true">' +
    '<g fill="none" stroke="' + tone + '" stroke-width="' + width + '" stroke-linejoin="round">' +
    shape + '</g></svg>';

  function selectFigure(id, label, shape, viewBox) {
    cloth.classList.toggle('has-figure', Boolean(shape));
    if (shape) {
      const mask = encodeURIComponent(drawing(shape, 'white', .84, viewBox));
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

  for (const [id, label, shape, viewBox] of figures) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.figure = id;
    button.innerHTML = drawing(shape, 'currentColor', 8, viewBox);
    button.append(label);
    button.addEventListener('click', () => {
      selectFigure(id, label, shape, viewBox);
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
