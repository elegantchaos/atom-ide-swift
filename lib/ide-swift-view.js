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
        const editor = this.editor = new TextEditor({ autoHeight: false});
        editor.insertText("> ");
        const element = this.element = editor.getElement();
        element.classList.add('ide-swift');
        editor.onDidStopChanging( () => {
            this.checkForCommand();
        });
        this.scrollToBottomOfOutput();

        this.addOutput("Welcome to Swift Debugger.");
        if (!this.pathsNotSet()) {
            this.addOutput(`(executable currently set to: \`${this.controller.executable}\`; use \`e=nameOfExecutable\` to change it)`)
        }

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
        this.stopDebugger();

        if(this.pathsNotSet()) {
            this.askForPaths();
            return;
        }

        this.swiftBuild = spawn(this.controller.swiftPath(), ['build', '--package-path', this.workspacePath()]);
        this.swiftBuild.stdout.on('data',data => {
            this.processBuilderOutput(data.toString().trim());
        });
        this.swiftBuild.stderr.on('data',data => {
            this.processBuilderError(data.toString().trim());
        });
        return this.swiftBuild.on('exit',code => {
            this.processBuilderExit(code);
        });
    }

    runDebugger() {
        this.lldb = spawn(this.controller.lldbPath(), [this.workspacePath()+"/.build/debug/"+this.controller.executable]);

        const breakpoints = this.controller.breakpoints();
        breakpoints.forEach( (breakpoint) => {
            const command = `b ${breakpoint.uri}:${breakpoint.line}`;
            this.lldb.stdin.write(command + "\n");
        });

        this.lldb.stdin.write('r\n');
        this.lldb.stdout.on('data',data => {
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
        this.addOutput("builder: " + output);
    }

    processBuilderError(output) {
        this.addOutput("builder error: " + output);
    }

    processBuilderExit(code) {
        const codeString = code.toString().trim();
        if (codeString === '0') {
            this.addOutput(`Build succeeded.`.);
            this.runDebugger();
        } else {
            this.addOutput(`Build failed with code : ${codeString}.`.);
        }
    }

    processDebuggerOutput(output) {
        let match = /Process (.*) launched/.exec(output);
        if (match) {
            this.process = match[1];
            this.controller.setState("running");
        }

        match = /Process (.*) stopped/.exec(output);
        if (match) {
            this.controller.setState("paused");
        }

        match = /Process (.*) resumed/.exec(output);
        if (match) {
            this.controller.setState("running");
        }

        match = /Process (.*) exited/.exec(output);
        if (match) {
            this.controller.setState("exited");
        }

        this.addOutput(output)
    }

    processDebuggerError(error) {
        this.addOutput(error)
    }

    processDebuggerExit(code) {
        this.addOutput(`exit code: ${code.toString().trim()}`);
        this.controller.setState("exited");
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


}
