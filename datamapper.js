// d3.json('public_advocate.geo.json', function(error, mapData) {
//     var features = mapData.features;
// })

// svg.append("path")
//     .datum({type: "FeatureCollection", features: features})
//     .attr("d", d3.geoPath());


// d3.selectAll("h1").style("color","red");

// const canvas = d3.select("canvas")
// const ctx = canvas.getContext("2d")

// d3.json('public_advocate.geo.json', function(error, mapData) {
//     var features = mapData.features;

//     map.data(features)
//     .enter().append


// })

// document.addEventListener("DOMContentLoaded", () => {
//     let width = 700;
//     let height = 500;
//     let svg = d3.select("svg").attr("preserveAspectRatio", "xMinYMin meet")
//         .attr("viewbox", "0 0" + width + " " + height)


//     let projection = d3.geoEquirectangular()
//     .translate([width/2, height/2]).scale(69000).center([-73.985974, 40.712776]);

//     let path = d3.geoPath().projection(projection)

//     let edMap = d3.json("public_advocate.geo.json");

//     edMap.then((data) => {
//         svg.selectAll("path")
//         .data(data.features)
//         // console.log(data.features)
//         .enter()
//         .append("path")
//         .attr("id", (d) => (d.properties.combined_w))
//         .attr("d", path);
//         // .exit()
//         console.log("completed!");
//     });

    
// })



mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtaHVkaXMiLCJhIjoiY2pudzdwZTIyMDA2dTN2bWVtY3Q1Znc5NSJ9.KKMNkGea2HILNgmDRDDj9Q';
var map = new mapboxgl.Map({
container: 'map',
style: 'mapbox://styles/samhudis/cjuefwyqu1o5j1fnrju4ywcgq',
center: [-74,40.75],
zoom: 10
});
var hoveredId = null

map.on('load', function() {
    map.addLayer({
        "id": "Election District",
        "type": 'fill',
        "source": {
            type: 'vector',
            url: 'mapbox://samhudis.5jrmia73'
        },
        "source-layer": "pa_eds_lite-a0qgzr",
        "paint": {
            "fill-color": ["case", ["boolean", ["feature-state", "hover"], false],
            "#000000",
            "#ffffff"],
            "fill-opacity": 0.7,
        }
    }, "road-label"
    )
    // map.addSource('Election District', {
    //     "type": "geojson",
    //     "data": "./election_districts.geo.json"
    //     });

    map.on("mousemove", "Election District", function(e) {
        if (e.features.length > 0) {
            if (hoveredId) {
                map.setFeatureState({sourceLayer: "pa_eds_lite-a0qgzr", source: 'Election District', id: hoveredId}, { hover: false});
            }
            hoveredId = e.features[0].id;
            map.setFeatureState({sourceLayer: "pa_eds_lite-a0qgzr", source: 'Election District', id: hoveredId},{ hover: true});
        }
    })

    map.on("mouseleave", "Election District", function() {
        if (hoveredId) {
            map.setFeatureState({sourceLayer: "pa_eds_lite-a0qgzr", source: 'Election District', id: hoveredId}, { hover: false});
        }
        hoveredId = null;
    })
})