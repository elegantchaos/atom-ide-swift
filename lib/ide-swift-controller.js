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

        this._view = null;
        this.executable = "";
        this.lldb = atom.config.get('ide-swift.lldb', {}) || 'lldb';
        this.swift = atom.config.get('ide-swift.swift', {}) || 'swift';
    }

    activate(state) {
        atom.workspace.addOpener( (url) => {
            if (url === DebuggerViewURI) {
                if (this._view == null) {
                    return new IdeSwiftView(this);
                } else {
                    return this._view;
                }
            }
        });

        if (state.executable) {
            this.executable = state.executable;
        }

        if (state.visible) {
            this.doWithView(() => {});
        }

        this.updateToolBar();
    }

    deactivate() {
        if (this.toolBar) {
            this.toolBar.removeItems();
            this.toolBar = null;
        }

        this._view.destroy();
        this.subscriptions.dispose();
    }

    serialize() {
        const state = {
            executable: this.executable
        };

        const view = this._view;
        if (view) {
            state.visible = view.isVisible()
        }

        return state
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
        this.console = console;
    }

    disposeConsole() {
        this.console = null;
    }

    setDebugger(db) {
        this.debugger = db;
    }

    disposeDebugger() {
        this.debugger = null;
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

        this.toolBar = toolBar;
        this.buttons = buttons;

        this.updateToolBar();
    }

    updateToolBar() {
        const buttons = this.buttons;
        if (buttons) {
            const view = this._view;
            const gotView = view != null;
            const gotExecutable = this.executable != null;

            buttons.play.setEnabled(gotExecutable && (!gotView || !view.appIsRunning()));
            buttons.stop.setEnabled(gotView && view.appIsRunning());
            buttons.over.setEnabled(gotView && view.appIsPaused());
            buttons.in.setEnabled(gotView && view.appIsPaused());
            buttons.out.setEnabled(gotView && view.appIsPaused());
            buttons.resume.setEnabled(gotView && view.appIsPaused());
        }
    }

    disposeToolbar() {
        this.toolBar = null;
    }
}
