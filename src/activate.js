const licenseClient = require('./licensing-client');
const core = require('@actions/core');

async function Activate() {
    let license = undefined;
    try {
        core.saveState('isPost', true);
        await licenseClient.Version();
        let activeLicenses = [];
        let isActive = await licenseClient.CheckExistingLicense();
        if (isActive) {
            activeLicenses = await licenseClient.ShowEntitlements();
        }
        const editorPath = process.env.UNITY_EDITOR_PATH;
        if (!editorPath) {
            throw Error("Missing UNITY_EDITOR_PATH!");
        }
        license = core.getInput('license', { required: true });
        switch (license.toLowerCase()) {
            case 'professional':
            case 'personal':
            case 'floating':
                break;
            default:
                throw Error(`Invalid License: ${license}! Must be Professional, Personal, or Floating.`);
        }
        if (activeLicenses.includes(license.toLocaleLowerCase())) {
            core.warning(`Unity License already activated with ${license}!`);
            return;
        }
        core.startGroup('Attempting to activate Unity License...');
        try {
            if (license.toLowerCase().startsWith('f')) {
                const servicesConfig = core.getInput('services-config', { required: true });
                await licenseClient.ActivateLicenseWithConfig(servicesConfig);
            } else {
                const username = core.getInput('username', { required: true });
                const password = core.getInput('password', { required: true });
                const serial = core.getInput('serial', { required: license.toLowerCase().startsWith('pro') });
                await licenseClient.ActivateLicense(username, password, serial);
            }
            core.saveState('license', license);
            isActive = await licenseClient.CheckExistingLicense();
            if (!isActive) {
                throw Error('Unable to find a valid Unity License!');
            }
            activeLicenses = await licenseClient.ShowEntitlements();
            if (!activeLicenses.includes(license.toLowerCase())) {
                throw Error(`Failed to activate Unity License with ${license}!`);
            }
        } finally {
            core.endGroup();
        }
    } catch (error) {
        core.setFailed(`Unity License Activation Failed!\n${error}`);
        process.exit(1);
    }
    core.info(`Unity ${license} License Activated!`);
}

module.exports = { Activate };
