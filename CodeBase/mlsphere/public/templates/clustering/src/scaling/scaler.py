from sklearn.preprocessing import StandardScaler

def scale_features(df):
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df)
    print(f"Features scaled: {X_scaled.shape[1]} dimensions")
    return X_scaled, scaler

X_scaled, scaler = scale_features(features_df)
