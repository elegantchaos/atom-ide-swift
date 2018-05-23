'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 23/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import { CompositeDisposable  } from 'atom';

DebuggerViewURI = 'atom://ide-swift/console';

export default class IdeSwiftController {

    constructor(mainModule, state) {

        this._state = "initial";
        this._view = null;
        this._executable = "";
        this._lldb = atom.config.get('ide-swift.lldb', {}) || 'lldb';
        this._swift = atom.config.get('ide-swift.swift', {}) || 'swift';

    }

    activate(serializedState) {
        atom.workspace.addOpener( (url) => {
            if (url === DebuggerViewURI) {
                if (this._view == null) {
                    return new IdeSwiftView(this);
                } else {
                    return this._view;
                }
            }
        });

        if (serializedState.executable) {
            this._executable = serializedState.executable;
        }

        if (serializedState.visible) {
            this.doWithView(() => {});
        }

        this.updateToolBar();
    }

    deactivate() {
        if (this._toolBar) {
            this._toolBar.removeItems();
            this._toolBar = null;
        }

        this._view.destroy();
        this.subscriptions.dispose();
    }

    serialize() {
        const serializedState = {
            executable: this._executable
        };

        const view = this._view;
        if (view) {
            serializedState.visible = view.isVisible()
        }

        return serializedState;
    }

    makeSubscriptions() {
        const subscriptions = this.subscriptions = new CompositeDisposable;
        return subscriptions.add(atom.commands.add('atom-workspace', {
            'toggle': () => atom.workspace.toggle(DebuggerViewURI),
            'debug': () => this.doWithView((view) => view.runApp()),
            'stop': () => this.doWithView((view) => view.stopApp()),
            'clear': () => this.doWithView((view) => view.clearOutput()),
            'step-over': () => this.doWithView((view) => view.stepOverBtnPressed()),
            'step-out': () => this.doWithView((view) => view.stepOutBtnPressed()),
            'step-in': () => this.doWithView((view) => view.stepInBtnPressed()),
            'resume': () => this.doWithView((view) => view.resumeBtnPressed()),
        }));
    }

    setConsole(console) {
        this._console = console;
    }

    disposeConsole() {
        this._console = null;
    }

    setDebugger(db) {
        this._debugger = db;
    }

    disposeDebugger() {
        this._debugger = null;
    }

    doWithView(action) {
        const options = { searchAllPanes: true };
        atom.workspace.open(DebuggerViewURI, options).then( (view) => {
            this.view = view;
            action(view);
            this.updateToolBar();
        });
    }

    setupToolBar(toolBar) {
        const buttons = {};
        buttons.play = toolBar.addButton({ icon: 'play', iconset: 'fa', callback: 'debug', tooltip: 'Debug the executable.'});
        buttons.stop = toolBar.addButton({ icon: 'stop', iconset: 'fa', callback: 'stop', tooltip: 'Stop the executable.'});
        buttons.over = toolBar.addButton({ icon: 'arrow-right', iconset: 'fa', callback: 'step-over', tooltip: 'Step to the next statement.'});
        buttons.out = toolBar.addButton({ icon: 'arrow-up', iconset: 'fa', callback: 'step-out', tooltip: 'Step out of the current function.'});
        buttons.in = toolBar.addButton({ icon: 'arrow-down', iconset: 'fa', callback: 'step-in', tooltip: 'Step into the next statement.'});
        buttons.resume = toolBar.addButton({ icon: 'play-circle-o', iconset: 'fa', callback: 'resume', tooltip: 'Resume debugging.'});
        buttons.clear = toolBar.addButton({ icon: 'trash', iconset: 'fa', callback: 'clear', tooltip: 'Clear the console.'});

        this._toolBar = toolBar;
        this._buttons = buttons;

        this.updateToolBar();
    }

    updateToolBar() {
        const buttons = this._buttons;
        if (buttons) {
            const gotView = this._view != null;
            const gotExecutable = this._executable != "";

            buttons.play.setEnabled(gotExecutable && (!gotView || !this.appIsRunning()));
            buttons.stop.setEnabled(this.appIsRunning());
            buttons.over.setEnabled(this.appIsPaused());
            buttons.in.setEnabled(this.appIsPaused());
            buttons.out.setEnabled(this.appIsPaused());
            buttons.resume.setEnabled(this.appIsPaused());
        }
    }

    disposeToolbar() {
        this._toolBar = null;
    }

    setState(state) {
        this._state = state;
        this.controller.updateToolBar();
    }

    state() {
        return this._state;
    }

    appIsRunning() {
        return this._state == "running";
    }

    appIsPaused() {
        return this._state == "paused";
    }

    lldbPath() {
        return this._lldb;
    }

    swiftPath() {
        return this._swift;
    }

    breakpoints() {
        return this._debugger.getModel().getBreakpoints();
    }

    console() {
        return this._console;
    }
}
