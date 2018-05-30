'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 23/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import { Disposable } from 'atom';
import IdeSwiftController from './ide-swift-controller';
import IdeSwiftAutocompleteProvider from './ide-swift-autocomplete-provider';

export default {
    controller: null,
    debugSerialization: false,

    /**
    Activate the plugin.
    We are passed the previously serialised state.
    */

    activate(serializedState) {
        if (this.debugSerialization) { console.log(serializedState); }

        const controller = this.controller = new IdeSwiftController(this);
        controller.activate(serializedState);
    },


    /**
    Deactivate the plugin and clean things up.
    */

    deactivate() {
        this.controller.deactivate();
    },

    /**
    Serialize the current state of the plugin.
    */

    serialize() {
        const serializedState = this.controller.serialize();
        if (this.debugSerialization) { console.log(serializedState); }
        return serializedState;
    },

    /**
    Capture a reference to the toolbar.
    */

    consumeToolBar(getToolBar) {
        const toolBar = getToolBar('ide-swift');
        this.controller.setupToolBar(toolBar);
        return new Disposable(() => { this.controller.disposeToolbar() });
    },

    /**
    Capture a reference to the console.
    */

    consumeConsole(createConsole) {
        let console = createConsole({id: 'ide-swift', name: 'Swift'});
        this.controller.setConsole(console);
        return new Disposable(() => { this.controller.disposeConsole() });
    },

    /**
    Capture a reference to the debugger.
    */

    consumeDebugger(d) {
        this.controller.setDebugger(d._service);
        return new Disposable(() => { this.controller.disposeDebugger() });
    },

    /**
    Capture a reference to the linter.
    */

    consumeIndie(registerIndie) {
        let linter = registerIndie({name: "Swift"});
        this.controller.setLinter(linter);
    },

    /**
    Capture a reference to the busy signal provider.
    */

    consumeBusySignal(service) {
        this.controller.setBusyService(service);
    },

    /**
    Auto-completion support.
    */

    getProvider() {
        // return a single provider, or an array of providers to use together
        return new IdeSwiftAutocompleteProvider();
    }
}
