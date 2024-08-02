const { ResolveGlobPath, GetEditorRootPath } = require('./utility');
const core = require('@actions/core');
const glob = require('@actions/glob');
const exec = require('@actions/exec');
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require('path');

const platform = process.platform;

async function getLicensingClient() {
    const editorPath = process.env.UNITY_EDITOR_PATH;
    const version = process.env.UNITY_EDITOR_VERSION || editorPath.match(/(\d+\.\d+\.\d+[a-z]?\d?)/)[0];
    core.info(`Unity Editor Path: ${editorPath}`);
    core.info(`Unity Version: ${version}`);
    await fs.access(editorPath, fs.constants.X_OK);
    let licenseClientPath;
    const major = version.split('.')[0];
    // if 2019.3 or older, use unity editor hub licensing client
    if (major < 2020) {
        const unityHubPath = process.env.UNITY_HUB_PATH || process.env.HOME;
        core.info(`Unity Hub Path: ${unityHubPath}`);
        await fs.access(unityHubPath, fs.constants.R_OK);
        // C:\Program Files\Unity Hub\UnityLicensingClient_V1
        // /Applications/Unity\ Hub.app/Contents/MacOS/Unity\ Hub/UnityLicensingClient_V1
        // ~/Applications/Unity\ Hub.AppImage/UnityLicensingClient_V1
        const globs = [unityHubPath, '**', 'Unity.Licensing.Client'];
        if (platform === 'win32') {
            globs.push('.exe');
        }
        licenseClientPath = await ResolveGlobPath(globs);
        core.info(`Unity Licensing Client Path: ${licenseClientPath}`);
        await fs.access(licenseClientPath, fs.constants.R_OK);
        return licenseClientPath;
    }
    else {
        // Windows: <UnityEditorDir>\Data\Resources\Licensing\Client
        // macOS (Editor versions 2021.3.19f1 or later): <UnityEditorDir>/Contents/Frameworks/UnityLicensingClient.app/Contents/MacOS/
        // macOS (Editor versions earlier than 2021.3.19f1): <UnityEditorDir>/Contents/Frameworks/UnityLicensingClient.app/Contents/Resources/
        // Linux: <UnityEditorDir>/Data/Resources/Licensing/Client/
        const rootEditorPath = await GetEditorRootPath(editorPath);
        core.info(`Root Editor Path: ${rootEditorPath}`);
        const globs = [rootEditorPath, '**', 'Unity.Licensing.Client'];
        if (platform === 'win32') {
            globs.push('.exe');
        }
        licenseClientPath = await ResolveGlobPath(globs);
        core.info(`Unity Licensing Client Path: ${licenseClientPath}`);
        await fs.access(licenseClientPath, fs.constants.R_OK);
        return licenseClientPath;
    }
};

function maskSerialInOutput(output) {
    return output.replace(/([\w-]+-XXXX)/g, (_, serial) => {
        const maskedSerial = serial.slice(0, -4) + `XXXX`;
        core.setSecret(maskedSerial);
        return serial;
    });
};

let client = undefined;

async function execWithMask(args) {
    let output = '';
    let exitCode = 0;
    try {
        if (client == undefined) {
            client = await getLicensingClient();
        }
        await fs.access(client, fs.constants.X_OK);
        core.info(`[command]"${client}" ${args.join(' ')}`);
        exitCode = await exec.exec(`"${client}"`, args, {
            silent: true,
            listeners: {
                stdout: (data) => {
                    output += data.toString();
                },
                stderr: (data) => {
                    output += data.toString();
                }
            }
        });

    } finally {
        const maskedOutput = maskSerialInOutput(output);
        if (exitCode !== 0) {
            throw Error(maskedOutput);
        } else {
            core.info(maskedOutput);
        }
    }
};

const licensePaths = {
    win32: [
        path.join(process.env.PROGRAMDATA || '', 'Unity'),
        path.join(process.env.LOCALAPPDATA || '', 'Unity', 'licenses')
    ],
    darwin: [
        path.join('/Library', 'Application Support', 'Unity') || '/Library/Application Support/Unity',
        path.join('/Library', 'Unity', 'licenses' || '/Library/Unity/licenses')
    ],
    linux: [
        path.join(process.env.HOME || '', '.local/share/unity3d/Unity'),
        path.join(process.env.HOME || '', '.config/unity3d/Unity/licenses')
    ]
};

async function CheckExistingLicense() {
    core.info('Checking for existing Unity License activation...');
    core.info(`Platform detected: ${platform}`);
    const paths = licensePaths[platform];
    core.info(`License paths: ${paths}`);
    if (!paths || paths.length < 2) {
        core.info(`No license paths configured for platform: ${platform}`);
        return false;
    }
    const [ulfDir, licensesDir] = paths.filter(Boolean);
    if (!ulfDir) {
        core.info(`ULF Directory is not defined for ${platform}`);
        return false;
    }
    if (!licensesDir) {
        core.info(`Licenses Directory is not defined for ${platform}`);
        return false;
    }
    core.info(`ULF Directory: ${ulfDir}`);
    core.info(`Licenses Directory: ${licensesDir}`);
    if (platform === 'darwin' && !fsSync.existsSync(ulfDir)) {
        core.info(`Creating Unity license directory: ${ulfDir}`);
        await fs.mkdir(ulfDir, { recursive: true });
        await fs.chmod(ulfDir, 0o777);
    }
    const ulfPath = path.join(ulfDir, 'Unity_lic.ulf');
    core.info(`ULF Path: ${ulfPath}`);

    try {
        if (fsSync.existsSync(ulfPath)) {
            core.info(`Found license file at path: ${ulfPath}`);
            return true;
        } else {
            core.info(`License file does not exist at path: ${ulfPath}`);
        }
    } catch (error) {
        core.info(`Error checking ulf path: ${error.message}`);
    }

    try {
        if (fsSync.existsSync(licensesDir)) {
            core.info(`Found licenses directory: ${licensesDir}`);
            return fsSync.readdirSync(licensesDir).some(f => f.endsWith('.xml'));
        } else {
            core.info(`Licenses directory does not exist: ${licensesDir}`);
        }
    } catch (error) {
        core.info(`Error checking licenses directory: ${error.message}`);
    }

    return false;
}

async function Version() {
    await execWithMask([`--version`]);
}

async function ShowEntitlements() {
    await execWithMask([`--showEntitlements`]);
}

async function ActivateLicense(username, password, serial) {
    let args = [`--activate-ulf`, `--username`, username, `--password`, password];
    if (serial !== undefined && serial.length > 0) {
        args.push([`--serial`, `"${serial}"`]);
        const maskedSerial = serial.slice(0, -4) + `XXXX`;
        core.setSecret(maskedSerial);
    }
    await execWithMask(args);
}

async function ReturnLicense() {
    await execWithMask([`--return-ulf`]);
    await ShowEntitlements();
}

module.exports = { CheckExistingLicense, Version, ShowEntitlements, ActivateLicense, ReturnLicense };
