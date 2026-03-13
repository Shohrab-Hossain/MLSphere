from sklearn.cluster import KMeans
import numpy as np

def find_optimal_k(X, k_range=range(2, 9)):
    """Use elbow method to find optimal number of clusters."""
    inertias = []
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=42, n_init='auto')
        km.fit(X)
        inertias.append(km.inertia_)
    print("Elbow method — inertia by k:")
    for k, inertia in zip(k_range, inertias):
        print(f"  k={k}: {inertia:.2f}")
    return inertias

def build_model(X, n_clusters=3):
    model = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto', max_iter=300)
    labels = model.fit_predict(X)
    print(f"\nKMeans (k={n_clusters}) — inertia: {model.inertia_:.2f}")
    unique, counts = np.unique(labels, return_counts=True)
    for cluster, count in zip(unique, counts):
        print(f"  Cluster {cluster}: {count} customers ({count/len(labels):.1%})")
    return model, labels

inertias = find_optimal_k(X_scaled)
model, cluster_labels = build_model(X_scaled, n_clusters=3)
