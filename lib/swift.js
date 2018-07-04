'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 24/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import Runner from './runner';

export default class Swift extends Runner {

    constructor(cwd) {
        const exe = atom.config.get('ide-swift.swift', {}) || 'swift';
        super("swift", exe, cwd);
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

    getPackage() {
        return this.run(['package', 'dump-package'], (code, out, err) => {
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

    build(target, stdout, stderr, useBuilder) {
        const args = useBuilder ? ['run', 'builder', 'build', target] : ['build', '--product', target];
        return this.start(args, stdout, stderr);
    }

    test(stdout, stderr, useBuilder) {
        const args = useBuilder ? ['run', 'builder', 'test'] : ['test'];
        return this.start(args, stdout, stderr);
    }

}
