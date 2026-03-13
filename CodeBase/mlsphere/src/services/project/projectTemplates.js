export const PROJECT_TEMPLATES = Object.freeze([
  {
    id: 'classification',
    name: 'Classification',
    icon: '🎯',
    description: 'Binary or multi-class classification problems',
    features: ['Data Loading', 'Preprocessing', 'Model Selection', 'Training', 'Evaluation'],
    type: 'classification'
  },
  {
    id: 'regression',
    name: 'Regression',
    icon: '📈',
    description: 'Predict continuous values with regression models',
    features: ['Data Loading', 'Feature Engineering', 'Model Training', 'Performance Metrics'],
    type: 'regression'
  },
  {
    id: 'clustering',
    name: 'Clustering',
    icon: '🔀',
    description: 'Unsupervised learning and pattern discovery',
    features: ['Data Loading', 'Scaling', 'Clustering', 'Visualization'],
    type: 'clustering'
  },
  {
    id: 'timeseries',
    name: 'Time Series',
    icon: '⏱️',
    description: 'Forecast and analyze temporal data patterns',
    features: ['Data Loading', 'Preprocessing', 'Forecasting', 'Evaluation'],
    type: 'timeseries'
  },
  {
    id: 'nlp',
    name: 'NLP',
    icon: '💬',
    description: 'Natural language processing and text analysis',
    features: ['Text Loading', 'Tokenization', 'Embedding', 'Classification'],
    type: 'nlp'
  },
  {
    id: 'blank',
    name: 'Blank Project',
    icon: '✨',
    description: 'Start from scratch with a blank canvas',
    features: ['Custom Blocks', 'Full Flexibility'],
    type: 'blank'
  }
]);

