export const ASPECT_RATIO_HEADER = `
[STRICT COMPOSITION]
- FORMAT: Cinematic 9:16 Vertical.
- MANDATE: Full-height portrait orientation. 
- COMPOSITION: The scene must fill the entire canvas top-to-bottom.
`.trim();

export const POSE_MAP = {
    'auto': 'a natural confident fashion pose',
    'editorial': 'a high-fashion editorial model pose with sophisticated angles',
    'casual': 'a relaxed casual everyday stance',
    'expressive': 'an expressive theatrical actor pose with dynamic gestures',
    'sporty': 'a dynamic fitness pose like during an aerobics workout session',
    'cute': 'a playful charming pose with engaging body language',
    'meditative': 'a calm centered yoga meditation pose'
};

export const EMOTION_MAP = {
    'auto': 'natural relaxed expression',
    'neutral': 'calm neutral expression',
    'smile': 'warm genuine smile',
    'laugh': 'joyful natural laugh',
    'flirty': 'playful confident flirty expression',
    'emotional': 'emotional tender vulnerable expression',
    'angry': 'intense fierce angry expression',
    'serious': 'serious focused determined expression'
};

export const MAKEUP_MAP = {
    'auto': 'natural everyday makeup',
    'no-makeup': 'with natural bare skin (no makeup)',
    'natural': 'with fresh natural daily makeup',
    'glam': 'with glamorous evening makeup'
};

export const EYEWEAR_MAP = {
    'auto': '',
    'none': '',
    'glasses': 'wearing prescription glasses',
    'sunglasses': 'wearing stylish sunglasses'
};

export const JEWELRY_MAP = {
    'auto': '',
    'none': '',
    'minimal': 'wearing minimal delicate jewelry',
    'statement': 'wearing bold statement jewelry'
};

export const CAMERA_ANGLE_MAP = {
    'auto': 'Standard frontal or slightly angled eye-level view',
    '30': 'Camera positioned 30 degrees to the side of the model',
    '60': 'Camera positioned 60 degrees to the side of the model',
    '90': 'Camera positioned exactly 90 degrees to the side (pure side profile view)',
    '180': 'Camera positioned behind the model (back view, model looking away from camera)'
};

export const CLOTHING_ANGLE_PROMPTS = [
    'CAMERA_ANGLE: "Frontal View". ORIENTATION: Full body facing the camera. LENS: Standard commercial focal length (50-85mm).',
    'CAMERA_ANGLE: "3/4 Side Profile". ORIENTATION: Body turned 45 degrees relative to camera. LENS: Portrait focal length, slimming perspective.',
    'CAMERA_ANGLE: "Back View". ORIENTATION: Facing away from camera, looking back over shoulder. LENS: Focus on back details of garment.'
];

export const ITEM_ANGLE_PROMPTS = [
    // РАКУРС 0: ПРЕЗЕНТАЦИЯ
    `SCENE_TYPE: "The Hero Shot".
    ADAPTIVE_DISPLAY: 
      - IF [Small: Watch, Jewelry, Phone]: CHEST-UP SHOT. Worn on wrist or held at chest level. NO LEGS.
      - IF [Standard: Bottle, Shaker]: WAIST-UP SHOT. Held elegantly.
      - IF [Large: Bag, Weapon, Umbrella]: FULL-BODY/KNEE-UP. Full scale visibility.`,

    // РАКУРС 1: ДЕЙСТВИЕ
    `SCENE_TYPE: "Interaction & Process".
    SHOT_TYPE:
      - IF [Small/Medium]: CHEST-UP CLOSE-UP. Focus on interaction zone.
      - IF [Large]: KNEE-UP VERTICAL SHOT.`,

    // РАКУРС 2: ПОДРОБНОЕ МАКРО (DSLR STYLE)
    `SCENE_TYPE: "The Detailed Macro".
    ZOOM: Extreme close-up. The product and interaction point fill 90% of the frame.
    OPTICAL_STYLE: DSLR Photography style. Natural depth of field with soft bokeh. Background elements are out of focus but maintain their basic lighting structure.
    SHOT_TYPE: Tight crop. Focus on detail.
    EMOTION: Sensory enjoyment.
    FOCUS: Razor-sharp focus only on the primary point of contact.`
];

