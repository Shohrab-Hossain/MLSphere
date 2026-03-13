from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, roc_auc_score, classification_report,
                              confusion_matrix)
import numpy as np

def evaluate_model(model, X_test, y_test):
    """Compute and print full classification metrics."""
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    metrics = {
        'accuracy' : accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred, zero_division=0),
        'recall'   : recall_score(y_test, y_pred, zero_division=0),
        'f1_score' : f1_score(y_test, y_pred, zero_division=0),
        'roc_auc'  : roc_auc_score(y_test, y_prob)
    }
    print("\n=== Evaluation Results ===")
    for k, v in metrics.items():
        print(f"  {k:<12}: {v:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['No Default','Default'], zero_division=0))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    if hasattr(model, 'feature_importances_'):
        import pandas as pd
        feat_cols = [f'feature_{i}' for i in range(X_test.shape[1])]
        fi = pd.Series(model.feature_importances_, index=feat_cols).sort_values(ascending=False)
        print("\nTop feature importances:")
        print(fi.head(5).round(4).to_string())
    return metrics

metrics = evaluate_model(model, X_test_scaled, y_test)
