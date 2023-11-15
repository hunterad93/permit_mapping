// Initialize map and markers
var map = initializeMap('map', [0, 0], 2);
var markers = createMarkerClusterGroup();
var searchResults = createMarkerClusterGroup();

// Fetch initial data and add to map
fetchDataAndAddToMap('/data', markers);

// Add event listener for search button
document.getElementById('search-button').addEventListener('click', function() {
    searchLocations(markers, searchResults);
});

// Add event listeners for cluster clicks
addClusterClickListener(markers);
addClusterClickListener(searchResults);

function initializeMap(mapId, coordinates, zoomLevel) {
    var map = L.map(mapId).setView(coordinates, zoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    return map;
}

function createMarkerClusterGroup() {
    return L.markerClusterGroup({

        iconCreateFunction: function(cluster) {
            return L.divIcon({
                html: '<b>' + cluster.getChildCount() + '</b>',
                className: 'marker-cluster marker-cluster-large',
                iconSize: new L.Point(40, 40)
            });
        },
        spiderfyOnMaxZoom: false,  // Disable spiderfying on max zoom
        removeOutsideVisibleBounds: false,  // Keep all markers in the cluster group
        animate: false,  // Disable animation
        maxClusterRadius: 120,  // Increase the maximum radius that a cluster will cover (default is 80)
        chunkedLoading: true,  // Enable chunked loading to improve performance
        chunkInterval: 100  // Control how long each chunk operation can run for (in milliseconds)
        });
}

function fetchDataAndAddToMap(url, markerGroup) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            var geoJsonLayer = createGeoJsonLayer(data);
            markerGroup.addLayer(geoJsonLayer);
            map.addLayer(markerGroup);
        });
}

function createGeoJsonLayer(data) {
    return L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return createMarker(feature, latlng);
        }
    });
}

function createMarker(feature, latlng) {
    var marker = L.marker(latlng);
    marker.on('click', function() {
        displayPropertiesInSidebar(feature.properties);
    });
    return marker;
}

function displayPropertiesInSidebar(properties) {
    var table = '<table>';
    for (var key in properties) {
        table += `<tr><td>${key}</td><td>${properties[key]}</td></tr>`;
    }
    table += '</table>';
    document.getElementById('sidebar').innerHTML = table;
}

function searchLocations(markers, searchResults) {
    // Get the search term
    var searchTerm = document.getElementById('search-input').value.toLowerCase();

    // If the search term is empty, show the original markers layer
    if (searchTerm === '') {
        // Remove the search results from the map
        map.removeLayer(searchResults);

        // Add the original markers to the map
        map.addLayer(markers);

        // Exit the function
        return;
    }

    // Get all markers
    var allMarkers = markers.getLayers();

    // Clear the current markers from the search results
    searchResults.clearLayers();

    // Loop through markers
    for (var i = 0; i < allMarkers.length; i++) {
        // If marker's field contains the search term, add to results
        var street1 = allMarkers[i].feature.properties.street1;
        if (street1 && street1.toLowerCase().includes(searchTerm)) {
            searchResults.addLayer(allMarkers[i]);  // Add the marker to the search results
        }
    }

    // Clear the current markers from the map
    map.removeLayer(markers);

    // Add the search results to the map
    map.addLayer(searchResults);

    // If there are any results, move to the location of the first result and zoom in
    if (searchResults.getLayers().length > 0) {
        map.setView(searchResults.getLayers()[0].getLatLng(), 12);
    }
}

function addClusterClickListener(markerGroup) {
    markerGroup.on('clusterclick', function (a) {
        if (map.getZoom() === map.getMaxZoom()) {
            displayClusterPropertiesInSidebar(a.layer.getAllChildMarkers());
        }
    });
}

function displayClusterPropertiesInSidebar(markers) {
    var table = '<table>';
    markers.forEach(marker => {
        var row = marker.feature.properties;
        for (var key in row) {
            table += `<tr><td>${key}</td><td>${row[key]}</td></tr>`;
        }
    });
    table += '</table>';
    document.getElementById('sidebar').innerHTML = table;
}