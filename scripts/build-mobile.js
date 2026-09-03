const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const wwwDir = path.resolve(rootDir, 'www');

// Clean or create www
if (fs.existsSync(wwwDir)) {
    fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

console.log('📦 Copying website assets to www/ for Mobile App...');

// 1. Copy all HTML files
const files = fs.readdirSync(rootDir);
files.forEach(file => {
    if (file.endsWith('.html') || file === 'style.css' || file === 'main.js' || file === 'api-client.js') {
        fs.copyFileSync(path.join(rootDir, file), path.join(wwwDir, file));
        console.log(`  ✓ Copied: ${file}`);
    }
    if (file.endsWith('.json') && !file.startsWith('package') && file !== 'capacitor.config.json') {
        fs.copyFileSync(path.join(rootDir, file), path.join(wwwDir, file));
        console.log(`  ✓ Copied data: ${file}`);
    }
});

// 2. Copy assets folder recursively
const assetsSrc = path.join(rootDir, 'assets');
const assetsDest = path.join(wwwDir, 'assets');

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

if (fs.existsSync(assetsSrc)) {
    copyDirRecursive(assetsSrc, assetsDest);
    console.log('  ✓ Copied: assets/ directory');
}

console.log('✅ Mobile build assets ready in www/');
