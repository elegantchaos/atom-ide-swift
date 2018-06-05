'use babel';

/**
* Created by Sam Deane, 10/05/2018.
* All code (c) 2018 - present day, Elegant Chaos Limited.
* For licensing terms, see http://elegantchaos.com/license/liberal/.
*/

import {BufferedProcess} from 'atom'


/**
* Transforms SourceKitten sourcetext into a snippet that Atom can consume.
* SourceKitten sourcetext looks something like this:
*
*   foobar(<#T##x: Int##Int#>, y: <#T##String#>, baz: <#T##[String]#>)
*
* Here, <#T##...#> represents the snippet location to highlight when the tab
* key is pressed. I don't know why the first snippet in the above example is
* "x: Int##Int" -- it seems to me it should be simply "x: Int" -- but we must
* handle this case as well. This function transforms this into the format
* Atom expects:
*
*   foobar(${1:x: Int}, y: ${2:String}, baz: ${3:[String]})
*
* (borrowed with thanks from https://github.com/facebook/nuclide/blob/master/pkg/nuclide-swift/lib/sourcekitten/Complete.js)
*
*/

function sourceKittenSourcetextToAtomSnippet(sourcetext) {
    // Atom expects numbered snippet location, beginning with 1.
    let index = 1;
    // Match on each instance of <#T##...#>, capturing the text in between.
    // We then specify replacement text via a function.
    const replacedParameters = sourcetext.replace(
        /<#T##(.+?)#>/g,
        (_, groupOne) => {
            // The index is incremented after each match. We split the match group
            // on ##, to handle the strange case mentioned in this function's docblock.
            return `\${${index++}:${groupOne.split('##')[0]}}`;
        },
    );

    // When overriding instance methods, SourceKitten uses the string <#code#>
    // as a marker for the body of the method. Replace this with an empty Atom
    // snippet location.
    return replacedParameters.replace('<#code#>', `\${${index++}}`);
}

/**
* Maps a SourceKitten kind to an atom type.
*
* TODO: Some of the kinds don't have predefined Atom styles that suit them. These should use custom HTML.
*
* (borrowed with thanks from https://github.com/facebook/nuclide/blob/master/pkg/nuclide-swift/lib/sourcekitten/Complete.js)
*/

function sourceKittenKindToAtomType(kind) {
    switch (kind) {
        case 'source.lang.swift.keyword':
        return 'keyword';
        case 'source.lang.swift.decl.associatedtype':
        return 'type';
        case 'source.lang.swift.decl.class':
        return 'class';
        case 'source.lang.swift.decl.enum':
        return 'class';
        case 'source.lang.swift.decl.enumelement':
        return 'property';
        case 'source.lang.swift.decl.extension.class':
        return 'class';
        case 'source.lang.swift.decl.function.accessor.getter':
        return 'method';
        case 'source.lang.swift.decl.function.accessor.setter':
        return 'method';
        case 'source.lang.swift.decl.function.constructor':
        return 'method';
        case 'source.lang.swift.decl.function.free':
        return 'function';
        case 'source.lang.swift.decl.function.method.class':
        return 'method';
        case 'source.lang.swift.decl.function.method.instance':
        return 'method';
        case 'source.lang.swift.decl.function.method.static':
        return 'method';
        case 'source.lang.swift.decl.function.operator.infix':
        return 'function';
        case 'source.lang.swift.decl.function.subscript':
        return 'method';
        case 'source.lang.swift.decl.generic_type_param':
        return 'variable';
        case 'source.lang.swift.decl.protocol':
        return 'type';
        case 'source.lang.swift.decl.struct':
        return 'class';
        case 'source.lang.swift.decl.typealias':
        return 'type';
        case 'source.lang.swift.decl.var.global':
        return 'variable';
        case 'source.lang.swift.decl.var.instance':
        return 'variable';
        case 'source.lang.swift.decl.var.local':
        return 'variable';
    }

    return 'variable';
}

/**
* Maps a SourceKitten kind to short description to show on the righthand side of the suggestion list.
*
* (borrowed with thanks from https://github.com/facebook/nuclide/blob/master/pkg/nuclide-swift/lib/sourcekitten/Complete.js)
*/

