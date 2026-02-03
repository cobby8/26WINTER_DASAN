
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');
const ARCHIVE_DIR = path.join(SCRIPTS_DIR, 'archive');

// 1. Ensure Archive Dir Exists
if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

// 2. Define Safety Lists
const KEEP_SCRIPTS = new Set([
    'force_restore_all_feb.ts',
    'nuclear_shuttle_reset.ts',
    'import_shuttle_rebuild.ts',
    'sync_winter_shuttle_v2.ts',
    'sync_2nd_enrollments_v2.ts',
    'perform_cleanup.ts'
]);

const SCRIPT_PATTERNS = [
    /^check_.*\.(ts|js)$/,
    /^debug_.*\.(ts|js)$/,
    /^verify_.*\.(ts|js)$/,
    /^count_.*\.(ts|js)$/,
    /^list_.*\.(ts|js)$/,
    /^test_.*\.(ts|js)$/,
    /^scan_.*\.(ts|js)$/,
    /^peek_.*\.(ts|js)$/,
    /^dump_.*\.(ts|js)$/,
    /^analyze_.*\.(ts|js)$/,
    /^diagnose_.*\.(ts|js)$/,
    /^inspect_.*\.(ts|js)$/,
    /^fix_.*\.(ts|js)$/,
    /^restore_.*\.(ts|js)$/
];

const ROOT_DELETE_PATTERNS = [
    /^debug_.*\.txt$/,
    /^debug_.*\.json$/,
    /^check_.*\.(txt|log)$/,
    /^analysis_.*\.txt$/,
    /^.*\.log$/, // aggressive log cleanup
    /^.*dump\.json$/
];

// Special checks for Root deletion to avoid killing project files
const ROOT_KEEP_FILES = new Set([
    'package.json', 'package-lock.json', 'tsconfig.json', 'README.md',
    'next.config.ts', 'next-env.d.ts', '.gitignore', '.env', '.env.local'
]);

// 3. Move Scripts
console.log('--- Archiving Scripts ---');
const files = fs.readdirSync(SCRIPTS_DIR);
files.forEach(file => {
    const fullPath = path.join(SCRIPTS_DIR, file);
    if (fs.statSync(fullPath).isDirectory()) return;

    if (KEEP_SCRIPTS.has(file)) {
        console.log(`Keeping critical script: ${file}`);
        return;
    }

    // Special check for restore_* vs force_restore_*
    // force_restore_all_feb.ts is in KEEP_SCRIPTS, so it's safe.
    // Other restore_ scripts will be moved.

    let shouldMove = false;
    for (const pattern of SCRIPT_PATTERNS) {
        if (pattern.test(file)) {
            shouldMove = true;
            break;
        }
    }

    if (shouldMove) {
        const destPath = path.join(ARCHIVE_DIR, file);
        console.log(`Archiving: ${file}`);
        fs.renameSync(fullPath, destPath);
    }
});

// 4. Delete Root Files
console.log('\n--- Cleaning Root Directory ---');
const rootFiles = fs.readdirSync(ROOT_DIR);
rootFiles.forEach(file => {
    if (ROOT_KEEP_FILES.has(file)) return;

    // Safety check: Don't delete directories (like .git, .next, src)
    // patterns like *.log won't match directories usually, but being safe.
    const fullPath = path.join(ROOT_DIR, file);
    try {
        if (fs.statSync(fullPath).isDirectory()) return;
    } catch (e) { return; } // ignore errors

    let shouldDelete = false;
    for (const pattern of ROOT_DELETE_PATTERNS) {
        if (pattern.test(file)) {
            shouldDelete = true;
            break;
        }
    }

    // Specifically target known trash files if they don't match regex (e.g. sync_debug.log)
    if (file === 'sync_debug.log' || file === 'debug_shuttle.txt') shouldDelete = true;

    if (shouldDelete) {
        console.log(`Deleting: ${file}`);
        fs.unlinkSync(fullPath);
    }
});

console.log('\n--- Cleanup Complete ---');
