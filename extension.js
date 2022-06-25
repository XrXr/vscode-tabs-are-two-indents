// SPDX-License-Identifier: MIT
//
// This extension is based on vscode-stretchy-spaces by Kyle Paulsen
// which is also licensed under MIT. See: https://github.com/kylepaulsen/vscode-stretchy-spaces
const vscode = require('vscode');

exports.activate = function activate(context) {
    // States updated by callbacks
    let timeout = null;
    let enabled = true;
    let activeEditor = vscode.window.activeTextEditor;
    let currentIndentDecorationType;

    if (activeEditor && checkLanguage(activeEditor)) {
        triggerUpdateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor && checkLanguage(editor)) {
            clearDecorations();
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document && checkLanguage(activeEditor)) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.commands.registerCommand('tabsAreTwoIndents.disable', () => {
        if (enabled) {
            enabled = false;
            clearDecorations();
        }
    });

    vscode.commands.registerCommand('tabsAreTwoIndents.enable', () => {
        if (!enabled) {
            enabled = true;
            if (activeEditor && checkLanguage(activeEditor)) {
                triggerUpdateDecorations();
            }
        }
    });

    function checkLanguage(editor) {
        const doc_lang = editor.document.languageId;
        const inc_lang = vscode.workspace.getConfiguration('tabsAreTwoIndents').includedLanguages || [];
        if (inc_lang.includes(doc_lang)) {
            return true;
        }
        return false;
    }

    function clearDecorations() {
        if (activeEditor && currentIndentDecorationType) {
            activeEditor.setDecorations(currentIndentDecorationType, []);
            currentIndentDecorationType = null;
        }
    }

    function triggerUpdateDecorations() {
        if (!enabled) return;

        if (timeout) clearTimeout(timeout);

        const updateDelay = vscode.workspace.getConfiguration('tabsAreTwoIndents').updateDelay || 30;
        timeout = setTimeout(updateDecorations, updateDelay);
    }

    function updateDecorations() {
        if (!activeEditor || !enabled) return;

        if (!currentIndentDecorationType) {
            currentIndentDecorationType = vscode.window.createTextEditorDecorationType({
                // The `ch` CSS unit is based on the width of the character of 0
                // in the font. This effectively doubles the size of the rendered size
                // of each targeted tab chracter.
                // See: https://css-tricks.com/the-lengths-of-css/#ch
                letterSpacing: '1ch'
            });
        }

        // Run a regex through the whole document. Sure hope the file is small!
        const decorationRanges = [];
        const regEx = /^\t+/gm; // spaces before tabs are generally regarded as errors
        const text = activeEditor.document.getText();
        let match;
        while (match = regEx.exec(text)) {
            const matchText = match[0];
            const matchLength = matchText.length;
            const startPos = activeEditor.document.positionAt(match.index);
            const endPos = activeEditor.document.positionAt(match.index + matchLength);
            decorationRanges.push({ range: new vscode.Range(startPos, endPos) });
        }
        activeEditor.setDecorations(currentIndentDecorationType, decorationRanges);
    }
}
