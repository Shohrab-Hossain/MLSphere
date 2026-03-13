import numpy as np

def preprocess(ts, test_periods=12):
    """Split time series into train/test (last N periods = test)."""
    values = ts.iloc[:, 0].values.astype(float)
    split = len(values) - test_periods
    train_vals = values[:split]
    test_vals  = values[split:]
    print(f"Train: {len(train_vals)} periods | Test: {len(test_vals)} periods")
    print(f"Train mean: {train_vals.mean():.0f}, std: {train_vals.std():.0f}")
    # Augmented Dickey-Fuller stationarity check
    try:
        from statsmodels.tsa.stattools import adfuller
        adf_result = adfuller(train_vals)
        print(f"ADF statistic: {adf_result[0]:.4f}, p-value: {adf_result[1]:.4f}")
        print("Series is " + ("stationary" if adf_result[1] < 0.05 else "non-stationary (differencing recommended)"))
    except ImportError:
        pass
    return train_vals, test_vals, values

train_vals, test_vals, all_vals = preprocess(time_series)
