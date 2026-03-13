// ML Block Types and Definitions
export const blockTypes = {
  DATA_LOAD: {
    id: 'data_load',
    name: 'Load Data',
    category: 'Data',
    color: '#4CAF50',
    icon: '📁',
    inputs: [],
    outputs: ['data'],
    defaultCode: `# Load Dataset
import pandas as pd
import numpy as np

def load_data():
    # Load your dataset here
    # Example: CSV file
    data = pd.read_csv('data.csv')
    
    print(f"Data shape: {data.shape}")
    print(f"Columns: {list(data.columns)}")
    
    return data

data = load_data()`
  },
  
  PREPROCESSING: {
    id: 'preprocessing',
    name: 'Data Preprocessing',
    category: 'Data',
    color: '#2196F3',
    icon: '🔧',
    inputs: ['data'],
    outputs: ['processed_data'],
    defaultCode: `# Data Preprocessing
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split

def preprocess_data(data):
    # Handle missing values
    data = data.fillna(data.mean())
    
    # Encode categorical variables
    le = LabelEncoder()
    for col in data.select_dtypes(include=['object']).columns:
        data[col] = le.fit_transform(data[col])
    
    # Separate features and target
    X = data.drop('target', axis=1)
    y = data['target']
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    print(f"Training set size: {X_train.shape}")
    print(f"Test set size: {X_test.shape}")
    
    return X_train, X_test, y_train, y_test

X_train, X_test, y_train, y_test = preprocess_data(data)`
  },
  
  NEURAL_NETWORK: {
    id: 'neural_network',
    name: 'Neural Network',
    category: 'Model',
    color: '#9C27B0',
    icon: '🧠',
    inputs: ['X_train', 'y_train'],
    outputs: ['model'],
    defaultCode: `# Neural Network Model
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

def create_model(input_dim):
    model = keras.Sequential([
        layers.Dense(128, activation='relu', input_shape=(input_dim,)),
        layers.Dropout(0.2),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(32, activation='relu'),
        layers.Dense(1, activation='sigmoid')
    ])
    
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    return model

model = create_model(X_train.shape[1])
print(model.summary())`
  },
  
  RANDOM_FOREST: {
    id: 'random_forest',
    name: 'Random Forest',
    category: 'Model',
    color: '#FF9800',
    icon: '🌳',
    inputs: ['X_train', 'y_train'],
    outputs: ['model'],
    defaultCode: `# Random Forest Model
from sklearn.ensemble import RandomForestClassifier

def create_rf_model():
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    
    return model

model = create_rf_model()
print(f"Random Forest initialized with {model.n_estimators} trees")`
  },
  
  TRAIN: {
    id: 'train',
    name: 'Train Model',
    category: 'Training',
    color: '#F44336',
    icon: '🎯',
    inputs: ['model', 'X_train', 'y_train', 'X_test', 'y_test'],
    outputs: ['trained_model', 'history'],
    defaultCode: `# Train Model
import time

def train_model(model, X_train, y_train, X_test, y_test, epochs=50, batch_size=32):
    # Check if it's a Keras model or sklearn model
    if hasattr(model, 'fit') and hasattr(model, 'predict_proba'):
        # Sklearn model
        print("Training sklearn model...")
        model.fit(X_train, y_train)
        
        train_score = model.score(X_train, y_train)
        test_score = model.score(X_test, y_test)
        
        history = {
            'train_accuracy': [train_score],
            'val_accuracy': [test_score]
        }
        
        print(f"Training accuracy: {train_score:.4f}")
        print(f"Validation accuracy: {test_score:.4f}")
    else:
        # Keras model
        print("Training neural network...")
        history = model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(X_test, y_test),
            verbose=1
        )
        history = history.history
    
    return model, history

trained_model, history = train_model(model, X_train, y_train, X_test, y_test)`
  },
  
  EVALUATE: {
    id: 'evaluate',
    name: 'Evaluate Model',
    category: 'Analysis',
    color: '#00BCD4',
    icon: '📊',
    inputs: ['trained_model', 'X_test', 'y_test'],
    outputs: ['metrics'],
    defaultCode: `# Evaluate Model
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.metrics import confusion_matrix, classification_report
import numpy as np

def evaluate_model(model, X_test, y_test):
    # Make predictions
    if hasattr(model, 'predict_proba'):
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        y_pred = (y_pred_proba > 0.5).astype(int)
    else:
        y_pred = (model.predict(X_test) > 0.5).astype(int).flatten()
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='binary')
    recall = recall_score(y_test, y_pred, average='binary')
    f1 = f1_score(y_test, y_pred, average='binary')
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    
    metrics = {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'confusion_matrix': cm.tolist()
    }
    
    print("\\nModel Evaluation:")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print("\\nConfusion Matrix:")
    print(cm)
    
    return metrics

metrics = evaluate_model(trained_model, X_test, y_test)`
  },
  
  VISUALIZE: {
    id: 'visualize',
    name: 'Visualize Results',
    category: 'Analysis',
    color: '#E91E63',
    icon: '📈',
    inputs: ['history', 'metrics'],
    outputs: [],
    defaultCode: `# Visualize Results
import matplotlib.pyplot as plt
import seaborn as sns

def visualize_results(history, metrics):
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    
    # Plot training history
    if 'loss' in history:
        axes[0, 0].plot(history['loss'], label='Training Loss')
        axes[0, 0].plot(history['val_loss'], label='Validation Loss')
        axes[0, 0].set_title('Model Loss')
        axes[0, 0].set_xlabel('Epoch')
        axes[0, 0].set_ylabel('Loss')
        axes[0, 0].legend()
    
    # Plot accuracy
    if 'accuracy' in history:
        axes[0, 1].plot(history['accuracy'], label='Training Accuracy')
        axes[0, 1].plot(history['val_accuracy'], label='Validation Accuracy')
        axes[0, 1].set_title('Model Accuracy')
        axes[0, 1].set_xlabel('Epoch')
        axes[0, 1].set_ylabel('Accuracy')
        axes[0, 1].legend()
    
    # Plot confusion matrix
    if 'confusion_matrix' in metrics:
        sns.heatmap(metrics['confusion_matrix'], annot=True, fmt='d', 
                   cmap='Blues', ax=axes[1, 0])
        axes[1, 0].set_title('Confusion Matrix')
        axes[1, 0].set_ylabel('True Label')
        axes[1, 0].set_xlabel('Predicted Label')
    
    # Plot metrics
    metric_names = ['accuracy', 'precision', 'recall', 'f1_score']
    metric_values = [metrics.get(m, 0) for m in metric_names]
    axes[1, 1].bar(metric_names, metric_values)
    axes[1, 1].set_title('Model Metrics')
    axes[1, 1].set_ylabel('Score')
    axes[1, 1].set_ylim([0, 1])
    
    plt.tight_layout()
    plt.show()
    
    return fig

fig = visualize_results(history, metrics)`
  }
};

export const blockCategories = {
  Data: { color: '#4CAF50', icon: '💾' },
  Model: { color: '#9C27B0', icon: '🤖' },
  Training: { color: '#F44336', icon: '⚡' },
  Analysis: { color: '#00BCD4', icon: '📊' }
};

export function getBlockById(id) {
  return Object.values(blockTypes).find(block => block.id === id);
}

export function getBlocksByCategory(category) {
  return Object.values(blockTypes).filter(block => block.category === category);
}
