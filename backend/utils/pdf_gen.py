import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def generate_competitor_report(company_name: str, summary: str, updates: list) -> io.BytesIO:
    """Generate a PDF report from scout data as an in-memory byte buffer."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    story.append(Paragraph(f"MarketScout Report: {company_name}", styles['Title']))
    story.append(Spacer(1, 12))
    
    # Summary Section
    story.append(Paragraph("AI Insights & Summary", styles['Heading2']))
    story.append(Spacer(1, 6))
    for line in summary.split('\n'):
        if line.strip():
            story.append(Paragraph(line.strip(), styles['BodyText']))
            story.append(Spacer(1, 4))
            
    story.append(Spacer(1, 12))
    
    # Updates Section
    story.append(Paragraph("Recent Sources (Tavily)", styles['Heading2']))
    story.append(Spacer(1, 6))
    
    for update in updates:
        title = update.get('title', 'Unknown Title')
        url = update.get('url', '#')
        content = update.get('content', '')[:200] + '...'
        
        story.append(Paragraph(f"<b>{title}</b>", styles['Heading3']))
        story.append(Paragraph(f"<i>Source: {url}</i>", styles['BodyText']))
        story.append(Paragraph(content, styles['BodyText']))
        story.append(Spacer(1, 8))

    doc.build(story)
    buffer.seek(0)
    return buffer
