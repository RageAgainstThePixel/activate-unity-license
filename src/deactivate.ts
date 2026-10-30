import core = require('@actions/core');
import {
    LicenseType,
    ReturnLicense
} from '@rage-against-the-pixel/unity-cli';

export async function Deactivate(): Promise<void> {
    try {
        const license: LicenseType | undefined = core.getState('license') as LicenseType | undefined;

        if (!license) {
            core.info('No license was activated, so there is nothing to return.');
            return;
        }

        const token = core.getState('activation-token');
        core.debug(`post state: ${license}`);
        core.info(`Unity ${license} License Deactivation...`);
        // skips personal and professional licenses on GitHub-hosted macOS and Linux runners,
        // which share one machine identity; floating licenses always release their lease
        await ReturnLicense(license, token || undefined);
    } catch (error) {
        core.error(`Failed to deactivate license!\n${error}`);
    } finally {
        // always exit 0 to not fail the job if deactivation fails
        process.exit(0);
    }
}
