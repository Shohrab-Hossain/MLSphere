from sklearn.ensemble import RandomForestClassifier

def build_model(n_estimators=100, max_depth=8, random_state=42):
    """Build a Random Forest classifier."""
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=10,
        class_weight='balanced',
        random_state=random_state,
        n_jobs=-1
    )
    print(f"RandomForestClassifier — {n_estimators} trees, max_depth={max_depth}")
    return model

model = build_model()
