"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFarmingGuide = exports.generateLocationCropRecommendations = exports.generateCropRecommendations = void 0;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const fetchCropImage = async (cropName) => {
    const pexilApiKey = process.env.PEXIL_API_KEY;
    if (!pexilApiKey) {
        return getWikimediaCropImage(cropName);
    }
    try {
        const query = encodeURIComponent(`${cropName} plant agriculture farm`);
        const response = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=1&page=1`, {
            headers: {
                'Authorization': pexilApiKey,
            }
        });
        if (!response.ok) {
            console.warn(`Pexels API request failed for ${cropName}: ${response.status}`);
            return getWikimediaCropImage(cropName);
        }
        const data = await response.json();
        if (data.photos && data.photos.length > 0) {
            const photo = data.photos[0];
            return {
                image_url: photo.src?.medium || photo.src?.large,
                image_alt: photo.alt || cropName
            };
        }
        return getWikimediaCropImage(cropName);
    }
    catch (error) {
        console.error(`Error fetching image for ${cropName}:`, error);
        return getWikimediaCropImage(cropName);
    }
};
// Fallback to Wikimedia Commons for crop images
const getWikimediaCropImage = (cropName) => {
    const normalizedName = cropName.toLowerCase().trim();
    // Wikimedia Commons images (public domain/CC licensed)
    const wikimediaImages = {
        rice: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Rice_grains_%28white_and_brown%29_%2801%29.jpg/320px-Rice_grains_%28white_and_brown%29_%2801%29.jpg',
            alt: 'Rice grains'
        },
        wheat: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Wheat_field.jpg/320px-Wheat_field.jpg',
            alt: 'Wheat field'
        },
        corn: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Corn_kernel.jpg/320px-Corn_kernel.jpg',
            alt: 'Corn kernels'
        },
        maize: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Corn_kernel.jpg/320px-Corn_kernel.jpg',
            alt: 'Maize kernels'
        },
        soybean: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Soybean_usda.jpg/320px-Soybean_usda.jpg',
            alt: 'Soybean pods'
        },
        tomato: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/320px-Tomato_je.jpg',
            alt: 'Fresh tomatoes'
        },
        tomatoes: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/320px-Tomato_je.jpg',
            alt: 'Fresh tomatoes'
        },
        potato: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Patates.jpg/320px-Patates.jpg',
            alt: 'Potatoes'
        },
        cotton: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Cotton_field_outside_Helena_AR.jpg/320px-Cotton_field_outside_Helena_AR.jpg',
            alt: 'Cotton field'
        },
        sugarcane: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saccharum_officinarum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-267.jpg/320px-Saccharum_officinarum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-267.jpg',
            alt: 'Sugarcane plant'
        },
        carrot: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Carrot_01.jpg/320px-Carrot_01.jpg',
            alt: 'Fresh carrots'
        },
        carrots: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Carrot_01.jpg/320px-Carrot_01.jpg',
            alt: 'Fresh carrots'
        },
        lettuce: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Lactuca_sativa_var._longifolia_01.jpg/320px-Lactuca_sativa_var._longifolia_01.jpg',
            alt: 'Fresh lettuce'
        },
        cabbage: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/White_cabbage_01.jpg/320px-White_cabbage_01.jpg',
            alt: 'White cabbage'
        },
        onion: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Onion_with_cross_section_02.jpg/320px-Onion_with_cross_section_02.jpg',
            alt: 'Fresh onions'
        },
        garlic: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Garlic_02.jpg/320px-Garlic_02.jpg',
            alt: 'Fresh garlic'
        },
        pepper: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Paprika_pictures.jpg/320px-Paprika_pictures.jpg',
            alt: 'Bell peppers'
        },
        cucumber: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Cucumis_sativus_01.jpg/320px-Cucumis_sativus_01.jpg',
            alt: 'Fresh cucumbers'
        },
        spinach: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Spinacia_oleracea_01.jpg/320px-Spinacia_oleracea_01.jpg',
            alt: 'Fresh spinach'
        },
        bean: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Green_beans_01.jpg/320px-Green_beans_01.jpg',
            alt: 'Green beans'
        },
        pea: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Pea_pods_01.jpg/320px-Pea_pods_01.jpg',
            alt: 'Pea pods'
        },
        sunflower: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Sunflower_sky_backdrop_Kirtipur_Nepal.jpg/320px-Sunflower_sky_backdrop_Kirtipur_Nepal.jpg',
            alt: 'Sunflower field'
        },
        coffee: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Coffea_arabica_fruits_01.jpg/320px-Coffea_arabica_fruits_01.jpg',
            alt: 'Coffee beans'
        },
        tea: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Camellia_sinensis_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-026.jpg/320px-Camellia_sinensis_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-026.jpg',
            alt: 'Tea leaves'
        },
        default: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Plant_cell_wall.svg/320px-Plant_cell_wall.svg.png',
            alt: 'Crop plant'
        }
    };
    // Direct match
    if (wikimediaImages[normalizedName]) {
        const img = wikimediaImages[normalizedName];
        return { image_url: img.url, image_alt: img.alt };
    }
    // Check for partial matches (singular/plural)
    for (const [key, value] of Object.entries(wikimediaImages)) {
        if (key !== 'default' && (normalizedName.includes(key) || key.includes(normalizedName))) {
            return { image_url: value.url, image_alt: value.alt };
        }
    }
    return { image_url: wikimediaImages.default.url, image_alt: wikimediaImages.default.alt };
};
const generateCropRecommendations = async (soilData) => {
    const locationLabel = soilData.city ? `${soilData.city}, ${soilData.province}, ${soilData.country}` : '';
    const locationPromptLine = locationLabel ? `Location: ${locationLabel}` : '';
    const prompt = `Based on the following soil conditions, recommend 3 suitable crops for farming:

${locationPromptLine}
Soil pH: ${soilData.ph}
Moisture level: ${soilData.moisture}%
Temperature: ${soilData.temperature}°C
Sunlight hours per day: ${soilData.sunlight_hours}
Soil type: ${soilData.soil_type}

For each crop, provide:
1. Crop name
2. Reason why it's suitable
3. Best planting month
4. Care tips

Format as JSON array of objects with keys: crop_name, reason, planting_month, care_tips. Return ONLY the JSON array, no other text.`;
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 1024
            })
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content;
        if (!aiResponse)
            throw new Error('No response from AI');
        const parsed = JSON.parse(aiResponse);
        const recommendations = Array.isArray(parsed) ? parsed : [];
        const recommendationsWithImages = await Promise.all(recommendations.map(async (rec) => {
            const imageData = await fetchCropImage(rec.crop_name);
            return { ...rec, ...imageData };
        }));
        return recommendationsWithImages;
    }
    catch (error) {
        console.error('Error generating crop recommendations:', error);
        const fallbackCrops = [
            { crop_name: 'Tomatoes', reason: 'Adaptable to various soil conditions', planting_month: 'March-April', care_tips: 'Regular watering, support with stakes' },
            { crop_name: 'Lettuce', reason: 'Grows well in moderate conditions', planting_month: 'February-May', care_tips: 'Keep soil moist, harvest young leaves' },
            { crop_name: 'Carrots', reason: 'Suitable for well-drained soil', planting_month: 'March-May', care_tips: 'Thin seedlings, keep weed-free' }
        ];
        return await Promise.all(fallbackCrops.map(async (rec) => {
            const imageData = await fetchCropImage(rec.crop_name);
            return { ...rec, ...imageData };
        }));
    }
};
exports.generateCropRecommendations = generateCropRecommendations;
const generateLocationCropRecommendations = async (locationData) => {
    const locationLabel = `${locationData.city}, ${locationData.province}, ${locationData.country}`;
    const prompt = `Recommend 3 suitable crops for farming in this location:

Location: ${locationLabel}

For each crop, provide:
1. Crop name
2. Reason why it's suitable for this location's climate and farming patterns
3. Best planting month for this location
4. Care tips for this local climate

Format as JSON array of objects with keys: crop_name, reason, planting_month, care_tips. Return ONLY the JSON array, no other text.`;
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 1024
            })
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content;
        if (!aiResponse)
            throw new Error('No response from AI');
        const parsed = JSON.parse(extractJsonBlock(aiResponse));
        const recommendations = Array.isArray(parsed) ? parsed : [];
        return await Promise.all(recommendations.map(async (rec) => {
            const imageData = await fetchCropImage(rec.crop_name);
            return { ...rec, ...imageData };
        }));
    }
    catch (error) {
        console.error('Error generating location crop recommendations:', error);
        const fallbackCrops = getLocationFallbackCrops(locationData);
        return await Promise.all(fallbackCrops.map(async (rec) => {
            const imageData = await fetchCropImage(rec.crop_name);
            return { ...rec, ...imageData };
        }));
    }
};
exports.generateLocationCropRecommendations = generateLocationCropRecommendations;
function getLocationFallbackCrops(locationData) {
    const place = `${locationData.country} ${locationData.province} ${locationData.city}`.toLowerCase();
    if (place.includes('benguet') || place.includes('baguio') || place.includes('tagaytay')) {
        return [
            { crop_name: 'Lettuce', reason: `Cooler highland conditions in ${locationData.city} are suitable for leafy vegetables.`, planting_month: 'October-February', care_tips: 'Keep beds evenly moist, use compost, and protect young plants from heavy rain.' },
            { crop_name: 'Cabbage', reason: `Cabbage performs well in cooler upland areas like ${locationData.province}.`, planting_month: 'September-January', care_tips: 'Space plants well, monitor for diamondback moth, and avoid waterlogging.' },
            { crop_name: 'Carrots', reason: `Carrots fit cooler locations with loose, well-drained soil and moderate sunlight.`, planting_month: 'October-February', care_tips: 'Prepare deep fine soil, thin seedlings early, and keep weeds controlled.' },
        ];
    }
    if (place.includes('philippines') || place.includes('davao') || place.includes('laguna') || place.includes('bulacan') || place.includes('nueva ecija') || place.includes('pangasinan')) {
        return [
            { crop_name: 'Rice', reason: `${locationData.city} has tropical growing conditions where rice is commonly suited, especially when irrigation or rainy-season moisture is available.`, planting_month: 'June-August', care_tips: 'Maintain water levels, use locally adapted seed, and monitor for stem borers and blast.' },
            { crop_name: 'Corn', reason: `Corn grows well in warm Philippine lowland areas with enough sun and moderate soil moisture.`, planting_month: 'May-July', care_tips: 'Plant after reliable rain starts, fertilize by growth stage, and keep fields weed-free early.' },
            { crop_name: 'Tomatoes', reason: `Tomatoes are suitable for warm local markets when planted in a drier window with good drainage.`, planting_month: 'October-February', care_tips: 'Stake plants, avoid overhead watering, and scout for bacterial wilt and leaf diseases.' },
        ];
    }
    if (place.includes('california')) {
        return [
            { crop_name: 'Tomatoes', reason: `${locationData.city} can support warm-season tomatoes when irrigation is available and soil drains well.`, planting_month: 'March-May', care_tips: 'Use drip irrigation, mulch, and monitor for heat stress during peak summer.' },
            { crop_name: 'Lettuce', reason: `Lettuce fits California's cooler planting windows and moderate soil conditions.`, planting_month: 'September-November', care_tips: 'Plant in cool weather, keep moisture even, and harvest before heat causes bolting.' },
            { crop_name: 'Garlic', reason: `Garlic suits mild winters and can grow well in fertile loamy soil.`, planting_month: 'October-November', care_tips: 'Plant cloves in well-drained beds and reduce watering near maturity.' },
        ];
    }
    if (place.includes('iowa')) {
        return [
            { crop_name: 'Corn', reason: `${locationData.province} is well suited to corn during the warm growing season with full sun.`, planting_month: 'April-May', care_tips: 'Plant after frost risk, manage nitrogen carefully, and scout for weeds early.' },
            { crop_name: 'Soybean', reason: `Soybeans fit warm summers and can tolerate a range of well-drained soils.`, planting_month: 'May-June', care_tips: 'Use inoculated seed where needed and monitor for aphids and foliar disease.' },
            { crop_name: 'Wheat', reason: `Wheat can fit crop rotations where seasonal timing and drainage are managed well.`, planting_month: 'September-October', care_tips: 'Choose locally adapted varieties and avoid nitrogen excess before winter.' },
        ];
    }
    if (place.includes('india') || place.includes('punjab') || place.includes('maharashtra') || place.includes('west bengal')) {
        return [
            { crop_name: 'Rice', reason: `${locationData.city} can support rice where monsoon rainfall or irrigation is available.`, planting_month: 'June-July', care_tips: 'Use suitable local varieties, manage standing water, and monitor for blast.' },
            { crop_name: 'Wheat', reason: `Wheat is suitable for cooler dry-season planting in many Indian farming regions.`, planting_month: 'November-December', care_tips: 'Irrigate at crown root initiation and grain filling, and manage rust early.' },
            { crop_name: 'Soybean', reason: `Soybean fits warm monsoon conditions and well-drained soil.`, planting_month: 'June-July', care_tips: 'Avoid waterlogging, use treated seed, and control weeds during early growth.' },
        ];
    }
    return [
        { crop_name: 'Tomatoes', reason: `Adaptable to the selected conditions in ${locationData.city} when planted in a suitable local season.`, planting_month: 'Use local dry or mild season', care_tips: 'Provide steady watering, good drainage, and support with stakes.' },
        { crop_name: 'Lettuce', reason: `Grows well in moderate conditions and can be adjusted to cooler local planting windows.`, planting_month: 'Use local cool season', care_tips: 'Keep soil moist and harvest young leaves before heat stress.' },
        { crop_name: 'Carrots', reason: `Suitable for loose, well-drained soil with moderate moisture.`, planting_month: 'Use local cool season', care_tips: 'Thin seedlings, keep weed-free, and avoid compacted soil.' },
    ];
}
function extractJsonBlock(content) {
    const trimmed = content.trim();
    if (trimmed.startsWith("```")) {
        const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    return trimmed;
}
function normalizeFarmingGuide(raw, cropName) {
    const parsed = (raw ?? {});
    const steps = Array.isArray(parsed.steps)
        ? parsed.steps
            .map((step, index) => ({
            step: typeof step.step === 'number' ? step.step : index + 1,
            title: typeof step.title === 'string' && step.title.trim() ? step.title.trim() : `Step ${index + 1}`,
            description: typeof step.description === 'string' && step.description.trim()
                ? step.description.trim()
                : 'Follow recommended best practices for this stage.',
            duration: typeof step.duration === 'string' && step.duration.trim() ? step.duration.trim() : undefined,
        }))
            .slice(0, 8)
        : [];
    const tips = Array.isArray(parsed.tips)
        ? parsed.tips.filter((tip) => typeof tip === 'string' && tip.trim().length > 0).slice(0, 5)
        : [];
    return {
        cropName: typeof parsed.cropName === 'string' && parsed.cropName.trim() ? parsed.cropName.trim() : cropName,
        overview: typeof parsed.overview === 'string' && parsed.overview.trim()
            ? parsed.overview.trim()
            : `${cropName} can perform well when managed carefully for local weather, soil, and irrigation conditions.`,
        climate: typeof parsed.climate === 'string' && parsed.climate.trim()
            ? parsed.climate.trim()
            : `Match ${cropName} production to the local temperature, rainfall, and sunlight pattern in your area.`,
        soilPreparation: typeof parsed.soilPreparation === 'string' && parsed.soilPreparation.trim()
            ? parsed.soilPreparation.trim()
            : `Prepare a clean, well-drained seedbed with enough organic matter and balanced nutrients before planting ${cropName}.`,
        steps: steps.length > 0
            ? steps
            : [
                {
                    step: 1,
                    title: 'Prepare the field',
                    description: `Clear weeds, improve drainage, and prepare the soil before planting ${cropName}.`,
                },
                {
                    step: 2,
                    title: 'Plant at the right time',
                    description: `Use healthy planting material and follow spacing that fits ${cropName} and your local climate.`,
                },
                {
                    step: 3,
                    title: 'Manage water and nutrients',
                    description: `Monitor irrigation, fertilization, and early crop growth so ${cropName} establishes evenly.`,
                },
                {
                    step: 4,
                    title: 'Monitor pests and diseases',
                    description: `Scout regularly and act early if you see stress, nutrient issues, pests, or disease pressure.`,
                },
                {
                    step: 5,
                    title: 'Harvest at maturity',
                    description: `Harvest ${cropName} at the right maturity stage to protect yield and quality.`,
                },
            ],
        tips: tips.length > 0
            ? tips
            : [
                'Check soil moisture often and avoid overwatering.',
                'Use clean seed or planting material from a reliable source.',
                'Scout the crop weekly for pests, disease, and nutrient stress.',
            ],
        harvestTime: typeof parsed.harvestTime === 'string' && parsed.harvestTime.trim()
            ? parsed.harvestTime.trim()
            : 'Depends on variety and local conditions',
        expectedYield: typeof parsed.expectedYield === 'string' && parsed.expectedYield.trim()
            ? parsed.expectedYield.trim()
            : 'Varies by management, variety, and climate',
    };
}
const generateFarmingGuide = async (cropName, context) => {
    const prompt = `Create a practical farming guide for ${cropName}.

Context:
- Why recommended: ${context?.reason || 'Not provided'}
- Suggested planting month: ${context?.plantingMonth || 'Use best local planting window'}
- Existing care tip: ${context?.careTips || 'Not provided'}

Return ONLY valid JSON with this exact shape:
{
  "cropName": "string",
  "overview": "string",
  "climate": "string",
  "soilPreparation": "string",
  "harvestTime": "string",
  "expectedYield": "string",
  "steps": [
    { "step": 1, "title": "string", "description": "string", "duration": "string optional" }
  ],
  "tips": ["string"]
}

Requirements:
- Give 5 to 8 detailed steps.
- Keep advice practical for small to medium farmers.
- Mention irrigation, nutrients, and pest or disease monitoring where relevant.
- Do not include markdown or explanation outside the JSON.`;
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.4,
                max_tokens: 1400
            })
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content;
        if (!aiResponse) {
            throw new Error('No response from AI');
        }
        const parsed = JSON.parse(extractJsonBlock(aiResponse));
        return normalizeFarmingGuide(parsed, cropName);
    }
    catch (error) {
        console.error('Error generating farming guide:', error);
        return normalizeFarmingGuide({
            cropName,
            overview: `${cropName} was recommended for your conditions. Use local weather, water availability, and soil performance to fine-tune production decisions.`,
            climate: `Grow ${cropName} in the most suitable local season and avoid planting when temperature or rainfall extremes are expected.`,
            soilPreparation: `Prepare loose, fertile soil for ${cropName}, add organic matter if available, and correct drainage or compaction issues before planting.`,
            harvestTime: 'Depends on local variety and growing conditions',
            expectedYield: 'Depends on variety, climate, and farm management',
            steps: [
                {
                    step: 1,
                    title: 'Prepare land and inputs',
                    description: `Clean the field, gather seed or planting material, and prepare the land before starting ${cropName} production.`,
                },
                {
                    step: 2,
                    title: 'Plant during the correct window',
                    description: `Plant ${cropName} in the best local season and follow spacing suited to your field conditions.`,
                    duration: context?.plantingMonth,
                },
                {
                    step: 3,
                    title: 'Manage irrigation and nutrition',
                    description: `Keep moisture consistent, avoid stress, and apply nutrients based on crop stage and soil condition.`,
                },
                {
                    step: 4,
                    title: 'Scout and protect the crop',
                    description: `Check weekly for weeds, pests, diseases, and nutrient deficiencies so problems are handled early.`,
                },
                {
                    step: 5,
                    title: 'Harvest and handle carefully',
                    description: `Harvest at the proper maturity stage and handle produce carefully to maintain quality and reduce losses.`,
                },
            ],
            tips: [
                context?.careTips || `Adjust care for ${cropName} based on actual field performance.`,
                'Use clean water and planting materials whenever possible.',
                'Track crop growth weekly so you can respond early to problems.',
            ],
        }, cropName);
    }
};
exports.generateFarmingGuide = generateFarmingGuide;
//# sourceMappingURL=cropService.js.map