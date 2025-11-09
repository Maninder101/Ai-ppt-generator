from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
import os
import uuid
import re
import google.generativeai as genai
from dotenv import load_dotenv

# --------------------------
# Load Environment Variables
# --------------------------
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("❌ Missing GOOGLE_API_KEY in .env file!")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

# --------------------------
# Flask App Setup
# --------------------------
app = Flask(__name__, static_folder='frontend/build')  # Serve React build
CORS(app)

OUTPUT_DIR = "generated"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --------------------------
# Utility Functions
# --------------------------
def parse_slides(text, max_slides=6):
    slides = re.findall(r"Slide\s*\d+\s*:\s*(.*?)(?=Slide\s*\d+\s*:|$)", text, re.DOTALL)
    parsed = []
    for s in slides:
        lines = [l.strip(" -•\n") for l in s.strip().split("\n") if l.strip()]
        if lines:
            parsed.append({"title": lines[0], "points": lines[1:]})
    return parsed[:max_slides]

def apply_template_style(slide, template):
    theme_colors = {
        "modern": {"bg": RGBColor(25, 25, 112), "text": RGBColor(255, 255, 255)},
        "minimal": {"bg": RGBColor(255, 255, 255), "text": RGBColor(30, 30, 30)},
        "corporate": {"bg": RGBColor(0, 51, 102), "text": RGBColor(255, 215, 0)},
        "creative": {"bg": RGBColor(128, 0, 128), "text": RGBColor(255, 255, 255)},
        "dark": {"bg": RGBColor(15, 15, 15), "text": RGBColor(200, 200, 200)},
    }
    colors = theme_colors.get(template, theme_colors["modern"])
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = colors["bg"]
    return colors["text"]

def generate_ppt_content(topic, slide_count=6):
    prompt = f"""
    Create a PowerPoint presentation outline on the topic: "{topic}".
    Include exactly {slide_count} slides.
    Format exactly like this:

    Slide 1: Title of the slide
    - Bullet point 1
    - Bullet point 2
    - Bullet point 3
    """
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print("❌ Error generating content:", e)
        return None

def create_ppt_from_slides(slides_data, template):
    prs = Presentation()
    prs.slide_width = Inches(13.33)
    prs.slide_height = Inches(7.5)

    for slide_data in slides_data:
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        text_color = apply_template_style(slide, template)

        # Title box
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.8), Inches(12.3), Inches(1.2))
        title_tf = title_box.text_frame
        title_tf.clear()
        p = title_tf.add_paragraph()
        p.text = slide_data["title"]
        p.font.size = Pt(40)
        p.font.bold = True
        p.font.color.rgb = text_color
        p.alignment = PP_ALIGN.CENTER

        # Content box
        content_box = slide.shapes.add_textbox(Inches(1.5), Inches(2.3), Inches(10.3), Inches(4))
        content_tf = content_box.text_frame
        content_tf.word_wrap = True

        for bullet in slide_data["points"]:
            bp = content_tf.add_paragraph()
            bp.text = f"➤ {bullet.strip()}"
            bp.font.size = Pt(24)
            bp.font.color.rgb = text_color
            bp.level = 0
            bp.space_after = Pt(10)

    filename = f"{uuid.uuid4()}.pptx"
    filepath = os.path.join(OUTPUT_DIR, filename)
    prs.save(filepath)
    return filename

# --------------------------
# API Routes
# --------------------------
@app.route('/generate-ppt', methods=['POST'])
def generate_ppt_api():
    data = request.get_json()
    topic_text = data.get('text', '').strip()
    template = data.get('template', 'modern')
    if not topic_text:
        return jsonify({"success": False, "error": "Empty topic"}), 400
    slides_data = parse_slides(topic_text)
    if not slides_data:
        return jsonify({"success": False, "error": "No valid slides found"}), 400
    filename = create_ppt_from_slides(slides_data, template)
    return jsonify({
        "success": True,
        "file_path": f"/generated/{filename}",
        "download_url": f"/generated/{filename}"
    })

@app.route('/generate-auto-ppt', methods=['POST'])
def generate_auto_ppt_api():
    data = request.get_json()
    topic = data.get('topic', '').strip()
    template = data.get('template', 'modern')
    slide_count = int(data.get('slide_count', 6))
    if not topic:
        return jsonify({"success": False, "error": "No topic provided"}), 400
    ai_text = generate_ppt_content(topic, slide_count)
    if not ai_text:
        return jsonify({"success": False, "error": "AI generation failed"}), 500
    slides_data = parse_slides(ai_text, slide_count)
    if not slides_data:
        return jsonify({"success": False, "error": "AI did not return valid slides"}), 400
    filename = create_ppt_from_slides(slides_data, template)
    return jsonify({
        "success": True,
        "file_path": f"/generated/{filename}",
        "download_url": f"/generated/{filename}",
        "slides_generated": len(slides_data)
    })

@app.route('/generated/<path:filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(OUTPUT_DIR, filename, as_attachment=True)

# --------------------------
# Serve React Frontend
# --------------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    if path != "" and os.path.exists(f"frontend/build/{path}"):
        return send_from_directory("frontend/build", path)
    else:
        return send_from_directory("frontend/build", "index.html")

# --------------------------
# Run Server
# --------------------------
if __name__ == '__main__':
    print("✅ Flask server running with Gemini AI PPT generator ready!")
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
