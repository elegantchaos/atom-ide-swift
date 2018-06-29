'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 29/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import SelectListView from 'atom-select-list';

function createElementForItem (item) {
  const element = document.createElement('li')
  element.style.height = '12px'
  element.className = 'item'
  element.textContent = item.name || item
  return element
}

export default class TargetsView {

  constructor(controller) {
      const targets = controller.targets().all;
      const items = targets ? targets : [];
      const select = new SelectListView({
          items: items,
          elementForItem: (item) => {
              const element = document.createElement('li')
              element.style.height = '10px';
              element.className = 'item';
              element.textContent = item.name;
              return element
          },
          emptyMessage: "(no targets found)",
          infoMessage: "Select a target:\n",
          didConfirmSelection: (item) => { this.select(item); },
          didCancelSelection: () => { this.cancel(); }
      });

      this._controller = controller;
      this._select = select;
      this._items = items;
      this._modal = atom.workspace.addModalPanel({
          item: select,
          visible: true
      });
      select.focus();
  }

  select(item) {
      const controller = this._controller;
      if (controller.setTarget(item)) {
          controller.doWithView( view => {
            view.addOutput(`Changed target to ${item.name}.`);
          });
      }
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
