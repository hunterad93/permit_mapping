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
        minZoom: 12,
        zoomControl: false
    }).setView(coordinates, zoomLevel);
    map.setMaxBounds(bounds);
    L.tileLayer(TILE_LAYER_URL,{
        bounds:bounds,
        maxZoom: 19,
        minZoom: 12
    }).addTo(map);
    return map;
}

// right sidebar object
let rightSidebar = {
    element: document.getElementById('right-sidebar'),

    show: function() {
        this.element.style.width = SIDEBAR_WIDTH;
        $(this.element).children().css('display', '');
    },

    hide: function() {
        $(this.element).children().css('display', 'none');
        this.element.style.width = '0';
    },

    displayProperties: function(propertiesArray) {
        // Show the spinner
        $('#spinner').css('display', 'block');
    
        // Use setTimeout to delay the execution of the long-running operation
        setTimeout(() => {
            let rows = '';
            propertiesArray.forEach(properties => {
                for (let key in properties) {
                    let value = properties[key];
                    // Check if the key is 'url'
                    if (key === 'url') {
                        // If it's 'url', create a hyperlink
                        value = `<a href="${value}" target="_blank">link</a>`;
                    }
                    rows += `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`;
                }
                rows += '<tr><td colspan="2"><hr></td></tr>'; // Horizontal line to separate different properties
            });
            let $table = $(`<table>${rows}</table>`);
            $(this.element).html(`<strong><p>${propertiesArray.length} permit(s) at this location</p></strong>`).append($table);
            this.show();
    
            // Hide the spinner
            $('#spinner').css('display', 'none');
        }, 100); // 0 ms delay
    }
};

// Permit Filters button object
let permitFiltersButton = {
    element: document.getElementById('permit-filters-button'),

    show: function() {
        this.element.style.width = '200px';
        this.element.style.zIndex = '2'; // Set z-index to 2 when shown
    },

    hide: function() {
        this.element.style.width = '0';
        this.element.style.zIndex = '0'; // Set z-index to 0 when hidden
    }
};

// left sidebar object
let leftSidebar = {
    element: document.getElementById('left-sidebar'),

    show: function() {
        this.element.style.width = SIDEBAR_WIDTH;
    },

    hide: function() {
        this.element.style.width = '0';
    }
};

$('#left-sidebar-close').on('click', function() {
    leftSidebar.hide();
    permitFiltersButton.show(); // Show permit filters button when sidebar is closed
});

$('#permit-filters-button').on('click', function() {
    leftSidebar.show();
    permitFiltersButton.hide(); // Hide permit filters button when it is clicked
});

// Add event listener to stop propagation of click event in the sidebar
$('#right-sidebar').click(function(event) {
    event.stopPropagation();
});

// Add event listener to hide the sidebar when clicking outside of it
$(document).click(function() {
    rightSidebar.hide();
});

// Initialize map and markers
let map = initializeMap('map', [46.8721, -113.9940], 15);
let markers = createMarkerClusterGroup();

// Fetch initial data and add to map
fetchDataAndAddToMap('/data' + getViewportBounds(), markers, debounce = false);

map.on('moveend', function() {
    // When the map movement ends, fetch new data and add to map
    fetchDataAndAddToMap('/data' + getViewportBounds(), markers);
});

function getViewportBounds() {
    // Get the current viewport bounds
    let bounds = map.getBounds();
    // Get the current filter parameters
    let filters = getFilters();
    // Return the bounds and filters as a query string
    return `?north=${bounds.getNorth()}&south=${bounds.getSouth()}&east=${bounds.getEast()}&west=${bounds.getWest()}&${filters}`;
}

let debounceTimeout;

async function fetchDataAndAddToMap(url, markerGroup, debounce = true) {
    const fetchData = async () => {
        // Clear the existing markers
        markerGroup.clearLayers();

        const response = await fetch(url);
        const data = await response.json();
        const geoJsonLayer = createGeoJsonLayer(data);
        markerGroup.addLayer(geoJsonLayer);
        map.addLayer(markerGroup);
    };

    if (debounce) {
        clearTimeout(debounceTimeout); // Clear the previous timeout
        debounceTimeout = setTimeout(fetchData, 1000); // Set a new timeout
    } else {
        await fetchData();
    }
}

// Add event listeners for cluster clicks
addClusterClickListener(markers);



function createMarkerClusterGroup() {
    return L.markerClusterGroup({

        iconCreateFunction: function(cluster) {
            let className = 'marker-cluster ';
            if (cluster.getChildCount() < 10) {
                className += 'marker-cluster-small';
            } else if (cluster.getChildCount() < 100) {
                className += 'marker-cluster-medium';
            } else {
                className += 'marker-cluster-large';
            }
            return L.divIcon({
                html: '<b>' + cluster.getChildCount() + '</b>',
                className: className,
                iconSize: new L.Point(30, 30)
            });
        },
        spiderfyOnMaxZoom: false,  // Disable spiderfying on max zoom
        showCoverageOnHover: false, //Disable the blue polygons
        removeOutsideVisibleBounds: false,  // Keep all markers in the cluster group
        animate: false,  // Disable animation
        maxClusterRadius: 80,  // Increase the maximum radius that a cluster will cover (default is 80)
        chunkedLoading: true,  // Enable chunked loading to improve performance
        chunkInterval: 10  // Control how long each chunk operation can run for (in milliseconds)
        });
}

function createGeoJsonLayer(data) {
    return L.geoJSON(data, {
        pointToLayer: createMarker
    });
}

function createMarker(feature, latlng) {
    let marker = L.marker(latlng);
    marker.on('click', createClickHandler(feature.properties));
    return marker;
}

function createClickHandler(properties) {
    return function(event) {
        event.originalEvent.stopPropagation();
        displayPropertiesInSidebar(properties);
    };
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

function getFilters() {
    let selectedType = $('#type-filter').val();
    let searchTerm = $('#search-input').val().toLowerCase();
    let startDate = $('#start-date').val();
    let endDate = $('#end-date').val();
    let recentData = $('#recent-data').is(':checked') ? 'recent' : 'all';

    // Return the filters without the leading '?'
    return `type=${selectedType}&search=${searchTerm}&start=${startDate}&end=${endDate}&data=${recentData}`;
}

$('#type-filter').change(function() {
    fetchDataAndAddToMap(`/data${getViewportBounds()}`, markers);
});

$('#search-button, #date-filter-button').click(function() {
    fetchDataAndAddToMap(`/data${getViewportBounds()}`, markers);
});

$('#recent-data').change(function() {
    fetchDataAndAddToMap(`/data${getViewportBounds()}`, markers);
});