const core = require('@actions/core');
const glob = require('@actions/glob');
const fs = require("fs").promises;
const path = require('path');

async function GetHubRootPath(hubPath) {
    core.debug(`searching for hub root path: ${hubPath}`);
    let hubRootPath = hubPath;
    switch (process.platform) {
        case 'darwin':
            hubRootPath = path.join(hubPath, '../../../../');
            break;
        case 'win32':
            hubRootPath = path.join(hubPath, '../../');
            break
        case 'linux':
            hubRootPath = path.join(hubPath, '../');
            break;
    }
}

async function GetEditorRootPath(editorPath) {
    core.debug(`searching for editor root path: ${editorPath}`);
    let editorRootPath = editorPath;
    switch (process.platform) {
        case 'darwin':
            editorRootPath = path.join(editorPath, '../../../../');
            break;
        case 'win32':
            editorRootPath = path.join(editorPath, '../../');
            break
        case 'linux':
            editorRootPath = path.join(editorPath, '../../');
            break;
    }
    await fs.access(editorRootPath, fs.constants.R_OK);
    core.debug(`found editor root path: ${editorRootPath}`);
    return editorRootPath;
}

async function ResolveGlobPath(globPath) {
    try {
        if (Array.isArray(globPath)) {
            globPath = path.join(...globPath);
        }
        core.info(`globPath: ${globPath}`);
        globPath = path.normalize(globPath);
        core.info(`normalized globPath: ${globPath}`);
        const globber = await glob.create(globPath);
        const globPaths = await globber.glob();
        core.info(`globPaths: ${globPaths}`);
        const result = globPaths[0];
        if (!result || globPaths.length === 0) {
            throw new Error(`Failed to resolve ${globPath}\n  > ${globPaths}`);
        }
        await fs.access(result, fs.constants.R_OK);
        core.info(`result:\n  > "${result}"`);
        return result;
    } catch (error) {
        throw error;
    }
}

module.exports = { ResolveGlobPath, GetEditorRootPath, GetHubRootPath }
