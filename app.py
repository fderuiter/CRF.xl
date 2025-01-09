import os
import re
import json
import logging
from typing import List, Dict, Any, Optional
import streamlit as st
import pandas as pd
import PyPDF2
from openai import OpenAI, AuthenticationError, OpenAIError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)

def validate_api_key(api_key: str) -> bool:
    """
    Validates the OpenAI API key by making a simple test request.
    """
    try:
        client = OpenAI(api_key=api_key)
        client.models.list()
        return True
    except AuthenticationError:
        return False
    except OpenAIError as e:
        logging.error(f"Error validating API key: {str(e)}")
        return False

def normalize_variable_name(name: str) -> str:
    """
    Normalizes variable names for consistency.
    """
    name = name.lower().strip()
    name = re.sub(r'[^\w\s]', '', name)  # Remove special characters
    name = re.sub(r'\s+', ' ', name)  # Replace multiple spaces with single space
    return name.title()

def main():
    st.title("Multi-step CRF Generation Prototype")
    st.markdown(
        "This demo shows how to do a multi-step approach:\n"
        "1. Identify visits/timepoints.\n"
        "2. Identify variables & data types.\n"
        "3. Identify inclusion/exclusion criteria.\n"
        "4. Build final CRFs."
    )

    # 1. API key input
    api_key = st.text_input(
        "Enter OpenAI API Key", type="password", key="openai_api_key"
    )
    if not api_key:
        st.warning("Please enter your OpenAI API key to proceed.")
        return

    # Validate the API key
    with st.spinner("Validating API key..."):
        if not validate_api_key(api_key):
            st.error("Invalid API key. Please enter a valid OpenAI API key.")
            return

    st.success("API key is valid.")
    extractor = CRFExtractor(api_key)

    # 2. Upload PDF
    uploaded_file = st.file_uploader(
        "Upload Protocol PDF", type=["pdf"], key="pdf_upload"
    )
    if not uploaded_file:
        st.warning("Please upload a protocol PDF to continue.")
        return

    # Extract and chunk text
    st.info("Extracting PDF text & chunking...")
    with st.spinner("Processing PDF..."):
        protocol_text = extractor.extract_text_from_pdf(uploaded_file)
        chunks = extractor.chunk_text(protocol_text, max_chars=1500)
    st.write(f"**Created {len(chunks)} text chunk(s).**")

    # 3. Pass #1: Identify visits/timepoints
    st.info("Pass #1: Identifying visits & timepoints...")
    visit_results = []
    for i, chunk in enumerate(chunks):
        st.write(f"Analyzing chunk {i+1}/{len(chunks)} for visits/timepoints...")
        chunk_visits = extractor.identify_visits_and_timepoints(chunk, temperature=0.2)
        visit_results.extend(chunk_visits)

    # Consolidate visits/timepoints
    unique_visits = unify_visits(visit_results)
    st.write("**Detected visits/timepoints:**")
    st.json(unique_visits)

    # 4. Pass #2: Identify variables & data types
    st.info("Pass #2: Identifying variables & data types...")
    final_crfs = []
    all_variables = set()
    for vt in unique_visits:
        vars_for_visit = extractor.identify_variables_and_types(
            protocol_text,
            vt["visit_name"],
            vt["timepoint"],
            temperature=0.6  # Higher temperature for generative behavior
        )
        # Normalize variable names
        for var in vars_for_visit:
            normalized_name = normalize_variable_name(var["name"])
            var["name"] = normalized_name
            all_variables.add(normalized_name)
        final_crfs.append({
            "visit_name": vt["visit_name"],
            "timepoint": vt["timepoint"],
            "variables": vars_for_visit
        })

    st.write("**Variables & data types extracted:**")
    st.json(final_crfs)

    # 5. Create Visit Grid
    st.info("Creating Visit Grid...")
    visit_grid = create_visit_grid(final_crfs, all_variables)
    st.subheader("Visit Grid")
    st.dataframe(visit_grid)

    # Optionally, provide download button for the visit grid
    csv = visit_grid.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="Download Visit Grid (CSV)",
        data=csv,
        file_name='visit_grid.csv',
        mime='text/csv',
    )

    # 6. Pass #3: Inclusion/Exclusion Criteria
    st.info("Pass #3: Identifying inclusion/exclusion criteria for baseline...")
    with st.spinner("Analyzing inclusion/exclusion criteria..."):
        inc_exc_crf = extractor.identify_inclusion_exclusion(protocol_text, temperature=0.2)
    st.write("**Inclusion/Exclusion Criteria extracted:**")
    st.json(inc_exc_crf)

    # 7. Combine into final output
    baseline_index = next((i for i, x in enumerate(final_crfs)
                          if "baseline" in x["visit_name"].lower()), None)
    if baseline_index is not None:
        final_crfs[baseline_index]["inclusion_exclusion"] = inc_exc_crf
    else:
        # Or append as a separate item if no baseline was found
        final_crfs.append({
            "visit_name": "Baseline",
            "timepoint": "Day 0",
            "variables": [],
            "inclusion_exclusion": inc_exc_crf
        })

    st.subheader("Final CRF Data")
    st.json(final_crfs)

    # Convert to DataFrame (somewhat flatten for display)
    all_rows = []
    for crf_item in final_crfs:
        visit = crf_item["visit_name"]
        timepoint = crf_item["timepoint"]
        for var_dict in crf_item["variables"]:
            row = {
                "visit_name": visit,
                "timepoint": timepoint,
                "variable_name": var_dict["name"],
                "variable_type": var_dict["type"]
            }
            all_rows.append(row)

    df = pd.DataFrame(all_rows)
    st.dataframe(df)

    # Provide download buttons
    st.download_button(
        label="Download Final CRFs (JSON)",
        data=json.dumps(final_crfs, indent=2),
        file_name="final_crfs.json",
        mime="application/json",
    )
    st.download_button(
        label="Download Variables Table (CSV)",
        data=df.to_csv(index=False).encode('utf-8'),
        file_name='variables_table.csv',
        mime='text/csv',
    )

