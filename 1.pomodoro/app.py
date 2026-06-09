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
	app.run(host="0.0.0.0", port=5000, debug=True)
