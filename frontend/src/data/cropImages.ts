// Crop image mappings using reliable sources
// Images are sourced from Wikimedia Commons (public domain/CC licensed)

export interface CropImageInfo {
  url: string;
  alt: string;
  source: string;
}

// High-quality crop images from Wikimedia Commons
export const cropImages: Record<string, CropImageInfo> = {
  rice: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Rice_grains_%28white_and_brown%29_%2801%29.jpg/640px-Rice_grains_%28white_and_brown%29_%2801%29.jpg",
    alt: "Rice grains",
    source: "Wikimedia Commons"
  },
  wheat: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Wheat_field.jpg/640px-Wheat_field.jpg",
    alt: "Wheat field",
    source: "Wikimedia Commons"
  },
  corn: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Corn_kernel.jpg/640px-Corn_kernel.jpg",
    alt: "Corn kernels",
    source: "Wikimedia Commons"
  },
  maize: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Corn_kernel.jpg/640px-Corn_kernel.jpg",
    alt: "Maize kernels",
    source: "Wikimedia Commons"
  },
  soybean: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Soybean_usda.jpg/640px-Soybean_usda.jpg",
    alt: "Soybean pods",
    source: "Wikimedia Commons"
  },
  tomato: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/640px-Tomato_je.jpg",
    alt: "Fresh tomatoes",
    source: "Wikimedia Commons"
  },
  potato: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Patates.jpg/640px-Patates.jpg",
    alt: "Potatoes",
    source: "Wikimedia Commons"
  },
  cotton: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Cotton_field_outside_Helena_AR.jpg/640px-Cotton_field_outside_Helena_AR.jpg",
    alt: "Cotton field",
    source: "Wikimedia Commons"
  },
  sugarcane: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saccharum_officinarum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-267.jpg/640px-Saccharum_officinarum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-267.jpg",
    alt: "Sugarcane plant",
    source: "Wikimedia Commons"
  },
  // Default fallback image
  default: {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Plant_cell_wall.svg/640px-Plant_cell_wall.svg.png",
    alt: "Crop plant",
    source: "Wikimedia Commons"
  }
};

// Get crop image by crop name
export function getCropImage(cropName: string): CropImageInfo {
  const normalizedName = cropName.toLowerCase().trim();
  
  // Direct match
  if (cropImages[normalizedName]) {
    return cropImages[normalizedName];
  }
  
  // Partial match
  for (const key of Object.keys(cropImages)) {
    if (key !== 'default' && (normalizedName.includes(key) || key.includes(normalizedName))) {
      return cropImages[key];
    }
  }
  
  // Return default image
  return cropImages.default;
}

// Preload images for better performance
export function preloadCropImages(cropNames: string[]): void {
  cropNames.forEach(cropName => {
    const imageInfo = getCropImage(cropName);
    const img = new Image();
    img.src = imageInfo.url;
  });
}