"""Sentiment Analysis NLP Pipeline"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from data          import load_data
from preprocessing import preprocess_texts
from embedding     import create_tfidf_embeddings
from model         import train_sentiment_model

print("=" * 50)
print("SENTIMENT ANALYSIS NLP PIPELINE")
print("=" * 50)
text_data, labels          = load_data()
processed_text             = preprocess_texts(text_data)
embeddings, vectorizer     = create_tfidf_embeddings(processed_text)
best_model, X_test, y_test = train_sentiment_model(embeddings, labels)
print("\nPipeline complete.")