def unify_visits(visit_results: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Consolidate visits/timepoints from chunk-level results.
    Accumulate unique combinations in a list.
    """
    unique_set = set()
    unified = []
    for vt in visit_results:
        pair = (vt.get("visit_name", "").strip().lower(),
                vt.get("timepoint", "").strip().lower())
        if pair not in unique_set:
            unique_set.add(pair)
            unified.append({
                "visit_name": vt.get("visit_name", ""),
                "timepoint": vt.get("timepoint", "")
            })
    return unified

def create_visit_grid(final_crfs: List[Dict[str, Any]], all_variables: set) -> pd.DataFrame:
    """
    Creates a visit grid mapping variables to visits/timepoints.
    Each row represents a variable, each column represents a visit/timepoint.
    Cells contain the data type if the variable is collected at that visit/timepoint.
    """
    # Create a list of all visit/timepoint identifiers
    visit_identifiers = [
        f"{crf['visit_name']} ({crf['timepoint']})" for crf in final_crfs
    ]

    # Initialize the DataFrame
    grid = pd.DataFrame(index=sorted(all_variables), columns=visit_identifiers)
    grid.fillna("N/A", inplace=True)

    # Populate the grid
    for crf in final_crfs:
        visit_id = f"{crf['visit_name']} ({crf['timepoint']})"
        for var in crf['variables']:
            grid.at[var['name'], visit_id] = var['type']

    grid.reset_index(inplace=True)
    grid.rename(columns={'index': 'Variable Name'}, inplace=True)
    return grid

class CRFExtractor:
    """
    Manages text extraction, chunking, and LLM calls.
    """

    def __init__(self, api_key: str):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.api_key = api_key
        self.client = self._create_client()

    def extract_text_from_pdf(self, pdf_file) -> str:
        self.logger.info("Extracting text from PDF...")
        reader = PyPDF2.PdfReader(pdf_file)
        pages = len(reader.pages)
        self.logger.info(f"Found {pages} pages in PDF.")
        full_text = []
        for i in range(pages):
            txt = reader.pages[i].extract_text()
            if txt:
                full_text.append(txt)
        combined_text = "\n".join(full_text)
        self.logger.info(f"Combined text length: {len(combined_text)} chars.")
        return combined_text

    def chunk_text(self, text: str, max_chars: int = 1500) -> List[str]:
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = []
        current_length = 0

        for para in paragraphs:
            if len(para) > max_chars:
                # break paragraph into subchunks
                for i in range(0, len(para), max_chars):
                    subchunk = para[i : i + max_chars]
                    if current_length + len(subchunk) > max_chars and current_chunk:
                        chunks.append("\n\n".join(current_chunk))
                        current_chunk = [subchunk]
                        current_length = len(subchunk)
                    else:
                        current_chunk.append(subchunk)
                        current_length += len(subchunk)
            else:
                if current_length + len(para) > max_chars and current_chunk:
                    chunks.append("\n\n".join(current_chunk))
                    current_chunk = [para]
                    current_length = len(para)
                else:
                    current_chunk.append(para)
                    current_length += len(para)

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks

    def _create_client(self) -> OpenAI:
        return OpenAI(api_key=self.api_key)

    def identify_visits_and_timepoints(self, chunk: str, temperature: float = 0.2) -> List[Dict[str, str]]:
        """
        Pass #1: Identify visits & timepoints.
        Returns a list of { "visit_name": ..., "timepoint": ... }.
        """
        system_prompt = (
            "You are an intelligent assistant that extracts study visits and "
            "their corresponding timepoints from text. Output only valid JSON, "
            "with no extra text or disclaimers. The JSON must be a list of "
            "objects, each object must have:\n"
            "  \"visit_name\": string\n"
            "  \"timepoint\": string\n\n"
            "If nothing is found, return an empty list: []."
        )

        user_prompt = (
            "Extract any study visits (like 'Screening', 'Baseline', 'Follow-up', "
            "'Adverse Event Collection', etc.) and any associated timepoints (like "
            "'Day 1', 'Week 4', 'Month 6', or 'ad hoc') from the text. Return them "
            "in JSON with the keys: \"visit_name\", \"timepoint\".\n"
            "If no visits or timepoints are found, return [].\n\n"
            "Text:\n\n"
            f"{chunk}"
        )

        return self._call_llm_json(system_prompt, user_prompt, temperature=temperature)

    def identify_variables_and_types(
        self,
        text: str,
        visit_name: str,
        timepoint: str,
        temperature: float = 0.6
    ) -> List[Dict[str, str]]:
        """
        Pass #2: Identify variables for a specific visit/timepoint, including data types.
        Generates variables even if not explicitly stated in the protocol based on visit context.
        Return a list of { "name": <variable_name>, "type": <data_field_type> }.
        """
        system_prompt = (
            "You are an expert in clinical data collection and Case Report Form (CRF) design. "
            "Given a study protocol and a specific visit/timepoint, identify all relevant "
            "variables that should be collected at that visit/timepoint. This includes variables "
            "explicitly mentioned in the protocol as well as standard variables typically collected "
            "in such visits. For each variable, specify its data type from the following options: "
            "[text, number, single-select, multi-select, file upload, dicom image, date/time, boolean].\n\n"
            "Output only valid JSON array of objects. Each object must have:\n"
            '  "name": <string for variable name>\n'
            '  "type": <one of the permitted data types>\n\n'
            "If no variables are found, return an empty list []."
        )

        user_prompt = (
            f"Given the following study protocol and the specific visit '{visit_name}' (timepoint '{timepoint}'), "
            "identify all variables that should be collected at this visit/timepoint. Include both variables "
            "explicitly mentioned in the protocol and standard variables typically collected at such visits. "
            "For each variable, determine the most appropriate data type from the following options: "
            "[text, number, single-select, multi-select, file upload, dicom image, date/time, boolean].\n\n"
            "Return only valid JSON of the form:\n"
            "[\n"
            "  {\n"
            '    "name": "Height",\n'
            '    "type": "number"\n'
            "  },\n"
            "  ...\n"
            "]\n\n"
            "Study Protocol Text:\n"
            f"{text}"
        )

        return self._call_llm_json(system_prompt, user_prompt, temperature=temperature)

    def identify_inclusion_exclusion(self, text: str, temperature: float = 0.2) -> Dict[str, Any]:
        """
        Pass #3: Identify inclusion/exclusion criteria.
        Return a structure that might look like:
        {
          "inclusion_criteria": [
            {"criterion": "Subject must be 18 years or older", "type": "boolean"},
            ...
          ],
          "exclusion_criteria": [
            {"criterion": "History of allergic reaction to study drug", "type": "boolean"},
            ...
          ]
        }
        Or return an empty dict if none found.
        """
        system_prompt = (
            "You are an expert in clinical research. Identify the explicit "
            "inclusion and exclusion criteria from the provided text. Return them "
            "as valid JSON, with keys 'inclusion_criteria' and 'exclusion_criteria'. "
            "Each must be a list of objects with a 'criterion' key (the text of the "
            "criterion) and a 'type' key describing the data field type (often "
            "boolean, but you can decide). If no criteria are found, return an empty "
            "JSON object: {}."
        )

        user_prompt = (
            "Find all inclusion and exclusion criteria in the text. Return them as:\n"
            "{\n"
            '  "inclusion_criteria": [\n'
            '    {"criterion": "...", "type": "boolean"},\n'
            '    ...\n'
            '  ],\n'
            '  "exclusion_criteria": [\n'
            '    {"criterion": "...", "type": "boolean"},\n'
            '    ...\n'
            '  ]\n'
            "}\n\n"
            f"Text:\n{text}"
        )

        return self._call_llm_json(system_prompt, user_prompt, temperature=temperature, expect_list=False)

    def _call_llm_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        expect_list: bool = True
    ) -> Any:
        """
        A helper that calls the LLM with a system & user prompt
        and attempts to parse the result as JSON.
        
        If expect_list=True, expect a JSON array. Otherwise, expect a JSON object.
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Replace with your desired model
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=700,
                n=1,
                stop=None
            )
            raw_text = response.choices[0].message.content.strip()

            # Log the raw response for debugging
            self.logger.debug(f"Raw LLM Response: {raw_text}")

            # Attempt direct parse
            parsed = self._try_parse_json(raw_text, expect_list=expect_list)
            return parsed
        except Exception as e:
            self.logger.error(f"Error calling LLM: {str(e)}")
            return [] if expect_list else {}

    def _try_parse_json(self, text: str, expect_list: bool = True) -> Any:
        """
        Tries direct json.loads. If that fails, tries a regex approach.
        """
        try:
            data = json.loads(text)
            self.logger.info("Successfully parsed JSON directly.")
            return data
        except json.JSONDecodeError:
            self.logger.warning("Direct JSON parse failed; using regex fallback.")
            # Attempt to extract the relevant JSON snippet
            # If we expect a list, look for a bracket block. If object, look for curly braces.
            pattern = r"(\[[\s\S]*\])" if expect_list else r"(\{[\s\S]*\})"
            match = re.search(pattern, text)
            if match:
                snippet = match.group(1)
                try:
                    data = json.loads(snippet)
                    self.logger.info("Successfully parsed JSON from regex-extracted snippet.")
                    return data
                except json.JSONDecodeError:
                    self.logger.error("Regex-extracted JSON still invalid.")
                    return [] if expect_list else {}
            else:
                self.logger.error("No JSON snippet found in the response.")
                return [] if expect_list else {}

# Ensure the script runs only when executed directly
if __name__ == "__main__":
    main()
