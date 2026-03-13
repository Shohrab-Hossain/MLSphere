import pandas as pd
import os

def load_data(filepath='data/reviews.csv', text_col='text', label_col='sentiment'):
    if os.path.exists(filepath):
        df = pd.read_csv(filepath)
        print(f"Loaded from: {filepath}")
    else:
        print("Generating synthetic product review dataset...")
        positives = [
            "This product is absolutely fantastic, works perfectly every time",
            "Great quality and fast shipping, very happy with my purchase",
            "Excellent value for money, exceeded all my expectations",
            "Outstanding performance, highly recommend to everyone",
            "Love this product, will definitely buy again",
            "Amazing product, top notch quality and great customer service",
            "Best purchase I have made this year, very satisfied",
            "Perfect product, arrived on time and well packaged",
            "Five stars, exactly as described and very useful",
            "Super happy with this buy, works as advertised",
            "Incredible quality, my whole family loves it",
            "Truly impressive, very well made and durable",
        ] * 20
        negatives = [
            "Terrible quality, broke after just two days of use",
            "Very disappointed, does not work as described at all",
            "Complete waste of money, avoid this product",
            "Poor quality materials, feels very cheap and flimsy",
            "Worst purchase ever, packaging was damaged and item broken",
            "Customer service was unhelpful, product stopped working",
            "Would not recommend, very poor build quality",
            "Returned immediately, nothing like the product images",
            "Cheaply made and overpriced, not worth it at all",
            "Frustrating experience, delivery late and product faulty",
            "Very bad, breaks easily and instructions are confusing",
            "Regret buying this, total disappointment",
        ] * 20
        texts  = positives + negatives
        labels = [1] * len(positives) + [0] * len(negatives)
        df = pd.DataFrame({text_col: texts, label_col: labels})
    texts  = df[text_col].astype(str).tolist()
    labels = df[label_col].tolist() if label_col in df.columns else []
    print(f"Loaded {len(texts)} texts | Classes: {set(labels)}")
    return texts, labels

text_data, labels = load_data()
