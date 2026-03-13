from sklearn.metrics import mean_squared_error, mean_absolute_error
import numpy as np

def train_and_forecast(model, test_data):
    """Fit ARIMA and forecast test horizon."""
    fitted = model.fit()
    forecast = fitted.forecast(steps=len(test_data))
    # Metrics
    rmse = np.sqrt(mean_squared_error(test_data, forecast))
    mae  = mean_absolute_error(test_data, forecast)
    mape = np.mean(np.abs((test_data - forecast) / test_data.clip(1))) * 100
    print(f"Model fitted | AIC: {fitted.aic:.2f} | BIC: {fitted.bic:.2f}")
    print(f"\nForecast Accuracy:")
    print(f"  RMSE : {rmse:.2f}")
    print(f"  MAE  : {mae:.2f}")
    print(f"  MAPE : {mape:.2f}%")
    print(f"\nForecast values: {forecast.round(0).astype(int).tolist()}")
    print(f"Actual   values: {test_data.round(0).astype(int).tolist()}")
    return fitted, forecast

fitted_model, forecast = train_and_forecast(ts_model, test_vals)
