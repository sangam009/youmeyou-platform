import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixImports(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/from '\/app\/src\//g, "from '../");
      content = content.replace(/from '\/app\/src\//g, "from './");
      
      // Fix the path depth
      const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, 'src'));
      const depth = relativePath.split(path.sep).length;
      const dots = '../'.repeat(depth - 1);
      
      content = content.replace(/from '\.\.\//g, `from '${dots}`);
      
      fs.writeFileSync(filePath, content);
      console.log(`Fixed imports in ${filePath}`);
    }
  });
}

fixImports(path.join(__dirname, 'src')); 