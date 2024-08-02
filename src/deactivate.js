const licensingClient = require('./licensing-client');
const core = require('@actions/core');

async function Deactivate() {
    try {
        if (await licensingClient.hasExistingLicense()) {
            core.startGroup(`Unity License Deactivation...`);
            try {
                await licensingClient.returnLicense();
            }
            finally {
                core.endGroup();
            }
        } else {
            console.info(`No Unity License was activated.`);
        }
    } catch (error) {
        core.setFailed(`Failed to deactivate license!\n::error::${error}`);
        process.exit(1);
    }
};

module.exports = { Deactivate }
