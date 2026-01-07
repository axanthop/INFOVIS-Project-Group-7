import pandas as pd
from geopy.geocoders import Nominatim
from time import sleep

INPUT="./assets/data/cleaned.csv"
OUTPUT="./assets/data/coordinates.csv"

CITY_COL ="City"
COUNTRY_COL="Country"

geolocator = Nominatim(user_agent="nbs-geocoder")

df =pd.read_csv(INPUT)

cities = (
    df[[CITY_COL, COUNTRY_COL]]
    .dropna()
    .drop_duplicates()
)

results=[]

for _, row in cities.iterrows():
    city = row[CITY_COL]
    country = row[COUNTRY_COL]

    query = f"{city}, {country}"
    print(f"Geocoding: {query}")

    try:
        location = geolocator.geocode(query)
        if location:
            results.append({
                "city": city,
                "country": country,
                "latitude": location.latitude,
                "longtitude": location.longitude
            })
        else:
            print(f"no query found: {query}")
        
    except Exception as e:
        print(f"error for query{query}:{e}")
    
    sleep(1) # To respect Nominatim's usage policy
    
output_df = pd.DataFrame(results)
output_df.to_csv(OUTPUT, index=False)
print(f"saved {len(output_df)} cities to {OUTPUT}")