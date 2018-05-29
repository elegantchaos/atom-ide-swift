'use babel';

export default class TestView {

  constructor(serializedState) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('your-name-word-count');

    // Create message element
    const select = document.createElement('select');
    const opt1 = document.createElement('option');
    const opt2 = document.createElement('option');
    opt1.textContent = 'option 1';
    opt2.textContent = 'option 2';
    opt2.selected = true;
    select.appendChild(opt1);
    select.appendChild(opt2);
    this.element.appendChild(select);
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
