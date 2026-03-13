import pandas as pd
import numpy as np
import os

def load_data(filepath='data/customers.csv'):
    if os.path.exists(filepath):
        df = pd.read_csv(filepath)
        print(f"Loaded from: {filepath}")
    else:
        print("Generating synthetic customer RFM dataset (400 customers)...")
        np.random.seed(7)
        n = 400
        # Simulate 3 customer segments: champions, at-risk, lost
        segment = np.random.choice([0,1,2], n, p=[0.3, 0.4, 0.3])
        recency = np.where(segment==0, np.random.randint(1,30,n),
                  np.where(segment==1, np.random.randint(30,120,n),
                           np.random.randint(120,365,n)))
        frequency = np.where(segment==0, np.random.randint(10,50,n),
                    np.where(segment==1, np.random.randint(3,15,n),
                             np.random.randint(1,5,n)))
        monetary = np.where(segment==0, np.random.normal(850, 200, n),
                   np.where(segment==1, np.random.normal(350, 100, n),
                            np.random.normal(120, 50, n))).clip(10, 3000).round(2)
        avg_order = (monetary / frequency).round(2)
        df = pd.DataFrame({
            'recency_days': recency, 'frequency': frequency,
            'monetary_total': monetary, 'avg_order_value': avg_order
        })
    print(f"Dataset shape: {df.shape}")
    print(f"Summary stats:\n{df.describe().round(2).to_string()}")
    return df

data = load_data()
