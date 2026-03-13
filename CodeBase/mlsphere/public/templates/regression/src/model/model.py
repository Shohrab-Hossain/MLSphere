from sklearn.ensemble import GradientBoostingRegressor

def build_model(n_estimators=200, learning_rate=0.08, max_depth=4, random_state=42):
    """Build a Gradient Boosting Regressor."""
    model = GradientBoostingRegressor(
        n_estimators=n_estimators,
        learning_rate=learning_rate,
        max_depth=max_depth,
        subsample=0.85,
        min_samples_split=10,
        random_state=random_state
    )
    print(f"GradientBoostingRegressor — {n_estimators} trees, lr={learning_rate}, depth={max_depth}")
    return model

model = build_model()
