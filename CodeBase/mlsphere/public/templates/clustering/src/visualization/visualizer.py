import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA
import numpy as np
import pandas as pd

def visualize_clusters(X, labels, model, feature_names=None):
    pca = PCA(n_components=2, random_state=42)
    X_2d = pca.fit_transform(X)
    centers_2d = pca.transform(model.cluster_centers_)
    print(f"PCA explained variance: {pca.explained_variance_ratio_.sum():.1%}")

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Scatter plot
    scatter = axes[0].scatter(X_2d[:, 0], X_2d[:, 1], c=labels, cmap='viridis', alpha=0.6, s=30)
    axes[0].scatter(centers_2d[:, 0], centers_2d[:, 1], c='red', marker='X', s=200, linewidths=2, label='Centroids', zorder=5)
    axes[0].set_title('Customer Segments (PCA)')
    axes[0].set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]:.1%})')
    axes[0].set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]:.1%})')
    axes[0].legend()
    plt.colorbar(scatter, ax=axes[0])

    # Cluster size bar
    unique, counts = np.unique(labels, return_counts=True)
    axes[1].bar([f'Cluster {c}' for c in unique], counts, color=['#3498db','#2ecc71','#e74c3c'])
    axes[1].set_title('Cluster Sizes')
    axes[1].set_ylabel('Number of Customers')
    for i, v in enumerate(counts):
        axes[1].text(i, v + 2, str(v), ha='center', fontweight='bold')

    plt.tight_layout()
    plt.savefig('clusters.png', dpi=100, bbox_inches='tight')
    print("Cluster visualization saved to clusters.png")
    return fig

def print_cluster_profiles(df, labels):
    import pandas as pd
    df = df.copy()
    df['cluster'] = labels
    print("\nCluster Profiles (mean values):")
    print(df.groupby('cluster').mean().round(2).to_string())

fig = visualize_clusters(X_scaled, cluster_labels, model)
print_cluster_profiles(features_df, cluster_labels)
