const fs = require('fs');
const path = require('path');

const folders = [
  'C:\\Users\\Laptop\\Desktop\\esim website\\esim website',
  'C:\\Users\\Laptop\\Desktop\\esim website\\esim-wallet'
];

function searchInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('amount_ltc') || content.includes('crypto_amount') || content.includes('cryptoAmount') || content.includes('surcharge')) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('Math.random') || line.includes('+') || line.includes('*') || line.includes('toFixed') || line.includes('round') || line.includes('slice')) {
        if (line.includes('amount') || line.includes('ltc') || line.includes('crypto')) {
          console.log(`${filePath}:${idx + 1}: ${line.trim()}`);
        }
      }
    });
  }
}

function traverse(dir) {
  if (dir.includes('node_modules') || dir.includes('.next') || dir.includes('dist')) return;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      traverse(full);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json'))) {
      searchInFile(full);
    }
  }
}

for (const folder of folders) {
  traverse(folder);
}
console.log('Search complete.');
