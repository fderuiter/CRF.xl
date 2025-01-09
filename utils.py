import re
import json
import logging
from typing import List, Dict, Any, Union
import pandas as pd
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
    - Lowercase, remove special chars, convert multiple spaces → single space.
    - Then title-case the result.
    """
    name = name.lower().strip()
    name = re.sub(r'[^\w\s]', '', name)  # Remove special characters
    name = re.sub(r'\s+', ' ', name)     # Replace multiple spaces with single space
    return name.title()

def create_interval_grid(
    crf_data: Dict[str, Any],
    all_variables: set
) -> pd.DataFrame:
    """
    Creates a grid (DataFrame) mapping variables to each interval 
    in the consolidated CRF data structure. The new single-pass 
    CRF data typically looks like:
    
    {
      "intervals": [
        {
          "interval_name": "<str>",
          "start_day": <int>,
          "end_day": <int>,
          "visits": [
            {
              "visit_name": "<str>",
              "day": <int>,
              "description": "<str>",
              "variables": [
                {
                  "variable_name": "<str>",
                  "data_type": "<str>"
                }
              ]
            }
          ]
        }
      ]
    }

    For each variable, we'll create a row. For each interval, we'll have
    a column indicating whether that variable is present at any of 
    the visits in that interval.
    """
    grid_data = []
    intervals = crf_data.get("intervals", [])

    for variable in all_variables:
        row = {"variable_name": variable}
        for interval in intervals:
            interval_name = interval.get("interval_name", "")
            start_day = interval.get("start_day", 0)
            end_day = interval.get("end_day", 0)

            # Use a column name that includes interval_name and day range
            interval_key = f"{interval_name} ({start_day} to {end_day})"

            # Check if this variable appears in any visit under this interval
            found_in_interval = False
            for visit in interval.get("visits", []):
                for var_item in visit.get("variables", []):
                    if var_item.get("variable_name", "").lower() == variable.lower():
                        found_in_interval = True
                        break
                if found_in_interval:
                    break

            row[interval_key] = found_in_interval
        grid_data.append(row)

    return pd.DataFrame(grid_data)

def merge_crf_data(crf_data_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merges multiple CRF data dictionaries (from separate chunks) into a single structure.
    Each CRF data has the form:
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
    """
    merged_data = {"intervals": []}
    intervals_map = {}

    for crf_data in crf_data_list:
        if not crf_data or "intervals" not in crf_data:
            continue
        for interval in crf_data["intervals"]:
            i_key = (interval["interval_name"], interval["start_day"], interval["end_day"])
            if i_key not in intervals_map:
                intervals_map[i_key] = {
                    "interval_name": interval["interval_name"],
                    "start_day": interval["start_day"],
                    "end_day": interval["end_day"],
                    "visits": []
                }
            # Extend visits
            intervals_map[i_key]["visits"].extend(interval.get("visits", []))

    merged_data["intervals"] = list(intervals_map.values())

    # Sort intervals by start_day
    merged_data["intervals"].sort(key=lambda x: x["start_day"])

    # Sort visits within each interval by day
    for interval in merged_data["intervals"]:
        interval["visits"].sort(key=lambda v: v.get("day", 0))

    return merged_data

#
# The following function unify_visits might be unused in the new single-pass
# approach. If you no longer need it, you can remove it. Otherwise, keep 
# it for any separate logic you might have.
#
def unify_visits(visit_results: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Consolidate visits/timepoints from chunk-level results.
    Accumulate unique combinations in a list.
    """
    unique_set = set()
    unified = []
    for vt in visit_results:
        pair = (
            vt.get("visit_name", "").strip().lower(),
            vt.get("timepoint", "").strip().lower()
        )
        if pair not in unique_set:
            unique_set.add(pair)
            unified.append({
                "visit_name": vt.get("visit_name", ""),
                "timepoint": vt.get("timepoint", "")
            })
    return unified