const CODE = {
  dataLoader: `import pandas as pd
import numpy as np
import os

def load_data(filepath='data.csv'):
    if os.path.exists(filepath):
        data = pd.read_csv(filepath)
        print(f"Loaded from file: {filepath}")
    else:
        # Generate synthetic classification dataset
        np.random.seed(42)
        n = 500
        age = np.random.randint(20, 65, n)
        income = np.random.normal(55000, 15000, n).astype(int)
        score = np.random.uniform(300, 850, n).round(1)
        dept = np.random.choice(['Engineering', 'Sales', 'HR', 'Finance'], n)
        target = ((age > 35) & (income > 50000) & (score > 600)).astype(int)
        data = pd.DataFrame({
            'age': age, 'income': income, 'credit_score': score,
            'department': dept, 'target': target
        })
        print(f"Generated synthetic dataset ({filepath} not found)")
    print(f"Shape: {data.shape}, Columns: {list(data.columns)}")
    print(f"Target distribution:\\n{data['target'].value_counts().to_string()}")
    return data

data = load_data()`,

  dataPreprocessor: `from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import numpy as np

def preprocess(data, target_col='target'):
    df = data.copy()
    df = df.dropna(thresh=int(len(df.columns) * 0.5))
    num_cols = df.select_dtypes(include=[np.number]).columns
    df[num_cols] = df[num_cols].fillna(df[num_cols].median())
    le = LabelEncoder()
    cat_cols = [c for c in df.select_dtypes(include=['object']).columns if c != target_col]
    for col in cat_cols:
        df[col] = le.fit_transform(df[col].astype(str))
    X = df.drop(columns=[target_col])
    y = df[target_col]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Train: {X_train.shape}, Test: {X_test.shape}")
    return X_train, X_test, y_train, y_test

X_train, X_test, y_train, y_test = preprocess(data)`,

  featureScaler: `from sklearn.preprocessing import StandardScaler

def scale_features(X_train, X_test):
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    print(f"Features scaled: {X_train_scaled.shape[1]} features")
    return X_train_scaled, X_test_scaled, scaler

X_train_scaled, X_test_scaled, scaler = scale_features(X_train, X_test)`,

  classificationModel: `from sklearn.linear_model import LogisticRegression

def build_model():
    model = LogisticRegression(max_iter=1000, random_state=42, solver='lbfgs')
    print("Logistic Regression model initialized")
    return model

model = build_model()`,

  regressionDataLoader: `import pandas as pd
import numpy as np
import os

def load_data(filepath='data.csv'):
    if os.path.exists(filepath):
        data = pd.read_csv(filepath)
        print(f"Loaded from file: {filepath}")
    else:
        # Generate synthetic regression dataset (house price prediction)
        np.random.seed(42)
        n = 500
        size = np.random.randint(500, 4000, n)
        bedrooms = np.random.randint(1, 6, n)
        age = np.random.randint(1, 50, n)
        distance = np.random.uniform(1, 30, n).round(1)
        garage = np.random.choice([0, 1], n)
        # Price correlated with features
        price = (size * 120 + bedrooms * 15000 - age * 500
                 - distance * 3000 + garage * 20000
                 + np.random.normal(0, 15000, n)).round(-2)
        data = pd.DataFrame({
            'size_sqft': size, 'bedrooms': bedrooms, 'age_years': age,
            'distance_km': distance, 'has_garage': garage, 'target': price
        })
        print(f"Generated synthetic house-price dataset ({filepath} not found)")
    print(f"Shape: {data.shape}, Columns: {list(data.columns)}")
    print(f"Target stats: min={data['target'].min():.0f}, max={data['target'].max():.0f}, mean={data['target'].mean():.0f}")
    return data

data = load_data()`,

  regressionModel: `from sklearn.linear_model import LinearRegression

def build_model():
    model = LinearRegression()
    print("Linear Regression model initialized")
    return model

model = build_model()`,

  modelTrainer: `def train_model(model, X_train, y_train, X_test, y_test):
    model.fit(X_train, y_train)
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f"Train score: {train_score:.4f}")
    print(f"Test  score: {test_score:.4f}")
    return model

model = train_model(model, X_train_scaled, y_train, X_test_scaled, y_test)`,

  evaluateClassification: `from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report

def evaluate(model, X_test, y_test):
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    rec = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
    print(f"\\nEvaluation Results:")
    print(f"  Accuracy : {acc:.4f}")
    print(f"  Precision: {prec:.4f}")
    print(f"  Recall   : {rec:.4f}")
    print(f"  F1 Score : {f1:.4f}")
    print(classification_report(y_test, y_pred, zero_division=0))
    return {'accuracy': acc, 'precision': prec, 'recall': rec, 'f1': f1}

metrics = evaluate(model, X_test_scaled, y_test)`,

  evaluateRegression: `from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import numpy as np

def evaluate(model, X_test, y_test):
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"\\nEvaluation Results:")
    print(f"  R2   : {r2:.4f}")
    print(f"  RMSE : {rmse:.4f}")
    print(f"  MAE  : {mae:.4f}")
    return {'r2': r2, 'rmse': rmse, 'mae': mae}

metrics = evaluate(model, X_test_scaled, y_test)`,

  clusteringModel: `from sklearn.cluster import KMeans

def build_clustering_model(X, n_clusters=3):
    model = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    labels = model.fit_predict(X)
    print(f"KMeans: {n_clusters} clusters, inertia={model.inertia_:.2f}")
    return model, labels

model, cluster_labels = build_clustering_model(X_train_scaled)`,

  clusterVisualizer: `import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA

def visualize_clusters(X, labels, model):
    pca = PCA(n_components=2, random_state=42)
    X_2d = pca.fit_transform(X)
    centers_2d = pca.transform(model.cluster_centers_)
    fig, ax = plt.subplots(figsize=(8, 6))
    scatter = ax.scatter(X_2d[:, 0], X_2d[:, 1], c=labels, cmap='viridis', alpha=0.6, s=30)
    ax.scatter(centers_2d[:, 0], centers_2d[:, 1], c='red', marker='x', s=200, linewidths=3, label='Centroids')
    plt.colorbar(scatter, ax=ax, label='Cluster')
    ax.set_title('KMeans Cluster Visualization (PCA)')
    ax.legend()
    plt.tight_layout()
    plt.savefig('clusters.png', dpi=100)
    print("Cluster plot saved to clusters.png")
    return fig

fig = visualize_clusters(X_train_scaled, cluster_labels, model)`,

  timeSeriesLoader: `import pandas as pd
import numpy as np
import os

def load_time_series(filepath='timeseries.csv', date_col='date'):
    if os.path.exists(filepath):
        df = pd.read_csv(filepath, parse_dates=[date_col])
        df = df.sort_values(date_col).reset_index(drop=True)
        df = df.set_index(date_col)
        print(f"Loaded from file: {filepath}")
    else:
        # Generate synthetic daily time series (2 years)
        np.random.seed(42)
        dates = pd.date_range(start='2022-01-01', periods=730, freq='D')
        trend = np.linspace(100, 150, 730)
        seasonality = 20 * np.sin(2 * np.pi * np.arange(730) / 365)
        noise = np.random.normal(0, 5, 730)
        values = (trend + seasonality + noise).round(2)
        df = pd.DataFrame({'value': values}, index=dates)
        df.index.name = date_col
        print(f"Generated synthetic time series ({filepath} not found)")
    print(f"Records: {len(df)}, Range: {df.index.min()} to {df.index.max()}")
    return df

time_series = load_time_series()`,

  timeSeriesPreprocessor: `import numpy as np

def preprocess_time_series(ts, test_ratio=0.2):
    values = ts.iloc[:, 0].values.astype(float)
    split = int(len(values) * (1 - test_ratio))
    train_vals = values[:split]
    test_vals = values[split:]
    print(f"Train: {len(train_vals)}, Test: {len(test_vals)}")
    return train_vals, test_vals, values

train_vals, test_vals, all_vals = preprocess_time_series(time_series)`,

  timeSeriesModel: `from statsmodels.tsa.arima.model import ARIMA
import warnings
warnings.filterwarnings('ignore')

def build_ts_model(train_data, order=(1, 1, 1)):
    model = ARIMA(train_data, order=order)
    print(f"ARIMA{order} model initialized")
    return model

ts_model = build_ts_model(train_vals)`,

  timeSeriesTrainer: `def train_ts_model(model, test_data):
    fitted = model.fit()
    forecast = fitted.forecast(steps=len(test_data))
    print(f"Trained ARIMA model. Forecast steps: {len(test_data)}")
    print(f"AIC: {fitted.aic:.2f}")
    return fitted, forecast

fitted_model, forecast = train_ts_model(ts_model, test_vals)`,

  forecastVisualizer: `import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def visualize_forecast(all_vals, forecast, test_vals):
    n_train = len(all_vals) - len(test_vals)
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.plot(range(n_train), all_vals[:n_train], label='Train', color='steelblue')
    ax.plot(range(n_train, len(all_vals)), test_vals, label='Actual', color='green')
    ax.plot(range(n_train, n_train + len(forecast)), forecast, label='Forecast', color='orange', linestyle='--')
    ax.set_title('Time Series Forecast')
    ax.set_xlabel('Time Step')
    ax.set_ylabel('Value')
    ax.legend()
    plt.tight_layout()
    plt.savefig('forecast.png', dpi=100)
    print("Forecast plot saved to forecast.png")
    return fig

fig = visualize_forecast(all_vals, forecast, test_vals)`,

  textLoader: `import pandas as pd
import os

def load_text_data(filepath='text_data.csv', text_col='text', label_col='label'):
    if os.path.exists(filepath):
        df = pd.read_csv(filepath)
        print(f"Loaded from file: {filepath}")
    else:
        # Generate synthetic sentiment dataset
        positive = [
            "This product is absolutely amazing and works perfectly",
            "Great quality, very happy with my purchase",
            "Excellent service, fast delivery and good packaging",
            "Love this item, exceeded all my expectations",
            "Fantastic experience, will definitely buy again",
            "Outstanding performance, highly recommended",
            "Very satisfied, best purchase I made this year",
        ] * 20
        negative = [
            "Terrible quality, broke after one day",
            "Very disappointed, does not work as described",
            "Waste of money, completely useless product",
            "Poor customer service and slow shipping",
            "Not worth the price, very cheap materials",
            "Worst purchase ever, avoid this product",
            "Completely dissatisfied with this item",
        ] * 20
        texts = positive + negative
        labels_list = [1] * len(positive) + [0] * len(negative)
        df = pd.DataFrame({text_col: texts, label_col: labels_list})
        print(f"Generated synthetic text dataset ({filepath} not found)")
    texts = df[text_col].astype(str).tolist()
    labels = df[label_col].tolist() if label_col in df.columns else []
    print(f"Loaded {len(texts)} text samples, Classes: {set(labels)}")
    return texts, labels

text_data, labels = load_text_data()`,

  textPreprocessor: `import re

STOPWORDS = {'a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'of', 'and', 'or', 'but', 'to', 'for', 'with', 'as', 'by'}

def preprocess_texts(texts, lowercase=True, remove_stopwords=True):
    processed = []
    for text in texts:
        if lowercase:
            text = text.lower()
        text = re.sub(r'[^\\w\\s]', '', text)
        text = re.sub(r'\\s+', ' ', text).strip()
        if remove_stopwords:
            text = ' '.join(w for w in text.split() if w not in STOPWORDS)
        processed.append(text)
    print(f"Preprocessed {len(processed)} texts")
    return processed

processed_text = preprocess_texts(text_data)`,

  tokenizer: `from collections import Counter

def tokenize_texts(texts, max_vocab=10000):
    tokenized = [text.split() for text in texts]
    all_words = [w for tokens in tokenized for w in tokens]
    vocab = {w: i + 2 for i, (w, _) in enumerate(Counter(all_words).most_common(max_vocab))}
    vocab['<PAD>'] = 0
    vocab['<UNK>'] = 1
    encoded = [[vocab.get(w, 1) for w in tokens] for tokens in tokenized]
    print(f"Vocabulary size: {len(vocab)}")
    return encoded, vocab

tokens, vocab = tokenize_texts(processed_text)`,

  embeddingLayer: `from sklearn.feature_extraction.text import TfidfVectorizer

def create_embeddings(texts, max_features=5000):
    vectorizer = TfidfVectorizer(max_features=max_features, ngram_range=(1, 2))
    embeddings = vectorizer.fit_transform(texts).toarray()
    print(f"TF-IDF embeddings shape: {embeddings.shape}")
    return embeddings, vectorizer

embeddings, vectorizer = create_embeddings(processed_text)`,

  nlpModel: `from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import numpy as np

def train_nlp_model(embeddings, labels, test_size=0.2):
    X = np.clip(embeddings, 0, None)
    X_train, X_test, y_train, y_test = train_test_split(X, labels, test_size=test_size, random_state=42)
    clf = MultinomialNB()
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\\nNLP Classification:")
    print(f"  Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, zero_division=0))
    return clf, y_pred

clf, predictions = train_nlp_model(embeddings, labels)`
};

