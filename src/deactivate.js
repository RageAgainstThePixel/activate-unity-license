const licensingClient = require('./licensing-client');
const core = require('@actions/core');

async function Deactivate() {
    try {
        const isActive = await licensingClient.CheckExistingLicense();
        if (isActive) {
            core.startGroup(`Unity License Deactivation...`);
            try {
                await licensingClient.ReturnLicense();
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
