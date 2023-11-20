from flask import Flask, render_template, request
import pandas as pd
import simplejson as json
import time
from utils import load_data_and_create_index, filter_by_viewport, filter_by_type, filter_by_date, filter_by_search_term

app = Flask(__name__)

gdf = load_data_and_create_index()

@app.route('/data')
def data():
    data = gdf.copy()
    start_time = time.time()

    north = request.args.get('north', type=float)
    south = request.args.get('south', type=float)
    east = request.args.get('east', type=float)
    west = request.args.get('west', type=float)
    data = filter_by_viewport(data, north, south, east, west)

    type_filter = request.args.get('type')
    data = filter_by_type(data, type_filter)

    start_date = request.args.get('start')
    end_date = request.args.get('end')
    data = filter_by_date(data, start_date, end_date)

    search_term = request.args.get('search')
    data = filter_by_search_term(data, search_term)

    data = data.drop(columns=['datetime'])

    end_time = time.time()
    print(f"data function took {end_time - start_time} seconds to execute")

    return json.dumps(json.loads(data.to_json()), ignore_nan=True)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)