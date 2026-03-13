import numpy as np

def preprocess(df):
    df = df.dropna()
    numeric_df = df.select_dtypes(include=[np.number])
    print(f"Features for clustering: {list(numeric_df.columns)}")
    print(f"Samples: {len(numeric_df)}")
    return numeric_df

features_df = preprocess(data)
