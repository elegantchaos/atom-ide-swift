'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 24/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import Runner from './runner';

export default class SwiftPackageManager extends Runner {

    constructor() {
        const exe = atom.config.get('ide-swift.swift', {}) || 'swift';
        super("swift", exe);
    }

    getDescription() {
        return this.run(['package', 'describe', '--type', 'json'], (code, out, err) => {
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
        return this.run(['--version']);
    }
}
