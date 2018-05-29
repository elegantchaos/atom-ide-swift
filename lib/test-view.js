'use babel';

import SelectList from 'atom-select-list';

function createElementForItem (item) {
  const element = document.createElement('li')
  element.style.height = '10px'
  element.className = 'item'
  element.textContent = item.name || item
  return element
}

export default class TestView {

  constructor(serializedState) {
    // Create root element
    this.element = document.createElement('dialog');
    this.element.innerText = "Dialog Title";
    const title = document.createElement('span');
    title.textContent = 'Select target:';
    const list = document.createElement('span');

    const select = new SelectList({
      items: ['Alice', 'Bob', 'Carol'],
      elementForItem: (item) => createElementForItem(item),
      emptyMessage: "Select target:",
      initialSelectionIndex: 1,
      infoMessage: "This is the info message"
    });
    list.appendChild(select.element);
    this.element.appendChild(title);
    this.element.appendChild(list);

    // document.body.appendChild(usersSelectList.element)
    // // Create message element
    // const select = document.createElement('select');
    // const opt1 = document.createElement('option');
    // const opt2 = document.createElement('option');
    // opt1.textContent = 'option 1';
    // opt2.textContent = 'option 2';
    // opt2.selected = true;
    // select.appendChild(opt1);
    // select.appendChild(opt2);
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
