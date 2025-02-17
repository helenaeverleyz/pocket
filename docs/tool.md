---
layout: default
title: "Tool"
parent: "Details"
nav_order: 2
---

# Tool

Similar to LLM wrappers, we **don't** provide built-in tools. Here, we recommend some *minimal* (and incomplete) implementations of commonly used tools. These examples can serve as a starting point for your own tooling.

---


## 1. Embedding Calls

```python
def get_embedding(text):
    from openai import OpenAI
    client = OpenAI(api_key="YOUR_API_KEY_HERE")
    r = client.embeddings.create(
        model="text-embedding-ada-002",
        input=text
    )
    return r.data[0].embedding

get_embedding("What's the meaning of life?")
```

---

## 2. Vector Database (Faiss)

```python
import faiss
import numpy as np

def create_index(embeddings):
    dim = len(embeddings[0])
    index = faiss.IndexFlatL2(dim)
    index.add(np.array(embeddings).astype('float32'))
    return index

def search_index(index, query_embedding, top_k=5):
    D, I = index.search(
        np.array([query_embedding]).astype('float32'), 
        top_k
    )
    return I, D

index = create_index(embeddings)
search_index(index, query_embedding)
```

---

## 3. Local Database

```python
import sqlite3

def execute_sql(query):
    conn = sqlite3.connect("mydb.db")
    cursor = conn.cursor()
    cursor.execute(query)
    result = cursor.fetchall()
    conn.commit()
    conn.close()
    return result
```


> ⚠️ Beware of SQL injection risk
{: .warning }

---

## 4. Python Function Execution

```python
def run_code(code_str):
    env = {}
    exec(code_str, env)
    return env

run_code("print('Hello, world!')")
```

> ⚠️ exec() is dangerous with untrusted input
{: .warning }


---

## 5. PDF Extraction

If your PDFs are text-based, use PyMuPDF:

```python
import fitz  # PyMuPDF

def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text

extract_text("document.pdf")
```

For image-based PDFs (e.g., scanned), OCR is needed. A easy and fast option is using an LLM with vision capabilities:

```python
from openai import OpenAI
import base64

def call_llm_vision(prompt, image_data):
    client = OpenAI(api_key="YOUR_API_KEY_HERE")
    img_base64 = base64.b64encode(image_data).decode('utf-8')
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", 
                 "image_url": {"url": f"data:image/png;base64,{img_base64}"}}
            ]
        }]
    )
    
    return response.choices[0].message.content

pdf_document = fitz.open("document.pdf")
page_num = 0
page = pdf_document[page_num]
pix = page.get_pixmap()
img_data = pix.tobytes("png")

call_llm_vision("Extract text from this image", img_data)
```

---

## 6. Web Crawling

```python
def crawl_web(url):
    import requests
    from bs4 import BeautifulSoup
    html = requests.get(url).text
    soup = BeautifulSoup(html, "html.parser")
    return soup.title.string, soup.get_text()
```

---

## 7. Basic Search (SerpAPI example)

```python
def search_google(query):
    import requests
    params = {
        "engine": "google",
        "q": query,
        "api_key": "YOUR_API_KEY"
    }
    r = requests.get("https://serpapi.com/search", params=params)
    return r.json()
```

---


## 8. Audio Transcription (OpenAI Whisper)

```python
def transcribe_audio(file_path):
    import openai
    audio_file = open(file_path, "rb")
    transcript = openai.Audio.transcribe("whisper-1", audio_file)
    return transcript["text"]
```

---

## 9. Text-to-Speech (TTS)

```python
def text_to_speech(text):
    import pyttsx3
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()
```

---

## 10. Sending Email

```python
def send_email(to_address, subject, body, from_address, password):
    import smtplib
    from email.mime.text import MIMEText

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = from_address
    msg["To"] = to_address

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(from_address, password)
        server.sendmail(from_address, [to_address], msg.as_string())
```