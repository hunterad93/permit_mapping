from flask import Flask, render_template, request
import pandas as pd
import simplejson as json
import geopandas as gpd

app = Flask(__name__)

# Load and preprocess the data when the application starts
def load_data():
    df = pd.read_csv('data/geocoded_addresses.csv')
    df = df[df['lat'].notnull() & df['lon'].notnull()]
    df['datetime'] = pd.to_datetime(df['date'])
    return df

df = load_data()

@app.route('/data')
def data():
    # Copy the preprocessed data
    data = df.copy()

    # Filter the data based on the type
    type_filter = request.args.get('type')
    if type_filter:
        data = data[data['type'] == type_filter]
    # Filter the data based on the start and end dates
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    if start_date and end_date:
        start_date = pd.to_datetime(start_date)
        end_date = pd.to_datetime(end_date)
        data = data[(data['datetime'] >= start_date) & (data['datetime'] <= end_date)]
    # Filter the data based on the search term
    search_term = request.args.get('search')
    if search_term and search_term != '':
        data = data[data['street1'].str.contains(search_term, case=False, na=False)]
    # Drop the datetime column as per instructions
    data = data.drop(columns=['datetime'])
    # Convert the data to GeoJSON
    gdf = gpd.GeoDataFrame(data, geometry=gpd.points_from_xy(data.lon, data.lat))
    print(start_date)
    print(end_date)
    print(type_filter)
    print(search_term)
    return json.dumps(json.loads(gdf.to_json()), ignore_nan=True)


@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)