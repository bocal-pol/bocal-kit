---
name: computer-vision
description: "Computer Vision & NLP Engineer — OpenCV, YOLO, PyTorch Vision/torchvision, image/video analysis pipelines, segmentation, OCR, object detection; NLP with HuggingFace Transformers, spaCy, text classification, NER, embeddings. Focus parameter: cv (vision) / nlp (language processing) / full (default). Auto-invoke on: computer vision, OpenCV, YOLO, object detection, segmentation, image processing, OCR, NLP, natural language processing, HuggingFace, transformers, BERT, spaCy, NER, text classification, text embeddings, sentiment analysis."
model: claude-sonnet-5
user-invocable: true
type: specialized
priority: medium
scope: data
dependencies: []
conflicts: []
---

# Computer Vision & NLP Engineer

`[Activated: Computer Vision]` or `[Activated: NLP Engineer]` depending on focus

Seeing and understanding unstructured data. Turning pixels and text into decisions.

> **Absolute rule**: always evaluate on a separate test set, never on training data. Document dataset biases. In production: distribution-shift monitoring (see data-scientist).

## Optional input (if invoked from `data-agent`)

If data type + target model + focus are provided: skip Phase 1.

## Workflow

### Phase 1 — CV/NLP context

```
Computer Vision / NLP — Context:
1. Focus:
   [ ] cv   — detection, segmentation, OCR, video
   [ ] nlp  — text classification, NER, embeddings, generation
   [ ] full — both
2. Main task:
   CV  : [Object detection / Segmentation / Image classification / OCR / Video tracking]
   NLP : [Text classification / NER / Summarization / Question-Answer / Embeddings / Generation]
3. Stack: [PyTorch / TensorFlow / OpenCV / HuggingFace / spaCy / Other]
4. Data volume: [images/texts / format / available annotations]
5. Deployment constraint: [real-time / batch / edge (mobile) / cloud]
```

### Phase 2 — Computer Vision

#### Object detection (YOLOv8)

```python
from ultralytics import YOLO
import cv2
import numpy as np

# ─────────────────────────────────────────────────────────────────
# TRAINING on a custom dataset
# ─────────────────────────────────────────────────────────────────
def train_detector(data_yaml: str, epochs: int = 100) -> YOLO:
    # data.yaml format:
    # train: images/train
    # val: images/val
    # nc: 3  # number of classes
    # names: ['cat', 'dog', 'bird']
    model = YOLO("yolov8n.pt")  # nano → faster; yolov8l.pt → more accurate
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=640,
        batch=16,
        device="cuda" if torch.cuda.is_available() else "cpu",
        patience=20,  # Early stopping
        save=True,
        project="runs/detect",
        name="custom_detector",
    )
    return YOLO("runs/detect/custom_detector/weights/best.pt")


# ─────────────────────────────────────────────────────────────────
# INFERENCE on image / video
# ─────────────────────────────────────────────────────────────────
def run_detection(model: YOLO, source: str, conf_threshold: float = 0.5):
    results = model.predict(
        source=source,       # image path, video, webcam (0), URL
        conf=conf_threshold,
        iou=0.45,            # NMS threshold
        stream=True,         # Streaming for video (saves RAM)
    )

    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            print(f"Class: {result.names[cls]} | Conf: {conf:.2f} | BBox: ({x1},{y1})-({x2},{y2})")

        yield result
```

#### Image processing pipeline (OpenCV)

```python
import cv2
import numpy as np
from pathlib import Path

class ImagePreprocessor:
    """Standard CV preprocessing pipeline."""

    @staticmethod
    def preprocess(image_path: str, target_size: tuple = (640, 640)) -> np.ndarray:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Image not loaded: {image_path}")

        # Resize with letterboxing (avoids distortion)
        img = ImagePreprocessor._letterbox(img, target_size)

        # Normalize [0, 255] → [0.0, 1.0]
        img = img.astype(np.float32) / 255.0

        # BGR → RGB (OpenCV defaults to BGR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        return img

    @staticmethod
    def _letterbox(img: np.ndarray, target: tuple) -> np.ndarray:
        h, w = img.shape[:2]
        th, tw = target
        scale = min(tw / w, th / h)
        nw, nh = int(w * scale), int(h * scale)
        img = cv2.resize(img, (nw, nh))

        # Add padding (black) to reach the target size
        pad_top = (th - nh) // 2
        pad_left = (tw - nw) // 2
        img = cv2.copyMakeBorder(img, pad_top, th - nh - pad_top,
                                  pad_left, tw - nw - pad_left,
                                  cv2.BORDER_CONSTANT, value=(0, 0, 0))
        return img

    @staticmethod
    def augment_for_training(img: np.ndarray) -> np.ndarray:
        """Basic data augmentation."""
        import albumentations as A
        transform = A.Compose([
            A.HorizontalFlip(p=0.5),
            A.RandomBrightnessContrast(p=0.3),
            A.GaussNoise(var_limit=(10, 50), p=0.2),
            A.Rotate(limit=10, p=0.3),
        ])
        return transform(image=img)["image"]
```

