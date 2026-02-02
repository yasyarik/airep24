import fs from 'fs/promises';
import path from 'path';

// Manually defined presets (with full metadata)
const MANUAL_PRESET_MODELS = [
    // Old presets removed - using auto-scanned files from /presets/models/ folder
];

const MANUAL_PRESET_LOCATIONS = [
    // Old presets removed - using auto-scanned files from /presets/locations/ folder
];

// Helper: Generate metadata from filename
function generateMetadataFromFilename(filename, type, dirPath) {
    const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png)$/i, '');

    // Convert to kebab-case for ID (e.g., "Brick Wall" -> "brick-wall")
    const id = nameWithoutExt
        .toLowerCase()
        .replace(/\s+/g, '-')  // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '');  // Remove special characters

    if (type === 'model') {
        // Detect gender from filename
        const gender = id.includes('female') ? 'female' :
            id.includes('male') ? 'male' : 'unisex';

        // Use original name (with proper capitalization)
        const name = nameWithoutExt;

        return {
            id,
            name,
            gender,
            image: `/${dirPath}/${filename}`,
            description: `${gender.charAt(0).toUpperCase() + gender.slice(1)} model`
        };
    } else {
        // Location/Placement - use original name
        const name = nameWithoutExt;

        return {
            id,
            name,
            image: `/${dirPath}/${filename}`,
            description: `${name} background`,
            prompt: `a professional commercial product photography background in a ${name.toLowerCase()} setting, empty, no products, no humans, 8k resolution`
        };
    }
}

// Scan directory and auto-generate presets
async function scanPresetsDirectory(dirPath, type) {
    try {
        const fullPath = path.join(process.cwd(), 'public', dirPath);
        const files = await fs.readdir(fullPath);

        const autoPresets = [];
        for (const file of files) {
            // Only process image files
            if (!/\.(jpg|jpeg|png)$/i.test(file)) continue;

            // Generate metadata
            const preset = generateMetadataFromFilename(file, type, dirPath);
            autoPresets.push(preset);
        }

        return autoPresets;
    } catch (error) {
        console.error(`Failed to scan ${dirPath}:`, error);
        return [];
    }
}

// Load all presets (manual + auto-scanned)
export async function loadPresets() {
    // Scan directories
    const autoModels = await scanPresetsDirectory('presets/models', 'model');
    const autoLocations = await scanPresetsDirectory('presets/locations', 'location');
    const autoPlacements = await scanPresetsDirectory('presets/placements', 'location');

    // Merge: Manual presets first, then auto-scanned (avoiding duplicates)
    const manualModelIds = new Set(MANUAL_PRESET_MODELS.map(m => m.id));
    const manualLocationIds = new Set(MANUAL_PRESET_LOCATIONS.map(l => l.id));

    const models = [
        ...MANUAL_PRESET_MODELS,
        ...autoModels.filter(m => !manualModelIds.has(m.id))
    ];

    const locations = [
        ...MANUAL_PRESET_LOCATIONS,
        ...autoLocations.filter(l => !manualLocationIds.has(l.id))
    ];

    const placements = autoPlacements;
    console.log(`[PRESETS] Loaded ${models.length} models, ${locations.length} locations, ${placements.length} placements`);

    return { models, locations, placements };
}

// Export static versions for backwards compatibility
export const PRESET_MODELS = MANUAL_PRESET_MODELS;
export const PRESET_LOCATIONS = MANUAL_PRESET_LOCATIONS;
