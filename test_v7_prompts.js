import { generateClothingPrompt, generateItemPrompt } from './app/data/prompts.js';

const mockGenSettings = {
    emotion: 'smile',
    makeup: 'glam',
    eyewear: 'sunglasses',
    jewelry: 'statement',
    pose: 'editorial',
    cameraAngle: '45',
    productAction: 'demonstrate',
    notes: 'dark background, rainy day'
};

const clothingPrompt = generateClothingPrompt(
    "Blue Denim Jacket",
    "Frontal stance",
    "Urban street",
    false,
    12345,
    mockGenSettings
);

console.log("--- CLOTHING PROMPT ---");
console.log(clothingPrompt);

const itemPrompt = generateItemPrompt(
    { title: "Luxury Watch", category: "jewelry" },
    "Eye-level shot",
    "Modern office",
    67890,
    0,
    false,
    mockGenSettings
);

console.log("\n--- ITEM PROMPT ---");
console.log(itemPrompt);
