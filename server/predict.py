import sys
import json
from pathlib import Path
import os

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python predict.py <input_img> <output_img>"}))
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    conf_threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 0.45
    
    # Resolve model path
    # Look in the same directory as this script first (standard for Render deployment)
    model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'weight'))
    model_path = os.path.join(model_dir, 'best.pt')

    # Create directory if it doesn't exist
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)

    # 📥 Cloud Download Logic
    if not os.path.exists(model_path):
        import requests
        
        # Determine the possible URLs
        urls = []
        if os.getenv("MODEL_URL"):
            urls.append(os.getenv("MODEL_URL"))
        
        # Build Supabase URL if keys exist
        supabase_url = os.getenv("SUPABASE_URL")
        if supabase_url:
            urls.append(f"{supabase_url.rstrip('/')}/storage/v1/object/public/models/best.pt")
            
        # Fallback to HuggingFace
        urls.append("https://huggingface.co/AthithyaKrishnaaM/ppe-detection-weights/resolve/main/best.pt")
        urls.append("https://huggingface.co/AthithyaKrishnaa/ppe-detection-system/resolve/main/best.pt")

        success = False
        for url in urls:
            print(f"Attempting download from: {url}")
            try:
                response = requests.get(url, stream=True, timeout=120)
                if response.status_code == 200:
                    with open(model_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=1024*1024):
                            if chunk:
                                f.write(chunk)
                    print(f"✅ Model downloaded successfully from {url}")
                    success = True
                    break
                else:
                    print(f"Failed status {response.status_code} for {url}")
            except Exception as e:
                print(f"Error downloading from {url}: {str(e)}")

        if not success:
            print(json.dumps({"error": "Failed to download model from all provided sources."}))
            sys.exit(1)

    # Final check of model path before inference
    if not os.path.exists(model_path) or os.path.getsize(model_path) < 1000000:
        print(json.dumps({"error": f"Model file missing or too small (invalid download) at {model_path}."}))
        sys.exit(1)

    try:
        # We import here so it doesn't slow down the quick syntax error check etc.
        print("📦 Loading model into memory...")
        try:
            from ultralytics import RTDETR
            model = RTDETR(model_path)
        except Exception as e:
            print(f"Info: RTDETR import failed ({str(e)}), trying YOLO wrapper...")
            try:
                from ultralytics import YOLO
                model = YOLO(model_path)
            except ImportError as ie:
                print(json.dumps({"error": f"Import failed: {str(ie)}. Likely missing system dependencies or package not in path."}))
                sys.exit(1)
            except Exception as e2:
                print(json.dumps({"error": f"Unexpected error during fallback import: {str(e2)}"}))
                sys.exit(1)

        print("🚀 Model loaded. Starting inference...")
        # Run inference
        # On CPU, we don't use half=True unless specifically supported, but we can try to limit memory
        results = model.predict(source=input_path, save=False, conf=conf_threshold)
        
        print("✅ Inference finished. Saving results...")
        first_result = results[0]
        first_result.save(filename=output_path)

        # Extract counts
        class_names = ["Helmet", "No Helmet", "Safety Vest", "No Safety Vest"]
        counts = {}
        
        if hasattr(first_result, 'boxes') and first_result.boxes is not None:
            classes = first_result.boxes.cls.cpu().numpy()
            for cls_idx in classes:
                name = class_names[int(cls_idx)] if int(cls_idx) < len(class_names) else f"Class_{int(cls_idx)}"
                counts[name] = counts.get(name, 0) + 1

        print(json.dumps({
            "success": True,
            "output": output_path,
            "detections": counts
        }))
        
    except Exception as e:
        print(json.dumps({"error": f"Inference execution error: {str(e)}"}))
        sys.exit(1)

if __name__ == '__main__':
    main()
