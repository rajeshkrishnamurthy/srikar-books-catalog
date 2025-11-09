import { jest } from '@jest/globals';

const renderModuleUrl = new URL('../../scripts/index/render.js', import.meta.url);

export async function createPublicCatalogHarness() {
  jest.resetModules();
  jest.clearAllMocks();

  const dom = buildDom();
  const { renderBooks } = await import(renderModuleUrl.href);

  return {
    gridEl: dom.grid,
    emptyEl: dom.empty,
    render(docs, searchTerm = '') {
      renderBooks({
        gridEl: dom.grid,
        emptyEl: dom.empty,
        docs,
        searchTerm,
      });
    },
  };
}

function buildDom() {
  document.body.innerHTML = `
    <section>
      <div id="grid"></div>
      <p id="emptyState" hidden>No books</p>
    </section>
  `;
  return {
    grid: document.getElementById('grid'),
    empty: document.getElementById('emptyState'),
  };
}
