import { execa } from 'execa';
import fs from 'fs';

(async () => {
    console.log('copying index.js');
    fs.copyFileSync('./index.js', './dist/index.js');
    console.log('copying package.json');
    fs.copyFileSync('./package.json', './dist/package.json');
    console.log('copying /scripts');
    fs.cpSync('./scripts', './dist/scripts', { recursive: true });
    console.log('installing dependencies...');
    await execa('npm install --production', { cwd: './dist' });
    console.log('done!');
})();