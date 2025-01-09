# 📋 CRF Data Extraction Prototype 🚀

Welcome to the **CRF Data Extraction Prototype**! This Streamlit app leverages **Large Language Models (LLMs)** to help researchers extract **Case Report Form (CRF) data elements** from research protocol PDFs. 📄💡

With this tool, you can:

- 📤 **Upload** a research protocol PDF
- 🧩 **Extract and chunk** the text
- 🤖 **Query an LLM** for structured CRF data from each chunk
- 🧹 **Aggregate and edit** the extracted data
- 📥 **Download** the final CRF data in various formats (CSV, JSON, HTML)

---

## ⚙️ How It Works

1️⃣ **Upload your PDF**  
2️⃣ **Extract text and split it into chunks**  
3️⃣ **Send each chunk to the LLM** for CRF data extraction  
4️⃣ **Review and edit** the extracted data in an interactive table  
5️⃣ **Download** the finalized CRF data as CSV, JSON, or HTML  

---

## 🛠️ Installation

First, clone this repository:

```bash
git clone https://github.com/your-repo/crf-data-extraction.git
cd crf-data-extraction
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Run the Streamlit app:

```bash
streamlit run main.py
```

---

## 🧑‍💻 API Key Setup

This app uses **OpenAI's API** to interact with the LLM. 🔑 To get started:

1. **Sign up** for an OpenAI account: [https://platform.openai.com](https://platform.openai.com)  
2. **Get your API key** from the dashboard  
3. **Enter your API key** in the app when prompted

---

## 💻 Features

✨ **Upload Research Protocol PDFs** – Upload a PDF file of your research protocol.  

🔍 **Extract Text and Chunk It** – Automatically extract text from the PDF and split it into manageable chunks.  

🤖 **LLM-Powered Data Extraction** – Query the LLM to identify and extract CRF data elements from each chunk.  

🧹 **Interactive Data Editing** – Edit the extracted data directly in the app before finalizing.  

📥 **Download the Final Data** – Export your CRF data in various formats:

- CSV 📄
- JSON 📑
- HTML 🌐

---

## 🛡️ Data Privacy

Your data remains **secure and confidential**.  
The app only processes data locally on your machine and communicates with the OpenAI API securely. 🔐

---

## ⚡ Example Output

After processing a research protocol, you can expect outputs like this:

```json
[
  {
    "visit_name": "Screening",
    "timepoint": "Day 1",
    "data_items": ["Informed Consent", "Height", "Weight"]
  },
  {
    "visit_name": "Follow-up",
    "timepoint": "Week 12",
    "data_items": ["Blood Pressure", "Heart Rate"]
  }
]
```

---

## 🚧 Future Enhancements

- 📚 **Support for more document types**  
- 📊 **Advanced data visualization**  
- 🔍 **Improved LLM chunking and querying**  
- ✅ **Automated validation of CRF data**  

---

## 👩‍💻 Developer Notes

**File Structure:**

```project structure
📂 crf-data-extraction
 ┣ 📄 main.py              # Main Streamlit app
 ┣ 📄 requirements.txt     # Python dependencies
 ┗ 📄 README.md            # This README file
```

---

## 🐞 Troubleshooting

Having issues? Here are some tips:

- Make sure your **OpenAI API key** is valid.
- Ensure you have the necessary **Python packages** installed.
- Check for **internet connectivity** when making LLM queries.

---

## 💙 Contributing

We welcome contributions! Feel free to:

- 🐛 **Report bugs**
- 💡 **Suggest features**
- 📦 **Submit pull requests**

---

## 📜 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.

---

## 🎉 Thank You

Thank you for using the **CRF Data Extraction Prototype**! We hope it makes your research workflow smoother and more efficient. ✨

Happy extracting! 🚀

---
