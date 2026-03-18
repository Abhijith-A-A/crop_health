import sys
try:
    from pypdf import PdfReader
    reader = PdfReader(r'C:\Users\Abhijith\Pictures\crop 3\CropSight_Participant_Brief.pdf')
    text = ""
    for p in reader.pages:
        text += p.extract_text() + "\n"
    with open('pdf_output.txt', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Done writing to pdf_output.txt")
except Exception as e:
    print(f"Error reading PDF: {e}")
