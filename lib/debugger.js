'use babel';

/**
* Created by Sam Deane, 04/06/2018.
* All code (c) 2018 - present day, Elegant Chaos Limited.
* For licensing terms, see http://elegantchaos.com/license/liberal/.
*/

class ConfigView {

  constructor(serializedState) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('your-name-word-count');

    // Create message element
    const message = document.createElement('div');
    message.textContent = 'The YourNameWordCount package is Alive! It\'s ALIVE!';
    message.classList.add('message');
    this.element.appendChild(message);
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



class Callbacks {

    construct() {
        console.log("constructed Callbacks");
    }

    /**
     * Whether this provider is enabled or not.
     */
    isEnabled() {
      return Promise.resolve(true);
    }

    /**
     * Returns a list of supported debugger types + environments for the specified action.
     */
    getDebuggerTypeNames() {
      return ["language.swift"];
    }

    /**
     * Returns the UI component for configuring the specified debugger type and action.
     */
    getComponent(debuggerTypeName, configIsValidChanged) {
        return new ConfigView();
    }

}

class LaunchAttachProvider {

    construct(connection) {
        console.log("constructed LaunchAttachProvider");
    }

    getCallbacksForAction(action) {
        return new Callbacks(action);
    }

    /**
      * Returns a unique key which can be associated with the component.
      */
     getUniqueKey() {
       return this._uniqueKey;
     }

     /**
      * Returns target uri for this provider.
      */
     getTargetUri() {
       return this._targetUri;
     }
}

export default class Debugger {

    construct() {
        console.log("constructed Debugger");
        this.name = "Swift Debugger";
    }

    getLaunchAttachProvider(connection) {
        return new LaunchAttachProvider(connection);
    }

}
