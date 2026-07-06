const fs = require('fs');
const files = ['index.html', 'programs.html', 'course-details.html', 'ai-mentor.html', 'shikshak.html', 'parent-panel.html', 'dashboard.html', 'admin-cms.html'];

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        // Remove the ISRO Lab link we added
        content = content.replace(/\n\s*<li><a href="isro-lab\.html" style="color: #0ea5e9; font-weight: 700;">ISRO Lab<\/a><\/li>/g, '');
        fs.writeFileSync(file, content);
        console.log(`Reverted ${file}`);
    } catch (e) {
        console.error(`Error updating ${file}:`, e.message);
    }
});
