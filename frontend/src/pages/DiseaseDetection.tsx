import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  Upload, 
  X, 
  Sparkles, 
  AlertTriangle, 
  RotateCcw, 
  Zap, 
  Image as ImageIcon,
  Trash2,
  CheckCircle,
  Loader2,
  Info
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { api, type DiseaseResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import diseaseImg from "@/assets/disease-detect.png";

interface ImageQuality {
  sharpness: number;
  brightness: number;
  contrast: number;
  isBlurred: boolean;
  score: number;
}

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  quality: ImageQuality | null;
  enhanced: boolean;
  enhancedPreview?: string;
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function DiseaseDetection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate image quality metrics
  const analyzeImageQuality = useCallback((img: HTMLImageElement): ImageQuality => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { sharpness: 0, brightness: 0, contrast: 0, isBlurred: true, score: 0 };

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate brightness
    let brightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }
    brightness /= (data.length / 4);
    brightness /= 255;

    // Calculate contrast (standard deviation)
    let contrast = 0;
    const mean = brightness * 255;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      contrast += (gray - mean) * (gray - mean);
    }
    contrast = Math.sqrt(contrast / (data.length / 4)) / 255;

    // Calculate sharpness using Laplacian variance
    const grayData = new Uint8Array(data.length / 4);
    for (let i = 0; i < data.length; i += 4) {
      grayData[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }

    let laplacianSum = 0;
    let laplacianCount = 0;
    const width = canvas.width;
    const height = canvas.height;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const laplacian = 
          -grayData[idx - width - 1] - grayData[idx - width] - grayData[idx - width + 1]
          - grayData[idx - 1] + 8 * grayData[idx] - grayData[idx + 1]
          - grayData[idx + width - 1] - grayData[idx + width] - grayData[idx + width + 1];
        laplacianSum += laplacian * laplacian;
        laplacianCount++;
      }
    }

    const sharpness = Math.sqrt(laplacianSum / laplacianCount);
    const isBlurred = sharpness < 15;

    // Overall quality score (0-100)
    const score = Math.min(100, Math.max(0, 
      (sharpness / 50) * 40 + 
      (contrast > 0.1 ? Math.min(contrast / 0.3, 1) : contrast / 0.1) * 30 + 
      (brightness > 0.2 && brightness < 0.8 ? 1 : Math.max(0, 1 - Math.abs(brightness - 0.5) * 2)) * 30
    ) * 100);

    return {
      sharpness,
      brightness,
      contrast,
      isBlurred,
      score: Math.round(score)
    };
  }, []);

  // Apply image enhancement
  const enhanceImage = useCallback((sourceImg: HTMLImageElement, options: { sharpen: boolean; contrast: boolean; brightness: boolean } = { sharpen: true, contrast: true, brightness: true }): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = sourceImg.naturalWidth;
    canvas.height = sourceImg.naturalHeight;

    // Apply brightness and contrast adjustments first
    if (options.brightness || options.contrast) {
      ctx.filter = `${options.contrast ? 'contrast(1.3)' : ''} ${options.brightness ? 'brightness(1.1)' : ''}`.trim();
    }
    ctx.drawImage(sourceImg, 0, 0);

    // Apply sharpening using unsharp mask technique
    if (options.sharpen) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;
      const copy = new Uint8ClampedArray(data);

      // Sharpening kernel
      const strength = 1.5;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = copy[idx + c] * (1 + 4 * strength);
            const neighbors = 
              copy[((y - 1) * width + x) * 4 + c] * strength +
              copy[((y + 1) * width + x) * 4 + c] * strength +
              copy[(y * width + x - 1) * 4 + c] * strength +
              copy[(y * width + x + 1) * 4 + c] * strength;
            data[idx + c] = Math.min(255, Math.max(0, center - neighbors));
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas.toDataURL('image/jpeg', 0.95);
  }, []);

  // Compress image to reduce upload size
  const compressImage = useCallback((file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.85): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        // Resize if needed
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, 'image/jpeg', quality);
        } else {
          resolve(file);
        }
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFile = useCallback(async (f: File) => {
    // Validate file type
    if (!f.type.startsWith('image/')) {
      toast({ 
        title: "Invalid file type", 
        description: "Please select an image file (JPG, PNG, or WebP)", 
        variant: "destructive" 
      });
      return;
    }

    // Validate file size
    if (f.size > MAX_FILE_SIZE) {
      toast({ 
        title: "File too large", 
        description: "Image must be under 10MB", 
        variant: "destructive" 
      });
      return;
    }

    if (images.length >= MAX_IMAGES) {
      toast({ 
        title: "Maximum images reached", 
        description: `You can upload up to ${MAX_IMAGES} images at a time`, 
        variant: "destructive" 
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Analyze image quality after loading
      const img = new Image();
      img.onload = async () => {
        const qualityMetrics = analyzeImageQuality(img);
        
        const newImage: UploadedImage = {
          id,
          file: f,
          preview: result,
          quality: qualityMetrics,
          enhanced: false
        };

        setImages(prev => [...prev, newImage]);

        if (qualityMetrics.isBlurred) {
          toast({
            title: "Image may be blurred",
            description: "Consider using enhancement for better results",
            variant: "default"
          });
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(f);
  }, [images.length, analyzeImageQuality, toast]);

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const enhanceSingleImage = useCallback((id: string) => {
    setImages(prev => prev.map(img => {
      if (img.id !== id || img.enhanced) return img;

      const imgElement = new Image();
      imgElement.onload = () => {
        const enhancedPreview = enhanceImage(imgElement);
        setImages(prevImages => prevImages.map(prevImg => 
          prevImg.id === id 
            ? { 
                ...prevImg, 
                enhanced: true, 
                enhancedPreview,
                quality: prevImg.quality ? {
                  ...prevImg.quality,
                  sharpness: prevImg.quality.sharpness * 1.5,
                  score: Math.min(100, prevImg.quality.score + 20)
                } : null
              }
            : prevImg
        ));
      };
      imgElement.src = img.preview;
      return img;
    }));

    toast({
      title: "Image enhanced",
      description: "Sharpening and contrast applied for better detection",
    });
  }, [enhanceImage, toast]);

  const enhanceAllImages = useCallback(() => {
    images.forEach(img => {
      if (!img.enhanced) {
        enhanceSingleImage(img.id);
      }
    });
  }, [images, enhanceSingleImage]);

  const handleSubmit = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setProgress(0);

    try {
      const fd = new FormData();
      let totalSize = 0;

      // Compress and add all images
      for (let i = 0; i < images.length; i++) {
        setProgress(Math.round((i / images.length) * 30));
        
        const img = images[i];
        const compressedBlob = await compressImage(img.file);
        const fileName = img.enhanced ? `enhanced_${img.file.name}`.replace(/\.[^.]+$/, '.jpg') : img.file.name;
        
        fd.append('images', compressedBlob, fileName);
        totalSize += compressedBlob.size;
      }

      setProgress(40);
      
      // Check if any image is enhanced
      const anyEnhanced = images.some(img => img.enhanced);
      if (anyEnhanced) {
        fd.append('enhanced', 'true');
      }

      setProgress(60);
      
      const result = await api.submitImage(fd);
      setProgress(100);
      
      navigate("/disease-results", { 
        state: { 
          results: result.disease_detection, 
          enhanced: anyEnhanced,
          imagesAnalyzed: result.images_analyzed || images.length,
          uploadedImages: images.map((image) => ({
            id: image.id,
            preview: image.enhanced ? image.enhancedPreview || image.preview : image.preview,
            originalPreview: image.preview,
            enhanced: image.enhanced,
            name: image.file.name,
          })),
        } 
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({ 
        title: "Error", 
        description: "Could not analyze image. Please try a clearer photo or use enhancement.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => handleFile(file));
  }, [handleFile]);

  const getQualityLabel = (score: number) => {
    if (score >= 80) return { text: "Excellent", color: "text-success" };
    if (score >= 60) return { text: "Good", color: "text-primary" };
    if (score >= 40) return { text: "Fair", color: "text-warning" };
    return { text: "Poor", color: "text-destructive" };
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high': return 'bg-success/20 text-success';
      case 'medium': return 'bg-warning/20 text-warning';
      case 'low': return 'bg-destructive/20 text-destructive';
      default: return 'bg-accent/20 text-accent-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Disease Detection" />
      
      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Upload plant or leaf images from gallery"
        onChange={(e) => {
          if (e.target.files) {
            Array.from(e.target.files).forEach(file => handleFile(file));
          }
          e.target.value = '';
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Take a photo with camera"
        onChange={(e) => {
          if (e.target.files) {
            Array.from(e.target.files).forEach(file => handleFile(file));
          }
          e.target.value = '';
        }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 12 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="px-4 pt-6 space-y-4"
      >
        {/* Drop Zone */}
        {images.length === 0 ? (
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all duration-200 ${
              isDragging 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-border bg-muted/40 hover:border-primary/50'
            }`}
          >
            <img src={diseaseImg} alt="Scan plant" width={80} height={80} loading="lazy" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Upload plant or leaf photos
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG, WebP — max 10MB each
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload up to {MAX_IMAGES} images for comprehensive analysis
              </p>
              {isDragging && (
                <p className="mt-2 text-sm text-primary font-medium animate-pulse">
                  Drop your images here!
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <Upload className="h-3.5 w-3.5" /> 
                Gallery ({MAX_IMAGES} max)
              </button>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg bg-accent/20 px-4 py-2 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/30"
              >
                <Camera className="h-3.5 w-3.5" /> Camera
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Previews */}
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {images.map((img, index) => (
                  <motion.div
                    key={img.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group"
                  >
                    <img
                      src={img.enhanced ? img.enhancedPreview : img.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-xl"
                    />
                    
                    {/* Image number badge */}
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-xs text-white font-medium">
                      {index + 1}
                    </div>

                    {/* Enhanced badge */}
                    {img.enhanced && (
                      <div className="absolute top-2 right-8 rounded-lg bg-primary/90 px-2 py-1 text-[10px] text-primary-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Enhanced
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>

                    {/* Quality indicator */}
                    {img.quality && (
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="flex items-center justify-between text-[10px] text-white/90 mb-1">
                          <span>Quality</span>
                          <span className={getQualityLabel(img.quality.score).color}>
                            {getQualityLabel(img.quality.score).text}
                          </span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-black/40 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              img.quality.score >= 80 ? "bg-success" :
                              img.quality.score >= 60 ? "bg-primary" :
                              img.quality.score >= 40 ? "bg-warning" : "bg-destructive"
                            )}
                            style={{ width: `${img.quality.score}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Enhance button (shown on hover) */}
                    {!img.enhanced && img.quality?.isBlurred && (
                      <button
                        onClick={() => enhanceSingleImage(img.id)}
                        className="absolute bottom-2 right-2 rounded-lg bg-primary/90 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Enhance image"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add more images button */}
              {images.length < MAX_IMAGES && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/40 transition-colors"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Add more ({MAX_IMAGES - images.length} left)
                  </span>
                </motion.button>
              )}
            </div>

            {/* Enhancement options for all images */}
            {images.some(img => !img.enhanced && img.quality?.isBlurred) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-accent/10 p-4 border border-accent/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-accent-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    AI Enhancement Available
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {images.filter(img => !img.enhanced && img.quality?.isBlurred).length} image(s) could benefit from enhancement
                </p>
                <Button
                  onClick={enhanceAllImages}
                  variant="default"
                  size="sm"
                  className="w-full gradient-primary"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Enhance All Images
                </Button>
              </motion.div>
            )}

            {/* Progress bar during analysis */}
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl bg-card p-4 card-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Analyzing images...
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  AI is examining your plant images for diseases and providing treatment recommendations
                </p>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setImages([]);
                  setProgress(0);
                }}
                disabled={loading}
                variant="outline"
                className="px-4"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || images.length === 0}
                className="flex-1 rounded-xl py-6 text-base font-semibold gradient-primary text-primary-foreground"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Detect Disease{images.length > 1 ? ` (${images.length} images)` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Tips section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-muted/40 p-4"
        >
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Tips for best results:</p>
              <ul className="text-[10px] text-muted-foreground mt-1 space-y-1">
                <li>• Take photos in good lighting conditions</li>
                <li>• Focus on the affected area of the plant</li>
                <li>• Upload multiple angles for better accuracy</li>
                <li>• Use enhancement for slightly blurred images</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