export const generateClothingPrompt = (productTitle, angleVariation, locationPrompt = '', hasLocationImage = false, seed = 0, isCustomModel = false, hasModelImage = true, options = {}, hasPerson = false) => {
    // Build styling descriptions for STEP 1
    const poseDesc = POSE_MAP[options.pose] || POSE_MAP['auto'];
    const cameraAngleDesc = CAMERA_ANGLE_MAP[options.cameraAngle] || CAMERA_ANGLE_MAP['auto'];

    const stylingParts = [];
    if (options.emotion && EMOTION_MAP[options.emotion]) stylingParts.push(EMOTION_MAP[options.emotion]);
    if (options.makeup && MAKEUP_MAP[options.makeup]) stylingParts.push(MAKEUP_MAP[options.makeup]);
    if (options.eyewear && EYEWEAR_MAP[options.eyewear]) stylingParts.push(EYEWEAR_MAP[options.eyewear]);
    if (options.jewelry && JEWELRY_MAP[options.jewelry]) stylingParts.push(JEWELRY_MAP[options.jewelry]);

    const stylingLine = stylingParts.length > 0 ? stylingParts.join(', ') + '.' : '';

    // --- SPECIAL HANDLING: Product image contains a person ---
    // Full copy of golden prompt, modified to replace the person from product image
    if (hasPerson) {
        return `
/// MASTER CLOTHING COMPOSITOR v7: PERSON REPLACEMENT MODE ///
[STRICT DIMENSIONS]
- ASPECT RATIO: 9:16 Vertical (Story Format).
- ORIENTATION: Portrait Only.
- MANDATE: The entire scene, including any generated background, MUST be vertical.
- RATIO LOCK: DO NOT match the aspect ratio of Image 1 or Image 2. Output MUST be 1080x1920 (9:16).
- [VARIETY SEED]: ${seed}

[CRITICAL: PERSON REPLACEMENT TASK]
IMAGE 2 contains a person wearing the clothing "${productTitle}".
You MUST COMPLETELY REPLACE this person with the person from IMAGE 1.
- The person in IMAGE 2 is IRRELEVANT - ignore their face, hair, body, skin tone
- Use ONLY the clothing/outfit from IMAGE 2 as reference
- The person in IMAGE 1 is your IDENTITY SOURCE - preserve their face, hair, body exactly

[INPUTS]
- IDENTITY: Face, Body and Hair from IMAGE 1. THIS IS THE ONLY PERSON ALLOWED IN THE OUTPUT.
- CLOTHING REFERENCE: Extract the outfit from IMAGE 2 ("${productTitle}"). IGNORE the person wearing it.
- BACKGROUND: ${hasLocationImage ? `USE IMAGE 3 AS THE ABSOLUTE BACKGROUND.` : `GENERATE A NEW BACKGROUND: "${locationPrompt || 'Elegant e-commerce studio background'}". MUST BE VERTICAL 9:16.`}

[PRODUCT FIDELITY: PIXEL-PERFECT CLOTHING]
1.  COLOR LOCK: Maintain the EXACT HEX color/shade of the garment from IMAGE 2. DO NOT allow background lighting to shift the color.
2.  FABRIC INTEGRITY: Replicate the EXACT fabric weave, weight, and texture from IMAGE 2.
3.  GEOMETRY & ANGLE PERMISSION: You are explicitly ALLOWED to rotate/re-imagine the 3D geometry of the clothing to match the requested camera angle (${cameraAngleDesc}). Do not be constrained by the original product angle if it conflicts with the target view.
4.  NO HALLUCINATIONS: Do not add or remove seams, buttons, or details (except for necessary perspective shifts).

[STEP 1: OUTFIT RECONSTRUCTION & ANTI-LAZINESS]
Camera angle: ${cameraAngleDesc}.
1.  ZERO PIXEL REUSE: REDRAW the model's body, skin, and clothing from scratch in ${poseDesc}.
2.  The person must be from IMAGE 1 - NOT from IMAGE 2.
${stylingLine}

[STEP 2: GEOMETRY & SPACE INTERACTION]
${hasLocationImage ? `1. MANDATORY DEPTH: Seamlessly integrate the model INTO the 3D space of IMAGE 3.
2. CONTACT PHYSICS:
    - FEET: Both feet MUST be firmly planted on the floor plane of IMAGE 3. ZERO GAP between shoes and floor.
    - OBJECT COLLISION: Identify all furniture and fixtures.
    - NO CLIPPING: The model's body MUST NOT clip through background objects.
3. PERSPECTIVE: The model's size must match the scale of background objects.` : `1. ENVIRONMENT DESIGN: Generate a high-fashion, high-quality VERTICAL environment.
2. PORTRAIT PERSPECTIVE: The subject MUST be centered and grounded.
3. VERTICAL COMPOSITION: Background architecturally designed for 9:16.`}

[STEP 3: FRAMING & ANATOMY]
1.  PROXIMITY: Model must occupy 85-90% of the vertical frame.
2.  VERTICALITY: Mandatory vertical 9:16 framing.
3.  NO HORIZONTAL LEAKAGE: ZERO horizontal white space.

[STEP 4: RENDER & LIGHTING]
- LIGHTING SOURCE: Derived exclusively from ${hasLocationImage ? 'IMAGE 3' : 'the new background'}.
- SHADOWS: Cast accurate contact shadows on the floor.
- TEXTURE: 8k photorealistic texture fidelity.

[NEGATIVE PROMPT]
(wrong person), (person from IMAGE 2), (mixed faces), (identity blend), (extra limbs:2.0), (third hand:2.0), (extra arms:2.0), (duplicate hands:2.0), (landscape), (wide shot), (horizontal), **gray wall**, **plain background**, de-focused face, blurry product, messy edges. IMPORTANT: (altering color:1.5), (changing fabric:1.5), (new texture), (incorrect shade), (oversaturated color).
`.trim();
    }



    return `
/// MASTER CLOTHING COMPOSITOR v7: FURNITURE & PERSPECTIVE LOCK ///
[STRICT DIMENSIONS]
- ASPECT RATIO: 9:16 Vertical (Story Format).
- ORIENTATION: Portrait Only.
- MANDATE: The entire scene, including any generated background, MUST be vertical.
- RATIO LOCK: DO NOT match the aspect ratio of Image 1 or Image 2. Output MUST be 1080x1920 (9:16).
- [VARIETY SEED]: ${seed}

[INPUTS]
- IDENTITY: Face, Body and Hair from IMAGE 1.
- PRODUCT: Clothing from IMAGE 2 ("${productTitle}").
- BACKGROUND: ${hasLocationImage ? `USE IMAGE 3 AS THE ABSOLUTE BACKGROUND.` : `GENERATE A NEW BACKGROUND: "${locationPrompt || 'Elegant e-commerce studio background'}". MUST BE VERTICAL 9:16.`}

[PRODUCT FIDELITY: PIXEL-PERFECT CLOTHING]
1.  COLOR LOCK: Maintain the EXACT HEX color/shade of the garment from IMAGE 2. DO NOT allow background lighting to shift the color.
2.  FABRIC INTEGRITY: Replicate the EXACT fabric weave, weight, and texture from IMAGE 2.
3.  GEOMETRY & ANGLE PERMISSION: You are explicitly ALLOWED to rotate/re-imagine the 3D geometry of the clothing to match the requested camera angle (${cameraAngleDesc}). Do not be constrained by the original product angle if it conflicts with the target view.
4.  NO HALLUCINATIONS: Do not add or remove seams, buttons, or details (except for necessary perspective shifts).

[STEP 1: OUTFIT RECONSTRUCTION & ANTI-LAZINESS]
Camera angle: ${cameraAngleDesc}.
1.  ZERO PIXEL REUSE: REDRAW the model's body, skin, and clothing from scratch in ${poseDesc}.
${stylingLine}

[STEP 2: GEOMETRY & SPACE INTERACTION]
${hasLocationImage ? `1. MANDATORY DEPTH: Seamlessly integrate the model INTO the 3D space of IMAGE 3.
2. CONTACT PHYSICS:
    - FEET: Both feet MUST be firmly planted on the floor plane of IMAGE 3. ZERO GAP between shoes and floor.
    - OBJECT COLLISION: Identify all furniture and fixtures.
    - NO CLIPPING: The model's body MUST NOT clip through background objects.
3. PERSPECTIVE: The model's size must match the scale of background objects.` : `1. ENVIRONMENT DESIGN: Generate a high-fashion, high-quality VERTICAL environment.
2. PORTRAIT PERSPECTIVE: The subject MUST be centered and grounded.
3. VERTICAL COMPOSITION: Background architecturally designed for 9:16.`}

[STEP 3: FRAMING & ANATOMY]
1.  PROXIMITY: Model must occupy 85-90% of the vertical frame.
2.  VERTICALITY: Mandatory vertical 9:16 framing.
3.  NO HORIZONTAL LEAKAGE: ZERO horizontal white space.

[STEP 4: RENDER & LIGHTING]
- LIGHTING SOURCE: Derived exclusively from ${hasLocationImage ? 'IMAGE 3' : 'the new background'}.
- SHADOWS: Cast accurate contact shadows on the floor.
- TEXTURE: 8k photorealistic texture fidelity.

[NEGATIVE PROMPT]
(extra limbs:2.0), (third hand:2.0), (extra arms:2.0), (duplicate hands:2.0), (landscape), (wide shot), (horizontal), **gray wall**, **plain background**, de-focused face, blurry product, messy edges. IMPORTANT: (altering color:1.5), (changing fabric:1.5), (new texture), (incorrect shade), (oversaturated color).
`.trim();
};

