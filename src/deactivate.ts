import core = require('@actions/core');
import {
    LicenseType,
    LicensingClient
} from '@rage-against-the-pixel/unity-cli';

export async function Deactivate(): Promise<void> {
    try {
        const license: LicenseType | undefined = core.getState('license') as LicenseType | undefined;

        if (!license) {
            core.error(`Failed to get license state!`);
            return;
        }

        // GitHub-hosted macOS and Linux runners share a machine identity, so returning the
        // license would revoke the activation for every other job using the same seat.
        // Floating licenses still release their lease back to the license server.
        if (license !== LicenseType.floating &&
            process.env.RUNNER_ENVIRONMENT === 'github-hosted' &&
            (process.platform === 'darwin' || process.platform === 'linux')) {
            core.info(`Skipping Unity ${license} License return on GitHub-hosted ${process.platform} runner.`);
            return;
        }

        const token = core.getState('activation-token');
        core.debug(`post state: ${license}`);
        core.info(`Unity ${license} License Deactivation...`);
        await new LicensingClient().Deactivate(license, token);
    } catch (error) {
        core.error(`Failed to deactivate license!\n${error}`);
    } finally {
        // always exit 0 to not fail the job if deactivation fails
        process.exit(0);
    }
}
