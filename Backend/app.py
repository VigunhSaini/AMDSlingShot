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
    
    # Configure CORS to allow Vercel deployments and localhost
    # Using regex pattern to match all .vercel.app domains
    CORS(app, resources={
        r"/*": {
            "origins": [
                r"https://.*\.vercel\.app",  # All Vercel deployments
                r"http://localhost:\d+",      # Localhost with any port
                r"http://127\.0\.0\.1:\d+"    # 127.0.0.1 with any port
            ],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type"],
            "supports_credentials": False
        }
    })
    
    app.register_blueprint(analyze_bp)
    return app


# Create the app instance for Vercel
app = create_app()

if __name__ == "__main__":
    print("=" * 50)
    print("  AMDSlingShot Backend — Flask API")
    print("  Running on http://localhost:5000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=True)
