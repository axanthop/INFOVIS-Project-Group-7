import pandas as pd
import re

COLUMN_RENAME = {"Name of the NBS intervention (short English title)": "intervention_name",
                 "City": "city",
                 "Country": "country",
                 "Begin": "begin_year",
                 "End": "end_year",
                 "Present stage of the intervention": "status",
                 "Spatial scale": "spatial_scale",
                 "NBS area (m2)": "nbs_area",
                 "Type of area before implementation of the NBS": "previous_area_type",
                 "Short description of the intervention": "short_description",
                 "Type of nature-based solution/Ecological domain": "nbs_type",
                 "Sustainability challenge(s) addressed": "sustainability_challenges",
                 "Focus of the project": "project_focus",
                 "Goals of the intervention": "intervention_goals",
                 "Implementation activities": "implementation_activities",
                 "Climate change adaptation: What activities are imp…ed to realize the conservation goals and targets?": "climate_change_adaptation",
                 "Climate change mitigation: What activities are imp…ed to realize the conservation goals and targets?": "climate_change_mitigation",
                 "Habitats and biodiversity conservation: What activ…ed to realize the conservation goals and targets?": "habitats_and_biodiversity_conservation",
                 "Habitats and biodiversity restoration: What activi…ted to realize the restoration goals and targets?": "habitats_and_biodiversity_restoration",
                 "Governance arrangements": "governance_arrangements",
                 "Key actors - initiating organization": "key_actors",
                 "Participatory methods/forms of community involvement used": "participatory_methods",
                 "Total cost €": "total_cost",
                 "Source(s) of funding": "sources_of_funding",
                 "Environmental impacts": "environmental_impacts",
                 "Economic impacts": "economic_impacts",
                 "Social and cultural impacts": "social_cultural_impacts",
                 "Link": "link"}


def remove_columns(df, columns_to_exclude):
    cols = [col for col in columns_to_exclude if col in df.columns]
    return df.drop(columns=cols)


def split_range_column(df, column_name, new_col_1, new_col_2, delimiter=" - "):
    if column_name not in df.columns:
        print(f"column {column_name} not found")
        return df

    split_col = (
        df[column_name]
        .astype(str)
        .str.split(delimiter, expand=True)
        .apply(lambda col: col.str.strip())
    )

    split_col.columns = [new_col_1, new_col_2]

    col_index = df.columns.get_loc(column_name) + 1
    df.insert(col_index, new_col_1, split_col[new_col_1])
    df.insert(col_index + 1, new_col_2, split_col[new_col_2])

    df = df.drop(columns=[column_name])
    return df


def fill_empty(df, column_name, replacement="Unknown"):
    if column_name not in df.columns:
        print(f"column {column_name} not found")
        return df

    df[column_name] = (
        df[column_name]
        .astype(str)
        .str.strip()
        .replace({"": replacement, "nan": replacement, "None": replacement})
        .fillna(replacement)
    )

    return df


def clean_column(df, column_name, new_column_name, replacements):
    if column_name not in df.columns:
        print(f"column {column_name} not found")
        return df

    col = df[column_name].astype(str)

    for pattern, repl in replacements:
        col = col.str.replace(pattern, repl, regex=True)

    col_index = df.columns.get_loc(column_name) + 1
    df.insert(col_index, new_column_name, col)

    df = df.drop(columns=[column_name])

    return df


def rename_columns(df, replacement_map):
    missing = [i for i in replacement_map if i not in df.columns]
    if missing:
        print(f"Columns not found for the remaining: {missing}")

    return df.rename(columns=replacement_map)


# ---------- numeric helpers ----------

def fill_with_numeric_median(df, column_name):
    """Convert a column to numeric and replace non-numeric / NaN with the median."""
    if column_name not in df.columns:
        print(f"column {column_name} not found")
        return df

    numeric_col = pd.to_numeric(df[column_name], errors="coerce")
    median_val = numeric_col.median()

    if pd.isna(median_val):
        print(f"Warning: cannot compute median for {column_name}")
        return df

    df[column_name] = numeric_col.fillna(median_val)
    return df


def ensure_begin_before_end(df, begin_col="Begin", end_col="End"):
    """Ensure Begin <= End in each row (swap values if needed)."""
    if begin_col not in df.columns or end_col not in df.columns:
        return df

    # Make both numeric with median for non-numeric values
    df = fill_with_numeric_median(df, begin_col)
    df = fill_with_numeric_median(df, end_col)

    mask = df[begin_col] > df[end_col]
    if mask.any():
        tmp = df.loc[mask, begin_col].copy()
        df.loc[mask, begin_col] = df.loc[mask, end_col]
        df.loc[mask, end_col] = tmp

    return df


