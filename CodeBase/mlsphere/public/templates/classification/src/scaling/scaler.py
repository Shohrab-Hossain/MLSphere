from sklearn.preprocessing import StandardScaler
import numpy as np

def scale_features(X_train, X_test):
    """Fit StandardScaler on training data and apply to both sets."""
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)
    print(f"Scaled {X_train_scaled.shape[1]} features")
    print(f"Feature means (train): {np.round(X_train_scaled.mean(axis=0), 3)}")
    return X_train_scaled, X_test_scaled, scaler

X_train_scaled, X_test_scaled, scaler = scale_features(X_train, X_test)
