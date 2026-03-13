import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

def visualize_forecast(all_vals, forecast, test_vals, ts_index=None):
    n_train = len(all_vals) - len(test_vals)
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.plot(range(n_train), all_vals[:n_train], label='Historical', color='steelblue', lw=2)
    ax.plot(range(n_train, len(all_vals)), test_vals, label='Actual', color='green', lw=2, marker='o', ms=4)
    ax.plot(range(n_train, n_train + len(forecast)), forecast, label='Forecast', color='orange', lw=2, ls='--', marker='s', ms=4)
    # Confidence band (±1 std)
    std = np.std(all_vals[:n_train])
    ax.fill_between(range(n_train, n_train + len(forecast)),
                    forecast - std, forecast + std, alpha=0.2, color='orange', label='±1 Std')
    ax.axvline(x=n_train, color='gray', ls=':', label='Train/Test split')
    ax.set_title('Sales Forecast — ARIMA Model', fontsize=14, fontweight='bold')
    ax.set_xlabel('Time Period')
    ax.set_ylabel('Sales')
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('forecast.png', dpi=100, bbox_inches='tight')
    print("Forecast chart saved to forecast.png")
    return fig

fig = visualize_forecast(all_vals, forecast, test_vals)
