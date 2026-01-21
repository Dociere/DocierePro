/**
 * LocalStorage-based draft and version management.
 * This replaces PouchDB to ensure compatibility and simplicity.
 */

const getStorageKeys = (projectId) => ({
    DRAFT: `dociere_draft_${projectId}`,
    VERSIONS: `dociere_versions_${projectId}`
});

/**
 * Saves the current draft for a specific project.
 */
export const saveDraft = async (projectId, content) => {
    if (!projectId) return false;
    try {
        const keys = getStorageKeys(projectId);
        const draft = {
            content,
            timestamp: Date.now()
        };
        localStorage.setItem(keys.DRAFT, JSON.stringify(draft));
        return true;
    } catch (error) {
        console.error('Error saving draft to localStorage:', error);
        return false;
    }
};

/**
 * Loads the current draft for a specific project.
 */
export const getDraft = async (projectId) => {
    if (!projectId) return null;
    try {
        const keys = getStorageKeys(projectId);
        const draftRaw = localStorage.getItem(keys.DRAFT);
        if (!draftRaw) return null;
        return JSON.parse(draftRaw);
    } catch (error) {
        console.error('Error loading draft from localStorage:', error);
        return null;
    }
};

/**
 * Creates a permanent version snapshot from the current draft for a specific project.
 */
export const publishVersion = async (projectId, name, description) => {
    if (!projectId) throw new Error("ProjectId is required");
    try {
        const keys = getStorageKeys(projectId);
        const draftRaw = localStorage.getItem(keys.DRAFT);
        if (!draftRaw) throw new Error("No draft found to publish");

        const draft = JSON.parse(draftRaw);
        const versionsRaw = localStorage.getItem(keys.VERSIONS) || '[]';
        const versions = JSON.parse(versionsRaw);

        const newVersion = {
            _id: `ver_${Date.now()}`,
            name,
            description,
            content: draft.content,
            timestamp: Date.now(),
            type: 'version'
        };

        versions.push(newVersion);
        localStorage.setItem(keys.VERSIONS, JSON.stringify(versions));
        return newVersion._id;
    } catch (error) {
        console.error('Error publishing version to localStorage:', error);
        throw error;
    }
};

/**
 * Restores a version's content into the current draft for a specific project.
 */
export const restoreVersion = async (projectId, versionId) => {
    if (!projectId) throw new Error("ProjectId is required");
    try {
        const keys = getStorageKeys(projectId);
        const versionsRaw = localStorage.getItem(keys.VERSIONS);
        if (!versionsRaw) throw new Error("No versions found");

        const versions = JSON.parse(versionsRaw);
        const version = versions.find(v => v._id === versionId);

        if (!version) throw new Error("Version not found");

        // Update draft with version content
        await saveDraft(projectId, version.content);
        return version.content;
    } catch (error) {
        console.error('Error restoring version in localStorage:', error);
        throw error;
    }
};

/**
 * Retrieves all versions for a specific project sorted by timestamp.
 */
export const getVersionHistory = async (projectId) => {
    if (!projectId) return [];
    try {
        const keys = getStorageKeys(projectId);
        const versionsRaw = localStorage.getItem(keys.VERSIONS) || '[]';
        const versions = JSON.parse(versionsRaw);
        return versions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error fetching version history:', error);
        return [];
    }
};

export default { saveDraft, getDraft, publishVersion, restoreVersion, getVersionHistory };
