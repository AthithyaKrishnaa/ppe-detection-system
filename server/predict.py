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
    
    model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'weight'))
    model_path = os.path.join(model_dir, 'best.pt')

    # Create directory if it doesn't exist
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)

    # 📥 Cloud Download Logic
    if not os.path.exists(model_path):
        import requests
        # Check if URL is provided in ENV or use placeholder
        url = os.getenv("MODEL_URL", "https://huggingface.co/AthithyaKrishnaa/ppe-detection-system/resolve/main/best.pt")
        
        print(f"Model not found at {model_path}. Downloading from {url}...")
        
        try:
            response = requests.get(url, stream=True)
            if response.status_code == 200:
                with open(model_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=1024*1024): # 1MB chunks
                        if chunk:
                            f.write(chunk)
                print("✅ Model downloaded successfully.")
            else:
                print(json.dumps({"error": f"Failed to download model. Status: {response.status_code}. Ensure the MODEL_URL is correct."}))
                sys.exit(1)
        except Exception as e:
            print(json.dumps({"error": f"Download failed: {str(e)}"}))
            sys.exit(1)

    try:
        # We import here so it doesn't slow down the quick syntax error check etc.
        try:
            from ultralytics import RTDETR
            model = RTDETR(model_path)
        except ImportError:
            try:
                from ultralytics import YOLO
                model = YOLO(model_path)
            except ImportError:
                print(json.dumps({"error": "ultralytics package is not installed."}))
                sys.exit(1)

        # Run inference
        results = model.predict(source=input_path, save=False, conf=conf_threshold)
        
        # Save annotated image
        first_result = results[0]
        first_result.save(filename=output_path)

        # Extract counts
        # Classes: 0: Helmet, 1: No Helmet, 2: Safety Vest, 3: No Safety Vest
        class_names = ["Helmet", "No Helmet", "Safety Vest", "No Safety Vest"]
        counts = {}
        
        if first_result.boxes is not None:
            # results[0].boxes.cls gives a tensor of class indices
            classes = first_result.boxes.cls.cpu().numpy()
            for cls_idx in classes:
                name = class_names[int(cls_idx)]
                counts[name] = counts.get(name, 0) + 1

        # Also grab some metrics if needed
        # Just return the success so we know
        print(json.dumps({
            "success": True,
            "output": output_path,
            "detections": counts
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
