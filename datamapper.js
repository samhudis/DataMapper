let ED = {};
let sourceLoaded = false;
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
// ED = null;
})
let data = {};
let columns = [];
let total = {};
let totalVotes = 0;
let candidates = [];
let rank = {};
let sourceFeatures = []

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

    //legend packing
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

    let row = table.append("tr").attr("id", "total-row");
    row.append("td").attr("id","total-key").text("Total:");
    let values = row.append("td").attr("id","values")
    // values.append("td").attr("id", "total-percent").text("100%")
    values.append("td").attr("id","value").text(totalVotes.toLocaleString());

    const headingRow = table.append("tr").attr("id", "heading-row");
    headingRow.append("td").text("Candidate");
    headingRow.append("td").text("Percent");
    headingRow.append("td").text("Votes");

    for (let i=0;i<candidates.length;i++) {
        totalVotes += total[candidates[i]]
        let row = table.append("tr").attr("onmouseover", `map.setPaintProperty('Election District', 'fill-color', "${legendColors[i]}")`).attr("id", htmlSanitize(candidates[i])).attr("class", "candidate-row").style("background", color[candidates[i]] || "white");
        row.append("td").attr("id","key").text(candidates[i].split("(")[0]);
        let values = row.append("td").attr("id","values")
        values.append("td").attr("id","percent-to-update").text()
        values.append("td").attr("id","value").text(total[candidates[i]].toLocaleString());
    }
    for (let i=0; i<candidates.length;i++) {
        d3.select("#percent-to-update").attr("id","percent").text(((total[candidates[i]]/totalVotes)*100).toFixed(2)+"%")
    }
    d3.select("#total-row").select("#value").text(totalVotes.toLocaleString());
    // let row = table.append("tr").attr("id", "total-row");
    // row.append("td").attr("id","total-key").text("Total");
    // let values = row.append("td").attr("id","values")
    // values.append("td").attr("id", "total-percent").text("100%")
    // values.append("td").attr("id","value").text(totalVotes.toLocaleString());

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
    // let features = map.querySourceFeatures('Election District', {filter: ["==", "ed", ed]})
    zoomTo(map, features)
}

const zoomToCity = function(map) {
    map.fitBounds([[-74.2556845,40.4955504],[-73.7018294,40.9153539]], {padding: 5})
    // zoomTo(map, map.querySourceFeatures('Election District'))
}

const updateTable = function() {
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
}

const resetTable = function() {
    d3.select("#table-title").text("Total")
        d3.selectAll(".candidate-row").attr("class", "candidate-row-to-update")
        d3.selectAll("#percent").attr("id","percent-to-update")
        for (let i=0; i<candidates.length;i++) {
            d3.select(".candidate-row-to-update").attr("class","candidate-row").select("#value").text(total[candidates[i]].toLocaleString())
            d3.select("#percent-to-update").attr('id','percent').text(((total[candidates[i]]/totalVotes)*100).toFixed(2)+"%")
        }
        d3.select("#total-row").select("#value").text(totalVotes.toLocaleString())
}

