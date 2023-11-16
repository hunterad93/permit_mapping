// Constants
const SIDEBAR_WIDTH = '300px';
const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

function initializeMap(mapId, coordinates, zoomLevel) {
    var southWest = L.latLng(46.6, -113.0),
    northEast = L.latLng(47.2, -115.0),
    bounds = L.latLngBounds(southWest, northEast);
    var map = L.map(mapId, {
        maxZoom: 19,
        minZoom: 10,
        zoomControl: false
    }).setView(coordinates, zoomLevel);
    map.setMaxBounds(bounds);
    L.tileLayer(TILE_LAYER_URL,{
        bounds:bounds,
        maxZoom: 19,
        minZoom: 10
    }).addTo(map);
    return map;
}

// Sidebar object
var Sidebar = {
    element: document.getElementById('sidebar'),

    show: function() {
        this.element.style.width = SIDEBAR_WIDTH;
    },

    hide: function() {
        this.element.style.width = '0';
    },

    displayProperties: function(propertiesArray) {
        var content = `<strong><p>${propertiesArray.length} permit(s) at this location</p></strong><table>`;
        propertiesArray.forEach(properties => {
            for (var key in properties) {
                content += `<tr><td><strong>${key}:</strong></td><td>${properties[key]}</td></tr>`;
            }
            content += '<tr><td colspan="2"><hr></td></tr>'; // Horizontal line to separate different properties
        });
        content += '</table>';
        this.element.innerHTML = content;
        this.show();
    }
};

// Add event listener to stop propagation of click event in the sidebar
Sidebar.element.addEventListener('click', function(event) {
    event.stopPropagation();
});

// Add event listener to hide the sidebar when clicking outside of it
document.addEventListener('click', function() {
    Sidebar.hide();
});

// Initialize map and markers
var map = initializeMap('map', [46.8721, -113.9940], 14);


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
        showCoverageOnHover: false, //Disable the blue polygons
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
    marker.on('click', function(event) {
        event.originalEvent.stopPropagation();
        displayPropertiesInSidebar(feature.properties);
    });
    return marker;
}

function searchLocations(markers, searchResults) {
    // Get the selected property and the search term
    var property = document.getElementById('property-select').value;
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
        // If marker's selected property contains the search term, add to results
        var propValue = allMarkers[i].feature.properties[property];
        
        if (propValue && propValue.toLowerCase().includes(searchTerm)) {
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
        a.originalEvent.stopPropagation();
        if (map.getZoom() === map.getMaxZoom()) {
            displayClusterPropertiesInSidebar(a.layer.getAllChildMarkers());
        }
    });
}

function displayPropertiesInSidebar(properties) {
    Sidebar.displayProperties([properties]);
}

function displayClusterPropertiesInSidebar(markers) {
    var propertiesArray = markers.map(marker => marker.feature.properties);
    Sidebar.displayProperties(propertiesArray);
}

var toggleButtons = document.querySelectorAll('.toggle-button');
for (var i = 0; i < toggleButtons.length; i++) {
    toggleButtons[i].addEventListener('click', function() {
        var target = document.getElementById(this.dataset.target);
        target.classList.toggle('open');
    });
}