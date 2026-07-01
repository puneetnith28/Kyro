const fs = require('fs');
const path = require('path');

const files = [
  'dashboard/src/components/GraphVisualizer.tsx',
  'dashboard/src/pages/DashboardLayout.tsx',
  'extension/src/App.tsx',
  'extension/src/background.ts'
];

files.forEach(relPath => {
  const fullPath = path.join(__dirname, relPath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace http://localhost:8000
  content = content.replace(/['"`]http:\/\/localhost:8000(.*?)['"`]/g, (match, p1) => {
    return `\`\${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}${p1}\``;
  });

  // Replace ws://localhost:8000
  content = content.replace(/['"`]ws:\/\/localhost:8000(.*?)['"`]/g, (match, p1) => {
    return `\`\${(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace('http', 'ws')}${p1}\``;
  });

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Updated ' + relPath);
});
