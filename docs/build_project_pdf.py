"""Render docs/PROJECT_EXPLANATION.md as a styled single-column PDF.

Uses only reportlab (already installed).  A small, deliberately simple
markdown parser handles headings, bullet / numbered lists, pipe tables,
fenced code blocks, bold, italic and inline code.
"""
from __future__ import annotations

import os
import re
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, StyleSheet1
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, Preformatted,
)
from reportlab.platypus.flowables import HRFlowable

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, "PROJECT_EXPLANATION.md")
OUT  = os.path.join(HERE, "PROJECT_EXPLANATION.pdf")

# --- palette -----------------------------------------------------
INK      = colors.HexColor("#191919")
MUTED    = colors.HexColor("#77736C")
ACCENT   = colors.HexColor("#7656E8")
ACCENT2  = colors.HexColor("#5E3FD6")
BORDER   = colors.HexColor("#E6E0D5")
PAPER    = colors.HexColor("#FDFBF3")
CODE_BG  = colors.HexColor("#1E1B2D")
CODE_FG  = colors.HexColor("#C9BFF7")
SUBTLE   = colors.HexColor("#F2EDE1")

# --- styles ------------------------------------------------------
styles = StyleSheet1()
styles.add(ParagraphStyle("Title",
    fontName="Helvetica-Bold", fontSize=22, leading=26,
    textColor=INK, spaceAfter=4))
styles.add(ParagraphStyle("Subtitle",
    fontName="Helvetica", fontSize=11, leading=14,
    textColor=MUTED, spaceAfter=14))
styles.add(ParagraphStyle("H1",
    fontName="Helvetica-Bold", fontSize=16.5, leading=20,
    textColor=INK, spaceBefore=16, spaceAfter=5))
styles.add(ParagraphStyle("H2",
    fontName="Helvetica-Bold", fontSize=13, leading=16,
    textColor=INK, spaceBefore=11, spaceAfter=3))
styles.add(ParagraphStyle("H3",
    fontName="Helvetica-Bold", fontSize=11, leading=14,
    textColor=INK, spaceBefore=7, spaceAfter=2))
styles.add(ParagraphStyle("Body",
    fontName="Helvetica", fontSize=10, leading=13.5,
    textColor=INK, alignment=4, spaceAfter=4))
styles.add(ParagraphStyle("Bullet",
    fontName="Helvetica", fontSize=10, leading=13.5,
    textColor=INK, leftIndent=14, bulletIndent=4, spaceAfter=1))
styles.add(ParagraphStyle("TableCell",
    fontName="Helvetica", fontSize=9, leading=11.5, textColor=INK))
styles.add(ParagraphStyle("TableHead",
    fontName="Helvetica-Bold", fontSize=9, leading=11.5, textColor=INK))
styles.add(ParagraphStyle("Code",
    fontName="Courier", fontSize=8.3, leading=10.5, textColor=CODE_FG,
    backColor=CODE_BG, leftIndent=10, rightIndent=10,
    borderPadding=8, borderRadius=6, spaceBefore=4, spaceAfter=6))


# --- inline formatting -------------------------------------------
INLINE_CODE = re.compile(r"`([^`]+)`")
BOLD_RE     = re.compile(r"\*\*([^*]+)\*\*")
EMPH_RE     = re.compile(r"(?<!\*)\*([^*]+)\*(?!\*)")

def inline(md: str) -> str:
    s = (md.replace("&", "&amp;")
           .replace("<", "&lt;")
           .replace(">", "&gt;"))
    s = BOLD_RE.sub(r"<b>\1</b>", s)
    s = EMPH_RE.sub(r"<i>\1</i>", s)
    s = INLINE_CODE.sub(
        lambda m: f'<font face="Courier" color="#5E3FD6">{m.group(1)}</font>', s)
    return s


# --- parser ------------------------------------------------------
TABLE_SEP = re.compile(r"^\s*\|?\s*[:\-\s|]+\s*\|?\s*$")

