const fs = require('fs');
const { execSync } = require('child_process');

if(fs.existsSync('dist.zip')){
    fs.unlinkSync('dist.zip');
}

const includesPaths = ['manifest.json', 'src'];

const items = fs.readdirSync('.').filter(item => includesPaths.includes(item)).join(' ');

// Only support MACOS
execSync(`zip -r dist.zip ${items} -x '.*' -x '**/.*' -x '__MACOSX'`);
