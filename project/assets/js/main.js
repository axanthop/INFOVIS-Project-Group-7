const appState={
    data:[],
    filteredData:[],
    filters:{
        nbsType:[],
        area:[0,Infinity],
        cost:[0,Infinity]
    }
};

let svg, projection, tooltip;

function updateVisuals(){
    updateMap(appState.filteredData);
}
d3.csv("./assets/data/cleaned.csv").then(data =>
{
    appState.data = data;
    appState.filteredData = data;

    initFilters(data);
    initMap(data);
}
)
function initFilters(data){
    d3.select("#filter-nbs")
        .append("p")
        .text("NBS type: ");
    d3.select("#filter-country")
        .append("p")
        .text("Country: ");
    d3.select("#filter-city")
        .append("p")
        .text("City: ");
    d3.select("#filter-area")
        .append("p")
        .text("Area: ");
    d3.select("#filter-cost")
        .append("p")
        .text("Cost: ");
    d3.select("#filter-scale")
        .append("p")
        .text("Spatial Scale: ");

}

function initMap(data){
    svg = d3.select("#map");
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;

    svg.attr("viewBox",[0,0, width, height]);

    projection = d3.geoMercator()
        .center([10,50])
        .scale(400)
        .translate([width/2, height/2]);
    tooltip=d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid black")
        .style("padding", "10px")
        .style("display", "none");
    updateMap(data);
}

//     svg.append("text")
//         .attr("x", width/2)
//         .attr("y", height/2)
//         .attr("text-anchor", "middle")
//         .text("Map render");
// }
function updateMap(data){
     const circles = svg.selectAll("circle")
         .data(data);

    circles.enter()
        .append("circle")
        .attr("cx", d=>projection([]))
}