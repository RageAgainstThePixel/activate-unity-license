const licenseClient = require('./licensing-client');
const core = require('@actions/core');
const path = require('path');
const fs = require("fs");

const platform = process.platform;

async function Activate() {
    try {
        if (licenseClient.hasExistingLicense()) {
            core.info('Unity License already activated!');
            return;
        } else {
            core.startGroup('Attempting to activate Unity License...');
            await licenseClient.version();
        }
        const editorPath = process.env.UNITY_EDITOR_PATH;
        if (!editorPath) {
            throw Error("Missing UNITY_EDITOR_PATH!");
        }
        const licenseType = core.getInput('license', { required: true });
        const username = core.getInput('username', { required: true });
        const password = core.getInput('password', { required: true });
        const serial = core.getInput('serial', { required: licenseType.toLowerCase().startsWith('pro') });
        await licenseClient.activateLicense(username, password, serial);
        core.saveState('isPost', true);
        if (!licenseClient.hasExistingLicense()) {
            throw Error('Unable to find Unity License!');
        }
        await licenseClient.showEntitlements();
    } catch (error) {
        core.setFailed(`Unity License Activation Failed!\n${error}`);
        copyLogs();
        process.exit(1);
    }
}

const licenseLogs = {
    win32: path.resolve(process.env.APPDATA || '', 'Unity', 'Unity.Licensing.Client.log'),
    darwin: path.resolve(process.env.HOME || '', 'Library', 'Logs', 'Unity', 'Unity.Licensing.Client.log'),
    linux: path.resolve(process.env.HOME || '', '.config', 'unity3d', 'Unity', 'Unity.Licensing.Client.log')
};

const hubLogs = {
    win32: path.resolve(process.env.APPDATA || '', 'UnityHub', 'logs', 'info-log.json'),
    darwin: path.resolve(process.env.HOME || '', 'Library', 'Application Support', 'UnityHub', 'logs', 'info-log.json'),
    linux: path.resolve(process.env.HOME || '', '.config', 'UnityHub', 'logs', 'info-log.json')
};

const copyLogs = () => {
    core.debug(`Unity Licensing Client Log: ${licenseLogs[platform]}`);
    if (fs.existsSync(licenseLogs[platform])) {
        copyFileToWorkspace(licenseLogs[platform], 'Unity.Licensing.Client.log');
    } else {
        core.warning(`Unity Licensing Client Log: ${licenseLogs[platform]} not found!`);
    }
    core.debug(`Unity Hub Log: ${hubLogs[platform]}`);
    if (fs.existsSync(hubLogs[platform])) {
        copyFileToWorkspace(hubLogs[platform], 'UnityHub.log');
    } else {
        core.warning(`Unity Hub Log: ${hubLogs[platform]} not found!`);
    }
};

const copyFileToWorkspace = (filePath, fileName) => {
    const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
    const logPath = path.resolve(workspace, fileName);
    fs.copyFileSync(filePath, logPath);
};

module.exports = { Activate };
