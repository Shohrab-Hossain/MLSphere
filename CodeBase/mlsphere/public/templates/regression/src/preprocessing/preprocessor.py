from sklearn.model_selection import train_test_split

def preprocess(df, target_col='price', test_size=0.2, random_state=42):
    """Split dataset into train/test features and labels."""
    df = df.dropna()
    X = df.drop(columns=[target_col])
    y = df[target_col]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )
    print(f"Training set : {X_train.shape[0]} samples, {X_train.shape[1]} features")
    print(f"Test set     : {X_test.shape[0]} samples")
    return X_train, X_test, y_train, y_test

X_train, X_test, y_train, y_test = preprocess(data)
