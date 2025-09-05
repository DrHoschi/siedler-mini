// Warns if Inspector core/logs not both touched, or if index.html order changed
const changed = danger.git.modified_files.concat(danger.git.created_files);

const must = [
  'assets/inspector/inspector.core.js',
  'assets/inspector/inspector.logs.js',
  'assets/inspector/inspector.css',
  'assets/ui/ui-bridge.js',
  'index.html'
];

if (changed.some(f => f.includes('inspector.logs.js')) &&
    !changed.includes('assets/inspector/inspector.core.js')) {
  warn('Logs geändert ohne core-Slots zu prüfen – bitte Slot-IDs bestätigen.');
}

if (changed.includes('index.html')) {
  markdown('Bitte Reihenfolge prüfen: **CBLog polyfill → core → overlay hooks → bootstrap → UI → Inspector → boot.compat**.');
}

const bad = changed.filter(f => f.endsWith('.min.js'));
if (bad.length) warn('Bitte keine minifizierten Dateien committen: ' + bad.join(', '));
