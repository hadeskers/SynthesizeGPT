const fs = require('fs');
const os = require('os');
const path = require('path');
const {execSync} = require('child_process');

const FIREFOX_GUID = 'af8f8e5d-48b4-4806-b08b-01379389e3d5';

if (fs.existsSync('build')) {
    fs.rmSync('build', {recursive: true, force: true});
}

const includesPaths = ['manifest.json', 'src'];

function readDirRecursive(dir) {
    const items = [];
    fs.readdirSync(dir, { withFileTypes: true })
        .forEach(file => {
            if(file.isFile() && !file.name.startsWith('.')) {
                items.push(path.join(dir, file.name));
            } else if(file.isDirectory()) {
                items.push(...readDirRecursive(path.join(dir, file.name)))
            }
        });
    return items;
}

const paths = [];
fs.readdirSync('.', { withFileTypes: true })
    .forEach(file => {
        if(includesPaths.includes(file.name)){
            if(file.isFile()) {
                paths.push(file.name);
            } else if(file.isDirectory()) {
                paths.push(...readDirRecursive(file.name));
            }
        }
    });


const chromeDist = path.join('build', 'dist', 'chrome');
const firefoxDist = path.join('build', 'dist', 'firefox');

[firefoxDist, chromeDist].forEach(dir => {
    fs.mkdirSync(dir, {recursive: true});
});

function copyFileWithParentDir(src, dest) {
    const destDir = path.dirname(dest);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
}

const manifestInfo = JSON.parse(fs.readFileSync('manifest.json', 'utf8').toString());

const builtFileName = `Synthesize_v${manifestInfo.version}.zip`;

function buildToChrome() {
    paths.forEach((item) => {
        copyFileWithParentDir(item, path.join(chromeDist, item));
    });
    const cmd = os.platform() === 'win32' ? `tar -a -cf ${builtFileName} .` : `zip -r ${builtFileName} .`;
    console.log('Build for chrome: ' + cmd);
    execSync(cmd, { cwd: chromeDist });
}

function buildToFirefox() {
    paths.forEach((item) => {
        if(!item.endsWith('manifest.json')) {
            copyFileWithParentDir(item, path.join(firefoxDist, item));
        } else {
            const json = {
                ...manifestInfo,
                background: {
                    scripts: [manifestInfo['background']['service_worker']]
                },
                default_popup: manifestInfo['action'],
                browser_specific_settings: {
                    "gecko": {
                        "id": `{${FIREFOX_GUID}}`
                    }
                }
            };
            delete json['action'];
            fs.writeFileSync(path.join(firefoxDist, item), JSON.stringify(json, null, 2));
        }
    });
    const cmd = os.platform() === 'win32' ? `tar -a -cf ${builtFileName} .` : `zip -r ${builtFileName} .`;
    console.log('Build for firefox: ' + cmd);
    execSync(cmd, { cwd: firefoxDist });
}

buildToChrome();
buildToFirefox();