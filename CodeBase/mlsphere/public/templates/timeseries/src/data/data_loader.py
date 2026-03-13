import pandas as pd
import numpy as np
import os

def load_data(filepath='data/sales.csv', date_col='date', value_col='sales'):
    if os.path.exists(filepath):
        df = pd.read_csv(filepath, parse_dates=[date_col])
        df = df.sort_values(date_col).set_index(date_col)
        print(f"Loaded time series from: {filepath}")
    else:
        print("Generating synthetic monthly sales time series (48 months)...")
        np.random.seed(99)
        dates = pd.date_range(start='2020-01-01', periods=48, freq='MS')
        trend = np.linspace(1200, 1800, 48)
        seasonality = 300 * np.sin(2 * np.pi * (np.arange(48) + 3) / 12)
        promo_boost = np.zeros(48)
        promo_boost[[11, 23, 35, 47]] = 400  # Year-end sales boost
        noise = np.random.normal(0, 60, 48)
        sales = (trend + seasonality + promo_boost + noise).clip(500).round(0)
        df = pd.DataFrame({'sales': sales}, index=dates)
        df.index.name = date_col
    print(f"Time series: {len(df)} periods, from {df.index.min()} to {df.index.max()}")
    print(f"Sales — mean: {df.iloc[:,0].mean():.0f}, std: {df.iloc[:,0].std():.0f}")
    return df

time_series = load_data()
