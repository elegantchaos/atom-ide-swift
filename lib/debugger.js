'use babel';

/**
* Created by Sam Deane, 04/06/2018.
* All code (c) 2018 - present day, Elegant Chaos Limited.
* For licensing terms, see http://elegantchaos.com/license/liberal/.
*/

import * as React from 'react';
import AutoGenLaunchAttachProvider from 'nuclide-debugger-common/AutoGenLaunchAttachProvider';
import {VsAdapterTypes} from 'nuclide-debugger-common/constants';

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

    getConfiguration() {
      const program = {
        name: 'program',
        type: 'string',
        description: 'Absolute path to the program.',
        required: true,
        visible: true,
      };
      const cwd = {
        name: 'cwd',
        type: 'string',
        description:
          'Absolute path to the working directory of the program being debugged.',
        required: true,
        visible: true,
      };
      const stopOnEntry = {
        name: 'stopOnEntry',
        type: 'boolean',
        description: 'Automatically stop program after launch.',
        defaultValue: false,
        required: false,
        visible: true,
      };

      const args = {
        name: 'args',
        type: 'array',
        itemType: 'string',
        description: 'Command line arguments passed to the program.',
        defaultValue: [],
        required: false,
        visible: true,
      };
      const runtimeExecutable = {
        name: 'runtimeExecutable',
        type: 'string',
        description:
          '(Optional) Runtime to use, an absolute path or the name of a runtime available on PATH',
        required: false,
        visible: true,
      };
      const env = {
        name: 'env',
        type: 'object',
        description:
          '(Optional) Environment variables (e.g. SHELL=/bin/bash PATH=/bin)',
        defaultValue: {},
        required: false,
        visible: true,
      };
      const outFiles = {
        name: 'outFiles',
        type: 'array',
        itemType: 'string',
        description:
          '(Optional) When source maps are enabled, these glob patterns specify the generated JavaScript files',
        defaultValue: [],
        required: false,
        visible: true,
      };
      const protocol = {
        name: 'protocol',
        type: 'string',
        description: '',
        defaultValue: 'inspector',
        required: false,
        visible: false,
      };

      const port = {
        name: 'port',
        type: 'number',
        description: 'Port',
        required: true,
        visible: true,
      };

      return {
        launch: {
          launch: true,
          vsAdapterType: VsAdapterTypes.NATIVE_LLDB,
          threads: false,
          properties: [
            program,
            cwd,
            stopOnEntry,
            args,
            runtimeExecutable,
            env,
            outFiles,
            protocol,
          ],
          scriptPropertyName: 'program',
          cwdPropertyName: 'cwd',
          scriptExtension: '.swift',
          header: (
            <p>This is intended to debug Swift files.</p>
          ),
        },
        attach: {
          launch: false,
          adapterExecutable: 'lldb',
          vsAdapterType: VsAdapterTypes.NATIVE_LLDB,
          threads: false,
          properties: [port],
          scriptExtension: '.swift',
          header: <p>Attach to a running Swift process</p>,
        },
      };
    }

    getLaunchAttachProvider(connection) {
        return new AutoGenLaunchAttachProvider(
            'Swift',
            connection,
            this.getConfiguration(),
        );
    }

}
