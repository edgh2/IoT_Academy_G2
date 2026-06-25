// inject-theme.js — adds docs-theme.css link into every generated JSDoc page
const fs = require('fs');
const path = require('path');

const projects = ['opc05', 'db01', 'rest05'];
const linkTag = '<link type="text/css" rel="stylesheet" href="docs-theme.css">';

for (const proj of projects) {
    const docsDir = path.join(__dirname, proj, 'docs');
    if (!fs.existsSync(docsDir)) { console.log(`skip ${proj}: no docs/`); continue; }

    // copy the shared theme into this project's docs folder
    fs.copyFileSync(path.join(__dirname, 'docs-theme.css'), path.join(docsDir, 'docs-theme.css'));

    // inject the link into every .html file
    for (const file of fs.readdirSync(docsDir)) {
        if (!file.endsWith('.html')) continue;
        const fp = path.join(docsDir, file);
        let html = fs.readFileSync(fp, 'utf8');
        if (html.includes('docs-theme.css')) continue; // already injected
        // add our link right after JSDoc's default stylesheet so ours overrides
        html = html.replace(
            /(<link[^>]*jsdoc-default\.css[^>]*>)/,
            `$1\n    ${linkTag}`
        );
        fs.writeFileSync(fp, html);
    }
    console.log(`themed ${proj}/docs`);
}
console.log('done');