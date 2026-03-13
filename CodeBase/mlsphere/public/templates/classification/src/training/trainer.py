from sklearn.model_selection import cross_val_score
import numpy as np

def train_model(model, X_train, y_train, cv=5):
    """Fit model and report cross-validation scores."""
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='roc_auc', n_jobs=-1)
    print(f"Cross-validation ROC-AUC ({cv}-fold): {cv_scores.round(4)}")
    print(f"  Mean: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
    model.fit(X_train, y_train)
    train_acc = model.score(X_train, y_train)
    print(f"Training accuracy: {train_acc:.4f}")
    return model

model = train_model(model, X_train_scaled, y_train)
