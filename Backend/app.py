"""
app.py — Flask entry point for AMDSlingShot Backend

Registers the analyze blueprint and enables CORS.
Run: python app.py
"""

from flask import Flask
from flask_cors import CORS
from routes.analyze import analyze_bp


def create_app():
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(analyze_bp)
    return app


if __name__ == "__main__":
    app = create_app()
    print("=" * 50)
    print("  AMDSlingShot Backend — Flask API")
    print("  Running on http://localhost:5000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=True)
