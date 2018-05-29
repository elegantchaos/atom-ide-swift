'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 23/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import { CompositeDisposable  } from 'atom';
import IdeSwiftView from './ide-swift-view';
import SwiftPackageManager from './swift-package-manager';
import TargetsView from './targets-view';
import SelectListView from 'atom-select-list';

DebuggerViewURI = 'atom://ide-swift/lldb-console';

export default class IdeSwiftController {

    constructor(mainModule, state) {

        this._state = "initial";
        this._view = null;
        this._diagnostics = {};
        this._target = "";
        this._didDefault = false;
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
            this._target = serializedState.target;
        }

        this.updateToolBar();
        this.makeSubscriptions();
        this.interrogatePackage(serializedState.visible);
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
            target: this._target
        };

        const view = this._view;
        if (view) {
            serializedState.visible = view.isVisible()
        }

        return serializedState;
    }

    projectRoot() {
        const project = atom.project;
        const paths = project.getPaths();
        console.log(paths);
        return (paths.length > 0) ? paths[0] : "./"
    }

    interrogatePackage(showView) {
        const spm = new SwiftPackageManager(this.projectRoot());
        spm.getDescription().then( (description) => {
            const name = this._packageName = description.name;
            let targets = this._targets = { test:[], library:[], executable:[] };
            if (name) {
                description.targets.forEach( (target) => {
                    targets[target.type].push(target);
                });

                targets.all = [].concat(targets.executable, targets.library, targets.test);

                if (!this.hasTarget()) {
                    this.setTarget(this.defaultTarget().name);
                    this._didDefault = this.hasTarget();
                }

                if (showView) {
                    this.doWithView( (view) => {
                        view.showWelcome();
                    });
                }
            }

        });
    }

    makeSubscriptions() {
        const subscriptions = new CompositeDisposable;
        subscriptions.add(atom.commands.add('atom-workspace', {
            'ide-swift:toggle': () => atom.workspace.toggle(DebuggerViewURI),
            'ide-swift:build': () => this.doWithView((view) => view.buildApp()),
            'ide-swift:debug': () => this.doWithView((view) => view.runApp()),
            'ide-swift:stop': () => this.doWithView((view) => view.stopApp()),
            'ide-swift:clear': () => this.doWithView((view) => view.clearOutput()),
            'ide-swift:step-over': () => this.doWithView((view) => view.stepOverBtnPressed()),
            'ide-swift:step-out': () => this.doWithView((view) => view.stepOutBtnPressed()),
            'ide-swift:step-in': () => this.doWithView((view) => view.stepInBtnPressed()),
            'ide-swift:resume': () => this.doWithView((view) => view.resumeBtnPressed()),
            'ide-swift:target': () => this.chooseTarget()
        }));
        this.subscriptions = subscriptions;
    }

    setConsole(console) {
        this._console = console;
    }

    disposeConsole() {
        this._console = null;
    }

    setLinter(linter) {
        this._linter = linter;
    }

    outputDiagnostic(item, severity) {
        const linter = this._linter;
        const file = item.file;
        const line = item.line - 1;
        const column = item.column - 1;
        let items = this._diagnostics[file];
        if (!items) {
            this._diagnostics[file] = items = [];
        }

        items.push({
            severity: severity,
            location: {
                file: file,
                position: [[line, column], [line, column]],
            },
            excerpt: item.description,
            linterName: "Builder"
        });

        console.log(items);

        linter.setMessages(file, items);
    }

    clearDiagnostics() {
        this._diagnostics = {};
        this._linter.setAllMessages([]);
    }

    outputError(error) {
        this.outputDiagnostic(error, 'error');
    }

    outputWarning(warning) {
        this.outputDiagnostic(warning, 'warning');
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
            this._view = view;
            action(view);
            this.updateToolBar();
        });
    }

    setupToolBar(toolBar) {
        const buttons = {};
        buttons.play = toolBar.addButton({ icon: 'play', iconset: 'fa', callback: 'ide-swift:debug', tooltip: 'Debug the target.'});
        buttons.stop = toolBar.addButton({ icon: 'stop', iconset: 'fa', callback: 'ide-swift:stop', tooltip: 'Stop debugging.'});
        buttons.over = toolBar.addButton({ icon: 'arrow-right', iconset: 'fa', callback: 'ide-swift:step-over', tooltip: 'Step to the next statement.'});
        buttons.out = toolBar.addButton({ icon: 'arrow-up', iconset: 'fa', callback: 'ide-swift:step-out', tooltip: 'Step out of the current function.'});
        buttons.in = toolBar.addButton({ icon: 'arrow-down', iconset: 'fa', callback: 'ide-swift:step-in', tooltip: 'Step into the next statement.'});
        buttons.resume = toolBar.addButton({ icon: 'play-circle-o', iconset: 'fa', callback: 'ide-swift:resume', tooltip: 'Resume debugging.'});
        buttons.clear = toolBar.addButton({ icon: 'trash', iconset: 'fa', callback: 'ide-swift:clear', tooltip: 'Clear the console.'});
        buttons.target = toolBar.addButton({ icon: 'trash', iconset: 'fa', callback: 'ide-swift:target', tooltip: 'Set target to build/test/debug.'});

        this._toolBar = toolBar;
        this._buttons = buttons;

        this.updateToolBar();
    }

    chooseTarget() {
        const view = new TargetsView(this);
    }

    updateToolBar() {
        const buttons = this._buttons;
        if (buttons) {
            const gotView = this._view != null;
            const hasTarget = this.hasTarget();

            buttons.play.setEnabled((!gotView || !this.appIsRunning()));
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
        this.updateToolBar();
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

    setTarget(target) {
        this._target = target;
    }

    target() {
        return this._target;
    }

    hasTarget() {
        return this._target && (this._target != "");
    }

    targetIsDefault() {
        return this._didDefault;
    }

    packageName() {
        return this._packageName;
    }

    targets() {
        return this._targets;
    }

    defaultTarget() {
        const targets = this._targets;
        if (targets.all.length > 0) {
            return targets.all[0];
        } else {
            return "";
        }
    }
}
