// Farming guide data for common crops
// Each crop has step-by-step farming instructions

export interface FarmingStep {
  step: number;
  title: string;
  description: string;
  duration?: string;
}

export interface FarmingGuide {
  cropName: string;
  overview: string;
  climate: string;
  soilPreparation: string;
  steps: FarmingStep[];
  tips: string[];
  harvestTime: string;
  expectedYield: string;
}

export const farmingGuides: Record<string, FarmingGuide> = {
  rice: {
    cropName: "Rice",
    overview: "Rice is a staple food crop that requires warm temperatures, plenty of water, and fertile soil. It's typically grown in flooded fields called paddies.",
    climate: "Tropical and subtropical climates with temperatures between 20-35°C. Requires high humidity and abundant water.",
    soilPreparation: "Clay or loamy soil with good water retention. pH level should be between 5.5-7.0. Field should be plowed and leveled.",
    harvestTime: "3-6 months depending on variety",
    expectedYield: "4-8 tons per hectare",
    steps: [
      { step: 1, title: "Land Preparation", description: "Plow the field to a depth of 15-20cm. Harrow and level the field to ensure even water distribution. Create bunds to hold water.", duration: "2-3 weeks before planting" },
      { step: 2, title: "Seed Selection & Treatment", description: "Choose high-quality, disease-resistant seeds. Soak seeds in water for 24 hours, then drain and keep in a warm place for 2-3 days until sprouts appear.", duration: "2-3 days" },
      { step: 3, title: "Nursery Preparation", description: "Prepare a raised nursery bed with fine soil. Sow sprouted seeds evenly and cover with a thin layer of soil. Keep the nursery moist.", duration: "15-20 days" },
      { step: 4, title: "Transplanting", description: "Transplant 15-20 day old seedlings to the main field. Maintain spacing of 20cm between rows and 15cm between plants. Keep 2-5cm of water in the field.", duration: "1 day" },
      { step: 5, title: "Water Management", description: "Maintain 5cm water level for the first 2 weeks, then increase to 10cm. Drain water 2 weeks before harvest to allow the field to dry.", duration: "Throughout growing season" },
      { step: 6, title: "Fertilizer Application", description: "Apply basal dose of NPK fertilizer at planting. Top dress with nitrogen fertilizer at tillering and panicle initiation stages.", duration: "Multiple applications" },
      { step: 7, title: "Weed & Pest Control", description: "Remove weeds manually or use herbicides. Monitor for pests like stem borer, leaf folder, and diseases like blast. Apply appropriate pesticides if needed.", duration: "As needed" },
      { step: 8, title: "Harvesting", description: "Harvest when 80-85% of grains are golden yellow. Cut the plants close to the ground using a sickle or mechanical harvester.", duration: "1-2 days" },
      { step: 9, title: "Threshing & Drying", description: "Separate grains from straw using a thresher. Dry the grains to 14% moisture content before storage.", duration: "2-3 days" }
    ],
    tips: [
      "Use certified seeds for better germination and yield",
      "Maintain proper water levels throughout the growing season",
      "Apply fertilizers in split doses for better nutrient uptake",
      "Practice integrated pest management to reduce chemical use",
      "Harvest at the right time to minimize grain loss"
    ]
  },

  wheat: {
    cropName: "Wheat",
    overview: "Wheat is a cool-season cereal grain that is widely cultivated for its edible seeds. It's one of the most important food crops globally.",
    climate: "Cool and dry climate with temperatures between 15-25°C. Requires moderate rainfall of 50-75cm.",
    soilPreparation: "Well-drained loamy or clay-loam soil with pH 6.0-7.5. Field should be deeply plowed and harrowed.",
    harvestTime: "4-5 months",
    expectedYield: "3-5 tons per hectare",
    steps: [
      { step: 1, title: "Land Preparation", description: "Plow the field 2-3 times to achieve fine tilth. Level the field and create drainage channels if needed.", duration: "2 weeks before planting" },
      { step: 2, title: "Seed Selection", description: "Select high-yielding, disease-resistant varieties. Use clean, certified seeds free from weeds and debris.", duration: "1 day" },
      { step: 3, title: "Sowing", description: "Sow seeds in rows 20-23cm apart at a depth of 4-5cm. Use seed rate of 100-125 kg per hectare. Optimum sowing time is October-November.", duration: "1-2 days" },
      { step: 4, title: "Irrigation", description: "First irrigation at 20-25 days after sowing (crown root initiation). Critical stages are tillering, jointing, flowering, and grain filling.", duration: "4-6 irrigations" },
      { step: 5, title: "Fertilizer Application", description: "Apply NPK @ 120:60:40 kg/ha. Full dose of P and K as basal, N in 3 split doses at sowing, first irrigation, and second irrigation.", duration: "Multiple applications" },
      { step: 6, title: "Weed Control", description: "First weeding at 20-25 days after sowing. Use herbicides like 2,4-D for broadleaf weeds. Keep the field weed-free during the first 6 weeks.", duration: "As needed" },
      { step: 7, title: "Pest & Disease Management", description: "Monitor for aphids, termites, and diseases like rust, smut, and powdery mildew. Apply appropriate fungicides and insecticides.", duration: "As needed" },
      { step: 8, title: "Harvesting", description: "Harvest when grains are hard and straw is dry and yellow. Cut the crop close to the ground using a sickle or combine harvester.", duration: "1-2 days" },
      { step: 9, title: "Threshing & Storage", description: "Thresh the harvested crop to separate grains. Dry grains to 12% moisture content. Store in clean, dry containers.", duration: "2-3 days" }
    ],
    tips: [
      "Sow at the right time for optimal yield",
      "Ensure proper seed treatment with fungicides",
      "Maintain proper plant population for maximum yield",
      "Irrigate at critical growth stages",
      "Practice crop rotation to maintain soil health"
    ]
  },

  corn: {
    cropName: "Corn (Maize)",
    overview: "Corn is a versatile cereal crop grown for food, feed, and industrial uses. It requires warm temperatures and adequate moisture.",
    climate: "Warm climate with temperatures between 18-30°C. Requires 50-80cm of well-distributed rainfall.",
    soilPreparation: "Well-drained, fertile loamy soil with pH 5.5-7.0. Rich in organic matter.",
    harvestTime: "3-4 months",
    expectedYield: "5-10 tons per hectare",
    steps: [
      { step: 1, title: "Land Preparation", description: "Plow the field to a depth of 20-25cm. Harrow to break clods and level the field. Create furrows for planting.", duration: "1-2 weeks before planting" },
      { step: 2, title: "Seed Selection & Treatment", description: "Choose hybrid seeds for higher yields. Treat seeds with fungicide and insecticide before planting.", duration: "1 day" },
      { step: 3, title: "Planting", description: "Plant seeds at a depth of 4-6cm. Spacing: 60-75cm between rows and 20-25cm between plants. Seed rate: 20-25 kg/ha.", duration: "1-2 days" },
      { step: 4, title: "Thinning", description: "Thin seedlings to maintain one healthy plant per hill when plants are 10-15cm tall.", duration: "10-15 days after planting" },
      { step: 5, title: "Fertilizer Application", description: "Apply NPK @ 120:60:40 kg/ha. Apply full P and K at planting. Apply N in 3 split doses at planting, knee-high stage, and tasseling.", duration: "Multiple applications" },
      { step: 6, title: "Irrigation", description: "Irrigate immediately after planting. Critical irrigation stages are knee-high, tasseling, and grain filling. Avoid waterlogging.", duration: "4-6 irrigations" },
      { step: 7, title: "Weed Control", description: "Keep the field weed-free during the first 6 weeks. Use pre-emergence herbicides and practice inter-cultivation.", duration: "As needed" },
      { step: 8, title: "Pest & Disease Management", description: "Monitor for corn borer, armyworm, and diseases like leaf blight and smut. Apply appropriate control measures.", duration: "As needed" },
      { step: 9, title: "Harvesting", description: "Harvest when husks turn brown and kernels are hard. For grain, harvest at 20-25% moisture. For silage, harvest at dough stage.", duration: "1-2 days" }
    ],
    tips: [
      "Use hybrid seeds for 20-30% higher yields",
      "Practice intercropping with legumes for better soil fertility",
      "Apply fertilizer based on soil test recommendations",
      "Scout regularly for pests and diseases",
      "Harvest at the right maturity for best quality"
    ]
  },

  soybean: {
    cropName: "Soybean",
    overview: "Soybean is an important legume crop grown for its protein-rich seeds and oil. It's a nitrogen-fixing crop that improves soil fertility.",
    climate: "Warm climate with temperatures between 20-30°C. Requires 40-60cm of well-distributed rainfall.",
    soilPreparation: "Well-drained loamy soil with pH 6.0-6.8. Avoid waterlogged conditions.",
    harvestTime: "3-4 months",
    expectedYield: "2-3 tons per hectare",
    steps: [
      { step: 1, title: "Land Preparation", description: "Plow and harrow the field to achieve fine tilth. Level the field properly for uniform irrigation.", duration: "1 week before planting" },
      { step: 2, title: "Seed Selection & Inoculation", description: "Select high-yielding varieties. Inoculate seeds with rhizobium culture for better nitrogen fixation.", duration: "1 day" },
      { step: 3, title: "Planting", description: "Sow seeds at a depth of 3-4cm. Spacing: 45cm between rows and 5cm between plants. Seed rate: 70-80 kg/ha.", duration: "1 day" },
      { step: 4, title: "Irrigation", description: "Irrigate immediately after sowing. Critical stages are flowering and pod filling. Avoid waterlogging.", duration: "3-4 irrigations" },
      { step: 5, title: "Fertilizer Application", description: "Apply basal dose of P and K fertilizers. Since soybean fixes nitrogen, minimal N fertilizer is needed. Apply gypsum for calcium.", duration: "At planting" },
      { step: 6, title: "Weed Control", description: "Keep the field weed-free during the first 4-5 weeks. Use pre-emergence herbicides and practice hand weeding.", duration: "As needed" },
      { step: 7, title: "Pest & Disease Management", description: "Monitor for pod borer, leaf miner, and diseases like rust and powdery mildew. Use integrated pest management.", duration: "As needed" },
      { step: 8, title: "Harvesting", description: "Harvest when leaves turn yellow and fall off, and pods turn brown. Cut plants close to the ground.", duration: "1-2 days" },
      { step: 9, title: "Threshing & Storage", description: "Thresh to separate seeds from pods. Dry seeds to 10% moisture content. Store in airtight containers.", duration: "2-3 days" }
    ],
    tips: [
      "Inoculate seeds with rhizobium for better nitrogen fixation",
      "Avoid planting in waterlogged soils",
      "Practice crop rotation with cereals",
      "Harvest at full maturity for maximum oil content",
      "Store seeds properly to prevent insect damage"
    ]
  },

  tomato: {
    cropName: "Tomato",
    overview: "Tomato is a popular vegetable crop grown for its nutritious fruits. It's suitable for both open field and protected cultivation.",
    climate: "Warm climate with temperatures between 18-25°C. Requires moderate humidity and plenty of sunlight.",
    soilPreparation: "Well-drained loamy soil rich in organic matter with pH 6.0-6.8.",
    harvestTime: "2-3 months after transplanting",
    expectedYield: "20-40 tons per hectare",
    steps: [
      { step: 1, title: "Nursery Preparation", description: "Prepare raised nursery beds with sterilized soil. Sow seeds thinly and cover with fine soil. Water regularly.", duration: "4-6 weeks before transplanting" },
      { step: 2, title: "Land Preparation", description: "Plow the field deeply and incorporate well-decomposed farmyard manure. Make raised beds and install drip irrigation.", duration: "2 weeks before transplanting" },
      { step: 3, title: "Transplanting", description: "Transplant 4-6 week old seedlings. Spacing: 60cm between rows and 45cm between plants. Transplant in the evening to reduce transplant shock.", duration: "1 day" },
      { step: 4, title: "Staking & Pruning", description: "Provide stakes for indeterminate varieties. Remove suckers regularly to maintain single or double stem system.", duration: "Throughout growing season" },
      { step: 5, title: "Irrigation", description: "Irrigate immediately after transplanting. Maintain consistent soil moisture. Use drip irrigation for water efficiency.", duration: "Regular irrigation" },
      { step: 6, title: "Fertilizer Application", description: "Apply balanced NPK fertilizer. Top dress with potassium during fruiting stage. Apply micronutrients as foliar spray.", duration: "Multiple applications" },
      { step: 7, title: "Weed Control", description: "Keep the field weed-free. Use black plastic mulch to suppress weeds and conserve moisture.", duration: "As needed" },
      { step: 8, title: "Pest & Disease Management", description: "Monitor for fruit borer, whitefly, and diseases like blight and wilt. Use neem-based pesticides and fungicides.", duration: "As needed" },
      { step: 9, title: "Harvesting", description: "Harvest fruits at mature green or red ripe stage depending on market requirements. Pick carefully to avoid bruising.", duration: "Multiple harvests over 2-3 months" }
    ],
    tips: [
      "Use disease-resistant varieties",
      "Practice crop rotation to prevent soil-borne diseases",
      "Mulching helps conserve moisture and control weeds",
      "Regular pruning improves fruit quality",
      "Harvest in the morning for better shelf life"
    ]
  },

  potato: {
    cropName: "Potato",
    overview: "Potato is a tuber crop that serves as a staple food in many regions. It's grown from seed tubers and requires cool temperatures.",
    climate: "Cool climate with temperatures between 15-20°C. Requires 50-75cm of well-distributed rainfall.",
    soilPreparation: "Well-drained sandy loam or loamy soil with pH 5.0-6.0. Rich in organic matter.",
    harvestTime: "3-4 months",
    expectedYield: "20-30 tons per hectare",
    steps: [
      { step: 1, title: "Seed Tuber Selection", description: "Select disease-free, medium-sized seed tubers. Cut larger tubers into pieces with 2-3 eyes each. Treat with fungicide.", duration: "1-2 days before planting" },
      { step: 2, title: "Land Preparation", description: "Plow the field deeply to loosen the soil. Form ridges 60-75cm apart. Incorporate organic manure.", duration: "1-2 weeks before planting" },
      { step: 3, title: "Planting", description: "Plant seed tuber pieces at a depth of 8-10cm on the ridges. Spacing: 20-25cm between plants. Seed rate: 2-2.5 tons/ha.", duration: "1-2 days" },
      { step: 4, title: "Earthing Up", description: "Earth up the plants when they are 15-20cm tall. Repeat earthing up after 2-3 weeks to cover developing tubers.", duration: "2-3 times during growth" },
      { step: 5, title: "Irrigation", description: "Irrigate immediately after planting. Maintain consistent soil moisture. Critical stages are stolon formation and tuber bulking.", duration: "6-8 irrigations" },
      { step: 6, title: "Fertilizer Application", description: "Apply NPK @ 120:80:100 kg/ha. Apply full dose at planting. Hill soil around plants during earthing up.", duration: "At planting and earthing up" },
      { step: 7, title: "Weed Control", description: "Keep the field weed-free during the first 6 weeks. Use herbicides and practice earthing up to control weeds.", duration: "As needed" },
      { step: 8, title: "Pest & Disease Management", description: "Monitor for aphids, cutworms, and diseases like late blight and early blight. Apply appropriate fungicides and insecticides.", duration: "As needed" },
      { step: 9, title: "Harvesting", description: "Harvest when vines turn yellow and dry. Cut vines 1-2 weeks before harvest. Dig carefully to avoid tuber damage.", duration: "1-2 days" },
      { step: 10, title: "Curing & Storage", description: "Cure tubers at 15-20°C for 10-14 days. Store in cool, dark, well-ventilated place at 4-8°C.", duration: "2 weeks curing + storage" }
    ],
    tips: [
      "Use certified disease-free seed tubers",
      "Practice crop rotation with non-solanaceous crops",
      "Avoid waterlogging which causes tuber rot",
      "Harvest carefully to minimize tuber damage",
      "Store in dark place to prevent greening"
    ]
  },

  cotton: {
    cropName: "Cotton",
    overview: "Cotton is an important fiber crop grown for its soft, fluffy fibers used in textile industry. It requires warm temperatures and a long growing season.",
    climate: "Hot climate with temperatures between 21-30°C. Requires 50-100cm of rainfall with dry weather during harvesting.",
    soilPreparation: "Well-drained deep loamy or black soil with pH 6.0-8.0. Good water retention capacity.",
    harvestTime: "5-7 months",
    expectedYield: "2-4 tons per hectare (seed cotton)",
    steps: [
      { step: 1, title: "Land Preparation", description: "Plow the field deeply 2-3 times. Harrow to achieve fine tilth. Form ridges and furrows for irrigation.", duration: "2-3 weeks before planting" },
      { step: 2, title: "Seed Selection & Treatment", description: "Select high-yielding hybrid or Bt cotton varieties. Treat seeds with fungicide and insecticide.", duration: "1 day" },
      { step: 3, title: "Planting", description: "Sow seeds on ridges at a depth of 3-4cm. Spacing: 90cm between rows and 60cm between plants. Seed rate: 3-5 kg/ha.", duration: "1-2 days" },
      { step: 4, title: "Thinning & Gap Filling", description: "Thin seedlings to maintain 2 plants per hill. Fill gaps by transplanting spare seedlings.", duration: "10-15 days after sowing" },
      { step: 5, title: "Irrigation", description: "First irrigation at 3-4 weeks after sowing. Critical stages are flowering and boll formation. Stop irrigation 2 weeks before picking.", duration: "6-8 irrigations" },
      { step: 6, title: "Fertilizer Application", description: "Apply NPK @ 120:60:60 kg/ha. Apply in 3-4 split doses. Apply micronutrients as foliar spray.", duration: "Multiple applications" },
      { step: 7, title: "Weed Control", description: "Keep the field weed-free during the first 6-8 weeks. Use herbicides and practice inter-cultivation.", duration: "As needed" },
      { step: 8, title: "Pest & Disease Management", description: "Monitor for bollworm, aphids, whitefly, and diseases like leaf curl and bacterial blight. Use integrated pest management.", duration: "As needed" },
      { step: 9, title: "Harvesting", description: "Pick cotton when bolls burst open and fibers are fluffy. Pick in 3-4 rounds at 10-15 day intervals. Pick during dry weather.", duration: "Multiple pickings over 1-2 months" }
    ],
    tips: [
      "Use Bt cotton hybrids for bollworm resistance",
      "Practice intercropping with pulses for additional income",
      "Monitor pest populations regularly",
      "Pick cotton during dry weather for better quality",
      "Store picked cotton in dry place to prevent moisture absorption"
    ]
  },

  sugarcane: {
    cropName: "Sugarcane",
    overview: "Sugarcane is a tall perennial grass grown for its sweet juice used in sugar production. It's a long-duration crop requiring warm, humid climate.",
    climate: "Hot and humid climate with temperatures between 20-30°C. Requires 150-250cm of well-distributed rainfall.",
    soilPreparation: "Deep, well-drained loamy soil with pH 6.0-7.5. Rich in organic matter and nutrients.",
    harvestTime: "10-18 months",
    expectedYield: "60-100 tons per hectare",
    steps: [
      { step: 1, title: "Land Preparation", description: "Plow the field deeply 3-4 times. Create furrows 90-120cm apart and 15-20cm deep. Incorporate organic manure.", duration: "3-4 weeks before planting" },
      { step: 2, title: "Sett Selection & Treatment", description: "Select healthy, disease-free cane tops as setts. Each sett should have 3-4 buds. Treat with hot water and fungicide.", duration: "1 day" },
      { step: 3, title: "Planting", description: "Plant setts horizontally in furrows. Cover with 5cm of soil. Seed rate: 8-10 tons/ha. Optimum planting time is February-March.", duration: "1-2 days" },
      { step: 4, title: "Gap Filling", description: "Fill gaps with sprouted setts within 30 days of planting to maintain uniform stand.", duration: "30 days after planting" },
      { step: 5, title: "Earthing Up", description: "First earthing up at 3-4 months. Second earthing up at 6 months with high ridging to support tall canes.", duration: "2 times" },
      { step: 6, title: "Irrigation", description: "Irrigate immediately after planting. Critical stages are tillering and grand growth phase. Reduce irrigation during ripening.", duration: "Regular irrigation" },
      { step: 7, title: "Fertilizer Application", description: "Apply NPK @ 250:60:60 kg/ha. Apply N in 3-4 split doses. Apply full P and K at planting.", duration: "Multiple applications" },
      { step: 8, title: "Weed Control", description: "Keep the field weed-free during the first 4 months. Use herbicides and practice inter-cultivation.", duration: "As needed" },
      { step: 9, title: "Pest & Disease Management", description: "Monitor for stem borer, white grub, and diseases like red rot and smut. Use resistant varieties and appropriate control measures.", duration: "As needed" },
      { step: 10, title: "Harvesting", description: "Harvest when canes are mature (10-18 months). Cut canes close to the ground. Remove green tops. Transport to mill within 24 hours.", duration: "1-2 weeks" }
    ],
    tips: [
      "Use disease-free setts for better germination",
      "Practice trash mulching to conserve moisture",
      "Apply adequate irrigation during grand growth phase",
      "Harvest at optimum maturity for maximum sugar recovery",
      "Practice ratoon cropping for 2-3 cycles"
    ]
  }
};

// Function to get farming guide by crop name
export function getFarmingGuide(cropName: string): FarmingGuide | null {
  const normalizedName = cropName.toLowerCase().trim();
  
  // Direct match
  if (farmingGuides[normalizedName]) {
    return farmingGuides[normalizedName];
  }
  
  // Partial match
  for (const key of Object.keys(farmingGuides)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return farmingGuides[key];
    }
  }
  
  // Return a generic guide if no match found
  return null;
}

// Function to get all available crop names
export function getAvailableCrops(): string[] {
  return Object.values(farmingGuides).map(guide => guide.cropName);
}