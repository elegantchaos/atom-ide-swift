'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 23/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import { TextEditor } from 'atom';
import { spawn } from 'child_process';

export default class IdeSwiftView {

    constructor(controller) {
        this.controller = controller;
        this.lastCommand = "";

        // Create root element
        const editor = this.editor = new TextEditor({ autoHeight: false, softWrapped:true, autoIndent:false});
        editor.insertText("> ");
        const element = this.element = editor.getElement();
        element.classList.add('ide-swift');
        editor.onDidStopChanging( () => {
            this.checkForCommand();
        });
        this.subscriptions = atom.commands.add(element, {
            'core:confirm': event => {
                console.debug('confirm');
                event.stopPropagation();
            },
            'core:cancel': event => {
                console.debug('cancel');
                event.stopPropagation();
            }
        });

        this.showWelcome();
    }

    // Returns an object that can be retrieved when package is activated
    serialize() {}

    // Tear down any state and detach
    destroy() {
        this.element.remove();
        this.subscriptions.destroy();
    }

    getElement() {
        return this.element;
    }

    getTitle() {
        return "Swift";
    }

    getDefaultLocation() {
        return "bottom";
    }

    isVisible() {
        return this.element.component.isVisible();
    }

    showWelcome() {
        const controller = this.controller;
        const package = controller.packageName();
        const targets = controller.targets();

        this.scrollToBottomOfOutput();
        this.addOutput("Welcome to Swift IDE.");
        this.addOutput(`Package: ${package}.`);
        const target = controller.target();
        if (target == undefined) {
            this.addOutput(`No target set.`);
        } else if (controller.targetIsDefault()) {
            this.addOutput(`Target defaulted to: \`${target.name}\`.`);
        } else {
            this.addOutput(`Target: ${target.name}.`)
        }

        this.addOutput(`(use the target button to change)`);
    }

    checkForCommand() {
        const editor = this.editor;
        const bottom = editor.getLastBufferRow();
        const bottomLine = editor.lineTextForBufferRow(bottom);
        if (bottomLine == "") {
            const commandLine = editor.lineTextForBufferRow(bottom - 1);
            if (commandLine.slice(0,2) == "> ") {
                const command = commandLine.slice(2);
                if (command != this.lastCommand) {
                    console.log("command", command);
                    this.lastCommand = command;
                    editor.insertText('\n> ');
                    this.parseCommand(command);
                }
            } else {
                // we've lost the prompt somehow, so add another
                this.scrollToBottomOfOutput();
                editor.insertText('> ');
            }
        }
    }

    addOutput(data) {
        const editor = this.editor;
        const insertAt = editor.getLastBufferRow();
        const line = editor.lineTextForBufferRow(bottom);

        editor.setSelectedBufferRange([[insertAt, 0], [insertAt,0]]);
        editor.insertText(data);
        editor.insertNewline();

        const bottom = editor.getLastBufferRow() + 1;
        editor.setSelectedBufferRange([[bottom, 0], [bottom,0]]);
        editor.scrollToBufferPosition([bottom,0]);
    }


    clearOutput() {
        const editor = this.editor;
        editor.setTextInBufferRange([[0,0], [editor.getLastBufferRow() + 1, 0]], "> ");
        editor.setSelectedBufferRange([[0, 2], [0,2]]);
        editor.scrollToBufferPosition([0,0]);
    }

    scrollToBottomOfOutput() {
        const editor = this.editor;
        const bottom = editor.getLastBufferRow();
        const line = editor.lineTextForBufferRow(bottom);
        editor.setSelectedBufferRange([[bottom, 0], [bottom,0]]);
        editor.scrollToBufferPosition([bottom,0]);
    }

    lldbCommand(command) {
        if (this.lldb) {
            this.lldb.stdin.write(`${command}\n`);
        }
    }

    stepIn() {
        this.lldbCommand("step");
    }

    stepOut() {
        this.lldbCommand("finish");
    }

    stepOver() {
        this.lldbCommand("next");
    }

    resume() {
        this.lldbCommand("continue");
    }



    runApp() {
        this.buildApp(true);
    }

    buildApp(runWhenBuilt) {
        this.stopDebugger();

        const controller = this.controller;
        if(!controller.hasTarget()) {
            this.addOutput("Please set the target to build.");
            return;
        }

        const executable = controller.targetExecutable();
        this.addOutput(`Building ${executable}`)
        controller.clearDiagnostics();
        const stdout = data => { this.processBuilderOutput(data.toString().trim()); };
        const stderr = data => { this.processBuilderError(data.toString().trim()); };
        this._builder = controller.swift().build(executable, stdout, stderr, controller.shouldUseBuilder()).then( code => {
            this.processBuilderExit(code, runWhenBuilt);
            this._builder = null;
        });

    }

