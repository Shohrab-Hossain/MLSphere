"""Customer Segmentation Clustering Pipeline"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from data          import load_data
from preprocessing import preprocess
from scaling       import scale_features
from model         import find_optimal_k, build_model
from visualization import visualize_clusters, print_cluster_profiles

print("=" * 50)
print("CUSTOMER SEGMENTATION PIPELINE")
print("=" * 50)
data         = load_data()
features_df  = preprocess(data)
X_scaled, sc = scale_features(features_df)
inertias     = find_optimal_k(X_scaled)
model, labels = build_model(X_scaled, n_clusters=3)
fig          = visualize_clusters(X_scaled, labels, model)
print_cluster_profiles(features_df, labels)
print("\nPipeline complete.")
