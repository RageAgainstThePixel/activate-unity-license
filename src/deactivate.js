const licensingClient = require('./licensing-client');
const core = require('@actions/core');

async function Deactivate() {
    try {
        const isActive = await licensingClient.CheckExistingLicense();
        if (isActive) {
            core.startGroup(`Unity License Deactivation...`);
            try {
                const license = core.getState('license');
                core.debug(`post state: ${license}`);
                if (license.startsWith('f')) {
                    return;
                }
                const activeLicenses = await licensingClient.ShowEntitlements();
                if (license !== undefined &&
                    !activeLicenses.includes(license.toLowerCase())) {
                    core.warning(`${license} was never activated.`);
                }
                await licensingClient.ReturnLicense(license);
            }
            finally {
                core.endGroup();
                core.info('Unity License successfully returned.');
            }
        } else {
            console.info(`No Unity License was activated.`);
        }
    } catch (error) {
        core.setFailed(`Failed to deactivate license!\n${error}`);
        process.exit(1);
    }
};

module.exports = { Deactivate }
