import pandas as pd
import numpy as np
import os

def load_data(filepath='data/dataset.csv'):
    """Load loan default dataset. Generates synthetic data if file not found."""
    if os.path.exists(filepath):
        df = pd.read_csv(filepath)
        print(f"Loaded dataset from: {filepath}")
    else:
        print("Generating synthetic loan default dataset (500 customers)...")
        np.random.seed(42)
        n = 500
        age = np.random.randint(22, 65, n)
        income = np.random.lognormal(10.8, 0.5, n).clip(20000, 200000).astype(int)
        credit_score = np.random.normal(640, 110, n).clip(300, 850).astype(int)
        loan_amount = np.random.randint(5000, 60000, n)
        debt_to_income = np.random.uniform(0.05, 0.65, n).round(3)
        employment_years = np.random.randint(0, 35, n)
        num_credit_lines = np.random.randint(1, 15, n)
        # Realistic default probability based on features
        z = (-0.025*age - 0.000006*income - 0.007*credit_score
             + 0.000012*loan_amount + 2.1*debt_to_income - 0.05*employment_years + 4.8)
        prob_default = 1 / (1 + np.exp(-z))
        default = (np.random.rand(n) < prob_default).astype(int)
        df = pd.DataFrame({
            'age': age, 'annual_income': income, 'credit_score': credit_score,
            'loan_amount': loan_amount, 'debt_to_income': debt_to_income,
            'employment_years': employment_years, 'num_credit_lines': num_credit_lines,
            'default': default
        })
    print(f"Dataset shape: {df.shape}")
    print(f"Class distribution:\n{df['default'].value_counts().rename({0:'No Default',1:'Default'}).to_string()}")
    print(f"Default rate: {df['default'].mean():.1%}")
    return df

data = load_data()
