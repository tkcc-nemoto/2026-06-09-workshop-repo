import os
from pathlib import Path

from flask import Flask, render_template


BASE_DIR = Path(__file__).resolve().parent

app = Flask(
	__name__,
	root_path=str(BASE_DIR),
	template_folder="templates",
	static_folder="static",
)


@app.get("/")
def index():
	return render_template("index.html")


if __name__ == "__main__":
	debug_mode = os.getenv("FLASK_DEBUG", "").lower() in ("1", "true", "yes", "on")
	app.run(host="0.0.0.0", port=5000, debug=debug_mode)
