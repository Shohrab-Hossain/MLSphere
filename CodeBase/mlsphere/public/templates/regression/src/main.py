"""House Price Regression Pipeline"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from data          import load_data
from preprocessing import preprocess
from scaling       import scale_features
from model         import build_model
from training      import train_model
from evaluation    import evaluate_model

print("=" * 50)
print("HOUSE PRICE REGRESSION PIPELINE")
print("=" * 50)
data                              = load_data()
X_train, X_test, y_train, y_test  = preprocess(data)
X_train_s, X_test_s, scaler       = scale_features(X_train, X_test)
reg                               = build_model()
reg                               = train_model(reg, X_train_s, y_train)
metrics                           = evaluate_model(reg, X_test_s, y_test)
print("\nPipeline complete.")
