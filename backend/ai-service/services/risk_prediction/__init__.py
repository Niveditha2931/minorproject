"""
Risk Prediction Service
LSTM-based disaster risk classification using real-time data
"""

from .lstm_risk_model import RiskPredictor, risk_router

__all__ = ["RiskPredictor", "risk_router"]