    runTests() {
        this.stopDebugger();

        const controller = this.controller;
        if(!controller.hasTarget()) {
            this.addOutput("Please set the target to test.");
            return;
        }

        controller.clearDiagnostics();
        const stdout = data => { console.log(data); this.processBuilderOutput(data.toString().trim()); };
        const stderr = data => { this.processBuilderError(data.toString().trim()); };
        this._tester = controller.swift().test(stdout, stderr).then( code => {
            this.processTestsExit(code);
            this._tester = null;
        });
    }

    runDebugger() {
        const controller = this.controller;
        const executable = controller.targetExecutable();
        this.addOutput(`Running ${executable}.`)
        this.lldb = spawn(controller.lldbPath(), [controller.projectRoot() + "/.build/debug/" + executable]);

        const breakpoints = controller.breakpoints();
        breakpoints.forEach( breakpoint => {
            if (breakpoint.enabled) {
                const command = `b ${breakpoint.uri}:${breakpoint.line}`;
                this.lldb.stdin.write(command + "\n");
            }
        });

        this.lldb.stdin.write('r\n');
        this.lldb.stdout.on('data', data => {
            this.processDebuggerOutput(data.toString().trim());
        });
        this.lldb.stderr.on('data',data => {
            this.processDebuggerError(data.toString().trim());
        });
        return this.lldb.on('exit',code => {
            this.processDebuggerExit(code);
        });
    }

    stopDebugger() {
        if (this.lldb != null) {
            this.controller.setState("exiting")
            this.lldbCommand("exit");
        }
        return this.lldb = null;
    }

    processBuilderOutput(output) {
        let matched = false;
        var match;
        let pattern = /(.*):(.*):(.*): error: (.*)\n/g;

        // compiler errors
        while (match = pattern.exec(output)) {
            const error = { file: match[1], line: match[2], column: match[3], description: match[4] }
            this.controller.outputError(error);
            matched = true;
        }

        // compiler warnings
        pattern = /(.*):(.*):(.*): warning: (.*)\n/g;
        while (match = pattern.exec(output)) {
            const warning = { file: match[1], line: match[2], column: match[3], description: match[4] }
            this.controller.outputWarning(warning);
            matched = true;
        }

        // unit test failures
        pattern = /(.*):(.*): error: (.*) : (.*) *failed:* (.*) *- (.*)\n/g;
        while (match = pattern.exec(output)) {
            const test = match[3];
            const kind = match[4] || "test";
            var reason = match[5];
            const comment = match[6];
            if (comment) {
                reason += " - " + comment
            }
            const error = { file: match[1], line: match[2], column: 0, description: `${kind} ${test} failed: ${reason}` }
            this.controller.outputTestFailure(error);
            matched = true;
        }

        if (!matched) {
            this.addOutput("» " + output);
        }
    }

    processBuilderError(output) {
        this.addOutput("!» " + output);
    }

    processBuilderExit(code, runWhenBuilt) {
        const codeString = code.toString().trim();
        if (codeString === '0') {
            this.addOutput(`Build succeeded.`);
            if (runWhenBuilt) {
                this.runDebugger();
            }
        } else {
            this.addOutput(`Build failed with code : ${codeString}.`);
        }
    }

    processTestsExit(code) {
        const codeString = code.toString().trim();
        if (codeString === '0') {
            this.addOutput(`Tests succeeded.`);
        } else {
            this.addOutput(`Tests failed with code : ${codeString}.`);
        }
    }
    processDebuggerOutput(output) {
        let suppress = false;
        let match = /Process (.*) launched/.exec(output);
        if (match) {
            this.process = match[1];
            this.controller.setState("running");
            suppress = true;
        }

        if (!match) {
            match = /Process (.*) stopped/.exec(output);
            if (match) {
                this.controller.setState("paused");
            }
        }

        if (!match) {
            match = /Process (.*) resumed/.exec(output);
            if (match) {
                this.controller.setState("running");
                suppress = true;
            }
        }

        if (!match) {
            match = /Process (.*) exited/.exec(output);
            if (match) {
                this.controller.setState("exited");
                suppress = true;
            }
        }

        if (!match) {
            const patterns = [
                /\(lldb\) target create ".*"/,
                /\(lldb\) b .*.swift:.*/
            ];
            patterns.forEach( pattern => {
                if (pattern.exec(output)) {
                    console.log(output);
                    suppress = true;
                };
            });
        }

        if (!suppress) {
            this.addOutput(output)
        }
    }

    processDebuggerError(error) {
        this.addOutput(error)
    }

    processDebuggerExit(code) {
        this.addOutput(`exit code: ${code.toString().trim()}`);
        this.controller.setState("exited");
    }

    parseCommand(command) {
        if (command) {
            this.lldbCommand(command);
            this.controller.updateToolBar();
        }
    }

    stringIsBlank(str) {
        return !str || /^\s*$/.test(str);
    }

    destroy() {
        console.debug("destroy called");
        this.controller.view = null;
    }


}