export const generateItemPrompt = (product, angleVariation, locationPrompt, seed, angleIndex = 0, hasLocationImage = false, isCustomModel = false, hasModelImage = true, options = {}, hasPerson = false, productAction = 'interaction') => {
    const category = (product.category || product.productCategory || '').toLowerCase();
    const title = (product.title || '').toLowerCase();

    // --- STANDARD INDEXING (Model=1, Product=2) ---
    const identityIdx = 1;

    // 1. Adaptive Lighting Setup
    const lightingPrompt = hasLocationImage
        ? `LIGHTING: MATCH the lighting of Background Image 3 perfectly. Use its shadows and highlights as the master template.`
        : (locationPrompt
            ? `LIGHTING: Match the natural atmosphere of "${locationPrompt}".`
            : `LIGHTING: High-quality professional studio lighting. Neutral balance.`);

    // 2. Logic scale
    const isSmall = /watch|jewelry|ring|earring|phone|cosmetic|lipstick|cream|glass|bottle/.test(category + title);
    const isLarge = /bag|suitcase|sword|saber|bow|umbrella|equipment/.test(category + title);

    const distanceMandate = isSmall
        ? "STRICT DISTANCE: Medium Close-up. The camera is prohibited from showing legs, feet, or shoes. Only head and torso."
        : "STRICT DISTANCE: Full-body or Knee-up. Show the entire scale of the product.";

    const poseDesc = POSE_MAP[options.pose] || POSE_MAP['auto'];
    const cameraAngleDesc = CAMERA_ANGLE_MAP[options.cameraAngle] || CAMERA_ANGLE_MAP['auto'];

    const stylingParts = [];
    if (options.emotion && EMOTION_MAP[options.emotion]) stylingParts.push(EMOTION_MAP[options.emotion]);
    if (options.makeup && MAKEUP_MAP[options.makeup]) stylingParts.push(MAKEUP_MAP[options.makeup]);
    if (options.eyewear && EYEWEAR_MAP[options.eyewear]) stylingParts.push(EYEWEAR_MAP[options.eyewear]);
    if (options.jewelry && JEWELRY_MAP[options.jewelry]) stylingParts.push(JEWELRY_MAP[options.jewelry]);

    const stylingLine = stylingParts.length > 0 ? stylingParts.join(', ') + '.' : '';

    // 7. Negative Prompts logic
    const baseNegative = "(altering color:1.5), (changing pattern:1.5), (new texture), (low resolution), (cartoon), (illustration), (black bars), (product separate from model:1.5), (product on top of model:1.5), (no interaction:1.5), (extra limbs:2.0), (third hand:2.0), (extra arms:2.0), (duplicate hands:2.0), (deformed fingers:1.8)";
    const interactionNegative = productAction === 'interaction' ? ", (closed lid:1.5), (closed cap:1.5), (sealed bottle:1.5), (closed container:1.5), (fingers covering label:1.5), (fingers covering logo:1.5)" : "";

    // 8. Dynamic behavioral injection for Angle 0 (Hero)
    let finalAngleVariation = angleVariation;
    if (productAction === 'interaction' && angleIndex === 0) {
        finalAngleVariation += `
    ACTION: Active usage. IF [Product is Bottle/Beverage]: The person is elegantly pouring the liquid from the bottle into a suitable glass (wine glass, crystal tumbler, or cup). Include the glass in the scene.
    STATE: If the action involves contents, the CAP IS REMOVED.
    HANDS: Dynamic tension. Hand A supports, Hand B interacts with the target.`;
    }

    return `
/// GEMINI 2.5 FLASH: ADAPTIVE VERTICAL GENERATION ///
${ASPECT_RATIO_HEADER}

[TASK: Product Interaction & Lifestyle Photography]
- OBJECTIVE: Create a photorealistic 9:16 portrait of the person from IMAGE 1 interacting with the "${product.title}" from IMAGE 2.
- MODE: ${productAction === 'demonstrate' ? 'PRESENTATION (The Hero Shot)' : 'INTERACTION (Active Lifestyle Usage)'}
- CAMERA: Professional photography, sharp focus, 8k resolution.
- ANGLE: ${finalAngleVariation}
- CAMERA SETTING: ${cameraAngleDesc}.
- STYLING/MODEL: ${stylingLine || 'Natural appearance.'}

**CRITICAL: VERTICAL CANVAS FILL**
Generate a rich, immersive 9:16 scene that extends to all four edges of the frame.
The background must bleed into the boundaries of the vertical frame.
If generating background automatically, ensure it occupies 100% of the vertical canvas.

--- [USER OVERRIDES (STRICT COMPLIANCE)] ---
- PRODUCT: "${product.title}" (${category}).
- CAMERA ANGLE: ${cameraAngleDesc}.
- POSE CHARACTER: ${poseDesc}
- ${options.emotion && options.emotion !== 'auto' ? `FORCE EMOTION: ${options.emotion.toUpperCase()}` : ''}
- ${options.makeup && options.makeup !== 'auto' ? `FORCE MAKEUP/GROOMING: ${options.makeup.toUpperCase()}` : ''}
- ${options.eyewear && options.eyewear !== 'auto' ? `FORCE ACCESSORIES/EYEWEAR: ${options.eyewear.toUpperCase()}` : ''}
- ${options.jewelry && options.jewelry !== 'auto' ? `FORCE JEWELRY: ${options.jewelry.toUpperCase()}` : ''}
- ${productAction === 'interaction' ? 'FORCE ACTION: ACTIVE LIFESTYLE INTERACTION. The person must be actively using, applying, drinking, or operating the product naturally.' : 'FORCE ACTION: PROFESSIONAL PRESENTATION. The person holds the product clearly for the camera.'}

[STATE: THE BARRIER LAW]
If MODE is INTERACTION and product is a container (bottle, jar, tube):
- The cap/lid/top MUST be removed.
- The product must be OPEN.
- Never show a model "drinking" from a closed bottle or "applying" from a closed jar.

[CRITICAL OVERRIDE]: If any "FORCE" instruction above is specified, it MUST take precedence over the appearance in IMAGE ${identityIdx}. For example, if "FORCE ACCESSORIES/EYEWEAR: GLASSES" is set, the model MUST wear glasses even if they are not present in IMAGE ${identityIdx}.

--- INPUT DEFINITIONS (3-IMAGE COMPOSITE) ---
- IMAGE 1 (CLIENT IDENTITY REFERENCE): Provides the ABSOLUTE REFERENCE for the person's identity and face.
- IMAGE 2 (PRODUCT REFERENCE): This is the product "${product.title}" to be integrated into the scene.
- IMAGE 3 (SCENE REFERENCE): ${hasLocationImage ? `MASTER BACKGROUND IMAGE.` : `GENERATE A NEW BACKGROUND: "${locationPrompt || 'Elegant e-commerce studio background'}".`}

--- MASTER DIRECTIVES ---
1. ${distanceMandate}
2. IDENTITY LOCK: The person in the final image MUST be an identical match to IMAGE 1.
3. PRODUCT FIDELITY: The product MUST be an identical match to IMAGE 2. DO NOT HALLUCINATE TEXTURES.
4. TEXTURE & COLOR LOCK (PIXEL-PERFECT): You must transfer the EXACT fabric texture, material finish (e.g., leather, silk, denim), and color from the product image. DO NOT change the hue or saturation. Match the original shade to the pixel.
5. COMPOSITION: The person should be ${isSmall ? 'holding or interacting with the product in a close portrait frame' : 'the central hero of the full-body shot'}.
6. ${lightingPrompt}
7. NEGATIVE PROMPTS: ${baseNegative}${interactionNegative}.
8. COMPATIBILITY: NO black bars, NO letterboxing. Fill the 9:16 canvas. [ID: ${seed}]`.trim();
};

