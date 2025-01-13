import json
import re
import logging
from typing import Any, Dict, List, Union
import streamlit as st
import PyPDF2
from openai import OpenAI
from io import BytesIO

class CRFExtractor:
    """
    Manages research protocol text extraction, chunking, and a single-pass
    LLM call to build CRFs from the content.
    """

    def __init__(self, api_key: str):
        """
        Initializes the extractor with a given API key. 
        Creates an OpenAI client and sets up logging.
        """
        self.logger = logging.getLogger(self.__class__.__name__)
        self.api_key = api_key
        self.client = self._create_client()

    def _create_client(self) -> OpenAI:
        """
        Internal helper to create and return the OpenAI client.
        """
        return OpenAI(api_key=self.api_key)

    def extract_text_from_pdf(self, pdf_content: Union[str, bytes]) -> str:
        """
        Converts the PDF protocol into a single string of text.
        Works with both file paths and byte content.
        """
        self.logger.info("Extracting text from PDF...")
        
        # Handle bytes input (from Streamlit uploader)
        if isinstance(pdf_content, bytes):
            reader = PyPDF2.PdfReader(BytesIO(pdf_content))
        else:
            reader = PyPDF2.PdfReader(pdf_content)
        
        pages = len(reader.pages)
        self.logger.info(f"Found {pages} pages in PDF.")
        all_text = []

        for i in range(pages):
            page_text = reader.pages[i].extract_text()
            if page_text:
                all_text.append(page_text)

        combined_text = "\n".join(all_text)
        self.logger.info(
            "Combined text length: %d characters.", len(combined_text)
        )
        return combined_text

    def chunk_text(self, text: str, max_chars: int = 24000) -> List[str]:
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = []
        current_length = 0

        for para in paragraphs:
            if len(para) > max_chars:
                # Break oversized paragraph
                for i in range(0, len(para), max_chars):
                    subchunk = para[i : i + max_chars]
                    if (current_length + len(subchunk) > max_chars 
                            and current_chunk):
                        chunks.append("\n\n".join(current_chunk))
                        current_chunk = [subchunk]
                        current_length = len(subchunk)
                    else:
                        current_chunk.append(subchunk)
                        current_length += len(subchunk)
            else:
                if (current_length + len(para) > max_chars 
                        and current_chunk):
                    chunks.append("\n\n".join(current_chunk))
                    current_chunk = [para]
                    current_length = len(para)
                else:
                    current_chunk.append(para)
                    current_length += len(para)

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks

    def extract_crf_structure(
        self, 
        protocol_text: str,
        temperature: float = 0.0
    ) -> Dict[str, Any]:
        """
        Single-pass extraction of intervals, visits, variables, and (optionally)
        their units from the protocol text.

        Returns a dictionary in valid JSON format, for example:

        {
        "intervals": [
            {
            "interval_name": "<string>",
            "start_day": <integer>,
            "end_day": <integer>,
            "visits": [
                {
                "visit_name": "<string>",
                "day": <integer>,
                "description": "<string>",
                "variables": [
                    {
                    "variable_name": "<string>",
                    "data_type": "<string>",
                    "unit": "<string>"
                    }
                ]
                }
            ]
            }
        ]
        }

        Note: if a variable has no known unit, set "unit" to an empty string.
        """

        # System prompt clarifies the format and instructions
        system_prompt = (
            "You are an expert in clinical protocol analysis and CRF design. "
            "Your task is to parse the text of a study protocol and extract a "
            "structured JSON representation of:\n"
            "1. Study intervals (e.g., Screening, Treatment, Follow-up), with "
            "   approximate day ranges relative to a Day 0 (start of study).\n"
            "2. Visits within each interval. Each visit has:\n"
            "   - a visit_name\n"
            "   - a day (integer, days from Day 0)\n"
            "   - a short description\n"
            "3. Variables to collect at each visit, each with:\n"
            "   - variable_name (string)\n"
            "   - data_type (one of [text, number, single-select, multi-select, "
            "     date/time, boolean, file upload, dicom image])\n"
            "   - unit (string, e.g. 'mg/dL', 'mmHg', 'kg', or '' if unknown)\n\n"
            "IMPORTANT:\n"
            "• If any field is not found, use an empty string or 0 (for numeric fields), "
            "  rather than omitting the field.\n"
            "• Return only valid JSON. No commentary or other text outside the JSON.\n"
            "• The final JSON must follow this exact structure (no extra fields):\n"
            "{\n"
            "  \"intervals\": [\n"
            "    {\n"
            "      \"interval_name\": \"\",\n"
            "      \"start_day\": 0,\n"
            "      \"end_day\": 0,\n"
            "      \"visits\": [\n"
            "        {\n"
            "          \"visit_name\": \"\",\n"
            "          \"day\": 0,\n"
            "          \"description\": \"\",\n"
            "          \"variables\": [\n"
            "            {\n"
            "              \"variable_name\": \"\",\n"
            "              \"data_type\": \"\",\n"
            "              \"unit\": \"\"\n"
            "            }\n"
            "          ]\n"
            "        }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}\n"
            "No additional commentary."
        )

        # User prompt gives the actual protocol text and reminds the model to comply
        user_prompt = (
            "Below is the study protocol text. Please extract intervals, visits, "
            "variables, and (if present) units according to the format. "
            "If no unit is found for a variable, leave the unit field as an empty string. "
            "Return only valid JSON, no extra explanation.\n\n"
            f"{protocol_text}"
        )

        raw_response = self._call_llm_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            expect_list=False
        )
        return raw_response

    def extract_inclusion_exclusion(
        self, 
        protocol_text: str,
        temperature: float = 0.0
    ) -> Dict[str, Any]:
        """
        Optional method to extract inclusion and exclusion criteria.
        Returns a structure like:
        {
          "inclusion_criteria": [
            {"criterion": "<string>", "type": "<string>"},
            ...
          ],
          "exclusion_criteria": [
            {"criterion": "<string>", "type": "<string>"},
            ...
          ]
        }
        """
        system_prompt = (
            "You are an expert in clinical research. Identify the explicit "
            "inclusion and exclusion criteria from the text. Return them in "
            "valid JSON with this structure:\n\n"
            "{\n"
            "  \"inclusion_criteria\": [\n"
            "    {\"criterion\": \"\", \"type\": \"\"}\n"
            "  ],\n"
            "  \"exclusion_criteria\": [\n"
            "    {\"criterion\": \"\", \"type\": \"\"}\n"
            "  ]\n"
            "}\n\n"
            "If none found, return an empty JSON object {}. Do not include "
            "any extra text."
        )

        user_prompt = (
            "Extract inclusion and exclusion criteria from the following text. "
            "Return only the JSON structure described.\n\n"
            f"{protocol_text}"
        )

        raw_response = self._call_llm_json(
            system_prompt, user_prompt, 
            temperature=temperature, 
            expect_list=False
        )
        return raw_response

    def _call_llm_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0,
        expect_list: bool = True
    ) -> Union[Dict[str, Any], List[Any]]:
        """
        A helper that calls the LLM with a system & user prompt
        and attempts to parse the result as JSON. If 'expect_list' is True,
        we look for a JSON array; otherwise an object/dict.
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=8000,  # can adjust based on your usage
                n=1
            )
            raw_text = response.choices[0].message.content.strip()
            self.logger.debug("Raw LLM Response: %s", raw_text)

            parsed = self._try_parse_json(raw_text, expect_list=expect_list)
            return parsed
        except Exception as exc:
            self.logger.error("Error calling LLM: %s", str(exc))
            return [] if expect_list else {}

    def _try_parse_json(
        self, 
        text: str, 
        expect_list: bool = True
    ) -> Union[Dict[str, Any], List[Any]]:
        """
        Tries json.loads directly. If that fails, attempts a regex to isolate
        the JSON. If all else fails, returns empty structure (list or dict).
        """
        # 1) Attempt direct parse
        try:
            data = json.loads(text)
            self.logger.info("Successfully parsed JSON directly.")
            return data
        except json.JSONDecodeError:
            self.logger.warning("Direct JSON parse failed. Attempting regex.")

        # 2) Use regex approach
        pattern = r"(\[[\s\S]*\])" if expect_list else r"(\{[\s\S]*\})"
        match = re.search(pattern, text)
        if match:
            snippet = match.group(1)
            try:
                data = json.loads(snippet)
                self.logger.info("Parsed JSON from regex-extracted snippet.")
                return data
            except json.JSONDecodeError:
                self.logger.error("Regex-extracted JSON is still invalid.")
                return [] if expect_list else {}
        else:
            self.logger.error("No JSON snippet found in the response.")
            return [] if expect_list else {}

@st.cache_data(ttl=3600, show_spinner=False)
def extract_text_from_pdf(self, pdf_content: Union[str, bytes]) -> str:
    """
    Cached PDF text extraction
    """
    self.logger.info("Cache MISS - Running PDF extraction") 
    reader = PyPDF2.PdfReader(BytesIO(pdf_content))
    pages = len(reader.pages)
    all_text = []
    
    for i in range(pages):
        page_text = reader.pages[i].extract_text()
        if page_text:
            all_text.append(page_text)

    return "\n".join(all_text)

@st.cache_data(ttl=3600)
def extract_crf_structure(self, protocol_text: str, temperature: float = 0.0) -> Dict[str, Any]:
    """Cached CRF structure extraction"""
    return self._call_llm_json(
        system_prompt=self._get_crf_system_prompt(),
        user_prompt=f"Extract from:\n{protocol_text}",
        temperature=temperature,
        expect_list=False
    )

@st.cache_data(ttl=3600)
def extract_inclusion_exclusion(self, protocol_text: str, temperature: float = 0.0) -> Dict[str, Any]:
    """Cached inclusion/exclusion criteria extraction"""
    return self._call_llm_json(
        system_prompt=self._get_inclusion_exclusion_prompt(),
        user_prompt=f"Extract from:\n{protocol_text}",
        temperature=temperature,
        expect_list=False
    )
    
