import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Dummy values so the hosted app can be imported in CI without a real .env
for key, value in {
    "MAIL_USERNAME": "test", "MAIL_PASSWORD": "test", "MAIL_FROM": "test@example.com",
    "MAIL_SERVER": "localhost", "MAIL_PORT": "25", "SECRET_KEY": "test-secret",
}.items():
    os.environ.setdefault(key, value)
