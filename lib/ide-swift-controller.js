'use babel';
'use strict';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 23/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import { CompositeDisposable  } from 'atom';
import IdeSwiftView from './ide-swift-view';
import Swift from './swift';
import TargetsView from './targets-view';
import SelectListView from 'atom-select-list';

DebuggerViewURI = 'atom://ide-swift/lldb-console';

export default class IdeSwiftController {

    constructor(mainModule, state) {

        this._state = "initial";
        this._view = null;
        this._diagnostics = {};
        this._didDefault = false;
        this._useBuilder = false;
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

        if (serializedState.target) {
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
        return (paths.length > 0) ? paths[0] : "./"
    }

    interrogatePackage(showView) {
        this._showView = showView;
        const spm = this._swift = new Swift(this.projectRoot());
        spm.getPackage().then( package => {
            this._package = package;
            this.processPackage();
        });

        spm.getDescription().then( description => {
            const name = this._packageName = description.name;
            let targets = this._targets = { test:[], library:[], executable:[] };
            if (name) {
                description.targets.forEach( (target) => {
                    targets[target.type].push(target);
                    if ((target.name === "Configure") && (target.type == "executable")) {
                        this._useBuilder = true;
                        console.log("Using Builder.")
                    }
                });

                targets.all = [].concat(targets.executable, targets.library, targets.test);
                let byName = {};
                targets.all.forEach( target => {
                    byName[target.name] = target;
                });
                targets.byName = byName;
            }
            this.processPackage();
        });
    }

    processPackage() {
        const targets = this._targets.byName;
        const package = this._package;
        if (targets && package) {
            const products = this._products = package.products;
            products.forEach( product => {
                const type = product.product_type;
                const productTargets = product.targets;
                if ((type == "executable") && productTargets) {
                    productTargets.forEach( target => {
                        const targetRecord = targets[target];
                        targetRecord.executable = product.name;
                        console.log(`Executable for ${targetRecord.name} is ${targetRecord.executable}.`)
                    });
                }
            });

            if (!this.hasTarget()) {
                this.setTarget(this.defaultTarget());
                this._didDefault = this.hasTarget();
            }

            if (this._showView) {
                this.doWithView( (view) => {
                    view.showWelcome();
                });
            }

        }
    }

    makeSubscriptions() {
        const subscriptions = new CompositeDisposable;
        subscriptions.add(atom.commands.add('atom-workspace', {
            'ide-swift:toggle': () => atom.workspace.toggle(DebuggerViewURI),
            'ide-swift:build': () => this.doWithView((view) => view.buildApp()),
            'ide-swift:debug': () => this.doWithView((view) => view.runApp()),
            'ide-swift:test': () => this.doWithView((view) => view.runTests()),
            'ide-swift:debugOrResume': () => this.debugOrResume(),
            'ide-swift:stop': () => this.doWithView((view) => view.stopApp()),
            'ide-swift:clear': () => this.doWithView((view) => view.clearOutput()),
            'ide-swift:step-over': () => this.doWithView((view) => view.stepOver()),
            'ide-swift:step-out': () => this.doWithView((view) => view.stepOut()),
            'ide-swift:step-in': () => this.doWithView((view) => view.stepIn()),
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


    outputTestFailure(failure) {
        this.outputDiagnostic(failure, 'failure');
        }

    setDebugger(db) {
        this._debugger = db;
    }

    disposeDebugger() {
        this._debugger = null;
    }

    setBusyService(service) {
        this._busy = service;
    }

    disposeBusyService() {
        this._busy = null;
    }

    reportBusy(title, options) {
        const service = this._busy;
        if (service) {
            return service.reportBusy(title, options);
        }
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
        const playTooltip = { title: () => { return this.playTooltip(); } };

        buttons.target = toolBar.addButton({ icon: 'bullseye', iconset: 'fa', callback: 'ide-swift:target', tooltip: 'Set target to build/test/debug.'});
        buttons.build = toolBar.addButton({ icon: 'wrench', iconset: 'fa', callback: 'ide-swift:build', tooltip: 'Build the target.'});
        buttons.test = toolBar.addButton({ icon: 'beaker', callback: 'ide-swift:test', tooltip: 'Run the tests.'});
        buttons.play = toolBar.addButton({ icon: 'play', iconset: 'fa', callback: 'ide-swift:debugOrResume', tooltip: playTooltip});
        buttons.stop = toolBar.addButton({ icon: 'stop', iconset: 'fa', callback: 'ide-swift:stop', tooltip: 'Stop debugging.'});
        buttons.over = toolBar.addButton({ icon: 'arrow-right', iconset: 'fa', callback: 'ide-swift:step-over', tooltip: 'Step to the next statement.'});
        buttons.out = toolBar.addButton({ icon: 'arrow-up', iconset: 'fa', callback: 'ide-swift:step-out', tooltip: 'Step out of the current function.'});
        buttons.in = toolBar.addButton({ icon: 'arrow-down', iconset: 'fa', callback: 'ide-swift:step-in', tooltip: 'Step into the next statement.'});
        buttons.clear = toolBar.addButton({ icon: 'trash', iconset: 'fa', callback: 'ide-swift:clear', tooltip: 'Clear the console.'});

        this._toolBar = toolBar;
        this._buttons = buttons;

        this.updateToolBar();
    }

    chooseTarget() {
        const view = new TargetsView(this);
    }

    debugOrResume() {
        this.doWithView((view) => {
            if (this.appIsPaused()) {
                view.resume();
            } else {
                view.runApp();
            }
        });
    }

    updateToolBar() {
        const buttons = this._buttons;
        if (buttons) {
            const gotView = this._view != null;
            const hasTarget = this.hasTarget();
            const paused = this.appIsPaused();

            buttons.play.setEnabled((!gotView || !this.appIsRunning()));
            buttons.stop.setEnabled(this.appIsRunning() || paused);
            buttons.over.setEnabled(paused);
            buttons.in.setEnabled(paused);
            buttons.out.setEnabled(paused);

            const playButton = buttons.play;
            const playIcon = paused ? 'play-circle-o' : 'play';
            this.updateIcon(playButton, playIcon, 'fa');
        }
    }

    playTooltip() {
        return this.appIsPaused() ? "Resume debugging the target." : "Debug the target.";
    }

    updateIcon(button, icon, iconset) {
        const classList = button.element.classList;
        let previousSet = button.options.iconset;
        if (previousSet) {
            classList.remove(previousSet);
        } else {
            previousSet = "icon";
        }
        const previousIcon = button.options.icon;
        classList.remove(`${previousSet}-${previousIcon}`);
        if (iconset) {
            classList.add(iconset);
        } else {
            iconset = "icon";
        }
        classList.add(`${iconset}-${icon}`);
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

    swift() {
        return this._swift;
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
        const changed = this._target != target.name;
        this._target = target.name;
        return changed;
    }

    shouldUseBuilder() {
        return this._useBuilder;
    }

    target() {
        const targetName = this._target;
        if (targetName) {
            return this._targets.byName[targetName];
        }
    }

    targetExecutable() {
        const target = this.target();
        const executable = target.executable;
        return executable ? executable : target.name;
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
