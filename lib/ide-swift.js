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

class SwiftLanguageClient extends AutoLanguageClient {
    constructor() {
        super()
        this.controller = null;
        this.debugSerialization = false;
    }

    getGrammarScopes () { return [ 'source.swift' ] }

    getLanguageName () { return 'Swift' }

    getServerName () { return 'sourcekit' }

    startServerProcess () {
        atom.config.set('core.debugLSP', true);
        const command = atom.config.get('ide-swift.sourcekit-lsp', {}) || 'sourcekit-lsp';
        console.log("start server", command)
        const process = cp.spawn(command, [], { 'env' : {'SOURCEKIT_LOGGING':'2'} });
        this.captureServerErrors(process)
        process.on('exit', exitCode => {
            if (exitCode != 0 && exitCode != null) {
                atom.notifications.addError('Swift language server (sourcekit-lsp) stopped unexpectedly.', {
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
    Capture a reference to the toolbar.
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

    consumeLinterV2(registerLinter) {
        let linter = registerLinter({name: "SwiftX"});
        this.controller.setLinter(linter);
        super.consumeLinterV2(registerLinter);
    }

    /**
    Capture a reference to the busy signal provider.
    */

    consumeBusySignal(service) {
        this.controller.setBusyService(service);
    }

}

module.exports = new SwiftLanguageClient();
