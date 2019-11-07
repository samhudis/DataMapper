// document.addEventListener('DOMContentLoaded', () => {
let sourceLoaded = false;
let atomicGeoJSONUnit = "ElectDist"
let atomicDataUnit = "ED"
let atomicUnit = "ElectDist"

var loadMap = function() {
    selectedIndex = document.getElementById("selector").selectedIndex
    d3.select("h1").text(`Election Results: ${elections[selectedIndex].replace(/_/g," ")}`)
    sourceLoaded = false
    // loadData(redrawMap)
    function redrawMap() {
        map.addSource('Election District', {
            "type": "geojson",
            "data": options[selectedIndex].geoJSON,
            'generateId': true
            })
        map.addLayer({
            "id": "Election District",
            "type": 'fill',
            "source": 'Election District',
            "paint": {
                "fill-color": [
                    'match',
                    ["get", atomicUnit],
                    ...legend,
                    "#ffffff"  
                ],
                "fill-opacity": 0.7,
            }
        }, "road-label"
        )
        map.addLayer({
            "id": "Election District Border",
            "type": 'line',
            "source": 'Election District',
            "paint": {
                "line-color": "#000000",
                "line-width": 2,
                "line-opacity": ["case",
                ["boolean", ["feature-state","selected"], false],1,
                ["boolean", ["feature-state","hover"], false],1,
                0.25],
                "line-width": ["case",
                ["boolean", ["feature-state","selected"], false],5,
                ["boolean", ["feature-state","hover"], false],2.5,
                0.5]
            }
        }, "road-label")
    }
    loadData(redrawMap)
    


}

var unloadMap = function() {
    if (map.getLayer("Election District Border")) {
    map.removeLayer("Election District Border")};
    if (map.getLayer("Election District")) {
    map.removeLayer("Election District")};
    if (map.getSource("Election District")) {
    map.removeSource("Election District")};
    unloadCSV();
}

elections = [""]
const selector = d3.select("select")
selector.attr("onchange", `unloadMap(); loadMap()`)
let selectedIndex = 0

const populateSelector = function(choices) {
    elections = choices
    if (elections[0] === ""){elections.shift()}
    for (let i=0; i<choices.length; i++){
        const option = selector.append("option").text(`${choices[i].replace(/_/g," ")}`)
        if (i===0) {option.attr("selected","selected")
        }
    }
    let selectedIndex = document.getElementById("selector").selectedIndex
    if (elections[selectedIndex] !== undefined){
    d3.select("h1").text(`Election Results: ${elections[selectedIndex].replace(/_/g," ")}`)
    }
}
populateSelector(elections)

const options = []
let ED = {};
let EDLastClicked = 0;
let legend = [];
let color = {}
$.ajax({
    type: "GET",
    url: "./inventory.txt",
    dataType: "text",
    success: function(response) {
        inventory = response.split('\r\n')
        for (let i=0; i<inventory.length; i++){
            item = inventory[i]
            options.push({geoJSON: "./geojsons/"+item+".geojson", data: "./data/"+item+".csv"})
        }
        populateSelector(inventory)

        jQuery.getJSON(options[selectedIndex].geoJSON).then((responseJSON) => {
            const features = responseJSON.features;
            for (let i=0; i < features.length; i++) {
                let ed = features[i].properties[atomicUnit];
                ED[ed] = features[i];
            }
            })
        loadData()
        
    }
})


let data = {};
let columns = [];
let total = {};
let totalVotes = 0;
let candidates = [];
let rank = {};
let sourceFeatures = []

const loadData = function(callback) {
    jQuery.getJSON(options[selectedIndex].geoJSON).then((responseJSON) => {
        const features = responseJSON.features;
        for (let i=0; i < features.length; i++) {
            let ed = features[i].properties[atomicUnit];
            ED[ed] = features[i];
        }})


    $.ajax({
        type: "GET",
        url: options[selectedIndex].data,
        dataType: "text",
        success: function(response) {
            loadCSV(response)
            if (callback) {callback()}
            },
    })
}

function htmlSanitize(str) {
    str = str.replace("__"," ")
    const invalids = [".","'","'","(",")","."]
    for (let i=0; i<invalids.length; i++) {
        str = str.replace(invalids[i],"")
    }
    return str
}