const TEMPLATE_BASE_BLOCKS = Object.freeze({
  classification: [
    { type: 'DataLoader', name: 'Load Data', icon: '📥', category: 'Data', config: { format: 'csv' }, inputs: [], outputs: ['data'], packages: ['pandas', 'numpy'], code: CODE.dataLoader, status: 'idle' },
    { type: 'DataPreprocessor', name: 'Preprocess', icon: '🔧', category: 'Processing', config: {}, inputs: ['data'], outputs: ['X_train', 'X_test', 'y_train', 'y_test'], packages: ['scikit-learn', 'numpy'], code: CODE.dataPreprocessor, status: 'idle' },
    { type: 'FeatureScaler', name: 'Scale Features', icon: '📊', category: 'Processing', config: { method: 'StandardScaler' }, inputs: ['X_train', 'X_test'], outputs: ['X_train_scaled', 'X_test_scaled'], packages: ['scikit-learn'], code: CODE.featureScaler, status: 'idle' },
    { type: 'ClassificationModel', name: 'Model', icon: '🤖', category: 'Model', config: { algorithm: 'LogisticRegression' }, inputs: ['X_train_scaled'], outputs: ['model'], packages: ['scikit-learn'], code: CODE.classificationModel, status: 'idle' },
    { type: 'ModelTrainer', name: 'Train', icon: '⚡', category: 'Training', config: {}, inputs: ['model', 'X_train_scaled', 'y_train', 'X_test_scaled', 'y_test'], outputs: ['model'], packages: ['scikit-learn'], code: CODE.modelTrainer, status: 'idle' },
    { type: 'ModelEvaluator', name: 'Evaluate', icon: '📈', category: 'Evaluation', config: { metrics: ['accuracy', 'precision', 'recall'] }, inputs: ['model', 'X_test_scaled', 'y_test'], outputs: ['metrics'], packages: ['scikit-learn'], code: CODE.evaluateClassification, status: 'idle' }
  ],
  regression: [
    { type: 'DataLoader', name: 'Load Data', icon: '📥', category: 'Data', config: { format: 'csv' }, inputs: [], outputs: ['data'], packages: ['pandas', 'numpy'], code: CODE.regressionDataLoader, status: 'idle' },
    { type: 'DataPreprocessor', name: 'Preprocess', icon: '🔧', category: 'Processing', config: {}, inputs: ['data'], outputs: ['X_train', 'X_test', 'y_train', 'y_test'], packages: ['scikit-learn', 'numpy'], code: CODE.dataPreprocessor, status: 'idle' },
    { type: 'FeatureScaler', name: 'Scale Features', icon: '📊', category: 'Processing', config: { method: 'StandardScaler' }, inputs: ['X_train', 'X_test'], outputs: ['X_train_scaled', 'X_test_scaled'], packages: ['scikit-learn'], code: CODE.featureScaler, status: 'idle' },
    { type: 'RegressionModel', name: 'Model', icon: '🤖', category: 'Model', config: { algorithm: 'LinearRegression' }, inputs: ['X_train_scaled'], outputs: ['model'], packages: ['scikit-learn'], code: CODE.regressionModel, status: 'idle' },
    { type: 'ModelTrainer', name: 'Train', icon: '⚡', category: 'Training', config: {}, inputs: ['model', 'X_train_scaled', 'y_train', 'X_test_scaled', 'y_test'], outputs: ['model'], packages: ['scikit-learn'], code: CODE.modelTrainer, status: 'idle' },
    { type: 'ModelEvaluator', name: 'Evaluate', icon: '📈', category: 'Evaluation', config: { metrics: ['r2', 'rmse', 'mae'] }, inputs: ['model', 'X_test_scaled', 'y_test'], outputs: ['metrics'], packages: ['scikit-learn', 'numpy'], code: CODE.evaluateRegression, status: 'idle' }
  ],
  clustering: [
    { type: 'DataLoader', name: 'Load Data', icon: '📥', category: 'Data', config: { format: 'csv' }, inputs: [], outputs: ['data'], packages: ['pandas', 'numpy'], code: CODE.regressionDataLoader, status: 'idle' },
    { type: 'DataPreprocessor', name: 'Preprocess', icon: '🔧', category: 'Processing', config: {}, inputs: ['data'], outputs: ['X_train', 'X_test', 'y_train', 'y_test'], packages: ['scikit-learn', 'numpy'], code: CODE.dataPreprocessor, status: 'idle' },
    { type: 'FeatureScaler', name: 'Scale Features', icon: '📊', category: 'Processing', config: { method: 'StandardScaler' }, inputs: ['X_train', 'X_test'], outputs: ['X_train_scaled', 'X_test_scaled'], packages: ['scikit-learn'], code: CODE.featureScaler, status: 'idle' },
    { type: 'ClusteringModel', name: 'Clustering', icon: '🔀', category: 'Model', config: { algorithm: 'KMeans', clusters: 3 }, inputs: ['X_train_scaled'], outputs: ['model', 'cluster_labels'], packages: ['scikit-learn'], code: CODE.clusteringModel, status: 'idle' },
    { type: 'ClusterVisualizer', name: 'Visualize', icon: '📊', category: 'Visualization', config: {}, inputs: ['X_train_scaled', 'cluster_labels', 'model'], outputs: ['fig'], packages: ['matplotlib', 'scikit-learn'], code: CODE.clusterVisualizer, status: 'idle' }
  ],
  timeseries: [
    { type: 'DataLoader', name: 'Load Time Series', icon: '📥', category: 'Data', config: { format: 'csv', dateColumn: 'date' }, inputs: [], outputs: ['time_series'], packages: ['pandas'], code: CODE.timeSeriesLoader, status: 'idle' },
    { type: 'DataPreprocessor', name: 'Preprocess', icon: '🔧', category: 'Processing', config: {}, inputs: ['time_series'], outputs: ['train_vals', 'test_vals', 'all_vals'], packages: ['numpy'], code: CODE.timeSeriesPreprocessor, status: 'idle' },
    { type: 'TimeSeriesModel', name: 'Forecasting Model', icon: '🤖', category: 'Model', config: { algorithm: 'ARIMA' }, inputs: ['train_vals'], outputs: ['ts_model'], packages: ['statsmodels'], code: CODE.timeSeriesModel, status: 'idle' },
    { type: 'ModelTrainer', name: 'Train', icon: '⚡', category: 'Training', config: {}, inputs: ['ts_model', 'test_vals'], outputs: ['fitted_model', 'forecast'], packages: ['statsmodels'], code: CODE.timeSeriesTrainer, status: 'idle' },
    { type: 'ForecastVisualizer', name: 'Visualize', icon: '📈', category: 'Visualization', config: {}, inputs: ['all_vals', 'forecast', 'test_vals'], outputs: ['fig'], packages: ['matplotlib'], code: CODE.forecastVisualizer, status: 'idle' }
  ],
  nlp: [
    { type: 'TextLoader', name: 'Load Text Data', icon: '📥', category: 'Data', config: { format: 'csv' }, inputs: [], outputs: ['text_data', 'labels'], packages: ['pandas'], code: CODE.textLoader, status: 'idle' },
    { type: 'TextPreprocessor', name: 'Preprocess', icon: '🔧', category: 'Processing', config: { lowercase: true, remove_stopwords: true }, inputs: ['text_data'], outputs: ['processed_text'], packages: [], code: CODE.textPreprocessor, status: 'idle' },
    { type: 'Tokenizer', name: 'Tokenize', icon: '📝', category: 'Processing', config: { method: 'word' }, inputs: ['processed_text'], outputs: ['tokens', 'vocab'], packages: [], code: CODE.tokenizer, status: 'idle' },
    { type: 'EmbeddingLayer', name: 'Embeddings', icon: '🧮', category: 'Feature', config: { method: 'TF-IDF' }, inputs: ['processed_text'], outputs: ['embeddings', 'vectorizer'], packages: ['scikit-learn'], code: CODE.embeddingLayer, status: 'idle' },
    { type: 'NLPModel', name: 'Classification Model', icon: '🤖', category: 'Model', config: { algorithm: 'NaiveBayes' }, inputs: ['embeddings', 'labels'], outputs: ['clf', 'predictions'], packages: ['scikit-learn', 'numpy'], code: CODE.nlpModel, status: 'idle' }
  ],
  blank: []
});

