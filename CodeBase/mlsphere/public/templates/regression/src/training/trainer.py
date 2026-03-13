from sklearn.model_selection import cross_val_score
import numpy as np

def train_model(model, X_train, y_train, cv=5):
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='r2')
    print(f"Cross-validation R² ({cv}-fold): {cv_scores.round(4)}")
    print(f"  Mean R²: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
    model.fit(X_train, y_train)
    train_r2 = model.score(X_train, y_train)
    print(f"Training R²: {train_r2:.4f}")
    return model

model = train_model(model, X_train_scaled, y_train)
