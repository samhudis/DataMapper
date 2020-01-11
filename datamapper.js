let geoJSONUnitColumnName = "ElectDist"

const tenStepOpacity = function(field) {
    const maxOpacity = 1
    return(
    ["case",
    ["<", ["*",["feature-state", field], ["feature-state", "reporting"]], 0.2],0.2 * maxOpacity,
    ["<", ["*",["feature-state", field], ["feature-state", "reporting"]], 0.3],0.3 * maxOpacity,
    ["<", ["*",["feature-state", field], ["feature-state", "reporting"]], 0.4],0.4 * maxOpacity,
    ["<", ["*",["feature-state", field], ["feature-state", "reporting"]], 0.5],0.5 * maxOpacity,
    ["<", ["*",["feature-state", field], ["feature-state", "reporting"]], 0.6],0.6 * maxOpacity,
    ["<", ["*",["feature-state", field], ["feature-state", "reporting"]], 0.7],0.7 * maxOpacity,
    ["<", ["*",["feature-state", field], ["feature-state", "reporting"]], 0.8],0.8 * maxOpacity,
    ["<", ["*",["feature-state", field], ["feature-state", "reporting"]], 0.9],0.9 * maxOpacity,
    // ["<", ["feature-state", field], 0.1],0.1,
    // ["<", ["feature-state", field], 0.2],0.2,
    // ["<", ["feature-state", field], 0.3],0.3,
    // ["<", ["feature-state", field], 0.4],0.4,
    // ["<", ["feature-state", field], 0.5],0.5,
    // ["<", ["feature-state", field], 0.6],0.6,
    // ["<", ["feature-state", field], 0.7],0.7,
    // ["<", ["feature-state", field], 0.8],0.8,
    // ["<", ["feature-state", field], 0.9],0.9,
    1])
}

const dataLayerBorder = { //const to define behavior of data borders
    "id": "Data-Layer Border",
    "type": 'line',
    "source": 'Data-Layer',
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
}

var loadMap = function() {
    selectedIndex = document.getElementById("selector").selectedIndex
    d3.select("h3").text(`Election Results: ${dataSeriesChoices[selectedIndex].replace(/_/g," ")}`)
    // map.sourceLoaded = false
    function redrawMap() {
        map.addSource('Data-Layer', {
            "type": "geojson",
            "data": {features: map.features, type: "FeatureCollection"}, //GeoJSON format
            'generateId': true
            })
        map.addLayer(dataLayer, "road-label")
        map.addLayer(dataLayerBorder, "road-label")
    }
    loadData(redrawMap)
}

var unloadMap = function() {
    map.clickedUnit = null
    map.moveEnd = false
    resetTable()
    // zoomToCity(map)
    if (map.getLayer("Data-Layer Border")) {
    map.removeLayer("Data-Layer Border")};
    if (map.getLayer("Data-Layer")) {
    map.removeLayer("Data-Layer")};
    if (map.getSource("Data-Layer")) {
    map.removeSource("Data-Layer")};
    unloadCSV();
}
let dataSeriesChoices = [""] //used once in loadMap(), otherwise local to populateSelector()
const selector = d3.select("#selector").attr("onchange", `unloadMap(); loadMap();`)
const dateSelector = d3.select("#date-selector").attr("onchange", `getInventory();`)
let selectedIndex = 0

const populateSelector = function(selectorChoices, selector) {
    selector.html("")
    dataSeriesChoices = selectorChoices
    if (dataSeriesChoices[0] === ""){dataSeriesChoices.shift()}
    if (dataSeriesChoices[dataSeriesChoices.length-1] === ""){dataSeriesChoices.pop()}
    for (let i=0; i<selectorChoices.length; i++){
        const option = selector.append("option").text(`${selectorChoices[i].replace(/_/g," ")}`)
        if (i===0) {option.attr("selected","selected")
        }
    }
    let selectedIndex = document.getElementById("selector").selectedIndex
    if (dataSeriesChoices[selectedIndex] !== undefined){
    d3.select("h3").text(`Election Results: ${dataSeriesChoices[selectedIndex].replace(/_/g," ")}`)
    }
}
populateSelector(dataSeriesChoices, selector)

const dateOptions = [] //set in loadDateInventory, used in getInventory
const options = [] //reset in loadInventory, set in loadInventory, used in loadData
// let ED = {}; //set in loadData, used in zoomToUnit
let legend = [];
// let color = {} //only used in loadCSV(), and reset in unloadCSV()
let dataLayer