function cloneBlock(block, generateBlockId) {
  return {
    ...block,
    id: generateBlockId(),
    config: { ...(block.config || {}) },
    inputs: Array.isArray(block.inputs) ? [...block.inputs] : [],
    outputs: Array.isArray(block.outputs) ? [...block.outputs] : [],
    packages: Array.isArray(block.packages) ? [...block.packages] : [],
    code: typeof block.code === 'string' ? block.code : '',
    output: '',
    status: block.status || 'idle'
  };
}

export function createTemplateBlocks(templateId, generateBlockId, catalogEntries = []) {
  const blocks = (TEMPLATE_BASE_BLOCKS[templateId] || []).map(block => cloneBlock(block, generateBlockId));

  const packageByBlockName = new Map(
    (Array.isArray(catalogEntries) ? catalogEntries : [])
      .filter(item => item && item.blockName && item.package)
      .map(item => [String(item.blockName).trim(), String(item.package).trim()])
  );

  blocks.forEach(block => {
    const packageName = packageByBlockName.get(String(block?.name || '').trim());
    if (!packageName) {
      return;
    }

    if (!Array.isArray(block.packages) || block.packages.length === 0) {
      block.packages = [packageName];
    }

    if (!block.config || typeof block.config !== 'object') {
      block.config = {};
    }
    if (!block.config.package) {
      block.config.package = packageName;
    }
  });

  return blocks;
}
