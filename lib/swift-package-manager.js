'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 24/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import {BufferedProcess} from 'atom'

export default class SwiftPackageManager {

    constructor() {
        this._exe = atom.config.get('ide-swift.swift', {}) || 'swift';
        this._showError = true;
    }

    runCommand(args, transformer, errorTransformer) {
        return new Promise((resolve) => {
            const command = this._exe;

            let out = "";
            let err = "";

            const stdout = (text) => { out += text; }
            const stderr = (text) => { err += text; }

            const exit = (code) => {
                const result = transformer ? transformer(code, out, err) : { code, out, err };
                resolve(result);
            }

            console.log(command, args);
            let process = new BufferedProcess({command, args, stdout, stderr, exit})
            process.onWillThrowError((error) => {
                if (this._showError) {
                    atom.notifications.addFatalError(`Couldn't launch swift (${command}).`, {
                        detail: "Please make sure that swift is installed, and either put it into your PATH or enter its location in the plugin settings."
                    });
                    this._showError = false;
                }
                error.handle();
                resolve();
            });
        });
    }

    getDescription() {
        return this.runCommand(['package', 'describe', '--type', 'json'], (code, out, err) => {
            try {
                if (code == 0) {
                    return JSON.parse(out);
                }
            } catch (e) {
                return {
                    exception: e
                }
            }
            return { error: err, text: out, code: code };
        });
    }

    getVersion() {
        return this.runCommand(['--version']);
    }
}
