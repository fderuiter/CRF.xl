import streamlit as st
import pandas as pd
import json
import logging
from typing import Any, Dict, List

from crf_extractor import CRFExtractor
from utils import validate_api_key, normalize_variable_name, create_interval_grid

logging.basicConfig(level=logging.INFO)

def merge_crf_data(crf_data_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merges multiple CRF data dictionaries (from separate chunks) into a single structure.
    Each crf_data has the form:
    {
      "intervals": [
        {
          "interval_name": str,
          "start_day": int,
          "end_day": int,
          "visits": [
            {
              "visit_name": str,
              "day": int,
              "description": str,
              "variables": [
                {
                  "variable_name": str,
                  "data_type": str
                }
              ]
            }
          ]
        }
      ]
    }
    Returns a single dict in the same structure.
    """
    merged_data = {"intervals": []}
    intervals_map = {}  # (interval_name, start_day, end_day) => interval dict

    for crf_data in crf_data_list:
        if not crf_data or "intervals" not in crf_data:
            continue
        for interval in crf_data["intervals"]:
            i_key = (
                interval["interval_name"], 
                interval["start_day"], 
                interval["end_day"]
            )
            if i_key not in intervals_map:
                intervals_map[i_key] = {
                    "interval_name": interval["interval_name"],
                    "start_day": interval["start_day"],
                    "end_day": interval["end_day"],
                    "visits": []
                }
            # Append visits
            intervals_map[i_key]["visits"].extend(interval.get("visits", []))

    # Convert back to list
    merged_data["intervals"] = list(intervals_map.values())
    # Sort intervals by start_day
    merged_data["intervals"].sort(key=lambda x: x["start_day"])
    # Sort visits within each interval
    for interval in merged_data["intervals"]:
        interval["visits"].sort(key=lambda v: v.get("day", 0))

    return merged_data

def pythonic_deduplicate(crf_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deduplicates visits by (visit_name, day) within each interval.
    Also merges duplicate variables in the same visit.
    """
    for interval in crf_data.get("intervals", []):
        visits = interval.get("visits", [])
        visit_map = {}
        for visit in visits:
            name_key = visit.get("visit_name", "")
            day_key = visit.get("day", 0)
            description = visit.get("description", "")
            variables = visit.get("variables", [])

            key = (name_key, day_key)
            if key not in visit_map:
                visit_map[key] = {
                    "visit_name": name_key,
                    "day": day_key,
                    "description": description,
                    "variables": []
                }
            visit_map[key]["variables"].extend(variables)

        # Convert visit_map to list
        new_visits = []
        for (v_name, v_day), v_obj in visit_map.items():
            # Deduplicate variables by variable_name
            var_map = {}
            for var_item in v_obj["variables"]:
                var_key = var_item.get("variable_name", "")
                if var_key not in var_map:
                    var_map[var_key] = var_item
            v_obj["variables"] = list(var_map.values())

            new_visits.append(v_obj)

        new_visits.sort(key=lambda x: x.get("day", 0))
        interval["visits"] = new_visits

    return crf_data

def main():
    st.title("CRF Generation Prototype")
    st.markdown(
        "This demo uses half (~4k chars) of the 8k-token context window for "
        "each chunk, then merges results, and deduplicates visits in Python."
    )

    # 1. API key input
    api_key = st.text_input("Enter OpenAI API Key", type="password", key="openai_api_key")
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
    
    # Cache management
    if st.button("Show Cache Info"):
        cache_entries = {}
        
        # Get session state info which includes cache keys
        cache_entries["Session State Keys"] = list(st.session_state.keys())
        
        # Show cache info
        cache_entries["Cache Status"] = {
            "Cache Data Keys": [key for key in st.session_state.keys() if key.startswith("cache")]
        }
        
        # Display the cache information
        st.subheader("Cache Information")
        st.json(cache_entries)
        
        # Add cache clearing option
        if st.button("Clear Cache"):
            st.cache_data.clear()
            st.success("Cache cleared!")

    # 2. Upload PDF
    uploaded_file = st.file_uploader("Upload Protocol PDF", type=["pdf"], key="pdf_upload")
    if not uploaded_file:
        st.warning("Please upload a PDF file to proceed.")
        return
        
    # 3. Extract text & chunk (using cached functions)
    st.info("Extracting PDF text & chunking")
    with st.spinner("Processing PDF..."):
        pdf_content = uploaded_file.read()  # Read bytes for caching
        protocol_text = extractor.extract_text_from_pdf(pdf_content)
        chunks = extractor.chunk_text(protocol_text)
    st.write(f"**Created {len(chunks)} text chunk(s).**")

    # 4. Single-Pass CRF extraction per chunk
    st.info("Extracting intervals, visits, and variables (LLM calls)...")
    crf_data_list = []
    progress_bar = st.progress(0)
    for i, chunk in enumerate(chunks):
        progress_bar.progress((i + 1) / len(chunks))
        chunk_crf = extractor.extract_crf_structure(chunk, temperature=0.0)
        crf_data_list.append(chunk_crf)
    progress_bar.empty()

    # 5. Merge chunk outputs
    st.info("Merging chunk outputs...")
    final_crf_data = merge_crf_data(crf_data_list)
    st.subheader("Merged CRF Data (Pre-Dedup)")
    st.json(final_crf_data)

    # 6. Pythonic Deduplication
    st.info("Deduplicating visits in Python...")
    deduped_crf_data = pythonic_deduplicate(final_crf_data)
    st.subheader("CRF Data (Post-Dedup)")
    st.json(deduped_crf_data)

    # 7. Flatten intervals/visits/variables for a table view
    intervals = deduped_crf_data.get("intervals", [])
    if not intervals:
        st.warning("No intervals found after merging/deduplication.")
        return

    flattened_rows = []
    for interval in intervals:
        interval_name = interval.get("interval_name", "")
        start_day = interval.get("start_day", 0)
        end_day = interval.get("end_day", 0)
        for visit in interval.get("visits", []):
            visit_name = visit.get("visit_name", "")
            day = visit.get("day", 0)
            description = visit.get("description", "")
            variables = visit.get("variables", [])
            for var_item in variables:
                var_name = var_item.get("variable_name", "")
                var_type = var_item.get("data_type", "")
                var_name = normalize_variable_name(var_name)
                flattened_rows.append({
                    "interval_name": interval_name,
                    "visit_name": visit_name,
                    "day": day,
                    "description": description,
                    "start_day": start_day,
                    "end_day": end_day,
                    "variable_name": var_name,
                    "variable_type": var_type
                })

    final_df = pd.DataFrame(flattened_rows)
    st.subheader("Flattened CRF Table")
    st.dataframe(final_df)

    # 8. Create Visit Grid
    all_variables = set(final_df["variable_name"])
    visit_grid = create_interval_grid(deduped_crf_data, all_variables)
    st.subheader("Visit Grid")
    st.dataframe(visit_grid)

    # 9. Optional: Inclusion/Exclusion Criteria
    st.info("Extracting Inclusion/Exclusion Criteria (Optional)...")
    with st.spinner("Analyzing inclusion/exclusion criteria..."):
        inc_exc_data = extractor.extract_inclusion_exclusion(protocol_text, temperature=0.0)
    deduped_crf_data["inclusion_exclusion"] = inc_exc_data
    st.subheader("Inclusion/Exclusion Criteria")
    st.json(inc_exc_data)

    # 10. Download
    st.download_button(
        label="Download CRF Data (JSON)",
        data=json.dumps(deduped_crf_data, indent=2),
        file_name="deduplicated_crfs.json",
        mime="application/json",
    )

    csv_data = final_df.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="Download Flattened CRF Table (CSV)",
        data=csv_data,
        file_name="deduplicated_crfs_table.csv",
        mime="text/csv",
    )

if __name__ == "__main__":
    main()
