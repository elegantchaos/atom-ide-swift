'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 23/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

let SwiftDebugger;
const Breakpoint = require('./breakpoint');
const BreakpointStore = require('./breakpoint-store');
const SwiftDebuggerView = require('./swift-debugger-view');
const {$, $$, View, TextEditorView} = require('atom-space-pen-views');


import * as React from 'react';
import IdeSwiftView from './ide-swift-view';
import { Disposable, CompositeDisposable  } from 'atom';
import {VsAdapterTypes} from 'nuclide-debugger-common/constants';
import AutoGenLaunchAttachProvider from 'nuclide-debugger-common/AutoGenLaunchAttachProvider';

const DebuggerViewURI = 'atom://ide-swift/console';

export default {
    subscriptions: null,
    console: null,

    /**
    Serialization support.
    */

    deserializeBreakpointStore(state) { return new BreakpointStore(state) },
    deserializeBreakpoint(state) { return new Breakpoint(state) },

    /**
    Activate the plugin.
    We are passed the previously serialised state.
    */

    activate(state) {
        console.debug(`ide-swift activate`, JSON.stringify(state));

        atom.workspace.addOpener( (url) => {
            if (url === DebuggerViewURI) {
                if (this._view == null) {
                    console.debug("made new view");
                    return new SwiftDebuggerView(this);
                } else {
                    return this._view;
                }
            }
        });

        this.executable = state.executable || "";
        this.lldb = atom.config.get('ide-swift.lldb', {}) || 'lldb';
        this.swift = atom.config.get('ide-swift.swift', {}) || 'swift';

        const breakpointState = state.breakPoints;
        let breakpoints = breakpointState ? atom.deserializers.deserialize(breakpointState) : null;
        if (!breakpoints) {
            breakpoints = new BreakpointStore();
        }
        this.breakpoints = breakpoints;
        if (state.visible) {
            console.debug("restoring view");
            this.doWithView(() => {});
        }

        this.updateToolBar();

        this.subscriptions = new CompositeDisposable;
        return this.subscriptions.add(atom.commands.add('atom-workspace', {
            'toggle': () => atom.workspace.toggle(DebuggerViewURI),
            'breakpoint': () => this.toggleBreakpoint(),
            'debug': () => this.doWithView((view) => view.runApp()),
            'stop': () => this.doWithView((view) => view.stopApp()),
            'clear': () => this.doWithView((view) => view.clearOutput()),
            'step-over': () => this.doWithView((view) => view.stepOverBtnPressed()),
            'step-out': () => this.doWithView((view) => view.stepOutBtnPressed()),
            'step-in': () => this.doWithView((view) => view.stepInBtnPressed()),
            'resume': () => this.doWithView((view) => view.resumeBtnPressed()),
        }));
    },


    /**
        Deactivate the plugin and clean things up.
    */

    deactivate() {
        this.lldbInputView.destroy();
        this.subscriptions.dispose();
        if (this.toolBar) {
            this.toolBar.removeItems();
            this.toolBar = null;
        }

        return this._view.destroy();
    },

    /**
        Serialize the current state of the plugin.
    */

    serialize() {
        const state = {
            executable: this.executable
        };

        const breakPoints = this.breakpoints;
        if (breakPoints) {
            state.breakPoints = breakPoints.serialize()
        }

        const view = this._view;
        if (view) {
            state.visible = view.isVisible()
        }

        console.debug(`ide-swift serialized`, JSON.stringify(state))
        return state
    },

    doWithView(action) {
        const options = { searchAllPanes: true };
        atom.workspace.open(DebuggerViewURI, options).then( (view) => {
            console.debug("with view");
            this._view = view;
            action(view);
            this.updateToolBar();
        });
    },

    toggleBreakpoint() {
        const editor = atom.workspace.getActiveTextEditor();
        const file = editor.getTitle();
        const line = editor.getCursorBufferPosition().row + 1;
        const breakpoint = new Breakpoint({file: file, line: line});
        return this.breakpoints.toggle(breakpoint);
    },

    consumeToolBar(getToolBar) {
        const buttons = {};

        toolBar = getToolBar('ide-swift');
        buttons.play = toolBar.addButton({ icon: 'play', iconset: 'fa', callback: 'debug', tooltip: 'Debug the executable.'});
        buttons.stop = toolBar.addButton({ icon: 'stop', iconset: 'fa', callback: 'stop', tooltip: 'Stop the executable.'});
        buttons.over = toolBar.addButton({ icon: 'arrow-right', iconset: 'fa', callback: 'step-over', tooltip: 'Step to the next statement.'});
        buttons.out = toolBar.addButton({ icon: 'arrow-up', iconset: 'fa', callback: 'step-out', tooltip: 'Step out of the current function.'});
        buttons.in = toolBar.addButton({ icon: 'arrow-down', iconset: 'fa', callback: 'step-in', tooltip: 'Step into the next statement.'});
        buttons.resume = toolBar.addButton({ icon: 'play-circle-o', iconset: 'fa', callback: 'resume', tooltip: 'Resume debugging.'});
        buttons.breakpoint = toolBar.addButton({ icon: 'bug', iconset: 'fa', callback: 'breakpoint', tooltip: 'Toggle breakpoint at the current line.'});
        buttons.clear = toolBar.addButton({ icon: 'trash', iconset: 'fa', callback: 'clear', tooltip: 'Clear the console.'});

        this.toolBar = toolBar;
        this.buttons = buttons;

        this.updateToolBar();
    },

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
    },

    consumeConsole(createConsole) {
        let console = createConsole({id: 'ide-swift', name: 'Swift'});
        console.log('A message!');
        console.error('Uh oh!');
        this.console = console;
        return new Disposable(() => { this.console = null; });
    },

    consumeDebugger(d) {
        const breakpoints = d._service.getModel().getBreakpoints();
        console.log(breakpoints);
    }
}
