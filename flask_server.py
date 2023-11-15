from flask import Flask, render_template
import pandas as pd
import simplejson as json
import geopandas as gpd

app = Flask(__name__)

@app.route('/data')
def data():
    df = pd.read_csv('../data/geocoded_addresses.csv')
    df = df[df['lat'].notnull() & df['lon'].notnull()]
    gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df.lon, df.lat))
    return json.dumps(json.loads(gdf.to_json()), ignore_nan=True)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)