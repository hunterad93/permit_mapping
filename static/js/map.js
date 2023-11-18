// Constants
const SIDEBAR_WIDTH = '300px';
const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';


//Creating the map
function initializeMap(mapId, coordinates, zoomLevel) {
    let southWest = L.latLng(46.6, -113.0), //guessed an approximate perim
    northEast = L.latLng(47.2, -115.0),
    bounds = L.latLngBounds(southWest, northEast);
    let map = L.map(mapId, { //prevent crazy zoom out or in
        maxZoom: 19,
        minZoom: 8,
        zoomControl: false
    }).setView(coordinates, zoomLevel);
    map.setMaxBounds(bounds);
    L.tileLayer(TILE_LAYER_URL,{
        bounds:bounds,
        maxZoom: 19,
        minZoom: 8
    }).addTo(map);
    return map;
}

// right sidebar object
let rightSidebar = {
    element: document.getElementById('right-sidebar'),

    show: function() {
        this.element.style.width = SIDEBAR_WIDTH;
    },

    hide: function() {
        this.element.style.width = '0';
    },

    displayProperties: function(propertiesArray) {
        let $table = $('<table>');
        propertiesArray.forEach(properties => {
            for (let key in properties) {
                $table.append(`<tr><td><strong>${key}:</strong></td><td>${properties[key]}</td></tr>`);
            }
            $table.append('<tr><td colspan="2"><hr></td></tr>'); // Horizontal line to separate different properties
        });
        $(this.element).html(`<strong><p>${propertiesArray.length} permit(s) at this location</p></strong>`).append($table);
        this.show();
    }
};

// Add event listener to stop propagation of click event in the sidebar
$('#right-sidebar').click(function(event) {
    event.stopPropagation();
});

// Add event listener to hide the sidebar when clicking outside of it
$(document).click(function() {
    rightSidebar.hide();
});

// Initialize map and markers
let map = initializeMap('map', [46.8721, -113.9940], 14);


let markers = createMarkerClusterGroup();
let searchResults = createMarkerClusterGroup();

// Fetch initial data and add to map
fetchDataAndAddToMap('/data', markers);

// Add event listener for search button
$('#search-button').click(function() {
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
        chunkInterval: 10  // Control how long each chunk operation can run for (in milliseconds)
        });
}

async function fetchDataAndAddToMap(url, markerGroup) {
    // Clear the existing markers
    markerGroup.clearLayers();

    const response = await fetch(url);
    const data = await response.json();
    const geoJsonLayer = createGeoJsonLayer(data);
    markerGroup.addLayer(geoJsonLayer);
    map.addLayer(markerGroup);
}

function createGeoJsonLayer(data) {
    return L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return createMarker(feature, latlng);
        }
    });
}

function createMarker(feature, latlng) {
    let marker = L.marker(latlng);
    marker.on('click', function(event) {
        event.originalEvent.stopPropagation();
        displayPropertiesInSidebar(feature.properties);
    });
    return marker;
}

function searchLocations(markers, searchResults) {
    // Get the selected property and the search term
    let searchTerm = document.getElementById('search-input').value.toLowerCase();

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
    let allMarkers = markers.getLayers();

    // Clear the current markers from the search results
    searchResults.clearLayers();

    // Loop through markers
    for (let i = 0; i < allMarkers.length; i++) {
        // If marker's selected property contains the search term, add to results
        let propValue = allMarkers[i].feature.properties['street1'];
        
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
    rightSidebar.displayProperties([properties]);
}

function displayClusterPropertiesInSidebar(markers) {
    let propertiesArray = markers.map(marker => marker.feature.properties);
    rightSidebar.displayProperties(propertiesArray);
}

$('#type-filter').change(function() {
    let selectedType = $(this).val();
    fetchDataAndAddToMap(`/data?type=${selectedType}`, markers);
});

$('#date-filter-button').click(function() {
    let startDate = $('#start-date').val();
    let endDate = $('#end-date').val();

    // Fetch data based on the selected dates
    fetchDataAndAddToMap(`/data?start=${startDate}&end=${endDate}`, markers);
});