export const generateModelPrompt = (modelParams) => {
    // Map emotions
    const emotionDescriptions = {
        'neutral': 'neutral, calm expression',
        'smiling': 'warm, genuine smile',
        'laughing': 'joyful, natural laugh with visible happiness',
        'flirty': 'playful, confident expression with slight smile and engaging eye contact',
        'expressive': 'dynamic, animated expression showing strong emotion and personality'
    };

    // Map aesthetics
    const aestheticDescriptions = {
        'ugc-authentic': 'Authentic UGC style, natural lighting, candid feel, minimal retouching',
        'high-fashion': 'High-end editorial fashion, glossy finish, perfect lighting, professional retouching',
        'business-casual': 'Professional business casual look, clean and polished',
        'athleisure': 'Active and sporty lifestyle aesthetic, dynamic and energetic'
    };

    // Map makeup
    const makeupDescriptions = {
        'no-makeup': 'No makeup, completely natural bare skin look',
        'natural': 'Natural daily makeup, fresh face',
        'glam': 'Heavy glam makeup, bold features, evening look'
    };

    // Map height
    const heightDescriptions = {
        'short': 'Short / Petite height (approx 160cm)',
        'average': 'Average height (approx 170cm)',
        'tall': 'Tall model height (approx 180cm+)'
    };

    const emotionText = EMOTION_MAP[modelParams.emotion] || EMOTION_MAP['auto'];
    const aestheticText = aestheticDescriptions[modelParams.aesthetic] || aestheticDescriptions['ugc-authentic'];
    const makeupText = MAKEUP_MAP[modelParams.makeup] || MAKEUP_MAP['auto'];
    const heightText = heightDescriptions[modelParams.height] || heightDescriptions['average'];
    const poseDesc = POSE_MAP[modelParams.pose] || POSE_MAP['auto'];

    const accessoriesText = [];
    if (modelParams.eyewear === 'glasses') accessoriesText.push('wearing prescription glasses');
    if (modelParams.eyewear === 'sunglasses') accessoriesText.push('wearing stylish sunglasses');
    if (modelParams.jewelry === 'minimal') accessoriesText.push('wearing minimal delicate jewelry');
    if (modelParams.jewelry === 'statement') accessoriesText.push('wearing bold statement jewelry');
    const accessoriesString = accessoriesText.length > 0 ? `ACCESSORIES: ${accessoriesText.join(', ')}.` : '';

    const clothingDescription = modelParams.notes
        ? modelParams.notes
        : "The model is wearing a clean, crew-neck white t-shirt and simple, solid light-wash blue denim jeans. FOOTWEAR: Simple white sneakers.";

    const physicalFeatures = `${modelParams.hairColor} ${modelParams.hairLength} hair, ${modelParams.bodyType} body type, ${heightText}.`;

    return `
${ASPECT_RATIO_HEADER}
ROLE: Commercial Fashion Photographer.
TASK: Generate a high-resolution, photorealistic image of a single model for a catalog. 
      
--- MODEL IDENTITY ---
MODEL DESCRIPTION: ${modelParams.age} ${modelParams.ethnicity} ${modelParams.gender} model. 
PHYSICAL FEATURES: ${physicalFeatures}
STYLING: ${makeupText}. ${accessoriesString}
EMOTION / EXPRESSION: ${emotionText}.

--- AESTHETIC & VIBE ---
STYLE: ${aestheticText}.

--- UNIFORM ATTIRE ---
CLOTHING: ${clothingDescription}

--- COMPOSITION & LIGHTING ---
BACKGROUND: Seamless, professional white studio background.
POSE: ${poseDesc}
FRAMING: Full body shot.
LIGHTING: Clean, bright, Soft, Diffused Lighting (4500K). 

--- NEGATIVE PROMPTS ---
(landscape), (horizontal), (black bars), (letterbox), (padding), visible branding, tattoos, extra limbs.`.trim();
};

