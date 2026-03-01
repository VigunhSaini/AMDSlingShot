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
    
    # Custom CORS origin validator
    def is_allowed_origin(origin):
        """
        Allow requests from:
        - Your Vercel deployments (e.g., amdslingshot-frontend.vercel.app)
        - Local development servers
        """
        if not origin:
            return False
        
        # Allow localhost for development
        if origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:"):
            return True
        
        # Allow all Vercel app deployments
        if origin.startswith("https://") and origin.endswith(".vercel.app"):
            return True
        
        return False
    
    # Configure CORS with custom origin validator
    CORS(app, resources={
        r"/*": {
            "origins": is_allowed_origin,  # Use function to validate origins
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
