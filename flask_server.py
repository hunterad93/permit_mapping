from flask import Flask, render_template, request
import pandas as pd
import simplejson as json
import geopandas as gpd

app = Flask(__name__)

@app.route('/data')
def data():
    df = pd.read_csv('data/geocoded_addresses.csv')
    df = df[df['lat'].notnull() & df['lon'].notnull()]

    # Convert the 'date' column to pandas Timestamps
    df['date'] = pd.to_datetime(df['date'])

    # Get the type filter from the query parameters
    type_filter = request.args.get('type')
    if type_filter:
        df = df[df['type'] == type_filter]

    # Get the start and end dates from the query parameters
    start_date = request.args.get('start')
    end_date = request.args.get('end')

    # Convert the start and end dates to pandas Timestamps
    if start_date:
        start_date = pd.to_datetime(start_date)
    if end_date:
        end_date = pd.to_datetime(end_date)

    # Filter the data based on the start and end dates
    if start_date and end_date:
        df = df[(df['date'] >= start_date) & (df['date'] <= end_date)]
    # Convert 'date' column to string format for JSON serialization
    df['date'] = df['date'].astype(str)
    gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df.lon, df.lat))
    return json.dumps(json.loads(gdf.to_json()), ignore_nan=True)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)