export const generateLocationPrompt = (locationParams) => {
    return `
${ASPECT_RATIO_HEADER}
Professional product photography background setup.
Style: ${locationParams.setting} setting with ${locationParams.lighting} lighting, ${locationParams.style} aesthetic.
Notes: ${locationParams.notes || 'None'}

IMPORTANT: This must be a PHOTOREALISTIC background, not an illustration or 3D render.
Requirements:
- Real photography of actual physical space
- Professional studio or location photography
- Natural lighting and shadows
- High-end commercial photography quality
- Shot on professional DSLR camera
- Empty background ready for product placement
- Sharp focus, high resolution 4K
- Clean, uncluttered composition

[NEGATIVE PROMPT]
(landscape), (horizontal), (black bars), (letterbox), (padding), (people), (hands), (skin), (products).
`.trim();
};

export const STILL_LIFE_ANGLE_PROMPTS = [
    'EYE-LEVEL FRONT VIEW: The camera is positioned directly in front of the product at eye-level. Perfectly balanced horizontal alignment.',
    'ELEVATED 45-DEGREE OVERHEAD VIEW: The camera is high, looking DOWN at the product from a 45-degree angle to show the top surfaces clearly.',
    'DRAMATIC LOW-ANGLE WORM-EYE VIEW: The camera is placed very low, looking UP at the product to give it a sense of grand scale and power.'
];