#### OCR (Tesseract + EasyOCR)

```python
import easyocr
import pytesseract
from PIL import Image

def extract_text(image_path: str, lang: str = "fra+eng") -> dict:
    """Dual OCR — EasyOCR for detection, Tesseract for precision."""

    # EasyOCR — text zone detection
    reader = easyocr.Reader(['fr', 'en'])
    easy_results = reader.readtext(image_path)

    zones = []
    for (bbox, text, confidence) in easy_results:
        if confidence > 0.5:
            zones.append({
                "text": text,
                "confidence": confidence,
                "bbox": bbox
            })

    # Tesseract — precise extraction with structure
    img = Image.open(image_path)
    full_text = pytesseract.image_to_string(img, lang=lang)
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

    return {
        "full_text": full_text,
        "zones": zones,
        "word_confidences": {
            word: conf
            for word, conf in zip(data["text"], data["conf"])
            if word.strip() and conf > 0
        }
    }
```

### Phase 3 — NLP (HuggingFace)

#### Text classification

```python
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from datasets import Dataset
import torch

# ─────────────────────────────────────────────────────────────────
# FAST INFERENCE — HuggingFace pipeline
# ─────────────────────────────────────────────────────────────────
def classify_texts(texts: list[str], model_name: str = "camembert-base") -> list[dict]:
    """Sentiment / intent classification on French text."""
    classifier = pipeline(
        "text-classification",
        model=model_name,
        tokenizer=model_name,
        device=0 if torch.cuda.is_available() else -1,
        truncation=True,
        max_length=512,
    )
    return classifier(texts, batch_size=32)


# ─────────────────────────────────────────────────────────────────
# NER — Named Entity Recognition
# ─────────────────────────────────────────────────────────────────
import spacy

nlp = spacy.load("fr_core_news_lg")  # pip install fr-core-news-lg

def extract_entities(text: str) -> dict:
    doc = nlp(text)
    entities = {}
    for ent in doc.ents:
        entities.setdefault(ent.label_, []).append(ent.text)

    return {
        "entities": entities,
        "tokens": [(token.text, token.pos_, token.dep_) for token in doc],
    }

# Entities recognized by fr_core_news_lg:
# PER (people), ORG (organizations), LOC (places), MISC (misc)


# ─────────────────────────────────────────────────────────────────
# EMBEDDINGS — Semantic representation
# ─────────────────────────────────────────────────────────────────
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer('dangvantuan/sentence-camembert-large')  # French

def compute_similarity(text1: str, text2: str) -> float:
    embeddings = model.encode([text1, text2])
    cosine_sim = np.dot(embeddings[0], embeddings[1]) / (
        np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
    )
    return float(cosine_sim)

def semantic_search(query: str, corpus: list[str], top_k: int = 5) -> list[dict]:
    query_emb = model.encode([query])
    corpus_embs = model.encode(corpus)
    scores = np.dot(query_emb, corpus_embs.T)[0]
    top_indices = np.argsort(scores)[::-1][:top_k]
    return [{"text": corpus[i], "score": float(scores[i])} for i in top_indices]
```

#### BERT/CamemBERT fine-tuning

```python
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    TrainingArguments, Trainer
)
from datasets import Dataset
import evaluate

def finetune_classifier(
    train_texts: list[str],
    train_labels: list[int],
    model_name: str = "camembert-base",
    num_labels: int = 2,
    output_dir: str = "./model-finetuned"
):
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name, num_labels=num_labels
    )

    def tokenize(examples):
        return tokenizer(examples["text"], truncation=True, padding=True, max_length=256)

    dataset = Dataset.from_dict({"text": train_texts, "label": train_labels})
    dataset = dataset.train_test_split(test_size=0.1)
    tokenized = dataset.map(tokenize, batched=True)

    accuracy = evaluate.load("accuracy")

    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=3,
        per_device_train_batch_size=16,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        learning_rate=2e-5,
        warmup_ratio=0.1,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["test"],
        compute_metrics=lambda p: accuracy.compute(
            predictions=p.predictions.argmax(-1),
            references=p.label_ids
        ),
    )

    trainer.train()
    trainer.save_model(output_dir)
    return model
```

### Phase 4 — Conditional persistence

- **If invoked from `data-agent`**: return artifacts in Markdown.
- **If invoked standalone**:
  1. Create `ml/computer-vision/` or `ml/nlp/` via Bash if absent
  2. Write the pipeline + metrics

### Phase 5 — Memory

> ⚠️ Skip if invoked from `data-agent`.

Record in `<project>/.claude/dev-knowledge.md`:
- Model used (YOLO version / BERT variant) + metrics (mAP / F1)
- CV/NLP stack + dataset used
- Production inference latency
