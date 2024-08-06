const licenseClient = require('./licensing-client');
const core = require('@actions/core');

async function Activate() {
    try {
        core.startGroup('Attempting to activate Unity License...');
        await licenseClient.Version();
        let activeLicenses = [];
        let isActive = await licenseClient.CheckExistingLicense();
        if (isActive) {
            activeLicenses = await licenseClient.ShowEntitlements();
        }
        try {
            const editorPath = process.env.UNITY_EDITOR_PATH;
            if (!editorPath) {
                throw Error("Missing UNITY_EDITOR_PATH!");
            }
            const licenseType = core.getInput('license', { required: true });
            if (activeLicenses.includes(licenseType.toLocaleLowerCase())) {
                core.info(`Unity License already activated with ${licenseType}!`);
                return;
            }
            if (licenseType.toLowerCase().startsWith('f')) {
                const servicesConfig = core.getInput('services-config', { required: true });
                await licenseClient.ActivateLicenseWithConfig(servicesConfig);
            } else {
                const username = core.getInput('username', { required: licenseType.toLowerCase().startsWith('p') });
                const password = core.getInput('password', { required: licenseType.toLowerCase().startsWith('p') });
                const serial = core.getInput('serial', { required: licenseType.toLowerCase().startsWith('pro') });
                await licenseClient.ActivateLicense(username, password, serial);
            }
            core.saveState('isPost', true);
            core.saveState('license', licenseType);
            isActive = await licenseClient.CheckExistingLicense();
            if (!isActive) {
                throw Error('Unable to find Unity License!');
            }
            activeLicenses = await licenseClient.ShowEntitlements();
        } finally {
            core.endGroup();
        }
    } catch (error) {
        core.setFailed(`Unity License Activation Failed!\n${error}`);
        process.exit(1);
    }
    core.info('Unity License Activated!');
}

module.exports = { Activate };
