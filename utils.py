import pandas as pd
import geopandas as gpd

def load_data_and_create_index():
    df = pd.read_csv('data/geocoded_addresses.csv')
    df = df[df['lat'].notnull() & df['lon'].notnull()]
    df['datetime'] = pd.to_datetime(df['date'])
    df = df.reset_index(drop=True)

    gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df.lon, df.lat))

    return gdf

def filter_by_viewport(data, north, south, east, west):
    return data[(data['lon'] >= west) & (data['lon'] <= east) & (data['lat'] >= south) & (data['lat'] <= north)]

def filter_by_type(data, type_filter):
    if type_filter:
        return data[data['type'] == type_filter]
    return data

def filter_by_date(data, start_date, end_date):
    if start_date and end_date:
        start_date = pd.to_datetime(start_date)
        end_date = pd.to_datetime(end_date)
        return data[(data['datetime'] >= start_date) & (data['datetime'] <= end_date)]
    return data

def filter_by_search_term(data, search_term):
    if search_term and search_term != '':
        return data[data['street1'].str.contains(search_term, case=False, na=False)]
    return data