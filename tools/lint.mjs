// Code checker for the game scripts.
// The files in js/ are plain scripts that share one global scope, loaded in the order index.html lists them.
// So we lint them together, in that order, as one program: that way a name used in one file and defined in
// another is fine, but a typo or a name defined nowhere is reported, with the real file and line.
import { readFileSync } from 'node:fs';
import { Linter } from 'eslint';
import globals from 'globals';

const RULES = {
  'no-undef': 'error',
  'no-redeclare': 'error',
  'no-dupe-keys': 'error',
  'no-unreachable': 'error',
  'no-const-assign': 'error',
  'no-self-assign': 'error',
  'no-unused-vars': ['error', { vars: 'all', args: 'none', caughtErrors: 'none' }],
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'no-cond-assign': 'error'
};
// each page is its own program: the game (index.html) and the control centre (admin.html)
let problems = 0,
  count = 0;
for (const page of ['index.html', 'admin.html']) {
  const html = readFileSync(page, 'utf8');
  const files = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
  const parts = [];
  let source = '';
  for (const file of files) {
    const text = readFileSync(file, 'utf8').replace(/^'use strict';\n/, '');
    parts.push({ file, start: source.split('\n').length, lines: text.split('\n').length });
    source += text + '\n';
  }
  const where = line => {
    const p = parts.findLast(p => p.start <= line);
    return `${p.file}:${line - p.start + 1}`;
  };
  const messages = new Linter().verify("'use strict';\n" + source, {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, THREE: 'readonly' }
    },
    rules: RULES
  });
  for (const m of messages) console.log(`${where(m.line - 1)}  ${m.message}  (${m.ruleId})`);
  problems += messages.length;
  count += files.length;
}
console.log(problems ? `\n${problems} problem(s) in ${count} files` : `Lint OK: ${count} files`);
process.exit(problems ? 1 : 0);
