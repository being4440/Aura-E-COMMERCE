const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

async function check(dir) {
  const files = await readdir(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    const s = await stat(fullPath);
    if (s.isDirectory() && f !== 'node_modules') {
      await check(fullPath);
    } else if (s.isFile() && (f.endsWith('.js') || f.endsWith('.jsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          const targetPath = path.resolve(dir, importPath);
          try {
            const dirName = path.dirname(targetPath);
            const baseName = path.basename(targetPath);
            
            if (!fs.existsSync(dirName)) {
               console.log('Dir not found:', targetPath, 'in', fullPath);
               continue;
            }
            const actualFiles = fs.readdirSync(dirName);
            
            const exactMatch = actualFiles.find(af => af === baseName || af.startsWith(baseName + '.'));
            
            if (!exactMatch) {
                const ciMatch = actualFiles.find(af => af.toLowerCase() === baseName.toLowerCase() || af.toLowerCase().startsWith(baseName.toLowerCase() + '.'));
                if (ciMatch) {
                    console.log('CASE MISMATCH: imported', importPath, 'as', baseName, 'but actual is', ciMatch, 'in', fullPath);
                } else {
                    console.log('NOT FOUND:', importPath, 'in', fullPath);
                }
            }
          } catch(e) {
            console.log('Error checking', targetPath, 'in', fullPath);
          }
        }
      }
    }
  }
}
check(path.join(process.cwd(), 'src')).catch(console.error);