map.on('load', function() {
    let clickedED = null
    zoomToCity(map)

    map.addControl(new mapboxgl.NavigationControl());

    map.addSource('Election District', {
    "type": "geojson",
    "data": "./pa_eds_lite_2.geojson",
    // // "data": "mapbox://samhudis.5jrmia73",
    'generateId': true
    })

    map.addLayer({
        "id": "Election District",
        "type": 'fill',
        // "source": {
        //     type: 'vector',
        //     url: 'mapbox://samhudis.5jrmia73'
        // },
        // "source-layer": inSourceLayer,
        "source": 'Election District',
        "paint": {
            // "fill-color": ["case", ["boolean", ["feature-state", "hover"], false],
            // "#000000",
            // "#ffffff"],
            // "fill-color": "#ffffff",
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

    map.on('sourcedata', () => {
        if (!sourceLoaded) {
        if (map.getSource('Election District') && map.isSourceLoaded('Election District')) {
        // let EDs = Object.keys(data)
        sourceFeatures = map.querySourceFeatures("Election District")
        if (sourceFeatures.length > 0) {
        for (let i=0; i<sourceFeatures.length;i++) {
            // map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District', id: EDs[i]},{ winner: data[EDs[i]]});
            let feature = sourceFeatures[i];
            // map.setFeatureState({source: 'Election District', id: EDs[i]}, {winner: data[EDs[i]].winner});
            map.setFeatureState({source: 'Election District', id: feature.id}, {winner: data[feature.properties.ed].winner})
        }
        sourceLoaded = true
        }}
        }}
    )

    map.addLayer({
        "id": "Election District Border",
        "type": 'line',
        // "source": {
        //     type: 'vector',
        //     url: 'mapbox://samhudis.5jrmia73'
        // },
        // "source-layer": inSourceLayer,
        "source": 'Election District',
        "paint": {
            // "line-color": ["case", ["boolean", ["feature-state", "hover"], false],
            // "#000000",
            // "#ffffff"],
            "line-color": "#000000",
            "line-width": 2,
             // "line-opacity": ["case", ["boolean", ["feature-state", "ed"], currentED],
            "line-opacity": ["case",
            ["boolean", ["feature-state","selected"], false],1,
            ["boolean", ["feature-state","hover"], false],1,
            0.25],
            // "line-width": ["case", ["boolean", ["feature-state", "ed"], currentED],
            "line-width": ["case",
            ["boolean", ["feature-state","selected"], false],5,
            ["boolean", ["feature-state","hover"], false],2.5,
            0.5]
        }
    }, "road-label")

    var popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        // className: "popup"
    })
    
    map.on("mousemove", "Election District", function(e) {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features.length > 0) {
            if (hoveredId || hoveredId === 0) {
                // map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District Border', id: hoveredId}
                // , { hover: false});
                map.setFeatureState({source: 'Election District', id: hoveredId}, {hover: false})
            }
            hoveredId = e.features[0].id;
            currentED = e.features[0].properties.ed;
            // popup.setLngLat(e.lngLat).setHTML(`<p style="color:black;">${currentED}</p>`).addTo(map)
            if (clickedED === null || clickedED.properties.ed === e.features[0].properties.ed) {
                updateTable()
            // d3.select("#table-title").text("ED "+currentED)
            // d3.selectAll(".candidate-row").attr("class","candidate-row-to-update")
            // d3.selectAll("#percent").attr("id", "percent-to-update")
            // let EDTotal = 0
            // for (let i=0; i<candidates.length; i++) {
            //     let EDCandidateCount = data[currentED][candidates[i]]
            //     EDTotal += Number(EDCandidateCount)
            //     d3.select(".candidate-row-to-update").attr("class","candidate-row").select("#value").text(EDCandidateCount.toLocaleString())
            // }
            // for (let i=0; i<candidates.length; i++) {
            //     let EDCandidateCount = data[currentED][candidates[i]]
            //     if (EDTotal === 0) {
            //         d3.select("#percent-to-update").attr("id","percent").text("n/a")
            //     }
            //     else {
            //         d3.select("#percent-to-update").attr("id","percent").text(((EDCandidateCount/EDTotal)*100).toFixed(2)+"%")
            //     }
            // }
            // d3.select("#total-row").select("#value").text(EDTotal)
            // map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District Border', id: hoveredId},{ hover: true});
            map.setFeatureState({source: 'Election District', id: hoveredId}, { hover: true});
            }
            // map.setFeatureState(map.querySourceFeatures("Election District",{filter: ['==', 'ed', currentED]})[0], { hover: true})
            // map.setPaintProperty('Election District', 'fill-color', "#ffffff");
        }
    })

    map.on("mouseleave", "Election District", function() {
        // popup.remove();
        map.getCanvas().style.cursor = '';
        if (hoveredId || hoveredId === 0) {
            // map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District Border', id: hoveredId}, { hover: false});
            map.setFeatureState({source: 'Election District', id: hoveredId}, { hover: false});
        }
        hoveredId = null;
        currentED = null;
        if (clickedED === null) {
            resetTable()
        // d3.select("#table-title").text("Total")
        // d3.selectAll(".candidate-row").attr("class", "candidate-row-to-update")
        // d3.selectAll("#percent").attr("id","percent-to-update")
        // for (let i=0; i<candidates.length;i++) {
        //     d3.select(".candidate-row-to-update").attr("class","candidate-row").select("#value").text(total[candidates[i]].toLocaleString())
        //     d3.select("#percent-to-update").attr('id','percent').text(((total[candidates[i]]/totalVotes)*100).toFixed(2)+"%")
        // }
        // d3.select("#total-row").select("#value").text(totalVotes.toLocaleString())
        }
    })

    map.on('click', 'Election District', function (e) {
        // let clickedED = e.features[0].properties.ed;
        clickedED = e.features[0]
        if (EDLastClicked) {
            map.setFeatureState({source: 'Election District', id: EDLastClicked.id}, {selected: false})
            }
        if (EDLastClicked && (clickedED.id === EDLastClicked.id)) {
            EDLastClicked = null;
            clickedED = null;
            // zoomToCity(map);
            zoomTo(map, sourceFeatures)
        }
        else {
        EDLastClicked = clickedED;
        map.setFeatureState({source: 'Election District', id: clickedED.id}, {selected: true})
        zoomToED(map, clickedED.properties.ed);
        updateTable()
        // d3.select("#table-title").text("ED "+currentED)
        // d3.selectAll(".candidate-row").attr("class","candidate-row-to-update")
        // d3.selectAll("#percent").attr("id", "percent-to-update")
        // let EDTotal = 0
        // for (let i=0; i<candidates.length; i++) {
        //     let EDCandidateCount = data[currentED][candidates[i]]
        //     EDTotal += Number(EDCandidateCount)
        //     d3.select(".candidate-row-to-update").attr("class","candidate-row").select("#value").text(EDCandidateCount.toLocaleString())
        // }
        // for (let i=0; i<candidates.length; i++) {
        //     let EDCandidateCount = data[currentED][candidates[i]]
        //     if (EDTotal === 0) {
        //         d3.select("#percent-to-update").attr("id","percent").text("n/a")
        //     }
        //     else {
        //         d3.select("#percent-to-update").attr("id","percent").text(((EDCandidateCount/EDTotal)*100).toFixed(2)+"%")
        //     }
        // }
        // d3.select("#total-row").select("#value").text(EDTotal)
        // map.setFeatureState({sourceLayer: inSourceLayer, source: 'Election District Border', id: hoveredId},{ hover: true});
        }
        map.setFeatureState({source: 'Election District', id: hoveredId}, { hover: true});
        // map.setFeatureState(map.querySourceFeatures("Election District",{filter: ['==', 'ed', currentED]})[0], { hover: true})
        // map.setPaintProperty('Election District', 'fill-color', "#ffffff");
        });
})

