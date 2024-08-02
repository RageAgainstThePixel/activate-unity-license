const core = require('@actions/core');
const glob = require('@actions/glob');
const exec = require('@actions/exec');
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require('path');

const platform = process.platform;

async function getLicensingClient() {
    // Windows: <UnityEditorDir>\Data\Resources\Licensing\Client
    // macOS (Editor versions 2021.3.19f1 or later): <UnityEditorDir>/Contents/Frameworks/UnityLicensingClient.app/Contents/MacOS/
    // macOS (Editor versions earlier than 2021.3.19f1): <UnityEditorDir>/Contents/Frameworks/UnityLicensingClient.app/Contents/Resources/
    // Linux: <UnityEditorDir>/Data/Resources/Licensing/Client
    const editorPath = platform !== 'darwin' ? path.resolve(process.env.UNITY_EDITOR_PATH, '..') : path.resolve(process.env.UNITY_EDITOR_PATH, '..', '..');
    const version = process.env.UNITY_EDITOR_VERSION || editorPath.match(/(\d+\.\d+\.\d+[a-z]?\d?)/)[0];
    core.info(`Unity Editor Path: ${editorPath}`);
    core.info(`Unity Version: ${version}`);
    await fs.access(editorPath, fs.constants.X_OK);
    let licenseClientPath;
    const major = version.split('.')[0];
    // if 2019.3 or older, use unity editor hub licensing client
    if (major < 2020) {
        const unityHubPath = process.env.UNITY_HUB_PATH;
        // C:\Program Files\Unity Hub\UnityLicensingClient_V1
        // /Applications/Unity\ Hub.app/Contents/MacOS/Unity\ Hub/UnityLicensingClient_V1
        // ~/Applications/Unity\ Hub.AppImage/UnityLicensingClient_V1
        const globPattern = path.join(unityHubPath, '..', '**', 'UnityLicensingClient_V1');
        const globber = await glob.create(globPattern);
        const files = await globber.glob();
        if (files.length > 0) {
            licenseClientPath = files[0];
        } else {
            throw Error(`Failed to find Unity Licensing Client in Unity Hub directory!\n "${globPattern}"`);
        }
        core.info(`Unity Licensing Client Path: ${licenseClientPath}`);
        await fs.access(licenseClientPath, fs.constants.X_OK);
        return licenseClientPath;
    }
    else {
        const globPattern = path.resolve(editorPath, '**', 'Unity.Licensing.Client');
        const globber = await glob.create(globPattern);
        const files = await globber.glob();
        if (files.length > 0) {
            licenseClientPath = files[0];
        } else {
            throw Error(`Unity Licensing Client not found in ${editorPath}\n  "${globPattern}"`);
        }
        core.info(`Unity Licensing Client Path: ${licenseClientPath}`);
        await fs.access(licenseClientPath, fs.constants.X_OK);
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
        path.resolve(process.env.PROGRAMDATA || '', 'Unity'),
        path.resolve(process.env.LOCALAPPDATA || '', 'Unity', 'licenses')
    ],
    darwin: [
        path.resolve('/Library', 'Application Support', 'Unity') || '/Library/Application Support/Unity',
        path.resolve('/Library', 'Unity', 'licenses' || '/Library/Unity/licenses')
    ],
    linux: [
        path.resolve(process.env.HOME || '', '.local/share/unity3d/Unity'),
        path.resolve(process.env.HOME || '', '.config/unity3d/Unity/licenses')
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
    let hasUfl = undefined;
    try {
        await fs.access(ulfDir, fs.constants.R_OK);
    } catch (error) {
        if (platform === 'darwin') {
            if (!fsSync.existsSync(ulfDir)) {
                await fs.mkdir(ulfDir, { recursive: true });
            }
            fs.chmod(ulfDir, 0o777);
        }
    }
    try {
        const ulfPath = path.resolve(ulfDir, 'Unity_lic.ulf');
        core.info(`ULF Path: ${ulfPath}`);
        await fs.access(ulfPath, fs.constants.R_OK);
        hasUfl = fsSync.existsSync(ulfPath);
    } catch (error) {
        return false;
    }
    try {
        await fs.access(licensesDir, fs.constants.R_OK);
        core.info(`Found licenses directory: ${licensesDir}`);
        return fsSync.readdirSync(licensesDir).some(f => f.endsWith('.xml'));
    } catch (error) {
        // nothing
    }
    return hasUfl === true;
}

async function Version() {
    await execWithMask([`--version`]);
}

async function ShowEntitlements() {
    await execWithMask([`--show-entitlements`]);
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
    await showEntitlements();
}

module.exports = { CheckExistingLicense, Version, ShowEntitlements, ActivateLicense, ReturnLicense };
