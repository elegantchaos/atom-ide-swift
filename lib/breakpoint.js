'use babel';

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Created by Sam Deane, 23/05/2018.
// All code (c) 2018 - present day, Elegant Chaos Limited.
// For licensing terms, see http://elegantchaos.com/license/liberal/.
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

let Breakpoint;
module.exports =
(Breakpoint = (function() {
  Breakpoint = class Breakpoint {
    static initClass() {
      this.prototype.decoration = null;
    }

    constructor(state) {
        console.debug(`Breakpoint`, JSON.stringify(state))
        const { file, line } = state
        this.filename = file
        this.lineNumber = line
    }

    serialize() {
        const state = {
            deserializer: `Breakpoint`,
            file: this.filename,
            line: this.lineNumber
        }

        console.debug(`Breakpoint serialized`, JSON.stringify(state))
        return state
    }

    toCommand() {
      return `b ${this.filename}:${this.lineNumber}`;
    }
  };

  Breakpoint.initClass();

  return Breakpoint;
})());
