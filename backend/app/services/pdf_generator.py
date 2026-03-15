from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from datetime import datetime
import os

def create_pdf(filename: str, title: str, content: list):
    """
    Generates a PDF file with the given filename, title, and content.
    content: List of dictionaries with 'question' and 'answer'.
    """
    doc = SimpleDocTemplate(filename, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = styles['Title']
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 12))

    # Date
    date_style = styles['Normal']
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}", date_style))
    story.append(Spacer(1, 24))

    # Questions and Answers
    q_style = ParagraphStyle('Question', parent=styles['Heading3'], spaceAfter=6, textColor=colors.darkblue)
    a_style = ParagraphStyle('Answer', parent=styles['Normal'], spaceAfter=12, leftIndent=20)

    for i, item in enumerate(content, 1):
        # Question
        story.append(Paragraph(f"Q{i}: {item['question']}", q_style))
        
        # Answer (if provided)
        if 'answer' in item and item['answer']:
             story.append(Paragraph(f"<b>Answer:</b> {item['answer']}", a_style))
        else:
             story.append(Spacer(1, 24)) # Space for writing answer if it's a QP

    doc.build(story)
    return filename

def generate_practice_paper(chat_history: list, session_id: int):
    """
    Uses AI to generate practice questions based on the specific chat session.
    """
    from groq import Groq
    import os
    import json
    
    # Build context from chat history
    context = "\n".join([f"{msg['role']}: {msg['content']}" for msg in chat_history])
    
    # Use AI to generate questions
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    try:
        prompt = f"""
        Based on this educational chat conversation, generate 10-15 practice questions with answers.
        The questions should test understanding of the topics discussed in this specific conversation.
        
        Return a JSON array of objects with "question" and "answer" fields.
        Make questions progressively harder - start with recall, then comprehension, then application.
        
        Format:
        [
            {{"question": "What is...", "answer": "..."}},
            {{"question": "Explain...", "answer": "..."}},
            ...
        ]
        
        Chat Conversation:
        {context[:8000]}
        """
        
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        
        result = json.loads(completion.choices[0].message.content)
        
        # Handle different possible response formats
        if isinstance(result, dict) and "questions" in result:
            questions = result["questions"]
        elif isinstance(result, list):
            questions = result
        else:
            # Fallback to mock questions if AI response is unexpected
            questions = [
                {"question": "Summarize the main topics discussed.", "answer": "Based on the conversation..."},
                {"question": "What were the key concepts covered?", "answer": "The key concepts were..."},
            ]
    
    except Exception as e:
        print(f"AI Question Generation Error: {e}")
        # Fallback to simple questions based on chat
        questions = [
            {"question": "What topics were discussed in this session?", "answer": "Review the chat history for topics covered."},
            {"question": "Summarize what you learned.", "answer": "Reflect on the key points from the conversation."},
        ]
    
    # Ensure we have at least some questions
    if not questions or len(questions) == 0:
        questions = [
            {"question": "Review the chat and list the main topics.", "answer": "Topics from the conversation."},
        ]
    
    # Paths
    if not os.path.exists("static/reports"):
        os.makedirs("static/reports")

    # 1. Question Paper (No Answers)
    qp_filename = f"static/reports/{session_id}_qp.pdf"
    qp_content = [{"question": q["question"]} for q in questions]
    create_pdf(qp_filename, "EduGuard Practice Paper", qp_content)

    # 2. Answer Key (With Answers)
    key_filename = f"static/reports/{session_id}_key.pdf"
    create_pdf(key_filename, "EduGuard Answer Key", questions)

    return qp_filename, key_filename
