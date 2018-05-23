'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 23/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import { TextEditor } from 'atom';
import { spawn } from 'child_process';
import * as path from 'path';

export default class IdeSwiftView {

    constructor(controller) {
        this.controller = controller;
        this.breakpoints = controller.breakpoints;
        this.state = "initial";
        this.lastCommand = "";

        // Create root element
        const editor = this.editor = new TextEditor({
            placeholderText: '> enter lldb commands here'
        });
        const element = this.element = editor.getElement();
        element.classList.add('ide-swift');
        editor.onDidStopChanging( () => {
            console.log("changed");
            const bottom = editor.getLastBufferRow();
            const line = editor.lineTextForBufferRow(bottom);
            if (line == "") {
                const command = editor.lineTextForBufferRow(bottom - 1);
                if (command != this.lastCommand) {
                    console.log("command", command);
                    this.lastCommand = command;
                    this.parseCommand(command);
                }
            }
        });

        this.addOutput("Welcome to Swift Debugger.");
        if (!this.pathsNotSet()) {
            this.addOutput(`(executable currently set to: \`${this.controller.executable}\`; use \`e=nameOfExecutable\` to change it)`)
        }

        this.subscriptions = atom.commands.add(this.element, {
            'core:confirm': event => {
                if (this.parseAndSetPaths()) {
                    this.clearInputText();
                } else {
                    this.confirmLLDBCommand();
                }
                return event.stopPropagation();
            },
            'core:cancel': event => {
                this.cancelLLDBCommand();
                return event.stopPropagation();
            }
        });
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
        return "Swift IDE";
    }

    getDefaultLocation() {
        return "bottom";
    }

    lldbCommand(command) {
        if (this.lldb) {
            this.lldb.stdin.write(`${command}\n`);
        }
    }

    stepInBtnPressed() {
        this.lldbCommand("step");
    }

    stepOutBtnPressed() {
        this.lldbCommand("finish");
    }

    stepOverBtnPressed() {
        this.lldbCommand("next");
    }

    resumeBtnPressed() {
        this.lldbCommand("continue");
    }

    workspacePath() {
        const editor = atom.workspace.getActiveTextEditor();
        const activePath = editor.getPath();
        const relative = atom.project.relativizePath(activePath);
        const pathToWorkspace = relative[0] || path.dirname(activePath);
        return pathToWorkspace;
    }

    runApp() {
        this.stopApp();

        if(this.pathsNotSet()) {
            this.askForPaths();
            return;
        }

        this.swiftBuild = spawn(this.controller.swift, ['build', '--package-path', this.workspacePath()]);
        this.swiftBuild.stdout.on('data',data => {
            this.addOutput(data.toString().trim());
        });
        this.swiftBuild.stderr.on('data',data => {
            this.addOutput(data.toString().trim());
        });
        return this.swiftBuild.on('exit',code => {
            const codeString = code.toString().trim();
            if (codeString === '0') {
                this.runLLDB();
            }
            this.addOutput(`built with code : ${codeString}`);
        });
    }

    runLLDB() {
        this.lldb = spawn(this.controller.lldb, [this.workspacePath()+"/.build/debug/"+this.controller.executable]);

        const breakpoints = this.controller.debugger.getModel().getBreakpoints();
        breakpoints.forEach( (breakpoint) => {
            const command = `b ${breakpoint.uri}:${breakpoint.line}`;
            this.lldb.stdin.write(command + "\n");
        });

        this.lldb.stdin.write('r\n');
        this.lldb.stdout.on('data',data => {
            this.processOutput(data.toString().trim());
        });
        this.lldb.stderr.on('data',data => {
            this.processError(data.toString().trim());
        });
        return this.lldb.on('exit',code => {
            this.processExit(code);
        });
    }

    stopApp() {
        if (this.lldb != null) {
            this.setState("exiting")
            this.lldb.stdin.write("\nexit\n");
        }
        return this.lldb = null;
    }

    appIsRunning() {
        return this.state == "running";
    }

    appIsPaused() {
        return this.state == "paused";
    }

    setState(state) {
        this.state = state;
        this.controller.updateToolBar();
    }

    clearOutput() {
        this.output.empty();
        this.controller.updateToolBar();
    }

    createOutputNode(text) {
        let parent;
        const node = $('<span />').text(text);
        return parent = $('<span />').append(node);
    }

    processOutput(output) {
        let match = /Process (.*) launched/.exec(output);
        if (match) {
            this.process = match[1];
            this.setState("running");
        }

        match = /Process (.*) stopped/.exec(output);
        if (match) {
            this.setState("paused");
        }

        match = /Process (.*) resumed/.exec(output);
        if (match) {
            this.setState("running");
        }

        match = /Process (.*) exited/.exec(output);
        if (match) {
            this.setState("exited");
        }

        this.addOutput(output)
    }

    processError(error) {
        this.addOutput(error)
    }

    processExit(code) {
        this.addOutput(`exit code: ${code.toString().trim()}`);
        this.setState("exited");
    }

    addOutput(data) {
        const editor = this.editor;
        const bottom = editor.getLastBufferRow();

        editor.setSelectedBufferRange([[bottom, 0], [bottom,0]]);
        editor.insertText(data);
        editor.insertNewline();
    }

    pathsNotSet() {
        return !this.controller.executable;
    }

    askForPaths() {
        const notSet = this.pathsNotSet();
        if (notSet) {
            this.addOutput("Please set the executable to debug, using `e=nameOfExecutable`");
        }
        return notSet;
    }

    parseCommand(command) {
        if (!command) {
            return false;
        }
        if (/e=(.*)/.test(command)) {
            const match = /e=(.*)/.exec(command);
            this.controller.executable = match[1];
            this.addOutput(`Executable path set to \`${this.controller.executable}\`.`);
        } else {
            this.lldbCommand(command);
        }
        this.controller.updateToolBar();
    }

    stringIsBlank(str) {
        return !str || /^\s*$/.test(str);
    }

    cancelLLDBCommand() {
        this.commandEntryView.getModel().setText("");
        this.controller.updateToolBar();
    }

    clearInputText() {
        this.commandEntryView.getModel().setText("");
    }

    destroy() {
        console.debug("destroy called");
        this.controller.view = null;
        this.detach();
    }


    atBottomOfOutput() {
        return true;
        // return this.output[0].scrollHeight <= (this.output.scrollTop() + this.output.outerHeight());
    }

    scrollToBottomOfOutput() {
        // this.editor.scrollToBottom();
    }
}
