let ED = {};
let EDLastClicked = 0;
const ElectDistJSON = jQuery.getJSON('./gis_temp/pa_eds_lite.geo.json').then((responseJSON) => {
const features = responseJSON.features;
for (let i=0; i < features.length; i++) {
    let ed = features[i].properties.ed;
    ED[ed] = features[i];
}
})
let data = {};
let columns = [];
let total = {};
let totalVotes = 0;
let candidates = [];
$.ajax({
    type: "GET",
    url: "./Public_Advocate.csv",
    dataType: "text",
    success: function(response) {loadCSV(response)}
})

function htmlSanitize(str) {
    const invalids = [".","'","'","(",")","."]
    for (let i=0; i<invalids.length; i++) {
        str = str.replace(invalids[i],"")
    }
    return str
}

function loadCSV(csv) {
    let rows = csv.split("\n")
    columns = rows[0].split(",");
    for (let i=0; i<columns.length; i++) {
        total[columns[i]] = 0;
    }
    for (let i=1; i<rows.length; i++) {
        let rowArr = rows[i].split(",");
        let row = {}
        for (let j=0; j<columns.length;j++) {
            row[columns[j]] = rowArr[j]
            if (!(isNaN(Number(row[columns[j]])))) {
                total[columns[j]] += Number(row[columns[j]])
  
            }
        }
        let ed = rowArr[0];
        data[ed] = row;
    }
    // for (let i=0; i<columns.length; i++) {
    //     totals
    //     for (let j=0; j<data.keys.length; j++) {

    //     }
    // }
    let table = d3.select("tbody")
    for (let i=0; i<columns.length; i++) {
        let column = columns[i]
        if (!(column.indexOf("(") === -1)
        && !(column.indexOf(")") === -1)
        && (column.indexOf("__") === -1)
        && !(column.indexOf("p_") === 0)
        ) {
            candidates.push(column)
            let row = table.append("tr").attr("id", htmlSanitize(column)).attr("class", "candidate-row");
            row.append("td").attr("id","key").text(column.split("(")[0]);
            let values = row.append("td").attr("id","values")
            values.append("td").attr("id","percent-to-update").text()
            values.append("td").attr("id","value").text(total[column]);
        }
    }
    for (let i=0;i<candidates.length;i++) {
        totalVotes += total[candidates[i]]
    }
    for (let i=0; i<candidates.length;i++) {
        d3.select("#percent-to-update").attr("id","percent").text(((total[candidates[i]]/totalVotes)*100).toFixed(2)+"%")
    }
    let row = table.append("tr").attr("id", "total-row");
    row.append("td").attr("id","key").text("Total");
    let values = row.append("td").attr("id","values")
    values.append("td").attr("id", "percent").text("100%")
    values.append("td").attr("id","value").text(totalVotes);

}


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
    
    map.on("mousemove", "Election District", function(e) {
        if (e.features.length > 0) {
            if (hoveredId) {
                map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District Border', id: hoveredId}
                , { hover: false});
            }
            hoveredId = e.features[0].id;
            currentED = e.features[0].properties.ed;
            d3.select("#table-title").text("ED "+currentED)
            d3.selectAll(".candidate-row").attr("class","candidate-row-to-update")
            d3.selectAll("#percent").attr("id", "percent-to-update")
            let EDTotal = 0
            for (let i=0; i<candidates.length; i++) {
                let EDCandidateCount = data[currentED][candidates[i]]
                EDTotal += Number(EDCandidateCount)
                d3.select(".candidate-row-to-update").attr("class","candidate-row").select("#value").text(EDCandidateCount)
            }
            for (let i=0; i<candidates.length; i++) {
                let EDCandidateCount = data[currentED][candidates[i]]
                if (EDTotal === 0) {
                    d3.select("#percent-to-update").attr("id","percent").text("0%")
                }
                else {
                    d3.select("#percent-to-update").attr("id","percent").text(((EDCandidateCount/EDTotal)*100).toFixed(2)+"%")
                }
            }
            d3.select("#total-row").select("#value").text(EDTotal)
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
        d3.selectAll(".candidate-row").attr("class", "candidate-row-to-update")
        d3.selectAll("#percent").attr("id","percent-to-update")
        for (let i=0; i<candidates.length;i++) {
            d3.select(".candidate-row-to-update").attr("class","candidate-row").select("#value").text(total[candidates[i]])
            d3.select("#percent-to-update").attr('id','percent').text(((total[candidates[i]]/totalVotes)*100).toFixed(2)+"%")
        }
        d3.select("#total-row").select("#value").text(totalVotes)

    })

    map.on('click', 'Election District', function (e) {
        let clickedED = e.features[0].properties.ed;
        if (clickedED === EDLastClicked) {
            EDLastClicked = null;
            zoomToCity(map);
        }
        else {
        EDLastClicked = clickedED;
        zoomToED(map, clickedED);
        }
        });
})