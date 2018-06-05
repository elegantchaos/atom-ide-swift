'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 05/06/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

import Runner from './runner';
import path from 'path';
import fs from 'fs';

export default class SourceKitten extends Runner {

    constructor(controller) {
        super();
        this._controller = controller;

        const root = atom.packages.getLoadedPackage('ide-swift').path;
        const dependencies = path.join(root, 'dependencies');
        fs.mkdir(dependencies, error => {
            console.log("sk", dependencies, error);
        });
    }
}
