import React, { useState } from "react";
import "./App.css";

function App() {
  const [topic, setTopic] = useState("");
  const [template, setTemplate] = useState("modern");
  const [slideCount, setSlideCount] = useState(6); // ✅ New state
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("auto"); // auto = AI, manual = user text

  // 🔧 Backend base URL (easy to change if deployed)
  const BASE_URL = "https://ai-ppt-generator-tphq.onrender.com";

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setStatus("⚠️ Please enter a topic first.");
      return;
    }

    setLoading(true);
    setStatus("⏳ Generating your presentation...");

    try {
      const endpoint =
        mode === "auto"
          ? `${BASE_URL}/generate-auto-ppt`
          : `${BASE_URL}/generate-ppt`;

      const payload =
        mode === "auto"
          ? { topic, template, slide_count: slideCount } // ✅ send slide count
          : { text: topic, template };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setLoading(false);

      if (data.success) {
        setStatus("✅ Presentation generated! Preparing download...");
        const link = document.createElement("a");
        link.href = data.download_url;
        link.download = "EDUSLIDE_Presentation.pptx";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setStatus("✅ Download complete!");
      } else {
        setStatus("❌ Failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("❌ Backend error:", error);
      setLoading(false);
      setStatus(
        "⚠️ Error: Could not connect to backend. Make sure Flask is running."
      );
    }
  };

  const handleClear = () => {
    setTopic("");
    setStatus("");
  };

  return (
    <>
      {/* Navbar */}
      <div className="navbar">
        <div className="brand">
          <div className="logo">ES</div>
          <div>
            <h2 style={{ margin: 0 }}>EDUSLIDE</h2>
            <div style={{ fontSize: 12, color: "rgba(230,240,255,0.7)" }}>
              AI PPT Generator
            </div>
          </div>
        </div>
        <div className="nav-actions">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(210,230,255,0.8)" }}>
              v2.2
            </div>
            <div
              style={{
                fontSize: 13,
                color:
                  mode === "auto"
                    ? "rgba(120,255,150,0.9)"
                    : "rgba(255,220,120,0.9)",
              }}
            >
              {mode === "auto" ? "AI Mode" : "Manual Mode"}
            </div>
          </div>
        </div>
      </div>

      {/* App Body */}
      <div className="app-wrap">
        <div className="card">
          <div className="left">
            <div className="title-big">
              Create a presentation — just give a topic
            </div>
            <p className="subtitle">
              Type a topic (e.g., "AI in Healthcare") and EDUSLIDE will
              auto-generate a PowerPoint file.
            </p>

            <div className="input-area">
              <textarea
                placeholder={
                  mode === "auto"
                    ? "Enter a topic (e.g., The Future of Renewable Energy)"
                    : "Enter custom slide text manually here..."
                }
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="hint">
              {mode === "auto"
                ? "💡 Tip: Keep your topic short and specific for best AI results."
                : "✏️ You can paste your own slide structure here (Slide 1: ...)"}
            </div>

            <div className="row">
              {/* Template selector */}
              <div className="template-select">
                <label>Choose template</label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option>
                  <option value="corporate">Corporate</option>
                  <option value="creative">Creative</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              {/* Mode selector */}
              <div className="template-select">
                <label>Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="auto">Auto (AI)</option>
                  <option value="manual">Manual (Custom)</option>
                </select>
              </div>

              {/* ✅ Slide Count selector (only for auto mode) */}
              {mode === "auto" && (
                <div className="template-select">
                  <label>Slides</label>
                  <select
                    value={slideCount}
                    onChange={(e) => setSlideCount(parseInt(e.target.value))}
                  >
                    {[4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} Slides
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "end" }}>
                <button className="btn secondary" onClick={handleClear}>
                  Clear
                </button>
              </div>
            </div>

            <div className="controls">
              <button
                className="btn"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div className="spinner" /> Generating...
                  </div>
                ) : (
                  "Generate PPT"
                )}
              </button>
            </div>

            <div className="status">{status}</div>
          </div>

          {/* Right side info */}
          <div className="right">
            <div className="preview-card">
              <div className="preview-title">Template Preview</div>
              <div className="preview-list">
                <div>• Modern — bold title, dark background</div>
                <div>• Minimal — white background, clean fonts</div>
                <div>• Corporate — navy + gold</div>
                <div>• Creative — purple theme, lively</div>
                <div>• Dark — dark mode with neon text</div>
              </div>

              <div className="template-thumbs">
                <div className="thumb">Modern</div>
                <div className="thumb">Minimal</div>
                <div className="thumb">Corp</div>
                <div className="thumb">Creative</div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  color: "rgba(200,220,255,0.8)",
                }}
              >
                💡 Add images in <code>backend/images</code> for visual slides
                (coming soon!).
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