const loadInventory = function(response, selector, seriesPath) {
    selectedIndex = 0 //reset selection of election
    inventory = response.split('\r\n')
    if (inventory[inventory.length - 1].length === 0) {inventory.pop()} //because the last element is a useless empty str
    options.length = 0 // clear out old options on inventory refresh
    for (let i=0; i<inventory.length; i++){
        item = inventory[i]
        options.push({geoJSON: "./inventory/"+seriesPath+"geojsons/"+item.replace("_-_","___").replace("'","")+".geojson", data: "./inventory/"+seriesPath+"data/"+item+".csv"})
    }
    populateSelector(inventory, selector)
    if (this.loadedOnce) {unloadMap(); loadMap()}
    else {this.loadedOnce = true; loadData()}
}

const getInventory = function() {
    selectedSubchoiceIndex = document.getElementById("date-selector").selectedIndex
    seriesPath = dateOptions[selectedSubchoiceIndex]+"/"
    $.ajax({
        type: "GET",
        url: "./inventory/"+seriesPath+"inventory.csv",
        dataType: "text",
        success: function(response) {
            loadInventory(response, selector, seriesPath)
            
        }
    })
}

const loadDateInventory = function(response, selector){
    inventory = response.split('\r\n')
    inventory.pop()
    for (let i=0; i<inventory.length; i++){
        item = inventory[i]
        dateOptions.push(item)
    }
    populateSelector(inventory, selector)
}


const getDateInventory = function(){
    $.ajax({
        type: "GET",
        url: "./inventory/inventory.csv",
        dataType: "text",
        success: function(response){
            loadDateInventory(response, dateSelector)
            getInventory()
        }
    })
}

getDateInventory()


let data = {};
let total = {}; //used only in loadCSV() and resetTable(), reset in unloadCSV()
let totalVotes = 0; //used in loadCSV() and resetTable(), reset in unloadCSV()
let candidates = []; //used widely
// let rank = {}; //used only in loadCSV(), reset in unloadCSV()
let opacityScaleField = "winner_p"
let rowSelected = false //used for enabling or surpressing symbology change on table row hover

