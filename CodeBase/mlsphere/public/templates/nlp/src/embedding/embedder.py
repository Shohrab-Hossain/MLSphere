from sklearn.feature_extraction.text import TfidfVectorizer

def create_tfidf_embeddings(texts, max_features=5000, ngram_range=(1, 2)):
    """Convert text to TF-IDF feature matrix."""
    vectorizer = TfidfVectorizer(
        max_features=max_features,
        ngram_range=ngram_range,
        sublinear_tf=True,
        min_df=2
    )
    embeddings = vectorizer.fit_transform(texts).toarray()
    print(f"TF-IDF matrix: {embeddings.shape[0]} samples × {embeddings.shape[1]} features")
    print(f"Top tokens: {vectorizer.get_feature_names_out()[:10].tolist()}")
    return embeddings, vectorizer

embeddings, vectorizer = create_tfidf_embeddings(processed_text)
