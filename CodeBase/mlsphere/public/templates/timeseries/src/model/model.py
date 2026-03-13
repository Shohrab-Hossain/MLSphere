from statsmodels.tsa.arima.model import ARIMA
import warnings
warnings.filterwarnings('ignore')

def build_ts_model(train_data, order=(2, 1, 2)):
    """Initialize ARIMA model with given order (p,d,q)."""
    model = ARIMA(train_data, order=order)
    print(f"ARIMA{order} model initialized on {len(train_data)} training periods")
    return model

ts_model = build_ts_model(train_vals)
