import pandas as pd
import numpy as np
import os

def load_data(filepath='data/houses.csv'):
    """Load house price dataset. Generates synthetic data if file not found."""
    if os.path.exists(filepath):
        df = pd.read_csv(filepath)
        print(f"Loaded dataset from: {filepath}")
    else:
        print("Generating synthetic house price dataset (600 properties)...")
        np.random.seed(0)
        n = 600
        sqft        = np.random.randint(600, 4500, n)
        bedrooms    = np.random.randint(1, 7, n)
        bathrooms   = np.random.choice([1, 1.5, 2, 2.5, 3], n)
        garage      = np.random.choice([0, 1, 2], n)
        age_years   = np.random.randint(0, 60, n)
        distance_km = np.random.uniform(1, 40, n).round(1)
        has_pool    = np.random.choice([0, 1], n, p=[0.75, 0.25])
        school_score = np.random.randint(50, 100, n)
        # Price generation with realistic correlations
        price = (sqft * 115
                 + bedrooms * 12000
                 + bathrooms * 8000
                 + garage * 18000
                 - age_years * 600
                 - distance_km * 2500
                 + has_pool * 25000
                 + school_score * 400
                 + np.random.normal(0, 18000, n)).clip(80000, 1500000).round(-3)
        df = pd.DataFrame({
            'sqft': sqft, 'bedrooms': bedrooms, 'bathrooms': bathrooms,
            'garage_spaces': garage, 'age_years': age_years,
            'distance_to_center_km': distance_km,
            'has_pool': has_pool, 'school_rating': school_score,
            'price': price
        })
    print(f"Dataset shape: {df.shape}")
    print(f"Price stats — min: ${df['price'].min():,.0f}  median: ${df['price'].median():,.0f}  max: ${df['price'].max():,.0f}")
    return df

data = load_data()
