'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 24/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import {BufferedProcess} from 'atom'

/**
    Process runner.
*/

export default class Runner {

    constructor(name, command, cwd) {
        this._name = name;
        this._command = command;
        this._cwd = cwd;
        this._showError = true;
    }

    /**
        Run until exit, then deliver combined stdout, stderr and exit code
        via a promise.
    */

    run(args, transformer) {
        return new Promise((resolve) => {
            const command = this._command;

            let out = "";
            let err = "";

            const stdout = (text) => { out += text; }
            const stderr = (text) => { err += text; }
            const options = { cwd: this._cwd };
            const exit = (code) => {
                const result = transformer ? transformer(code, out, err) : { code, out, err };
                resolve(result);
            }

            this._makeProcess({command, args, stdout, stderr, exit, options}, resolve);
        });
    }

    /**
        Start a process, passing stdout, stderr to callbacks.
        We return a promise which resolves when the process finishes.
    */

    start(args, stdout, stderr) {
        return new Promise((resolve) => {
            const command = this._command;
            const options = { cwd: this._cwd };
            const exit = (code) => {
                resolve(code);
            }

            this._makeProcess({command, args, stdout, stderr, exit, options}, resolve);
        });
    }

    /**
        Make the process, handle any launch errors.
    */

    _makeProcess(settings, resolve) {
        let process = new BufferedProcess(settings)
        process.onWillThrowError((error) => {
            if (this._showError) {
                const name = this._name;
                atom.notifications.addFatalError(`Couldn't launch ${name} (${this._command}).`, {
                    detail: `Please make sure that ${name} is installed, and either put it into your PATH or enter its location in the plugin settings.`
                });
                this._showError = false;
            }
            error.handle();
            resolve();
        });
        return process;
    }
}