const normalizeCategory = (cat) => {
    const c = cat ? cat.toLowerCase() : 'general';
    if (c.includes('skincare') || c.includes('beauty') || c.includes('cosmet')) return 'skincare';
    if (c.includes('drink') || c.includes('beverag') || c.includes('bottle')) return 'drinks';
    if (c.includes('jewel') || c.includes('watch') || c.includes('access')) return 'jewelry';
    if (c.includes('food') || c.includes('snack') || c.includes('cook')) return 'food';
    return 'general';
};

export const getSmartLocationPrompt = (title, category) => {
    // Let Gemini decide the background based on product context
    return `Analyze the product "${title}" (category: ${category || 'general'}) and determine the most suitable real-world environment. For example: gym for activewear, beach for swimwear, street for casual, luxury interior for formal wear, kitchen for food items, etc. Generate a high-quality, contextually appropriate vertical background.`;
};

export const generateStillLifePrompt = (product, angleVariation, locationPrompt, seed, hasLocationImage = false) => {
    return `
${ASPECT_RATIO_HEADER}
[TASK: Professional Still Life Product Photography Shot]
- CAMERA: 8k DSLR, high resolution, photorealistic.
- ANGLE: ${angleVariation}
- LIGHTING: ${hasLocationImage ? 'Match Image 2' : (locationPrompt || 'Elegant studio lighting')}.
- PRODUCT: Place "${product.title}" carefully in the scene.
- MANDATE: Zero digital noise, high fidelity, 9:16 vertical composition. [SEED: ${seed}]
- VERSION: GEMINI 2.5 FLASH CORE.
`.trim();
};

