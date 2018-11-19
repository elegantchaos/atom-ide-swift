//'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 23/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

const { Disposable, BufferedProcess } = require('atom');
const IdeSwiftController = require('./ide-swift-controller');
const { AutoLanguageClient } = require('atom-languageclient');
const cp = require('child_process')
const Debugger = require('./debugger.js')

class SwiftLanguageClient extends AutoLanguageClient {
    constructor() {
        super()
        this.controller = null;
        this.debugSerialization = false;
    }

    getGrammarScopes () { return [ 'source.swift' ] }

    getLanguageName () { return 'Swift' }

    getServerName () { return 'Swift IDE' }

    startServerProcess () {
        atom.config.set('core.debugLSP', true);
        const command = atom.config.get('ide-swift.sourcekit-lsp', {}) || 'sourcekit-lsp';
        console.log("start server", command)
        const process = cp.spawn(command)
        this.captureServerErrors(process)
        process.on('exit', exitCode => {
            if (exitCode != 0 && exitCode != null) {
                atom.notifications.addError('IDE-PHP language server stopped unexpectedly.', {
                    dismissable: true,
                    description: this.processStdErr != null ? `<code>${this.processStdErr}</code>` : `Exit code ${exitCode}`
                })
            }
        })
        return process
    }

    /**
    Activate the plugin.
    We are passed the previously serialised state.
    */

    activate(serializedState) {
        super.activate(serializedState)
        if (this.debugSerialization) { console.log(serializedState); }

        const controller = this.controller = new IdeSwiftController(this);
        controller.activate(serializedState);
    }

    /**
    Deactivate the plugin and clean things up.
    */

    deactivate() {
        this.controller.deactivate();
        super.deactivate();
    }

    /**
    Serialize the current state of the plugin.
    */

    serialize() {
        const serializedState = this.controller.serialize();
        if (this.debugSerialization) { console.log(serializedState); }
        return serializedState;
    }

    /**
    Capture a reference to the toolbar.{
    "name": "ide-swift",
    "main": "./lib/ide-swift",
    "version": "0.1.8",
    "description": "Swift support for Atom IDE.",
    "keywords": [
        "swift",
        "debugger",
        "swift package manager",
        "lldb",
        "ide"
    ],
    "repository": "https://github.com/elegantchaos/atom-ide-swift",
    "license": "MIT",
    "engines": {
        "atom": ">= 1.19.0"
    },
    "dependencies": {
        "react": "16.3.2",
        "nuclide-debugger-common": "0.7.1",
        "atom-select-list": "0.7.1",
        "atom-languageclient": "^0.8.3"
    },
    "package-deps": [
        "atom-ide-ui",
        "tool-bar:1.1.7",
        "language-swift-89"
    ],
    "consumedServices": {
        "console": {
            "versions": {
                "0.1.0": "consumeConsole"
            }
        },
        "debugger.remote": {
            "versions": {
                "0.0.0": "consumeDebugger"
            }
        },
        "tool-bar": {
            "versions": {
                "^0 || ^1": "consumeToolBar"
            }
        },
        "linter-indie": {
            "versions": {
                "2.0.0": "consumeIndie"
            }
        },
        "atom-ide-busy-signal": {
            "versions": {
                "0.1.0": "consumeBusySignal"
            }
        }
    },
    "providedServices": {
        "autocomplete.provider": {
            "versions": {
                "2.0.0": "provideAutocomplete"
            }
        },
        "code-format.range": {
            "versions": {
                "0.1.0": "provideCodeFormat"
            }
        },
        "code-highlight": {
            "versions": {
                "0.1.0": "provideCodeHighlight"
            }
        },
        "definitions": {
            "versions": {
                "0.1.0": "provideDefinitions"
            }
        },
        "find-references": {
            "versions": {
                "0.1.0": "provideFindReferences"
            }
        },
        "outline-view": {
            "versions": {
                "0.1.0": "provideOutlines"
            }
        },
        "debugger.provider": {
          "description": "LLDB debugger engine.",
          "versions": {
            "0.0.0": "provideDebugger"
          }
      }
  },
    "configSchema": {
        "swift": {
            "title": "swift binary location",
            "description": "The location of the swift binary.\n \nDefault behaviour if this setting is left empty is to search for a command called `swift`, but you can specify an explicit path or different command here if required.",
            "type": "string",
            "default": ""
        },
        "lldb": {
            "title": "lldb binary location",
            "description": "The location of the lldb binary.\n \nDefault behaviour if this setting is left empty is to search for a command called `lldb`, but you can specify an explicit path or different command here if required.",
            "type": "string",
            "default": ""
        },
        "sourcekit-lsp": {
            "title": "sourcekit-lsp binary Location",
            "description": "The binary for the sourcekit-lsp server.\n \nDefault behaviour if this setting is left empty is to search for a command called `sourcekit-lsp`, but you can specify an explicit path or different command here if required.",
            "type": "string",
            "default": ""
        }
    }
}

    */

    consumeToolBar(getToolBar) {
        const toolBar = getToolBar('ide-swift');
        this.controller.setupToolBar(toolBar);
        return new Disposable(() => { this.controller.disposeToolbar() });
    }

    /**
    Capture a reference to the console.
    */

    consumeConsole(createConsole) {
        let console = createConsole({id: 'ide-swift', name: 'Swift'});
        this.controller.setConsole(console);
        return new Disposable(() => { this.controller.disposeConsole() });
    }

    /**
    Capture a reference to the debugger.
    */

    consumeDebugger(d) {
        this.controller.setDebugger(d._service);
        return new Disposable(() => { this.controller.disposeDebugger() });
    }

    /**
    Capture a reference to the linter.
    */

    consumeIndie(registerIndie) {
        let linter = registerIndie({name: "Swift"});
        this.controller.setLinter(linter);
    }

    /**
    Capture a reference to the busy signal provider.
    */

    consumeBusySignal(service) {
        this.controller.setBusyService(service);
    }

    /**
    Provide debugger.
    */

    provideDebugger() {
        return new Debugger();
    }
}

module.exports = new SwiftLanguageClient();
