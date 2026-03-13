from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import numpy as np
import pandas as pd

def evaluate_model(model, X_test, y_test, feature_names=None):
    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae  = mean_absolute_error(y_test, y_pred)
    r2   = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test.values - y_pred) / y_test.values.clip(1))) * 100
    print("\n=== Regression Evaluation ===")
    print(f"  R²   : {r2:.4f}")
    print(f"  RMSE : ${rmse:,.0f}")
    print(f"  MAE  : ${mae:,.0f}")
    print(f"  MAPE : {mape:.2f}%")
    if hasattr(model, 'feature_importances_'):
        n_features = X_test.shape[1]
        names = feature_names if feature_names else [f'feature_{i}' for i in range(n_features)]
        fi = pd.Series(model.feature_importances_, index=names).sort_values(ascending=False)
        print("\nFeature Importances:")
        print(fi.round(4).to_string())
    return {'r2': r2, 'rmse': rmse, 'mae': mae, 'mape': mape}

metrics = evaluate_model(model, X_test_scaled, y_test)
