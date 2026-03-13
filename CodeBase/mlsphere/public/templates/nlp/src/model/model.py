from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
import numpy as np

def train_sentiment_model(embeddings, labels, test_size=0.2, random_state=42):
    """Train and compare MultinomialNB and LinearSVC for sentiment classification."""
    X = np.clip(embeddings, 0, None)
    X_train, X_test, y_train, y_test = train_test_split(
        X, labels, test_size=test_size, random_state=random_state, stratify=labels
    )
    results = {}
    for name, clf in [('MultinomialNB', MultinomialNB(alpha=0.1)),
                       ('LinearSVC',    LinearSVC(C=1.0, max_iter=2000, random_state=42))]:
        cv_acc = cross_val_score(clf, X_train, y_train, cv=5, scoring='accuracy').mean()
        clf.fit(X_train, y_train)
        test_acc = accuracy_score(y_test, clf.predict(X_test))
        print(f"\n{name}:")
        print(f"  CV Accuracy : {cv_acc:.4f}")
        print(f"  Test Accuracy: {test_acc:.4f}")
        results[name] = clf
    best_name = max(results, key=lambda k: accuracy_score(y_test, results[k].predict(X_test)))
    best_clf = results[best_name]
    print(f"\nBest model: {best_name}")
    print("\nClassification Report:")
    print(classification_report(y_test, best_clf.predict(X_test),
                                target_names=['Negative','Positive'], zero_division=0))
    return best_clf, X_test, y_test

best_model, X_test_nlp, y_test_nlp = train_sentiment_model(embeddings, labels)
