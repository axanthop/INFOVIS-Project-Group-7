import pandas as pd

def remove_columns(df, columns_to_exclude):

    cols = [col for col in columns_to_exclude if col in df.columns]
    return df.drop(columns=cols)


def split_range_column(df, column_name, new_col_1, new_col_2, delimiter=" - "):
    if column_name not in df.columns:
        print(f"column {column_name} not found")
        return df
    
    split_col=(
        df[column_name].astype(str).str.split(delimiter, expand=True).apply(lambda col: col.str.strip())
    )

    split_col.columns = [new_col_1, new_col_2]

    col_index =df.columns.get_loc(column_name)+1
    df.insert(col_index, new_col_1, split_col[new_col_1])
    df.insert(col_index+1, new_col_2, split_col[new_col_2])

    df = df.drop(columns=[column_name])
    return df

def fill_empty(df, column_name, replacement="Unknown"):
    
    if column_name not in df.columns:
        print(f"column {column_name} not found")
        return df
    
    df[column_name] = (df[column_name].astype(str).str.strip().replace({"":replacement, "nan":replacement,"None":replacement}).fillna(replacement))

    return df

def clean_column(df, column_name, new_column_name, replacements):
    if column_name not in df.columns:
        print(f"column {column_name} not found")
        return df
    
    col = df[column_name].astype(str)

    for pattern, repl in replacements:
        col = col.str.replace(pattern, repl, regex=True)
    
    col_index = df.columns.get_loc(column_name)+1
    df.insert(col_index, new_column_name, col)

    df = df.drop(columns=[column_name])

    return df

def clean_dataset(
        input_csv,
        output_file,
        rem_col=None,
        split_col=None,
        clean_custom_column=None,
        blank_col=None):
    
    df=pd.read_excel(input_csv)
    
    if rem_col:
        df = remove_columns(df, rem_col)
        print(f"dropped columns:{rem_col}")

    if split_col:
        for col, (new1, new2) in split_col.items():
            # df = split_columns(df, col, val)
            df = split_range_column(df, col, new1, new2)
            print(f"split column {col} into {new1} and {new2}_*columns")

    if blank_col:
        for col in blank_col:
            df = fill_empty(df, col)
            print("filled blank")

    if clean_custom_column:
        for col, (newcol, rules) in clean_custom_column.items():
            df = clean_column(df, col, newcol, rules)

        # df.to_csv(output_csv, index=False)
        df.to_excel(output_file, index=False)
        print("saved")
        return df

if __name__=="__main__":

    cleaned_df = clean_dataset(
        input_csv = "data/data.xlsx",
        output_file = "cleaned.xlsx",
        rem_col = ["Native title of the NBS intervention", "City population", "Primary Beneficiaries",
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
                    "List of references", "Last updated"],
        split_col = {"Duration":("Begin", "End")},
        clean_custom_column={
            "NBS area": ("NBS area (m2)", [(r"[^0-9.]", "")]),
            "Total cost": ("Total cost €", [(r"[€]", "")])
            },
        # blank_col = ["e"]
    )

    print(cleaned_df)