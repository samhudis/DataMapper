let ED = {};
const ElectDistJSON = jQuery.getJSON('./gis_temp/pa_eds_lite.geo.json').then((responseJSON) => {
const features = responseJSON.features;
for (let i=0; i < features.length; i++) {
    let ed = features[i].properties.ed;
    ED[ed] = features[i];
}
})
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtaHVkaXMiLCJhIjoiY2pudzdwZTIyMDA2dTN2bWVtY3Q1Znc5NSJ9.KKMNkGea2HILNgmDRDDj9Q';
var map = new mapboxgl.Map({
container: 'map',
style: 'mapbox://styles/samhudis/cjuefwyqu1o5j1fnrju4ywcgq',
center: [-73.97875695,40.70545215],
zoom: 9
});
let hoveredId = null;
let currentED = null;
const inSourceLayer = "pa_eds_lite-a0qgzr";

const zoomTo = function(map, featureArr) {
    let n = -100;
    let s = 100;
    let e = 200;
    let w = -200;
    for (let i=0; i < featureArr.length; i++) {
        // let ed = featureArr[i].ed;
        let bounds = turf.envelope(featureArr[i]).geometry.coordinates[0];
        for (let i=0; i < bounds.length; i++) {
            let corner = bounds[i]
                if (corner[1] > n) {n = corner[1]}
                if (corner[1] < s) {s = corner[1]}
                if (corner[0] < e) {e = corner[0]}
                if (corner[0] > w) {w = corner[0]}
        }
    }
    map.fitBounds([[w,s],[e,n]], {padding: 25, linear: false})
}

const zoomToED = function(map, ed) {
    let features = [ED[ed]]
    zoomTo(map, features)
}

const zoomToCity = function(map) {
    map.fitBounds([[-74.2556845,40.4955504],[-73.7018294,40.9153539]], {padding: 5})
}

map.on('load', function() {
    zoomToCity(map)
    map.addLayer({
        "id": "Election District",
        "type": 'fill',
        "source": {
            type: 'vector',
            url: 'mapbox://samhudis.5jrmia73'
        },
        "source-layer": inSourceLayer,
        "paint": {
            // "fill-color": ["case", ["boolean", ["feature-state", "hover"], false],
            // "#000000",
            // "#ffffff"],
            "fill-color": "#ffffff",
            "fill-opacity": 0.7,
        }
    }, "road-label"
    )
    // map.addSource('Election District', {
    //     "type": "geojson",
    //     "data": "./election_districts.geo.json"
    //     });
    // debugger

    map.addLayer({
        "id": "Election District Border",
        "type": 'line',
        "source": {
            type: 'vector',
            url: 'mapbox://samhudis.5jrmia73'
        },
        "source-layer": inSourceLayer,
        "paint": {
            // "line-color": ["case", ["boolean", ["feature-state", "hover"], false],
            // "#000000",
            // "#ffffff"],
            "line-color": "#000000",
            "line-width": 2,
            "line-opacity": ["case", ["boolean", ["feature-state","hover"], false],
            1,
            0]
        }
    }, "road-label")

    // const EDs = map.querySourceFeatures("Election District", {'sourceLayer': inSourceLayer});
    // const features = map.queryRenderedFeatures();
    // debugger
    // zoomTo(features)
    // map.flyto(turf.center(map.getLayer("Election District")))
    
    map.on("mousemove", "Election District", function(e) {
        if (e.features.length > 0) {
            if (hoveredId) {
                map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District Border', id: hoveredId}
                , { hover: false});
            }
            hoveredId = e.features[0].id;
            currentED = e.features[0].properties.ed;
            d3.select("#table-title").text("ED "+currentED)
            map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District Border', id: hoveredId},{ hover: true});
        }
    })

    map.on("mouseleave", "Election District", function() {
        if (hoveredId) {
            map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District Border', id: hoveredId}, { hover: false});
        }
        hoveredId = null;
        currentED = null;
        d3.select("#table-title").text("Total")
    })

    map.on('click', 'Election District', function (e) {
        // map.jumpTo({zoom: 12});
        zoomToED(map, e.features[0].properties.ed);

        });
})