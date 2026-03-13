import re

STOPWORDS = {
    'a','an','the','is','it','in','on','at','of','and','or','but',
    'to','for','with','as','by','this','that','was','are','be','from',
    'have','has','had','do','did','not','no','so','if','up','we','he',
    'she','they','i','my','your','his','her','its'
}

def preprocess_texts(texts, lowercase=True, remove_stopwords=True, min_length=2):
    """Clean and normalize text data."""
    processed = []
    for text in texts:
        if lowercase:
            text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        if remove_stopwords:
            words = [w for w in text.split() if w not in STOPWORDS and len(w) >= min_length]
            text = ' '.join(words)
        processed.append(text)
    avg_len = sum(len(t.split()) for t in processed) / max(len(processed), 1)
    print(f"Preprocessed {len(processed)} texts | Avg length: {avg_len:.1f} words")
    return processed

processed_text = preprocess_texts(text_data)