def fill_unknown_other_columns(df, exclude=None):
    """For all object columns except those in `exclude`, fill empty cells with 'Unknown'."""
    if exclude is None:
        exclude = []

    for col in df.columns:
        if col in exclude:
            continue

        if df[col].dtype == object:
            s = df[col].astype(str).str.strip()
            s = s.replace({"": "Unknown", "nan": "Unknown", "None": "Unknown"})
            df[col] = s.fillna("Unknown")

    return df


# ---------- Total cost parsing helpers ----------

def parse_cost_to_number(val):
    """
    Convert strings like:
      '10,000 - 50,000'        -> 30000
      '500,000 - 2,000,000'    -> 1250000
      'More than 4,000,000'    -> 4000000
      'Unknown', '', NaN       -> <missing>
    into numeric values.
    """
    if pd.isna(val):
        return pd.NA

    s = str(val).strip()
    if not s or s.lower() == "unknown":
        return pd.NA

    # remove euro symbol and leading/trailing spaces
    s = s.replace("€", "").strip()

    # Handle "More than 4,000,000"
    if s.lower().startswith("more than"):
        nums = re.findall(r"[\d,.]+", s)
        if nums:
            low = float(nums[-1].replace(",", ""))
            return low
        return pd.NA

    # Handle "10,000 - 50,000" etc.
    nums = re.findall(r"[\d,.]+", s)
    if len(nums) == 1:
        return float(nums[0].replace(",", ""))
    elif len(nums) >= 2:
        low = float(nums[0].replace(",", ""))
        high = float(nums[1].replace(",", ""))
        return (low + high) / 2.0

    return pd.NA


def fill_cost_with_median(df, column_name="Total cost €"):
    """Parse cost strings/ranges to numbers and fill missing with the median."""
    if column_name not in df.columns:
        print(f"column {column_name} not found")
        return df

    numeric = df[column_name].apply(parse_cost_to_number)
    median_val = numeric.median()

    if pd.isna(median_val):
        print(f"Warning: cannot compute median for {column_name}")
        return df

    df[column_name] = numeric.fillna(median_val)
    return df


# ---------- main cleaning pipeline ----------

def clean_dataset(
        input_csv,
        output_file,
        rem_col=None,
        split_col=None,
        clean_custom_column=None,
        blank_col=None):

    # Only read the 'Worksheet' sheet
    df = pd.read_excel(input_csv, sheet_name="Worksheet")

    if rem_col:
        df = remove_columns(df, rem_col)
        print(f"dropped columns:{rem_col}")

    if split_col:
        for col, (new1, new2) in split_col.items():
            df = split_range_column(df, col, new1, new2)
            print(f"split column {col} into {new1} and {new2}_*columns")

    if blank_col:
        for col in blank_col:
            df = fill_empty(df, col)
            print("filled blank")

    if clean_custom_column:
        for col, (newcol, rules) in clean_custom_column.items():
            df = clean_column(df, col, newcol, rules)


    # 1. Begin & End: replace categorical/non-numeric with median and ensure Begin <= End
    df = ensure_begin_before_end(df, begin_col="Begin", end_col="End")

    # 2. NBS area (m2): replace text/non-numeric with median of numeric values
    df = fill_with_numeric_median(df, "NBS area (m2)")

    # 3. Total cost €: parse ranges, compute median, fill non-numeric/missing
    df = fill_cost_with_median(df, "Total cost €")

    # 4. For all other columns, change empty cells to 'Unknown'
    df = fill_unknown_other_columns(
        df,
        exclude=["Begin", "End", "NBS area (m2)", "Total cost €"]
    )

    # 5. Rename columns for better use in code
    df = rename_columns(df, COLUMN_RENAME)

    # Save and return
    df.to_excel(output_file, index=False)
    print("saved")
    return df


if __name__ == "__main__":

    cleaned_df = clean_dataset(
        input_csv="data/nbs-xls-export 20251119.xlsx",
        output_file="data/cleaned.xlsx",
        rem_col=[
            "Native title of the NBS intervention", "City population", "Primary Beneficiaries",
            "Please specify the roles of the specific government and non-government actor groups involved in the initiative",
            "NBS intervention implemented in response to a national regulations/strategy/plan",
            "NBS intervention implemented in response to a local regulation/strategy/plan",
            "NBS intervention implemented in response to an EU Directive/Strategy",
            "Type of fund(s) used",
            "Type of non-financial contribution",
            "Who provided the non-financial contribution?",
            "Type of reported impacts",
            "Presence of formal monitoring system",
            "Presence of indicators used in reporting",
            "Presence of monitoring/evaluation reports",
            "Availability of a web-based monitoring tool",
            "List of references", "Last updated"
        ],
        split_col={"Duration": ("Begin", "End")},
        clean_custom_column={
            "NBS area": ("NBS area (m2)", [(r"[^0-9.]", "")]),
            "Total cost": ("Total cost €", [])  # keep raw strings; we'll parse later
        },
        # blank_col can stay None or be set if you want specific columns pre-filled
        # blank_col=["e"]
    )

    print(cleaned_df)