const loadData = function(callback) {
    delete map.features
    jQuery.getJSON(options[selectedIndex].geoJSON).then((responseJSON) => {
        map.features = responseJSON.features;
        // for (let i=0; i < map.features.length; i++) {
            // let ed = map.features[i].properties[geoJSONUnitColumnName];
            // ED[ed] = features[i];
        // }
        map.zoom(map.features)

        $.ajax({
            type: "GET",
            url: options[selectedIndex].data,
            dataType: "text",
            success: function(response) {
                loadCSV(response)
                if (callback) {callback()}
                },
        })
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
    d3.select("#total-row").remove();
    d3.select("#heading-row").remove();
    d3.selectAll(".candidate-row").remove();
    let rows = csv.split("\n")
    let columns = rows[0].split("\r")[0].split(",");
    candidates_start_i = columns.indexOf("Reporting")+1
    candidates_end_i = columns.indexOf("Total Votes")
    for (let i=0; i<columns.length; i++){
        if (columns[i].includes(" RECAP")) {
            candidates_end_i = columns.indexOf("p_"+columns[candidates_start_i])
            candidates_start_i = columns.indexOf("Total Votes")+1
            break
        }
    }
    // const total = {}
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
    const rank = {}
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
    const primaryColors = ["#fdb800","#006544","#78c7eb","#720091","#a9e558"]
    const generalColors = ["#004da8","#c10032"] //blue, red
    const questionColors = ["#007300","#c10032"]//green, red
    if (candidates.includes("Yes")) {legendColors=questionColors; candidates = ["Yes","No"]} //force proper order for colors
    else {legendColors=primaryColors
        for (let i=0; i<candidates.length; i++) {
            if (candidates[i].includes("RECAP")){legendColors=generalColors; break}
        }
    }
    const color = {}
    let k = 0
    let unitKeys = Object.keys(data)
    for (let i=0; (i<legendColors.length);) {
        let candidate = candidates[k]
        if (candidate === undefined) {break} //if there are fewer candidates than colors
        
        let symbologySegmentUnits = []
        for (let j=0; j<unitKeys.length; j++) {
            let ed = unitKeys[j]
            if (data[ed].winner){
                if (data[ed].winner.split(" RECAP")[0] === candidate.split(" RECAP")[0]) {
                        symbologySegmentUnits.push(ed)
                        break
                }
            }
        }
        if (symbologySegmentUnits.length > 0) {
            // ['==', ['feature-state', 'winner'], "Jose E. Serrano"], "#b4d455", // what a 'case' line looks like
            // legend.push(symbologySegmentUnits)
            // legend.push(legendColors[i])
            //^ push color for symbology definition cluster
            legend.push(['==', ['feature-state', 'winner'], candidate])
            legend.push(legendColors[i])
            if (typeof legendColors[i] == "string") {seriesColor = legendColors[i]}
            else {seriesColor = legendColors[i][0]}
            color[candidate] = seriesColor
            i++
        }
        else {color[candidate] = "#ffffff"}
        k++
    }
    dataLayer = {
        "id": "Data-Layer",
        "type": 'fill',
        "source": 'Data-Layer',
        "paint": {
            "fill-color": 
            [
            //     'match',
            //     ["get", geoJSONUnitColumnName],
            //     ...legend,
            //     "#ffffff"
                "case",
                ...legend, 
                "#ffffff"
            ],
                "fill-opacity": tenStepOpacity(opacityScaleField)
            // ["boolean", ["feature-state","selected"], false],1,
            // ["boolean", ["feature-state","hover"], false],1,
            // 0.25],
        }
    }
    //construct table
    let totalRow = table.append("tr").attr("id", "total-row");
    totalRow.append("td").attr("id","total-key").text("Total:");
    let values = totalRow.append("td").attr("id","values")
    values.append("td").attr("id","value").text(totalVotes.toLocaleString());

    const headingRow = table.append("tr").attr("id", "heading-row");
    headingRow.append("td").text("Candidate");
    headingRow.append("td").text("Percent");
    headingRow.append("td").text("Votes");
    const dataRows = table.append("div").attr("id","data-rows").attr("onmouseleave", 
            `if (!rowSelected){
                    map.setPaintProperty('Data-Layer', 'fill-color', [
                    "case",
                    ...legend,
                    "#ffffff"  
                    ]);
                    map.setPaintProperty('Data-Layer', 'fill-opacity', tenStepOpacity(opacityScaleField))
                };`)
    for (let i=0;i<candidates.length;i++) {
        totalVotes += total[candidates[i]]
        let row = dataRows.append("tr")
        .attr("onmouseenter",
                `        
                if (!rowSelected){
                    map.setPaintProperty('Data-Layer', 'fill-color', this.style["background-color"]);
                    let seriesName = this.id;
                    map.setPaintProperty('Data-Layer', 'fill-opacity', tenStepOpacity('p_'+seriesName));
                    };
                `
                )
        .attr("onclick", `{
            if (this.id !== "selected-row"){
            let seriesName = this.id;
            map.setPaintProperty('Data-Layer', 'fill-color', this.style["background-color"]);
            map.setPaintProperty('Data-Layer', 'fill-opacity', tenStepOpacity('p_'+seriesName));
            if (rowSelected){d3.select("#selected-row").attr("id", htmlSanitize(d3.select("#selected-row").select("#key").text()))};
            this.id = "selected-row"
            this.seriesName = seriesName
            rowSelected = true
            }
            else {this.id = this.seriesName;
            rowSelected = false};
        }`)
        .attr("id", htmlSanitize(candidates[i]).replace(" RECAP","")).attr("class", "candidate-row").style("background", color[candidates[i]] || "white");
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
    rowSelected = false
    data = {};
    legend = [];
    candidates = [];
    totalVotes = 0;
    d3.selectAll("#total-row").remove();
    d3.selectAll("#heading-row").remove();
    // d3.selectAll(".candidate-row").remove();
    d3.selectAll("#data-rows").remove()

}


mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtaHVkaXMiLCJhIjoiY2pudzdwZTIyMDA2dTN2bWVtY3Q1Znc5NSJ9.KKMNkGea2HILNgmDRDDj9Q';
const map = new mapboxgl.Map({
container: 'map',
style: 'mapbox://styles/samhudis/cjuefwyqu1o5j1fnrju4ywcgq',
center: [-73.97875695,40.70545215], //nyc
zoom: 9, //nyc
// center: [0,0], // world
// zoom: 1, // world
});
let hoveredId = null;
let currentED = null;

map.zoom = function(featureArr=map.sourceFeatures) {
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

const zoomToUnit = function(map, unit) {
    // let features = [ED[unit]]
    let features = [map.features[unit]]
    map.zoom(features)
}

const zoomToCity = function(map) {
    map.fitBounds([[-74.2556845,40.4955504],[-73.7018294,40.9153539]], {padding: 5}) //zoom to NYC
    // map.fitBounds([[-180,-90],[180,90]]) //zoom to the entire world
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
    map.clickedUnit = null

    map.addControl(new mapboxgl.NavigationControl());

    map.addSource('Data-Layer', {
    "type": "geojson",
    "data": {features: map.features, type: "FeatureCollection"}, //GeoJSON format
    'generateId': true
    })
    map.addLayer(dataLayer, "road-label")

    map.zoom(map.features)

    map.on('sourcedata', () => {
        // if (!map.sourceLoaded) {
            if (map.getSource('Data-Layer') && map.isSourceLoaded('Data-Layer')) {
                map.sourceFeatures = map.querySourceFeatures("Data-Layer")
                if (map.sourceFeatures.length > 0) {
                    // if (map.features) {
                    for (let i=0; i<map.sourceFeatures.length;i++) {
                        let state = {};
                        let sourceFeature = map.sourceFeatures[i];
                        // below is only necessary if percentages are not supplied in the data 
                        // let EDTotal = 0;
                        // for (let j=0; j<candidates.length; j++) {
                        //     let EDCandidateCount = data[sourceFeature.properties[geoJSONUnitColumnName]][candidates[j]]
                        //     EDTotal += Number(EDCandidateCount)
                        // }
                        // for (let j=0; j<candidates.length; j++) {
                        //     let EDCandidateCount = data[sourceFeature.properties[geoJSONUnitColumnName]][candidates[j]]
                        //     let pCandidateName = `p_${candidates[j]}`
                        //     let pCandidateValue = (EDCandidateCount/EDTotal).toFixed(4)
                        //     state[pCandidateName] = pCandidateValue
                        // }
                        // ^ above is only necessary if percentages are not supplied in the data
                        for (let j=0; j<candidates.length; j++){
                            let pCandidateName = `p_${candidates[j]}`

                            state[htmlSanitize(pCandidateName).replace(" RECAP","")] = Number(data[sourceFeature.properties[geoJSONUnitColumnName]][pCandidateName])
                            }
                        
                        state.reporting = Number(data[sourceFeature.properties[geoJSONUnitColumnName]].Reporting)/100
                        state.winner = data[sourceFeature.properties[geoJSONUnitColumnName]].winner
                        // state.winner_p = Number(data[sourceFeature.properties[geoJSONUnitColumnName]]["winner_p"]).toFixed(4)
                        state.winner_p = Number(data[sourceFeature.properties[geoJSONUnitColumnName]].winner_p)

                        map.setFeatureState({source: 'Data-Layer', id: sourceFeature.id}, state)
                        }
                    // map.sourceLoaded = true
                // }
            }
        }
    })

    map.addLayer(dataLayerBorder, "road-label")
    
    map.on("mousemove", "Data-Layer", function(e) {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features.length > 0) {
            if (hoveredId || hoveredId === 0) {
                map.setFeatureState({source: 'Data-Layer', id: hoveredId}, {hover: false})
            }
            hoveredId = e.features[0].id;
            currentED = e.features[0].properties[geoJSONUnitColumnName];
            if (map.clickedUnit === null || map.clickedUnit.properties[geoJSONUnitColumnName] === e.features[0].properties[geoJSONUnitColumnName]) {
                updateTable()
            map.setFeatureState({source: 'Data-Layer', id: hoveredId}, { hover: true});
            }
        }
    })

    map.on("mouseleave", "Data-Layer", function() {
        map.getCanvas().style.cursor = '';
        if (hoveredId || hoveredId === 0) {
            map.setFeatureState({source: 'Data-Layer', id: hoveredId}, { hover: false});
        }
        hoveredId = null;
        currentED = null;
        if (map.clickedUnit === null) {
            resetTable()
        }
    })

    map.on('click', 'Data-Layer', function (e) {
        map.clickedUnit = e.features[0]
        if (map.unitLastClicked) {
            map.setFeatureState({source: 'Data-Layer', id: map.unitLastClicked.id}, {selected: false})
            }
        if (map.unitLastClicked && (map.clickedUnit.id === map.unitLastClicked.id)) {
            map.unitLastClicked = null;
            map.clickedUnit = null;
            map.zoom(map.features)
        }
        else {
        map.unitLastClicked = map.clickedUnit;
        map.setFeatureState({source: 'Data-Layer', id: map.clickedUnit.id}, {selected: true})
        // zoomToUnit(map, map.clickedUnit.properties[geoJSONUnitColumnName]);
        zoomToUnit(map, map.clickedUnit.id)
        updateTable()
        }
        map.setFeatureState({source: 'Data-Layer', id: hoveredId}, { hover: true});
        });
})