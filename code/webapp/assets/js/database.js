d3.csv("./assets/data/cleaned.csv").then(data=> {
    createTable(data);
});

function createTable(data){
    const container =d3.select("#table-container");

    const table = container.append("table")
        .attr("class", "table table-bordered table-sm");

    const columns = Object.keys(data[0]);

    table.append("thead")
        .append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
        .text(d=>d);

    const tbody = table.append("tbody");

    const rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr");
    
    rows.selectAll("td")
        .data(d=>columns.map(col=>d[col]))
        .enter()
        .append("td")
        .text(d=>d);

}