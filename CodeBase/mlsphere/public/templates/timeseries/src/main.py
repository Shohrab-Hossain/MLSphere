"""Sales Forecasting Time Series Pipeline"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from data          import load_data
from preprocessing import preprocess
from model         import build_ts_model
from training      import train_and_forecast
from visualization import visualize_forecast

print("=" * 50)
print("SALES FORECASTING PIPELINE")
print("=" * 50)
time_series               = load_data()
train_vals, test_vals, all_vals = preprocess(time_series)
ts_model                  = build_ts_model(train_vals)
fitted_model, forecast    = train_and_forecast(ts_model, test_vals)
fig                       = visualize_forecast(all_vals, forecast, test_vals)
print("\nPipeline complete.")
