'use babel';

import SelectListView from 'atom-select-list';

function createElementForItem (item) {
  const element = document.createElement('li')
  element.style.height = '12px'
  element.className = 'item'
  element.textContent = item.name || item
  return element
}

export default class TestView {

  constructor(controller) {
      const targets = controller.targets().all;
      console.log(targets);
      const items = targets ? targets.map( (target) => { return target.name }) : [];
      const select = new SelectListView({
          items: items,
          elementForItem: (item) => {
              const element = document.createElement('li')
              element.style.height = '10px'
              element.className = 'item'
              element.textContent = item.name || item
              return element
          },
          emptyMessage: "(no targets found)",
          initialSelectionIndex: 1,
          infoMessage: "Select a target:\n",
          didConfirmSelection: (item) => { this.select(item); },
          didCancelSelection: () => { this.cancel(); }
      });

      this._select = select;
      this._modal = atom.workspace.addModalPanel({
          item: select,
          visible: true
      });
      select.focus();
  }

  select(item) {
      this.cancel();
  }

  cancel() {
      this._modal.destroy();
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