function sourceKittenKindToAtomRightLabel(kind) {
    switch (kind) {
        case 'source.lang.swift.keyword':
        return 'Keyword';
        case 'source.lang.swift.decl.associatedtype':
        return 'Associated type';
        case 'source.lang.swift.decl.class':
        return 'Class';
        case 'source.lang.swift.decl.enum':
        return 'Enum';
        case 'source.lang.swift.decl.enumelement':
        return 'Enum element';
        case 'source.lang.swift.decl.extension.class':
        return 'Class extension';
        case 'source.lang.swift.decl.function.accessor.getter':
        return 'Getter';
        case 'source.lang.swift.decl.function.accessor.setter':
        return 'Setter';
        case 'source.lang.swift.decl.function.constructor':
        return 'Constructor';
        case 'source.lang.swift.decl.function.free':
        return 'Free function';
        case 'source.lang.swift.decl.function.method.class':
        return 'Class method';
        case 'source.lang.swift.decl.function.method.instance':
        return 'Instance method';
        case 'source.lang.swift.decl.function.method.static':
        return 'Static method';
        case 'source.lang.swift.decl.function.operator.infix':
        return 'Infix operator';
        case 'source.lang.swift.decl.function.subscript':
        return 'Subscript';
        case 'source.lang.swift.decl.generic_type_param':
        return 'Generic type parameter';
        case 'source.lang.swift.decl.protocol':
        return 'Protocol';
        case 'source.lang.swift.decl.struct':
        return 'Struct';
        case 'source.lang.swift.decl.typealias':
        return 'Typealias';
        case 'source.lang.swift.decl.var.global':
        return 'Global variable';
        case 'source.lang.swift.decl.var.instance':
        return 'Instance variable';
        case 'source.lang.swift.decl.var.local':
        return 'Local variable';
    }
    return '';
}


/**
Provider which calls sourcekitten asynchronously to supply completions.
*/

export default class IdeSwiftAutocompleteProvider {

    constructor() {
        this.selector = '.source.swift';
        this.disableForSelector = '.source.swift .comment';
        this.suggestionPriority = 1;
        this.showError = true;
    }

    getSuggestions(options) {
        const {editor, bufferPosition, prefix} = options;
        const text = editor.getText()
        const index = editor.getBuffer().characterIndexForPosition(bufferPosition)
        const offset = index - prefix.length

        console.debug(`prefix: <${prefix}>, position: ${bufferPosition}, index: ${index}, offset: ${offset}`)

        return this.findMatchingSuggestions(text, offset, prefix);
    }

    findMatchingSuggestions(text, offset, prefix) {
        return new Promise((resolve) => {
            const command = atom.config.get('ide-swift.sourceKittenLocation') || "sourcekitten"
            const args = [ 'complete', '--text', text, '--offset', offset ]
            let output = ""
            let errors = ""

            let stdout = (text) => { output += text }
            let stderr = (text) => { errors += text }

            let exit = (code) => {
                if (code == 0) {
                    let suggestions = JSON.parse(output)
                    console.debug(`suggestions: ${suggestions.length}`)
                    if (prefix.trim() != "") {
                        suggestions = suggestions.filter((suggestion) => {
                            return suggestion.sourcetext.startsWith(prefix);
                        });
                        console.debug(`filtered: ${suggestions.length}`)
                    }

                    let inflatedSuggestions = suggestions.map((suggestion) => {
                        return {
                            text: suggestion.descriptionKey,
                            snippet: sourceKittenSourcetextToAtomSnippet(suggestion.sourcetext),
                            type: sourceKittenKindToAtomType(suggestion.kind),
                            leftLabel: suggestion.typeName,
                            rightLabel: sourceKittenKindToAtomRightLabel(suggestion.kind),
                            description: suggestion.docBrief,
                            replacementPrefix: prefix
                        };
                    });
                    resolve(inflatedSuggestions);
                } else {
                    atom.notifications.addError("SourceKitten returned an error.", {
                        description: `SourceKitten failed to get suggestions.\n\nError: ${code}.`,
                        detail: errors
                    });
                    resolve([]);
                }
            }

            let process = new BufferedProcess({command, args, stdout, stderr, exit})
            process.onWillThrowError((error) => {
                if (this.showError) {
                    atom.notifications.addFatalError(`Couldn't launch SourceKitten (${command}).`, {
                        detail: "Please make sure that SourceKitten is installed, and either put it into your PATH or enter its location in the plugin settings."
                    });
                    this.showError = false;
                }
                error.handle();
                resolve([]);
            });
            this.process = process;


        });
    }
}