export const generatePlacementPrompt = (params) => {
    const category = normalizeCategory(params.productCategory);
    const material = params.material || 'marble';
    const decor = params.decor || 'organic';
    const level = params.level || 'eye-level';
    const seed = params.seed || Math.floor(Math.random() * 1000000);

    const categoryContext = {
        'skincare': { vibe: 'minimalist and clean', bg: 'soft pastel or bright white', accent: 'glass reflections and water droplets' },
        'drinks': { vibe: 'vibrant and refreshing', bg: 'natural outdoor or modern bar', accent: 'ice cubes and fresh citrus slices' },
        'jewelry': { vibe: 'luxurious and high-contrast', bg: 'dark velvet or mirrors', accent: 'sharp highlights and bokeh flares' },
        'food': { vibe: 'warm and rustic', bg: 'wooden kitchen or linen textile', accent: 'herbs and scattered ingredients' },
        'general': { vibe: 'modern and professional', bg: 'soft-focus interior', accent: 'subtle lifestyle props' }
    }[category];

    const materialDesc = {
        'marble': 'a smooth, polished white marble pedestal with subtle grey veining',
        'wood': 'a natural light oak wooden platform with visible grain',
        'concrete': 'a minimalist raw concrete slab with industrial texture',
        'velvet': 'a luxurious soft velvet-covered jewelry stand',
        'glass': 'a clean frosted glass block with soft internal light',
        'botanical': 'a platform made of stacked tropical leaves',
        'sandstone': 'a rough-hewn natural sandstone block'
    }[material] || 'a professional display pedestal';

    const decorDesc = {
        'organic': 'pampas grass and smooth river stones',
        'minimalist': 'stark clean lines with no props',
        'luxury': 'gold accents and silk fabric',
        'floral': 'delicate petals and leaves',
        'nature': 'moss and weathered rocks',
        'seasonal': 'pine cones and seasonal elements',
        'industrial': 'wire mesh and metal accents'
    }[decor] || '';

    const viewDesc = {
        'eye-level': 'Eye-level professional product photography shot.',
        'top-down': 'Top-down flat lay perspective.',
        'macro': 'Macro close-up, focusing on the texture of the surface.'
    }[level] || 'Professional shot.';

    return `
${ASPECT_RATIO_HEADER}
[TASK: Background Asset Generation]
- OBJECTIVE: Generate an EMPTY background scene for product placement.
- NO PRODUCTS: The central focus is an EMPTY ${materialDesc}.
- NO HUMANS: Strictly no people, hands, or skin.
- CATEGORY VIBE: ${categoryContext.vibe}.
- DECOR: Surrounded by ${decorDesc}.
- COMPOSITION: ${viewDesc}
- ATMOSPHERE: ${categoryContext.bg}, 8k quality, sharp focus on the pedestal. [SEED: ${seed}]
`.trim();
};

