let ED = {};
let EDLastClicked = 0;
let legend = [];
let color = {}
// let legend = [[23001, 65001], '#000000',
// 23002, '#000100'];
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
let rank = {};

$.ajax({
    type: "GET",
    url: "./Public_Advocate.csv",
    dataType: "text",
    success: function(response) {loadCSV(response)}
})

function htmlSanitize(str) {
    const invalids = [".","'","'","(",")",".","__"]
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
            if ((rowArr[j] !== undefined) && (rowArr[j].indexOf("\r") !== -1)) {
                row[columns[j]] = row[columns[j]].split("\r")[0]}
            if (!(isNaN(Number(row[columns[j]])))) {
                total[columns[j]] += Number(row[columns[j]])
  
            }
        }
        let ed = rowArr[0];
        data[ed] = row;
    }
    let candidateKeys = Object.keys(total)
    for (let i=1; i<candidateKeys.length; i++) {
        rank[total[candidateKeys[i]]] = candidateKeys[i].replace("__"," ")
    }

    let candidatesUnsorted = [];
    let table = d3.select("tbody")
    for (let i=0; i<columns.length; i++) {
        let column = columns[i]
        if (((!(column.indexOf("(") === -1)
        && !(column.indexOf(")") === -1))
        || !(column.indexOf("Scattered") === -1))
        // || false)
        && (column.indexOf("__") === -1)
        && !(column.indexOf("p_") === 0)
        )
        {
            candidatesUnsorted.push(column)
        }
    }


    let candidatesRankVotes = Object.keys(rank).sort((a,b) => b - a);

    for (let i=0; i<candidatesRankVotes.length; i++) {
        let candidate = rank[candidatesRankVotes[i]]
        if (candidatesUnsorted.indexOf(candidate) !== -1) {
            candidates.push(candidate)
        }
    }

    //legend packing goes here
    // legend.push([23001])
    // legend.push("#000000")
    const legendColors = ["#fdb800","#c10032","#006544","#78c7eb","#a9e558","#720091","#ffff00","#df73ff","#a87000","#004da8"]
    let k = 0
    for (let i=0; i<legendColors.length;) {
        let candidate = candidates[k]
        let EDs = Object.keys(data)
        let winningEds = []
        for (let j=0; j<EDs.length; j++) {
            let ed = EDs[j]
            if (data[ed].winner === candidate.replace(" (","__(")) {
                winningEds.push(Number(ed))
            }
        }
        if (winningEds.length > 1) {
        legend.push(winningEds)
        legend.push(legendColors[i])
        color[candidate] = legendColors[i]
        k++
        i++
        }
        else {
            k++;
            color[candidate] = "#ffffff"}
    }

    for (let i=0;i<candidates.length;i++) {
        totalVotes += total[candidates[i]]
        let row = table.append("tr").attr("id", htmlSanitize(candidates[i])).attr("class", "candidate-row").style("background", color[candidates[i]]);
        row.append("td").attr("id","key").text(candidates[i].split("(")[0]);
        let values = row.append("td").attr("id","values")
        values.append("td").attr("id","percent-to-update").text()
        values.append("td").attr("id","value").text(total[candidates[i]].toLocaleString());
    }
    for (let i=0; i<candidates.length;i++) {
        d3.select("#percent-to-update").attr("id","percent").text(((total[candidates[i]]/totalVotes)*100).toFixed(2)+"%")
    }
    let row = table.append("tr").attr("id", "total-row");
    row.append("td").attr("id","key").text("Total");
    let values = row.append("td").attr("id","values")
    values.append("td").attr("id", "percent").text("100%")
    values.append("td").attr("id","value").text(totalVotes.toLocaleString());

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
// const inSourceLayer = "pa_eds_lite"

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

    // map.addSource('Election District', {
    // "type": "geojson",
    // "data": "./pa_eds_lite_2.geojson"
    // // "data": "mapbox://samhudis.5jrmia73"
    
    // });
    map.addLayer({
        "id": "Election District",
        "type": 'fill',
        "source": {
            type: 'vector',
            url: 'mapbox://samhudis.5jrmia73'
        },
        "source-layer": inSourceLayer,
        // "source": 'Election District',
        "paint": {
            // "fill-color": ["case", ["boolean", ["feature-state", "hover"], false],
            // "#000000",
            // "#ffffff"],
            "fill-color": "#ffffff",
            "fill-color": [
                'match',
                ["get", "ed"],
                ...legend,
                // [23001], "#000000",
                "#ffffff"  
            ],
            "fill-opacity": 0.7,
        }
    }, "road-label"
    )

    // let EDs = Object.keys(data)
    // for (let i=0; i<EDs.length;i++) {
    //     debugger
    //     map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District', id: EDs[i]},{ winner: data[EDs[i]]});
    // }

    map.addLayer({
        "id": "Election District Border",
        "type": 'line',
        "source": {
            type: 'vector',
            url: 'mapbox://samhudis.5jrmia73'
        },
        "source-layer": inSourceLayer,
        // "source": 'Election District',
        "paint": {
            // "line-color": ["case", ["boolean", ["feature-state", "hover"], false],
            // "#000000",
            // "#ffffff"],
            "line-color": "#000000",
            "line-width": 2,
            "line-opacity": ["case", ["boolean", ["feature-state","hover"], false],
            // "line-opacity": ["case", ["boolean", ["feature-state", "ed"], currentED],
            1,
            0.25],
            "line-width": ["case", ["boolean", ["feature-state","hover"], false],
            // "line-width": ["case", ["boolean", ["feature-state", "ed"], currentED],
            2.5,
            0.5]
        }
    }, "road-label")
    
    map.on("mousemove", "Election District", function(e) {
        map.getCanvas().style.cursor = 'pointer';
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
                d3.select(".candidate-row-to-update").attr("class","candidate-row").select("#value").text(EDCandidateCount.toLocaleString())
            }
            for (let i=0; i<candidates.length; i++) {
                let EDCandidateCount = data[currentED][candidates[i]]
                if (EDTotal === 0) {
                    d3.select("#percent-to-update").attr("id","percent").text("n/a")
                }
                else {
                    d3.select("#percent-to-update").attr("id","percent").text(((EDCandidateCount/EDTotal)*100).toFixed(2)+"%")
                }
            }
            d3.select("#total-row").select("#value").text(EDTotal)
            map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District Border', id: hoveredId},{ hover: true});
            // debugger
            // map.setFeatureState({source: 'Election District', id: hoveredId}, { hover: true});
            // map.setFeatureState(map.querySourceFeatures("Election District",{filter: ['==', 'ed', currentED]})[0], { hover: true})
        }
    })

    map.on("mouseleave", "Election District", function() {
        map.getCanvas().style.cursor = '';
        if (hoveredId) {
            map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District Border', id: hoveredId}, { hover: false});
        }
        hoveredId = null;
        currentED = null;
        d3.select("#table-title").text("Total")
        d3.selectAll(".candidate-row").attr("class", "candidate-row-to-update")
        d3.selectAll("#percent").attr("id","percent-to-update")
        for (let i=0; i<candidates.length;i++) {
            d3.select(".candidate-row-to-update").attr("class","candidate-row").select("#value").text(total[candidates[i]].toLocaleString())
            d3.select("#percent-to-update").attr('id','percent').text(((total[candidates[i]]/totalVotes)*100).toFixed(2)+"%")
        }
        d3.select("#total-row").select("#value").text(totalVotes.toLocaleString())

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