def parse(md: str):
    """Yield Platypus flowables for the given markdown."""
    out = []
    lines = md.split("\n")
    i, N = 0, len(lines)
    buf: list[str] = []

    def flush():
        if buf:
            text = " ".join(l.strip() for l in buf if l.strip())
            if text:
                out.append(Paragraph(inline(text), styles["Body"]))
            buf.clear()

    while i < N:
        ln = lines[i]
        stripped = ln.rstrip()

        # fenced code block
        if stripped.startswith("```"):
            flush()
            i += 1
            code: list[str] = []
            while i < N and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1
            out.append(Preformatted("\n".join(code), styles["Code"]))
            continue

        # pipe table — header | --- | row+
        if ("|" in stripped and i + 1 < N and TABLE_SEP.match(lines[i+1])):
            flush()
            header = [c.strip() for c in stripped.strip("|").split("|")]
            i += 2
            rows: list[list[str]] = []
            while i < N:
                row_line = lines[i].rstrip()
                if "|" not in row_line or not row_line.strip():
                    break
                cells = [c.strip() for c in row_line.strip("|").split("|")]
                if len(cells) != len(header):
                    break
                rows.append(cells)
                i += 1
            data = [[Paragraph(inline(c), styles["TableHead"]) for c in header]]
            for r in rows:
                data.append([Paragraph(inline(c), styles["TableCell"]) for c in r])
            pw = LETTER[0] - 2 * 0.75 * inch
            tbl = Table(data, colWidths=[pw / len(header)] * len(header),
                        repeatRows=1)
            tbl.setStyle(TableStyle([
                ("GRID",         (0, 0), (-1, -1), 0.4, BORDER),
                ("BACKGROUND",   (0, 0), (-1, 0),  SUBTLE),
                ("LINEBELOW",    (0, 0), (-1, 0),  0.8, INK),
                ("VALIGN",       (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING",   (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
                ("LEFTPADDING",  (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]))
            out.append(Spacer(1, 2)); out.append(tbl); out.append(Spacer(1, 6))
            continue

        # horizontal rule
        if stripped in ("---", "***"):
            flush()
            out.append(Spacer(1, 2))
            out.append(HRFlowable(width="100%", thickness=0.4,
                                  color=BORDER, spaceAfter=4))
            i += 1
            continue

        # headings
        if stripped.startswith("#### "):
            flush(); out.append(Paragraph(inline(stripped[5:]), styles["H3"])); i += 1; continue
        if stripped.startswith("### "):
            flush(); out.append(Paragraph(inline(stripped[4:]), styles["H2"])); i += 1; continue
        if stripped.startswith("## "):
            flush(); out.append(Paragraph(inline(stripped[3:]), styles["H1"])); i += 1; continue
        if stripped.startswith("# "):
            flush(); out.append(Paragraph(inline(stripped[2:]), styles["Title"])); i += 1; continue

        # bullet list item
        m_b = re.match(r"^\s*[-*]\s+(.*)$", ln)
        if m_b:
            flush()
            out.append(Paragraph(inline(m_b.group(1)),
                                 styles["Bullet"], bulletText="•"))
            i += 1; continue

        # numbered list item
        m_n = re.match(r"^\s*(\d+)\.\s+(.*)$", ln)
        if m_n:
            flush()
            out.append(Paragraph(inline(m_n.group(2)),
                                 styles["Bullet"],
                                 bulletText=f"{m_n.group(1)}."))
            i += 1; continue

        # blank line -> paragraph break
        if not stripped:
            flush(); i += 1; continue

        buf.append(ln); i += 1

    flush()
    return out


# --- page chrome -------------------------------------------------
def build():
    page_w, page_h = LETTER
    margin = 0.75 * inch

    def draw_chrome(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, page_w, page_h, fill=1, stroke=0)
        # masthead
        canvas.setFillColor(INK)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.drawString(margin, page_h - margin + 10,
                          "BIOVISION INTELLIGENCE  ·  PROJECT EXPLANATION")
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 8.5)
        canvas.drawRightString(page_w - margin, page_h - margin + 10,
                               f"Page {doc.page}")
        # accent + border rules
        canvas.setStrokeColor(ACCENT); canvas.setLineWidth(0.7)
        canvas.line(margin, page_h - margin + 4,
                    margin + 42, page_h - margin + 4)
        canvas.setStrokeColor(BORDER); canvas.setLineWidth(0.3)
        canvas.line(margin + 44, page_h - margin + 4,
                    page_w - margin, page_h - margin + 4)
        # footer
        canvas.setFillColor(MUTED); canvas.setFont("Helvetica-Oblique", 8)
        canvas.drawString(margin, margin / 2,
                          "Research prototype — not for clinical use.")
        canvas.drawRightString(page_w - margin, margin / 2,
                               "github.com/your-repo/biovision")
        canvas.restoreState()

    frame = Frame(margin, margin, page_w - 2*margin, page_h - 2*margin,
                  leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=10, id="main")
    tpl = PageTemplate(id="main", frames=[frame], onPage=draw_chrome)

    doc = BaseDocTemplate(OUT, pagesize=LETTER, pageTemplates=[tpl],
                          leftMargin=margin, rightMargin=margin,
                          topMargin=margin, bottomMargin=margin,
                          title="BioVision — Project Explanation",
                          author="BioVision team")

    md = open(SRC, encoding="utf-8").read()
    md = md.replace("# BioVision Intelligence — Project Explanation\n", "", 1)

    story = [
        Paragraph("BioVision Intelligence", styles["Title"]),
        Paragraph("Project explanation — architecture, warehousing "
                  "reasoning, data provenance and model metrics. "
                  "Generated from the live backend on 2026-10-28.",
                  styles["Subtitle"]),
        HRFlowable(width="42%", thickness=1.2, color=ACCENT,
                   spaceBefore=0, spaceAfter=12, hAlign="LEFT"),
    ]
    story.extend(parse(md))

    doc.build(story)
    print(f"wrote {OUT}  ({os.path.getsize(OUT):,} bytes)")


if __name__ == "__main__":
    build()
