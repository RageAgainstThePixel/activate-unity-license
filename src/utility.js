const core = require('@actions/core');
const glob = require('@actions/glob');
const fs = require("fs").promises;
const path = require('path');

async function ResolveGlobPath(globPath) {
    try {
        core.debug(`globPath: ${globPath}`);
        globPath = path.normalize(globPath);
        core.debug(`normalized globPath: ${globPath}`);
        const globber = await glob.create(globPath);
        const globPaths = await globber.glob();
        core.debug(`globPaths: ${globPaths}`);
        const result = globPaths[0];
        if (!result || globPaths.length === 0) {
            throw new Error(`Failed to resolve ${globPath}\n  > ${globPaths}`);
        }
        await fs.access(result, fs.constants.R_OK);
        core.debug(`result:\n  > "${result}"`);
        return result;
    } catch (error) {
        throw error;
    }
}

module.exports = { ResolveGlobPath }