function loadCSV(csv) {
    let rows = csv.split("\n")
    columns = rows[0].split(",");
    candidates_start_i = columns.indexOf("Reporting")+1
    candidates_end_i = columns.indexOf("Total Votes")
    for (let i=0; i<columns.length; i++){
        if (columns[i].includes(" RECAP")) {
            candidates_end_i = columns.indexOf("p_"+columns[candidates_start_i])
            candidates_start_i = columns.indexOf("Total Votes")+1
            break
        }
    }
    for (let i=candidates_start_i; i<candidates_end_i; i++) {
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
    for (let i=0; i<candidateKeys.length; i++) {
        rank[total[candidateKeys[i]]] = candidateKeys[i]
    }

    let candidatesUnsorted = [];
    for (let i=candidates_start_i; i<candidates_end_i; i++) {
        candidatesUnsorted.push(columns[i])
    }
    // for (let i=0; i<columns.length; i++) {
    //     let column = columns[i]
    //     if (((!(column.indexOf("(") === -1)
    //     && !(column.indexOf(")") === -1))
    //     || !(column.indexOf("Scattered") === -1)
    //     || !(column.indexOf("WRITE-IN") === -1))
    //     && (column.indexOf("__") === -1)
    //     && !(column.indexOf("p_") === 0)
    //     )
    //     {
    //         candidatesUnsorted.push(column)
    //     }
    // }

    let table = d3.select("tbody")


    let candidatesRankVotes = Object.keys(rank).sort((a,b) => b - a);

    for (let i=0; i<candidatesRankVotes.length; i++) {
        let candidate = rank[candidatesRankVotes[i]]
        if (candidatesUnsorted.indexOf(candidate) !== -1) {
            candidates.push(candidate)
        }
    }

    //legend packing
    let legendColors
    const crowdedColors = ["#fdb800","#c10032","#006544","#78c7eb","#a9e558","#720091","#ffff00","#df73ff","#a87000","#004da8"]
    const primaryColors = ["fdb800","#006544","#78c7eb","#720091","#a9e558"]
    const generalColors = ["#004da8","#c10032"]
    const questionColors = ["#007300","#c10032"]
    if (candidates.includes("Yes")) {legendColors=questionColors}
    else {legendColors=primaryColors
        for (let i=0; i<candidates.length; i++) {
            if (candidates[i].includes("RECAP")){legendColors=generalColors; break}
        }
    }
    let k = 0
    for (let i=0; (i<legendColors.length);) {
        let candidate = candidates[k]
        if (candidate === undefined) {break}
        let EDs = Object.keys(data)
        let winningEds = []
        for (let j=0; j<EDs.length; j++) {
            let ed = EDs[j]
            if (data[ed].winner){
                if (data[ed].winner.replace(" RECAP","") === candidate.replace(" RECAP","")) { //append .replace(" RECAP","") to both sides of ===
                        winningEds.push(ed)
                }
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
    values.append("td").attr("id","value").text(totalVotes.toLocaleString());

    const headingRow = table.append("tr").attr("id", "heading-row");
    headingRow.append("td").text("Candidate");
    headingRow.append("td").text("Percent");
    headingRow.append("td").text("Votes");
    for (let i=0;i<candidates.length;i++) {
        totalVotes += total[candidates[i]]
        let row = table.append("tr")
        .attr("onmouseout", `map.setPaintProperty('Election District', 'fill-color', [
                'match',
                ["get", atomicUnit],
                ...legend,
                "#ffffff"  
            ])`)
        .attr("id", htmlSanitize(candidates[i])).attr("class", "candidate-row").style("background", color[candidates[i]] || "white");
        row.append("td").attr("id","key").text(candidates[i].split("(")[0].split(" RECAP")[0]);
        let values = row.append("td").attr("id","values")
        values.append("td").attr("id","percent-to-update").text()
        values.append("td").attr("id","value").text(total[candidates[i]].toLocaleString());
    }
    for (let i=0; i<candidates.length;i++) {
        d3.select("#percent-to-update").attr("id","percent").text(((total[candidates[i]]/totalVotes)*100).toFixed(2)+"%")
    }
    d3.select("#total-row").select("#value").text(totalVotes.toLocaleString());

}

function unloadCSV() {
    total = {};
    data = {};
    rank = {};
    legend = [];
    color = {};
    candidates = [];
    totalVotes = 0;
    d3.select("#total-row").remove();
    d3.select("#heading-row").remove();
    d3.selectAll(".candidate-row").remove();

}


mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtaHVkaXMiLCJhIjoiY2pudzdwZTIyMDA2dTN2bWVtY3Q1Znc5NSJ9.KKMNkGea2HILNgmDRDDj9Q';
const map = new mapboxgl.Map({
container: 'map',
style: 'mapbox://styles/samhudis/cjuefwyqu1o5j1fnrju4ywcgq',
center: [-73.97875695,40.70545215],
zoom: 9
});
let hoveredId = null;
let currentED = null;

const zoomTo = function(map, featureArr) {
    let n = -100;
    let s = 100;
    let e = 200;
    let w = -200;
    for (let i=0; i < featureArr.length; i++) {
        let bounds = turf.envelope(featureArr[i]).geometry.coordinates[0];
        for (let j=0; j < bounds.length; j++) {
            let corner = bounds[j]
                if (corner.indexOf(Infinity) === -1 &&
                corner.indexOf(-Infinity) === -1){
                    if (corner[1] > n) {n = corner[1]}
                    if (corner[1] < s) {s = corner[1]}
                    if (corner[0] < e) {e = corner[0]}
                    if (corner[0] > w) {w = corner[0]}
                }
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
    "data": options[selectedIndex].geoJSON,
    'generateId': true
    })

    map.addLayer({
        "id": "Election District",
        "type": 'fill',
        "source": 'Election District',
        "paint": {
            "fill-color": [
                'match',
                ["get", atomicUnit],
                ...legend,
                "#ffffff"  
            ],
            "fill-opacity": 0.7,
        }
    }, "road-label"
    )

    map.on('sourcedata', () => {
        if (!sourceLoaded) {
        if (map.getSource('Election District') && map.isSourceLoaded('Election District')) {
        sourceFeatures = map.querySourceFeatures("Election District")
        if (sourceFeatures.length > 0) {
        for (let i=0; i<sourceFeatures.length;i++) {
            let state = {};
            let feature = sourceFeatures[i];
            let EDTotal = 0;
            for (let j=0; j<candidates.length; j++) {
                let EDCandidateCount = data[feature.properties[atomicUnit]][candidates[j]]
                EDTotal += Number(EDCandidateCount)
            }
            for (let j=0; j<candidates.length; j++) {
                let EDCandidateCount = data[feature.properties[atomicUnit]][candidates[j]]
                let pCandidateName = `p_${candidates[j]}`
                let pCandidateValue = (EDCandidateCount/EDTotal).toFixed(4)
                state[pCandidateName] = pCandidateValue
            }
            state.winner = data[feature.properties[atomicUnit]].winner
            map.setFeatureState({source: 'Election District', id: feature.id}, state)
        }
        sourceLoaded = true
        }}
        }}
    )

    map.addLayer({
        "id": "Election District Border",
        "type": 'line',
        "source": 'Election District',
        "paint": {
            "line-color": "#000000",
            "line-width": 2,
            "line-opacity": ["case",
            ["boolean", ["feature-state","selected"], false],1,
            ["boolean", ["feature-state","hover"], false],1,
            0.25],
            "line-width": ["case",
            ["boolean", ["feature-state","selected"], false],5,
            ["boolean", ["feature-state","hover"], false],2.5,
            0.5]
        }
    }, "road-label")
    
    map.on("mousemove", "Election District", function(e) {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features.length > 0) {
            if (hoveredId || hoveredId === 0) {
                map.setFeatureState({source: 'Election District', id: hoveredId}, {hover: false})
            }
            hoveredId = e.features[0].id;
            currentED = e.features[0].properties[atomicUnit];
            if (clickedED === null || clickedED.properties[atomicUnit] === e.features[0].properties[atomicUnit]) {
                updateTable()
            map.setFeatureState({source: 'Election District', id: hoveredId}, { hover: true});
            }
        }
    })

    map.on("mouseleave", "Election District", function() {
        map.getCanvas().style.cursor = '';
        if (hoveredId || hoveredId === 0) {
            map.setFeatureState({source: 'Election District', id: hoveredId}, { hover: false});
        }
        hoveredId = null;
        currentED = null;
        if (clickedED === null) {
            resetTable()
        }
    })

    map.on('click', 'Election District', function (e) {
        clickedED = e.features[0]
        if (EDLastClicked) {
            map.setFeatureState({source: 'Election District', id: EDLastClicked.id}, {selected: false})
            }
        if (EDLastClicked && (clickedED.id === EDLastClicked.id)) {
            EDLastClicked = null;
            clickedED = null;
            zoomTo(map, sourceFeatures)
        }
        else {
        EDLastClicked = clickedED;
        map.setFeatureState({source: 'Election District', id: clickedED.id}, {selected: true})
        zoomToED(map, clickedED.properties[atomicUnit]);
        updateTable()
        }
        map.setFeatureState({source: 'Election District', id: hoveredId}, { hover: true});
        });
})