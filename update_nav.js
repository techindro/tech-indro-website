const fs = require('fs');
const files = ['index.html', 'programs.html', 'course-details.html', 'ai-mentor.html', 'shikshak.html', 'parent-panel.html', 'dashboard.html', 'admin-cms.html'];

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        // Find the <ul class="nav-links"> and append the ISRO Lab link
        content = content.replace(/<ul class="nav-links">/, `<ul class="nav-links">\n                <li><a href="isro-lab.html" style="color: #0ea5e9; font-weight: 700;">ISRO Lab</a></li>`);
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    } catch (e) {
        console.error(`Error updating ${file}:`, e.message);
    }
});
