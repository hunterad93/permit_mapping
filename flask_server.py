from flask import Flask, render_template, request
import pandas as pd
import simplejson as json
import geopandas as gpd
from rtree import index
import time


app = Flask(__name__)


# Load and preprocess the data when the application starts
def load_data_and_create_index():
    df = pd.read_csv('data/geocoded_addresses.csv')
    df = df[df['lat'].notnull() & df['lon'].notnull()]
    df['datetime'] = pd.to_datetime(df['date'])

    # Reset the DataFrame's index
    df = df.reset_index(drop=True)

    idx = index.Index()
    for i, row in df.iterrows():
        idx.insert(i, (row['lon'], row['lat'], row['lon'], row['lat']))

    return df, idx

df, idx = load_data_and_create_index()


def filter_by_viewport(data, north, south, east, west):
    indices = list(idx.intersection((west, south, east, north)))
    return data.iloc[indices]

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

@app.route('/data')
def data():
    start_time = time.time()
    # Copy the preprocessed data
    data = df.copy()

    # Get the viewport bounds from the query parameters
    north = request.args.get('north', type=float)
    south = request.args.get('south', type=float)
    east = request.args.get('east', type=float)
    west = request.args.get('west', type=float)

    # Filter the data based on the viewport bounds
    data = filter_by_viewport(data, north, south, east, west)

    # Filter the data based on the type
    type_filter = request.args.get('type')
    data = filter_by_type(data, type_filter)

    # Filter the data based on the start and end dates
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    data = filter_by_date(data, start_date, end_date)

    # Filter the data based on the search term
    search_term = request.args.get('search')
    data = filter_by_search_term(data, search_term)

    # Drop the datetime column as per instructions
    data = data.drop(columns=['datetime'])

    # Convert the data to GeoJSON
    gdf = gpd.GeoDataFrame(data, geometry=gpd.points_from_xy(data.lon, data.lat))

    end_time = time.time()
    print(f"data function took {end_time - start_time} seconds to execute")


    return json.dumps(json.loads(gdf.to_json()), ignore_nan=True)


@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)