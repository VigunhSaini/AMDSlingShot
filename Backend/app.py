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
    
    # Configure CORS to allow frontend domains
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",  # Vite dev server
                "http://localhost:5174",
                "http://localhost:3000",
                "https://amdslingshot-frontend.vercel.app",
                "https://*.vercel.app"  # Allow all Vercel preview deployments
            ],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"],
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