export const generateAutoPlacementPrompt = (product, seed) => {
    const productInfo = `${product.title} ${product.category ? `(Category: ${product.category})` : ''}`.trim();

    return `
${ASPECT_RATIO_HEADER}
[TASK: Universal Smart Background Generation]
- OBJECTIVE: Generate a high-end, professionally styled background scene for product photography.
- CONTEXT: This background is being designed specifically for the product: "${productInfo}".
- NO PRODUCTS: The scene must be EMPTY. No products, hands, or people.
- SMART STYLE SELECTION: 
    1. Analyze the product "${productInfo}".
    2. Select the most aesthetically appropriate MATERIAL for the central display platform (e.g., polished marble for skincare, dark velvet or glass for luxury watches, rustic oak for wine/spirits, minimalist concrete for tech).
    3. Select an ENVIRONMENT that matches the product's vibe (e.g., sun-drenched minimalist studio, moody luxury boutique, natural outdoor setting, or a high-end bar/cellar).
- COMPOSITION: A professional eye-level shot. The central platform should be the hero, ready to host the product.
- ATMOSPHERE: Sophisticated lighting, sharp focus, 8k quality. Cinematic shadows and reflections that enhance the sense of depth. [SEED: ${seed}]
- RULES: No black bars, fill the 9:16 vertical frame completely.
`;
};