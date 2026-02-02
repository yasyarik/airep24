#!/usr/bin/env python3
import cv2
import numpy as np
import sys

def algorithmic_upscale(input_path, output_path):
    """
    Preprocess image to bypass Gemini's protection against real photos.
    This makes the image appear as AI-generated rather than a real photograph.
    """
    # 1. Load the image
    img = cv2.imread(input_path)
    if img is None:
        print(f"Error: Could not load image from {input_path}", file=sys.stderr)
        sys.exit(1)

    # 2. Upscale using Lanczos4 interpolation
    # Lanczos4 is the highest quality mathematical resizing algorithm in OpenCV.
    # It preserves sharp edges better than bicubic resizing.
    scale_factor = 3
    h, w = img.shape[:2]
    upscaled = cv2.resize(img, (w * scale_factor, h * scale_factor), interpolation=cv2.INTER_LANCZOS4)

    # 3. Apply Unsharp Masking (Sharpening) - SUBTLE
    # Reduced strength to avoid "fried" look.
    # Formula: sharpened = original * 1.1 + blurred * (-0.1)
    gaussian = cv2.GaussianBlur(upscaled, (0, 0), 2.0)
    sharpened = cv2.addWeighted(upscaled, 1.1, gaussian, -0.1, 0)

    # 4. Inject Micro-Noise - SUBTLE
    # Reduced noise sigma from 3 to 1.5 (barely visible)
    noise = np.random.normal(0, 1.5, sharpened.shape).astype(np.uint8)
    final_img = cv2.add(sharpened, noise)

    # 5. Resize back to original size (or max 1536px to save space)
    # We processed at 3x, now we scale back down.
    # This downscaling actually helps blend the noise naturally.
    max_dim = 1536
    if h > max_dim or w > max_dim:
        # If original was huge, limit to max_dim
        scale = max_dim / max(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        final_img = cv2.resize(final_img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    else:
        # Return to original size
        final_img = cv2.resize(final_img, (w, h), interpolation=cv2.INTER_AREA)

    # 6. Save the result
    # Using quality=85 for better compression/quality balance
    cv2.imwrite(output_path, final_img, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    print(f"SUCCESS:{output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: preprocess_image.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    algorithmic_upscale(input_path, output_path)
